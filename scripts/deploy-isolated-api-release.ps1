<#
.SYNOPSIS
    Isolated-release deploy wrapper for the AO-OS API.

.DESCRIPTION
    Automates the isolated-release flow used for VM rollouts:
      1. Copy local rollout files (env overlay + compose override) to the VM.
      2. On the VM: clone a clean copy of the repo into a temp release directory.
      3. Overlay the copied rollout files so the release uses the intended config.
      4. Rebuild and restart the API container (docker compose up --build).
      5. Wait for /v1/health to return 200.
      6. Verify key API routes are reachable.
      7. Optionally run the production-safe facility topology seed.
      8. Print floor/zone counts via Prisma to confirm seed state.
      9. Remove the temp release directory (unless -KeepReleaseRepo).

.EXAMPLE
    # Full deploy with topology seed
    .\scripts\deploy-isolated-api-release.ps1 -HostName ao-os-api-gcp -SeedFacilityTopology

.EXAMPLE
    # Dry-run to preview SSH/SCP commands
    .\scripts\deploy-isolated-api-release.ps1 -DryRun -SeedFacilityTopology

.EXAMPLE
    # Re-run verification and seed without rebuilding
    .\scripts\deploy-isolated-api-release.ps1 -HostName ao-os-api-gcp -SkipBuild -SeedFacilityTopology

.PARAMETER HostName
    SSH host alias or address of the target VM.
    Defaults to "ao-os-api".

.PARAMETER RemoteRepoDir
    Absolute path to the live AO-OS repo directory on the VM.
    Defaults to "~/AO-OS".

.PARAMETER ReleaseDir
    Absolute path used for the temporary clean-clone on the VM.
    Defaults to "~/ao-os-release".

.PARAMETER ComposeFile
    Path to the compose file relative to the repo root, used for the build/up step.
    Defaults to "infra/docker/docker-compose.api.yml".

.PARAMETER LocalEnvOverlay
    Path on this machine to the .env file to copy onto the VM.
    Leave blank to skip the env overlay step.

.PARAMETER LocalComposeOverride
    Path on this machine to a compose override file to copy onto the VM.
    Leave blank to skip the compose override step.

.PARAMETER ApiBase
    Base URL used for health / route checks on the VM.
    Defaults to "http://localhost:4000".

.PARAMETER SeedFacilityTopology
    When set, runs the production-safe facility-topology seed after the build.

.PARAMETER SkipBuild
    When set, skips the docker compose build/up step.
    Useful for re-running verification or the seed against an already-running container.

.PARAMETER KeepReleaseRepo
    When set, the temp release directory is left on the VM for inspection.

.PARAMETER DryRun
    When set, prints every SSH/SCP command that would be executed without running it.
#>

