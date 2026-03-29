#!/usr/bin/env pwsh
<#
.SYNOPSIS
Installs and starts cloudflared as a Windows service.

.DESCRIPTION
This script installs cloudflared as a Windows service with autostart enabled.
Must be run with Administrator privileges.

.PARAMETER TunnelName
The name of the tunnel (default: ao-os-api)

.PARAMETER HealthUrl  
URL to test after installation (default: https://api.aosanctuary.com/v1/health)

.PARAMETER HealthTimeoutSeconds
Timeout for health check (default: 15)

.EXAMPLE
# Run interactively (will ask for elevation if needed)
.\Install-Service-Simple.ps1

# Run with specific tunnel name
.\Install-Service-Simple.ps1 -TunnelName "my-tunnel"
#>

param(
    [string]$TunnelName = "ao-os-api",
    [string]$HealthUrl = "https://api.aosanctuary.com/v1/health",
    [int]$HealthTimeoutSeconds = 15
)

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Step {
    param([string]$Message, [switch]$Success)
    if ($Success) {
        Write-Host "[+] $Message" -ForegroundColor Green
    } else {
        Write-Host "[*] $Message" -ForegroundColor Cyan
    }
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[-] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Red
}

# Check admin
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Cloudflared Service Installation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-IsAdmin)) {
    Write-Error "Administrator privileges required"
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator first, then execute this script."
    Write-Host ""
    exit 1
}

Write-Step "Running as Administrator" -Success

# Verify cloudflared exists
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    Write-Error "cloudflared.exe not found at $cloudflaredPath"
    exit 1
}
Write-Step "cloudflared found" -Success

# Verify config exists
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
if (-not (Test-Path $configPath)) {
    Write-Error "config.yml not found at $configPath"
    exit 1
}
Write-Step "config.yml found" -Success
Write-Host ""

# Install service
Write-Step "Installing cloudflared service..."
& $cloudflaredPath service install
if ($LASTEXITCODE -eq 0) {
    Write-Step "Service installed" -Success
} else {
    Write-Warning "Service install returned code $LASTEXITCODE (may already exist)"
}

Write-Host ""

# Start service
Write-Step "Starting cloudflared service..."
net start cloudflared 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Step "Service started" -Success
} else {
    Write-Warning "Service start returned code $LASTEXITCODE (may already be running)"
}

# Set autostart
Write-Step "Configuring autostart..."
sc config cloudflared start=auto 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Step "Autostart enabled" -Success
} else {
    Write-Warning "Autostart configuration returned code $LASTEXITCODE"
}

Write-Host ""

# Verify service status
Write-Step "Verifying service status..."
$svc = Get-Service cloudflared -ErrorAction SilentlyContinue
if ($svc) {
    if ($svc.Status -eq "Running") {
        Write-Step "Service is RUNNING" -Success
    } else {
        Write-Warning "Service status: $($svc.Status)"
    }
    Write-Host "  StartType: $($svc.StartType)" -ForegroundColor Gray
} else {
    Write-Warning "Could not find cloudflared service"
}

Write-Host ""

# Health check
Write-Step "Testing tunnel health endpoint (${HealthTimeoutSeconds}s timeout)..."
try {
    $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec $HealthTimeoutSeconds -SkipCertificateCheck -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Step "Tunnel is reachable and healthy" -Success
        Write-Host "  URL: $HealthUrl" -ForegroundColor Gray
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
    }
} catch {
    Write-Warning "Could not verify tunnel health: $($_.Exception.Message)"
    Write-Host "  (This may be normal if tunnel needs time to start)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Installation Complete" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your tunnel should now be running:" -ForegroundColor Green
Write-Host "  https://api.aosanctuary.com/v1/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Commands:" -ForegroundColor Green
Write-Host "  View status:   sc query cloudflared" -ForegroundColor Gray
Write-Host "  Start service: net start cloudflared" -ForegroundColor Gray
Write-Host "  Stop service:  net stop cloudflared" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs:" -ForegroundColor Green
Write-Host "  View event logs in Event Viewer (Services)" -ForegroundColor Gray
Write-Host ""
