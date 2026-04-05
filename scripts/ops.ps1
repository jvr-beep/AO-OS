# AO-OS Unified Ops Menu
# Usage:
#   .\scripts\ops.ps1              — interactive menu
#   .\scripts\ops.ps1 -Action status — run status check directly

param(
  [string]$Action = ""
)

# ---------------------------------------------------------------------------
# Load env vars from root .env if present
# ---------------------------------------------------------------------------
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*)\s*$') {
      $name  = $Matches[1].Trim()
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      if (-not [System.Environment]::GetEnvironmentVariable($name)) {
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
      }
    }
  }
}

$API_BASE = if ($env:AO_API_BASE) { $env:AO_API_BASE } else { "http://localhost:4000" }
$TUNNEL_URL = if ($env:CLOUDFLARE_TUNNEL_URL) { $env:CLOUDFLARE_TUNNEL_URL } else { "https://api.aosanctuary.com/v1/health" }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Header {
  param([string]$Title)
  Write-Host ""
  Write-Host "======================================" -ForegroundColor Cyan
  Write-Host "  $Title" -ForegroundColor Cyan
  Write-Host "======================================" -ForegroundColor Cyan
}

function Invoke-SafeWeb {
  param([string]$Url, [int]$TimeoutSec = 8)
  try {
    $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    return [PSCustomObject]@{ Ok = $true; Status = $resp.StatusCode; Body = $resp.Content }
  } catch {
    return [PSCustomObject]@{ Ok = $false; Status = 0; Body = $_.Exception.Message }
  }
}

function Require-Command {
  param([string]$Cmd)
  if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
    Write-Host "  [!] '$Cmd' not found in PATH. Install it first." -ForegroundColor Yellow
    return $false
  }
  return $true
}

# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------
function Invoke-Status {
  Write-Header "AO-OS Status Check"

  # Local API
  Write-Host "`n[1] Local API ($API_BASE/v1/health)" -ForegroundColor White
  $local = Invoke-SafeWeb "$API_BASE/v1/health"
  if ($local.Ok) {
    Write-Host "  OK  HTTP $($local.Status)" -ForegroundColor Green
  } else {
    Write-Host "  DOWN  $($local.Body)" -ForegroundColor Red
  }

  # Cloudflare tunnel
  Write-Host "`n[2] Cloudflare Tunnel ($TUNNEL_URL)" -ForegroundColor White
  $tunnel = Invoke-SafeWeb $TUNNEL_URL
  if ($tunnel.Ok) {
    Write-Host "  OK  HTTP $($tunnel.Status)" -ForegroundColor Green
  } else {
    Write-Host "  DOWN  $($tunnel.Body)" -ForegroundColor Red
  }

  # Vercel last deployment
  Write-Host "`n[3] Vercel Last Deployment" -ForegroundColor White
  if ($env:VERCEL_TOKEN -and $env:VERCEL_PROJECT_ID) {
    $headers = @{ Authorization = "Bearer $env:VERCEL_TOKEN" }
    try {
      $vResp = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v6/deployments?projectId=$env:VERCEL_PROJECT_ID&limit=1&teamId=$env:VERCEL_ORG_ID" `
        -Headers $headers -TimeoutSec 10
      $dep = $vResp.deployments[0]
      if ($dep) {
        $state = $dep.state
        $color = if ($state -eq "READY") { "Green" } elseif ($state -eq "ERROR") { "Red" } else { "Yellow" }
        Write-Host "  $state  $($dep.url)  (created $(([DateTimeOffset]::FromUnixTimeMilliseconds($dep.createdAt)).LocalDateTime))" -ForegroundColor $color
      } else {
        Write-Host "  No deployments found." -ForegroundColor Yellow
      }
    } catch {
      Write-Host "  ERROR querying Vercel API: $_" -ForegroundColor Red
    }
  } else {
    Write-Host "  Skipped — set VERCEL_TOKEN and VERCEL_PROJECT_ID in .env" -ForegroundColor Yellow
  }

  # GCP VM status
  Write-Host "`n[4] GCP VM Status" -ForegroundColor White
  if ((Require-Command "gcloud") -and $env:GCP_PROJECT -and $env:GCP_INSTANCE -and $env:GCP_ZONE) {
    $vmStatus = gcloud compute instances describe $env:GCP_INSTANCE `
      --project=$env:GCP_PROJECT `
      --zone=$env:GCP_ZONE `
      --format="value(status)" 2>&1
    $color = if ($vmStatus -eq "RUNNING") { "Green" } elseif ($vmStatus -eq "TERMINATED") { "Red" } else { "Yellow" }
    Write-Host "  $vmStatus" -ForegroundColor $color
  } else {
    Write-Host "  Skipped — set GCP_PROJECT, GCP_INSTANCE, GCP_ZONE in .env (and install gcloud CLI)" -ForegroundColor Yellow
  }

  Write-Host ""
}

function Invoke-CloudflareMenu {
  Write-Header "Cloudflare"
  Write-Host "  1) Show tunnel status"
  Write-Host "  2) Start tunnel (cloudflared tunnel run ao-os-api)"
  Write-Host "  3) List tunnels"
  Write-Host "  4) Open Cloudflare dashboard in browser"
  Write-Host "  B) Back"
  $choice = Read-Host "`nChoice"
  switch ($choice.ToUpper()) {
    "1" {
      if (Require-Command "cloudflared") { cloudflared tunnel info ao-os-api }
    }
    "2" {
      if (Require-Command "cloudflared") { cloudflared tunnel run ao-os-api }
    }
    "3" {
      if (Require-Command "cloudflared") { cloudflared tunnel list }
    }
    "4" { Start-Process "https://dash.cloudflare.com" }
    default { return }
  }
}

function Invoke-VercelMenu {
  Write-Header "Vercel"
  Write-Host "  1) Deploy frontend to production"
  Write-Host "  2) List recent deployments"
  Write-Host "  3) View deployment logs (latest)"
  Write-Host "  4) Open Vercel dashboard in browser"
  Write-Host "  B) Back"
  $choice = Read-Host "`nChoice"
  $webDir = Join-Path $PSScriptRoot ".." "apps" "web"
  switch ($choice.ToUpper()) {
    "1" {
      if (Require-Command "vercel") {
        Push-Location $webDir
        vercel --prod
        Pop-Location
      }
    }
    "2" {
      if (Require-Command "vercel") {
        Push-Location $webDir
        vercel ls
        Pop-Location
      }
    }
    "3" {
      if (Require-Command "vercel") {
        Push-Location $webDir
        $latest = vercel ls --json 2>$null | ConvertFrom-Json | Select-Object -First 1
        if ($latest) { vercel logs $latest.url } else { vercel logs }
        Pop-Location
      }
    }
    "4" { Start-Process "https://vercel.com/dashboard" }
    default { return }
  }
}

function Invoke-GcpMenu {
  Write-Header "GCP"
  if (-not (Require-Command "gcloud")) { return }
  Write-Host "  1) SSH into VM"
  Write-Host "  2) Start VM"
  Write-Host "  3) Stop VM"
  Write-Host "  4) Show VM status"
  Write-Host "  5) Open GCP Console in browser"
  Write-Host "  B) Back"
  $choice = Read-Host "`nChoice"
  $proj  = $env:GCP_PROJECT
  $zone  = $env:GCP_ZONE
  $inst  = $env:GCP_INSTANCE
  switch ($choice.ToUpper()) {
    "1" { ssh ao-os-api-gcp }
    "2" {
      if ($proj -and $zone -and $inst) {
        gcloud compute instances start $inst --project=$proj --zone=$zone
      } else {
        Write-Host "  Set GCP_PROJECT, GCP_ZONE, GCP_INSTANCE in .env" -ForegroundColor Yellow
      }
    }
    "3" {
      if ($proj -and $zone -and $inst) {
        gcloud compute instances stop $inst --project=$proj --zone=$zone
      } else {
        Write-Host "  Set GCP_PROJECT, GCP_ZONE, GCP_INSTANCE in .env" -ForegroundColor Yellow
      }
    }
    "4" {
      if ($proj -and $zone -and $inst) {
        gcloud compute instances describe $inst --project=$proj --zone=$zone --format="table(name,status,networkInterfaces[0].accessConfigs[0].natIP)"
      } else {
        Write-Host "  Set GCP_PROJECT, GCP_ZONE, GCP_INSTANCE in .env" -ForegroundColor Yellow
      }
    }
    "5" { Start-Process "https://console.cloud.google.com" }
    default { return }
  }
}

function Invoke-ApiMenu {
  Write-Header "Local API"
  Write-Host "  1) Start API (dev watch)"
  Write-Host "  2) Build API"
  Write-Host "  3) Run DB migration (migrate dev)"
  Write-Host "  4) Seed database"
  Write-Host "  5) Run smoke tests"
  Write-Host "  6) Run integration tests"
  Write-Host "  B) Back"
  $choice = Read-Host "`nChoice"
  $root = Join-Path $PSScriptRoot ".."
  switch ($choice.ToUpper()) {
    "1" { Push-Location $root; pnpm --filter api dev; Pop-Location }
    "2" { Push-Location $root; pnpm --filter api build; Pop-Location }
    "3" { Push-Location $root; pnpm prisma:migrate-dev; Pop-Location }
    "4" { Push-Location $root; pnpm prisma:seed; Pop-Location }
    "5" { Push-Location $root; pnpm smoke:locker-policy; Pop-Location }
    "6" { Push-Location $root; pnpm --filter api test:int; Pop-Location }
    default { return }
  }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if ($Action -eq "status") {
  Invoke-Status
  exit 0
}

do {
  Write-Header "AO-OS Ops Menu"
  Write-Host "  1) Cloudflare"
  Write-Host "  2) Vercel"
  Write-Host "  3) GCP"
  Write-Host "  4) Local API"
  Write-Host "  5) Status Check"
  Write-Host "  Q) Quit"
  $main = Read-Host "`nChoice"
  switch ($main.ToUpper()) {
    "1" { Invoke-CloudflareMenu }
    "2" { Invoke-VercelMenu }
    "3" { Invoke-GcpMenu }
    "4" { Invoke-ApiMenu }
    "5" { Invoke-Status }
    "Q" { break }
    default { Write-Host "  Unknown option." -ForegroundColor Yellow }
  }
} while ($main.ToUpper() -ne "Q")
