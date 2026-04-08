param(
    [string]$HostName = "ao-os-api-gcp",
    [string]$RemoteSourceRepo = "~/AO-OS",
    [string]$RemoteReleaseRepo = "~/AO-OS-release-isolated",
    [string]$ApiBase = "http://localhost:4000",
    [string]$WebBase = "http://localhost:3000",
    [string]$RemoteGitRef = "",
    [string]$SshIdentityFile = "",
    [string[]]$OverlayPaths = @(
        "apps/api/src/main.ts",
        "apps/api/src/floor-plans",
        "apps/api/Dockerfile",
        "package.json",
        "prisma/schema.prisma",
        "prisma/seed-facility-topology.ts",
        "prisma/migrations/20260406234513_add_facility_topology"
    ),
    [switch]$SkipOverlay,
    [switch]$SeedFacilityTopology,
    [switch]$SkipBuild,
    [switch]$KeepReleaseRepo,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$remoteSourceRepoShell = if ($RemoteSourceRepo.StartsWith("~/")) {
    '$HOME/' + $RemoteSourceRepo.Substring(2)
}
else {
    $RemoteSourceRepo
}

$remoteReleaseRepoShell = if ($RemoteReleaseRepo.StartsWith("~/")) {
    '$HOME/' + $RemoteReleaseRepo.Substring(2)
}
else {
    $RemoteReleaseRepo
}

$remoteGitRefShell = if ([string]::IsNullOrWhiteSpace($RemoteGitRef)) {
    ""
}
else {
    $RemoteGitRef.Replace('"', '\"')
}

function Write-Step {
    param([string]$Message)

    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-SshBaseArguments {
    $arguments = @("-o", "BatchMode=yes")

    if (-not [string]::IsNullOrWhiteSpace($SshIdentityFile)) {
        $arguments += @("-i", $SshIdentityFile)
    }

    return $arguments
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$FailureMessage
    )

    if ($DryRun.IsPresent) {
        $renderedArgs = ($ArgumentList | ForEach-Object {
                if ($_ -match '\s') {
                    '"' + $_ + '"'
                }
                else {
                    $_
                }
            }) -join ' '

        Write-Host "[dry-run] $FilePath $renderedArgs" -ForegroundColor Yellow
        return
    }

    & $FilePath @ArgumentList

    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Invoke-Ssh {
    param(
        [string]$Command,
        [string]$FailureMessage
    )

    $sshArgs = @(Get-SshBaseArguments)
    $sshArgs += @($HostName, $Command)
    Invoke-Checked -FilePath "ssh" -ArgumentList $sshArgs -FailureMessage $FailureMessage
}

function Invoke-RemoteScript {
    param(
        [string]$Script,
        [string]$FailureMessage
    )

    $normalizedScript = $Script -replace "`r", ""
    $remoteCommand = $remoteEnvPrefix + " bash -lc '" + $normalizedScript + "'"
    Invoke-Ssh -Command $remoteCommand -FailureMessage $FailureMessage
}

function Copy-OverlayPath {
    param([string]$RelativePath)

    $localPath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $localPath)) {
        throw "Overlay path not found: $RelativePath"
    }

    $relativeUnixPath = $RelativePath -replace '\\', '/'
    $remotePath = ($RemoteReleaseRepo.TrimEnd('/')) + "/" + $relativeUnixPath
    $lastSeparatorIndex = $remotePath.LastIndexOf('/')
    $remoteParent = if ($lastSeparatorIndex -ge 0) {
        $remotePath.Substring(0, $lastSeparatorIndex)
    }
    else {
        $RemoteReleaseRepo.TrimEnd('/')
    }

    Invoke-Ssh -Command "mkdir -p $remoteParent" -FailureMessage "Failed creating remote parent for $RelativePath"

    $item = Get-Item $localPath
    if ($item.PSIsContainer) {
        Invoke-Ssh -Command "rm -rf $remotePath" -FailureMessage "Failed clearing remote directory for $RelativePath"
        $scpArgs = @()
        if (-not [string]::IsNullOrWhiteSpace($SshIdentityFile)) {
            $scpArgs += @("-i", $SshIdentityFile)
        }
        $scpArgs += @("-r", $localPath, "${HostName}:$remoteParent")
        Invoke-Checked -FilePath "scp" -ArgumentList $scpArgs -FailureMessage "Failed copying directory $RelativePath"
        return
    }

    $scpArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($SshIdentityFile)) {
        $scpArgs += @("-i", $SshIdentityFile)
    }
    $scpArgs += @($localPath, "${HostName}:$remotePath")
    Invoke-Checked -FilePath "scp" -ArgumentList $scpArgs -FailureMessage "Failed copying file $RelativePath"
}

