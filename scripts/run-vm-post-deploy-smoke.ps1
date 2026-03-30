param(
  [string]$HostName = "ao-os-api",
  [switch]$Build
)

$remoteScript = "~/AO-OS/scripts/vm-post-deploy-smoke.sh"
$buildArg = if ($Build.IsPresent) { " --build" } else { "" }

$cmd = "bash $remoteScript$buildArg"

Write-Host "Running VM smoke script on $HostName ..." -ForegroundColor Cyan
ssh -o BatchMode=yes $HostName $cmd

if ($LASTEXITCODE -ne 0) {
  Write-Host "VM smoke failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "VM smoke passed." -ForegroundColor Green