param(
    [string]$HostName            = "ao-os-api",
    [string]$RemoteRepoDir       = "~/AO-OS",
    [string]$ReleaseDir          = "~/ao-os-release",
    [string]$ComposeFile         = "infra/docker/docker-compose.api.yml",
    [string]$LocalEnvOverlay     = "",
    [string]$LocalComposeOverride = "",
    [string]$ApiBase             = "http://localhost:4000",
    [switch]$SeedFacilityTopology,
    [switch]$SkipBuild,
    [switch]$KeepReleaseRepo,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step {
    param([string]$Msg)
    Write-Host ""
    Write-Host "==> $Msg" -ForegroundColor Cyan
}

function Invoke-Ssh {
    param([string]$Cmd)
    if ($DryRun) {
        Write-Host "  [DRY-RUN ssh] $HostName '$Cmd'" -ForegroundColor DarkGray
        return
    }
    Write-Host "  [ssh] $Cmd" -ForegroundColor DarkGray
    ssh -o BatchMode=yes $HostName $Cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  SSH command failed (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

function Invoke-Scp {
    param([string]$LocalPath, [string]$RemotePath)
    if ($DryRun) {
        Write-Host "  [DRY-RUN scp] $LocalPath -> ${HostName}:$RemotePath" -ForegroundColor DarkGray
        return
    }
    Write-Host "  [scp] $LocalPath -> ${HostName}:$RemotePath" -ForegroundColor DarkGray
    scp $LocalPath "${HostName}:${RemotePath}"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  SCP failed (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# ---------------------------------------------------------------------------
# Repo URL discovery (read from local git remote so forks work automatically)
# ---------------------------------------------------------------------------
$repoUrl = ""
try {
    $repoUrl = (git -C $PSScriptRoot remote get-url origin 2>$null).Trim()
} catch {}
if (-not $repoUrl) {
    $repoUrl = "https://github.com/jvr-beep/AO-OS.git"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AO-OS Isolated-Release Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Host         : $HostName"
Write-Host "  Repo URL     : $repoUrl"
Write-Host "  Live repo    : $RemoteRepoDir"
Write-Host "  Release dir  : $ReleaseDir"
Write-Host "  Compose file : $ComposeFile"
Write-Host "  API base     : $ApiBase"
Write-Host "  Seed topology: $($SeedFacilityTopology.IsPresent)"
Write-Host "  Skip build   : $($SkipBuild.IsPresent)"
Write-Host "  Keep release : $($KeepReleaseRepo.IsPresent)"
Write-Host "  Dry run      : $($DryRun.IsPresent)"

# ---------------------------------------------------------------------------
# Step 1 — Copy rollout overlay files to VM
# ---------------------------------------------------------------------------
Write-Step "Step 1 — Copy rollout overlay files"

if ($LocalEnvOverlay) {
    if (-not (Test-Path $LocalEnvOverlay)) {
        Write-Host "  ERROR: LocalEnvOverlay not found: $LocalEnvOverlay" -ForegroundColor Red
        exit 1
    }
    Invoke-Scp $LocalEnvOverlay "${ReleaseDir}/.env.overlay"
} else {
    Write-Host "  Skipping env overlay (LocalEnvOverlay not set)" -ForegroundColor DarkGray
}

if ($LocalComposeOverride) {
    if (-not (Test-Path $LocalComposeOverride)) {
        Write-Host "  ERROR: LocalComposeOverride not found: $LocalComposeOverride" -ForegroundColor Red
        exit 1
    }
    Invoke-Scp $LocalComposeOverride "${ReleaseDir}/docker-compose.override.yml"
} else {
    Write-Host "  Skipping compose override (LocalComposeOverride not set)" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# Step 2 — Clone clean repo into release directory
# ---------------------------------------------------------------------------
Write-Step "Step 2 — Clone clean repo on VM"

Invoke-Ssh "rm -rf $ReleaseDir && git clone --depth 1 $repoUrl $ReleaseDir"

# ---------------------------------------------------------------------------
# Step 3 — Overlay rollout files
# ---------------------------------------------------------------------------
Write-Step "Step 3 — Apply rollout overlays"

if ($LocalEnvOverlay) {
    Invoke-Ssh "cp ${ReleaseDir}/.env.overlay ${ReleaseDir}/apps/api/.env"
} else {
    # Fall back to the live repo's .env so the container has credentials
    Invoke-Ssh "cp ${RemoteRepoDir}/apps/api/.env ${ReleaseDir}/apps/api/.env 2>/dev/null || true"
}

if ($LocalComposeOverride) {
    Invoke-Ssh "cp ${ReleaseDir}/docker-compose.override.yml ${ReleaseDir}/$ComposeFile.override.yml"
}

# ---------------------------------------------------------------------------
# Step 4 — Build and start API container
# ---------------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Step "Step 4 — Build and start API container"
    Invoke-Ssh "docker compose -f ${ReleaseDir}/${ComposeFile} up -d --build --force-recreate --remove-orphans api"
} else {
    Write-Step "Step 4 — Skipping build (SkipBuild set)"
}

# ---------------------------------------------------------------------------
# Step 5 — Wait for health
# ---------------------------------------------------------------------------
Write-Step "Step 5 — Wait for API health"

$healthCmd = @"
healthy=0
for i in \$(seq 1 30); do
  code=\$(curl -s -o /dev/null -w '%{http_code}' $ApiBase/v1/health || true)
  if [ "\$code" = "200" ]; then echo "HEALTHY"; healthy=1; break; fi
  sleep 2
done
if [ "\$healthy" != "1" ]; then echo "ERROR: API did not become healthy after 60s"; exit 1; fi
"@
Invoke-Ssh $healthCmd

# ---------------------------------------------------------------------------
# Step 6 — Verify key routes
# ---------------------------------------------------------------------------
Write-Step "Step 6 — Verify key API routes"

$verifyCmd = @"
set -e
check() {
  local name=\$1 url=\$2 expected=\$3
  local code=\$(curl -s -o /dev/null -w '%{http_code}' \$url || true)
  if [ "\$code" = "\$expected" ]; then
    echo "PASS  \$name (\$code)"
  else
    echo "FAIL  \$name (expected \$expected, got \$code)"
    exit 1
  fi
}
check "GET /v1/health"        "$ApiBase/v1/health"       200
check "GET /v1/members (401)" "$ApiBase/v1/members"      401
"@
Invoke-Ssh $verifyCmd

# ---------------------------------------------------------------------------
# Step 7 — Facility topology seed (optional)
# ---------------------------------------------------------------------------
if ($SeedFacilityTopology) {
    Write-Step "Step 7 — Run facility topology seed"
    $seedCmd = "cd ${ReleaseDir} && npx ts-node prisma/seed-facility-topology.ts"
    Invoke-Ssh $seedCmd
} else {
    Write-Step "Step 7 — Skipping topology seed"
}

# ---------------------------------------------------------------------------
# Step 8 — Print floor / zone counts
# ---------------------------------------------------------------------------
Write-Step "Step 8 — Floor and zone counts (Prisma)"

$countCmd = @"
cd ${ReleaseDir} && npx prisma db execute --stdin <<'EOF'
SELECT 'floors' AS entity, COUNT(*)::text AS count FROM "Floor"
UNION ALL
SELECT 'zones',  COUNT(*)::text FROM "Zone"
ORDER BY entity;
EOF
"@
Invoke-Ssh $countCmd

# ---------------------------------------------------------------------------
# Step 9 — Cleanup
# ---------------------------------------------------------------------------
if (-not $KeepReleaseRepo) {
    Write-Step "Step 9 — Remove temp release directory"
    Invoke-Ssh "rm -rf $ReleaseDir"
} else {
    Write-Step "Step 9 — Keeping release directory ($ReleaseDir)"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy complete." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
