param(
    [string]$TunnelName = "ao-os-api",
    [string]$Hostname = "api.aosanctuary.com",
    [string]$CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    [string]$HealthUrl = "https://api.aosanctuary.com/v1/health",
    [int]$HealthTimeoutSeconds = 20,
    [switch]$VerifyHealth,
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
        "-Hostname", '"' + $Hostname + '"',
        "-CloudflaredPath", '"' + $CloudflaredPath + '"',
        "-HealthUrl", '"' + $HealthUrl + '"',
        "-HealthTimeoutSeconds", $HealthTimeoutSeconds
    )

    if ($VerifyHealth) {
        $argList += "-VerifyHealth"
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

function Ensure-DnsRoute {
    Write-Step "Creating or updating Cloudflare DNS route"
    $cmd = "$CloudflaredPath tunnel route dns $TunnelName $Hostname"

    if ($DryRun) {
        Write-Host "[DryRun] $cmd"
        return
    }

    & $CloudflaredPath tunnel route dns $TunnelName $Hostname
}

function Verify-Health {
    Write-Step "Verifying hostname health"

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

    Ensure-DnsRoute

    if ($VerifyHealth) {
        Verify-Health
    }

    Write-Host "`nDone. DNS route setup complete." -ForegroundColor Green
    Write-Host "Tunnel: $TunnelName"
    Write-Host "Hostname: $Hostname"
} catch {
    Write-Host "`nSetup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
