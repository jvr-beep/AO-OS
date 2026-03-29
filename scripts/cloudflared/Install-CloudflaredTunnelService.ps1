param(
    [string]$TunnelName = "ao-os-api",
    [string]$CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    [string]$ConfigPath = "$env:USERPROFILE\.cloudflared\config.yml",
    [string]$HealthUrl = "https://api.aosanctuary.com/v1/health",
    [int]$HealthTimeoutSeconds = 20,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Admin {
    if (Test-IsAdmin) {
        return
    }

    if ($DryRun) {
        Write-Host "DryRun: not elevated, showing planned actions without admin rights." -ForegroundColor Yellow
        return
    }

    Write-Host "Relaunching as Administrator..." -ForegroundColor Yellow

    $argList = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", '"' + $PSCommandPath + '"',
        "-TunnelName", '"' + $TunnelName + '"',
        "-CloudflaredPath", '"' + $CloudflaredPath + '"',
        "-ConfigPath", '"' + $ConfigPath + '"',
        "-HealthUrl", '"' + $HealthUrl + '"',
        "-HealthTimeoutSeconds", $HealthTimeoutSeconds
    )

    if ($DryRun) {
        $argList += "-DryRun"
    }

    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList ($argList -join " ") | Out-Null
    exit 0
}

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (-not (Test-Path -Path $Path)) {
        throw "$Label not found at: $Path"
    }
}

function Get-CloudflaredService {
    $svc = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($svc) {
        return $svc
    }

    return Get-Service | Where-Object {
        $_.Name -match "cloudflared" -or $_.DisplayName -match "cloudflared"
    } | Select-Object -First 1
}

function Install-Service {
    Write-Step "Installing cloudflared service"

    if ($DryRun) {
        Write-Host "[DryRun] $CloudflaredPath service install"
        return
    }

    & $CloudflaredPath service install
}

function Start-ServiceIfNeeded {
    Write-Step "Starting cloudflared service"

    $svc = Get-CloudflaredService
    if (-not $svc) {
        if ($DryRun) {
            Write-Host "[DryRun] cloudflared service not found yet (expected before install)."
            Write-Host "[DryRun] Start-Service -Name cloudflared"
            Write-Host "[DryRun] Set-Service -Name cloudflared -StartupType Automatic"
            return
        }
        throw "cloudflared service was not found after install attempt."
    }

    if ($svc.Status -ne "Running") {
        if ($DryRun) {
            Write-Host "[DryRun] Start-Service -Name $($svc.Name)"
        } else {
            Start-Service -Name $svc.Name
        }
    }

    if ($DryRun) {
        Write-Host "[DryRun] Set-Service -Name $($svc.Name) -StartupType Automatic"
    } else {
        Set-Service -Name $svc.Name -StartupType Automatic
    }

    $svc = Get-Service -Name $svc.Name
    Write-Host "Service: $($svc.Name) | Status: $($svc.Status) | StartupType: Automatic"
}

function Test-Health {
    Write-Step "Verifying tunnel health endpoint"

    if ($DryRun) {
        Write-Host "[DryRun] GET $HealthUrl"
        return
    }

    $response = Invoke-WebRequest -Uri $HealthUrl -Method Get -UseBasicParsing -TimeoutSec $HealthTimeoutSeconds
    Write-Host "Health check HTTP status: $($response.StatusCode)"
    Write-Host "Health check body: $($response.Content)"
}

try {
    Ensure-Admin

    Write-Step "Validating prerequisites"
    Assert-FileExists -Path $CloudflaredPath -Label "cloudflared executable"
    Assert-FileExists -Path $ConfigPath -Label "cloudflared config"

    Install-Service
    Start-ServiceIfNeeded
    Test-Health

    Write-Host "`nDone. Cloudflared tunnel service setup complete." -ForegroundColor Green
    Write-Host "Tunnel target: $TunnelName"
    Write-Host "Health URL: $HealthUrl"
} catch {
    Write-Host "`nSetup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
