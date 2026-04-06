param(
  [string]$HostName = "ao-os-api",
  [string]$ApiBase = "http://localhost:4000",
  [string]$WebBase = "http://localhost:3000",
  [switch]$DryRun,
  [switch]$Build
)

$remoteScript = "~/AO-OS/scripts/vm-post-deploy-smoke.sh"
$remoteEnv = "API_BASE='$ApiBase' WEB_BASE='$WebBase'"
$buildArg = if ($Build.IsPresent) { " --build" } else { "" }

$cmd = "$remoteEnv bash $remoteScript$buildArg"

if ($DryRun.IsPresent) {
  Write-Host "Dry run only. Command that would be executed on ${HostName}:" -ForegroundColor Yellow
  Write-Host $cmd
  exit 0
}

Write-Host "Running VM smoke script on $HostName ..." -ForegroundColor Cyan
ssh -o BatchMode=yes $HostName $cmd

if ($LASTEXITCODE -ne 0) {
  Write-Host "VM smoke failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "VM smoke passed." -ForegroundColor Green