$prepareReleaseCommand = @'
set -euo pipefail
rm -rf "$REMOTE_RELEASE_REPO"
git clone --no-hardlinks "$REMOTE_SOURCE_REPO" "$REMOTE_RELEASE_REPO"
if [ -n "${REMOTE_GIT_REF:-}" ]; then
    UPSTREAM_REMOTE_URL=$(git -C "$REMOTE_SOURCE_REPO" remote get-url origin)
  cd "$REMOTE_RELEASE_REPO"
    git remote set-url origin "$UPSTREAM_REMOTE_URL"
    git fetch origin --prune
  git checkout "$REMOTE_GIT_REF"
  git reset --hard "$REMOTE_GIT_REF"
fi
cp "$REMOTE_SOURCE_REPO/apps/api/.env" "$REMOTE_RELEASE_REPO/apps/api/.env"
if [ -f "$REMOTE_SOURCE_REPO/apps/web/.env" ]; then
    cp "$REMOTE_SOURCE_REPO/apps/web/.env" "$REMOTE_RELEASE_REPO/apps/web/.env"
fi
'@

$deployCommand = @'
set -euo pipefail
cd "$REMOTE_RELEASE_REPO"
docker rm -f ao-os-api 2>/dev/null || true
docker compose -f infra/docker/docker-compose.api.yml up -d --build --force-recreate --remove-orphans api
'@

$seedCommand = @'
set -euo pipefail
cd "$REMOTE_RELEASE_REPO"
docker compose -f infra/docker/docker-compose.api.yml run --rm --no-deps api pnpm exec tsx prisma/seed-facility-topology.ts
'@

$verifyCommand = @'
set -euo pipefail
curl -fsS "$API_BASE/v1/health"
printf "\n"
floor_plans_status=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/v1/floor-plans")
printf "%s\n" "$floor_plans_status"
if [ "$floor_plans_status" != "401" ]; then
    echo "Unexpected /v1/floor-plans status: $floor_plans_status" >&2
    exit 1
fi
'@

$cleanupCommand = @'
set -euo pipefail
rm -rf "$REMOTE_RELEASE_REPO"
'@

$remoteEnvPrefix = "REMOTE_SOURCE_REPO=$remoteSourceRepoShell REMOTE_RELEASE_REPO=$remoteReleaseRepoShell REMOTE_GIT_REF=$remoteGitRefShell API_BASE=$ApiBase WEB_BASE=$WebBase"

Write-Step "Preparing isolated release repo on $HostName"
Invoke-RemoteScript -Script $prepareReleaseCommand -FailureMessage "Failed preparing isolated release repository"

if (-not $SkipOverlay.IsPresent) {
    Write-Step "Overlaying local release files"
    foreach ($path in $OverlayPaths) {
        Copy-OverlayPath -RelativePath $path
    }
}

if (-not $SkipBuild.IsPresent) {
    Write-Step "Building and starting API container from isolated release repo"
    Invoke-RemoteScript -Script $deployCommand -FailureMessage "Failed deploying isolated API release"
}

if ($SeedFacilityTopology.IsPresent) {
    Write-Step "Seeding production-safe facility topology"
    Invoke-RemoteScript -Script $seedCommand -FailureMessage "Failed seeding facility topology"
}

Write-Step "Verifying API health and AO Sanctuary topology"
Invoke-RemoteScript -Script $verifyCommand -FailureMessage "Failed verifying isolated API release"

if (-not $KeepReleaseRepo.IsPresent) {
    Write-Step "Cleaning up isolated release repo"
    Invoke-RemoteScript -Script $cleanupCommand -FailureMessage "Failed cleaning isolated release repository"
}

Write-Host "Isolated API release completed successfully." -ForegroundColor Green