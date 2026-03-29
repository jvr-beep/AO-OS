param(
    [string]$TunnelName = "ao-os-api",
    [string]$Hostname = "api.aosanctuary.com",
    [string]$HealthUrl = "https://api.aosanctuary.com/v1/health",
    [switch]$DryRun,
    [string]$LogFilePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $PSCommandPath
$dnsScript = Join-Path $scriptRoot "Ensure-CloudflaredDnsRoute.ps1"
$serviceScript = Join-Path $scriptRoot "Install-CloudflaredTunnelService.ps1"

$logDir = Join-Path $scriptRoot "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

if (-not $LogFilePath) {
    $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
    $LogFilePath = Join-Path $logDir "cloudflared-setup-$timestamp.log"
}

if (-not (Test-Path $dnsScript)) {
    throw "Missing script: $dnsScript"
}

if (-not (Test-Path $serviceScript)) {
    throw "Missing script: $serviceScript"
}

"[$(Get-Date -Format s)] Starting setup. TunnelName=$TunnelName Hostname=$Hostname DryRun=$DryRun" |
    Tee-Object -FilePath $LogFilePath -Append | Out-Host

Write-Host "Running DNS route setup..." -ForegroundColor Cyan
$dnsArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $dnsScript,
    "-TunnelName", $TunnelName,
    "-Hostname", $Hostname,
    "-HealthUrl", $HealthUrl
)
if ($DryRun) {
    $dnsArgs += "-DryRun"
}
& powershell @dnsArgs 2>&1 | Tee-Object -FilePath $LogFilePath -Append | Out-Host

if ($LASTEXITCODE -ne 0) {
    "[$(Get-Date -Format s)] DNS route setup failed." | Tee-Object -FilePath $LogFilePath -Append | Out-Host
    throw "DNS route setup failed."
}

Write-Host "Running service install/start..." -ForegroundColor Cyan
$serviceArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $serviceScript,
    "-TunnelName", $TunnelName,
    "-HealthUrl", $HealthUrl
)
if ($DryRun) {
    $serviceArgs += "-DryRun"
}
& powershell @serviceArgs 2>&1 | Tee-Object -FilePath $LogFilePath -Append | Out-Host

if ($LASTEXITCODE -ne 0) {
    "[$(Get-Date -Format s)] Service setup failed." | Tee-Object -FilePath $LogFilePath -Append | Out-Host
    throw "Service setup failed."
}

Write-Host "All steps completed." -ForegroundColor Green
"[$(Get-Date -Format s)] Setup completed successfully." | Tee-Object -FilePath $LogFilePath -Append | Out-Host
"Log file: $LogFilePath" | Tee-Object -FilePath $LogFilePath -Append | Out-Host
