#!/usr/bin/env pwsh
# Register the GH_TOKEN GitHub Actions secret for this repository.
#
# Usage (interactive):
#   ./scripts/Set-GhTokenSecret.ps1
#
# Usage (non-interactive / CI):
#   ./scripts/Set-GhTokenSecret.ps1 -Token $env:MY_PAT -Owner jvr-beep -Repo AO-OS
#
# The script tries 'gh secret set' first (GitHub CLI).
# If gh is not installed it falls back to the GitHub REST API using the
# supplied token as a management credential (-ManagementToken).

param(
    [SecureString]$Token,

    [string]$Owner,

    [string]$Repo,

    # Only required for the REST-API fallback path when gh CLI is not installed.
    # Must have 'repo' scope or 'admin:org' for org-level secrets.
    [SecureString]$ManagementToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function ConvertFrom-SecureStringPlain {
    param([Parameter(Mandatory)][SecureString]$Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Resolve-Repo {
    # Try to derive owner/repo from the git remote when not supplied.
    param([string]$Owner, [string]$Repo)

    if ($Owner -and $Repo) {
        return $Owner, $Repo
    }

    try {
        $remote = git remote get-url origin 2>$null
        if ($remote -match 'github\.com[:/]([^/]+)/([^/\.]+)') {
            if (-not $Owner) { $Owner = $Matches[1] }
            if (-not $Repo)  { $Repo  = $Matches[2] -replace '\.git$', '' }
        }
    } catch { }

    if (-not $Owner -or -not $Repo) {
        throw "Could not detect owner/repo from git remote. Pass -Owner and -Repo explicitly."
    }

    return $Owner, $Repo
}

# ---------------------------------------------------------------------------
# Resolve repository coordinates
# ---------------------------------------------------------------------------

$Owner, $Repo = Resolve-Repo -Owner $Owner -Repo $Repo
Write-Host "Repository : $Owner/$Repo" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Read the PAT to store
# ---------------------------------------------------------------------------

if (-not $Token) {
    $Token = Read-Host "GitHub Personal Access Token (needs 'repo' scope)" -AsSecureString
}

$plain = ConvertFrom-SecureStringPlain -Secure $Token
Write-Host "Token      : *** (length $($plain.Length))" -ForegroundColor Gray

# ---------------------------------------------------------------------------
# Attempt gh CLI first
# ---------------------------------------------------------------------------

$ghAvailable = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)

if ($ghAvailable) {
    Write-Host "Using gh CLI ..." -ForegroundColor Cyan

    $env:GH_TOKEN = $plain          # gh reads this for its own auth
    try {
        $plain | gh secret set GH_TOKEN --repo "$Owner/$Repo"
        Write-Host "GH_TOKEN secret registered via gh CLI." -ForegroundColor Green
    } finally {
        Remove-Item Env:\GH_TOKEN -ErrorAction SilentlyContinue
    }
    return
}

# ---------------------------------------------------------------------------
# Fallback: GitHub REST API (libsodium public-key encryption)
# ---------------------------------------------------------------------------

Write-Host "gh CLI not found — using GitHub REST API." -ForegroundColor Yellow

if (-not $ManagementToken) {
    Write-Host ""
    Write-Host "The REST API path requires a second token that has permission to manage" -ForegroundColor Yellow
    Write-Host "repository secrets (the same 'repo'-scoped PAT is fine)." -ForegroundColor Yellow
    $ManagementToken = Read-Host "Management token (press Enter to reuse the same token)" -AsSecureString
    $mgmtPlain = ConvertFrom-SecureStringPlain -Secure $ManagementToken
    if ([string]::IsNullOrWhiteSpace($mgmtPlain)) {
        $mgmtPlain = $plain     # reuse the token being registered
    }
} else {
    $mgmtPlain = ConvertFrom-SecureStringPlain -Secure $ManagementToken
}

$headers = @{
    Authorization = "Bearer $mgmtPlain"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# Step 1 – fetch the repository's public key for secret encryption
Write-Host "Fetching repository public key ..." -ForegroundColor Cyan
$keyResp = Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$Owner/$Repo/actions/secrets/public-key" `
    -Headers $headers `
    -Method Get

$keyId    = $keyResp.key_id
$pubKeyB64 = $keyResp.key

# Step 2 – encrypt the secret value with the public key (libsodium sealed box).
# PowerShell does not ship with libsodium, so we use a small inline C# shim via
# the NuGet-distributed Sodium.Core assembly when available, or request the user
# installs the GitHub CLI instead.

$sodiumAvailable = $false
try {
    Add-Type -AssemblyName "Sodium.Core" -ErrorAction Stop
    $sodiumAvailable = $true
} catch { }

if (-not $sodiumAvailable) {
    # Try loading from common NuGet cache paths
    $nugetPaths = @(
        "$env:USERPROFILE\.nuget\packages\sodium.core\*\lib\net*\Sodium.dll",
        "$env:HOME\.nuget\packages\sodium.core\*\lib\net*\Sodium.dll"
    )
    foreach ($glob in $nugetPaths) {
        $dll = Get-Item -Path $glob -ErrorAction SilentlyContinue | Select-Object -Last 1
        if ($dll) {
            Add-Type -Path $dll.FullName -ErrorAction SilentlyContinue
            if ([type]::GetType("Sodium.SealedPublicKeyBox")) {
                $sodiumAvailable = $true
                break
            }
        }
    }
}

if (-not $sodiumAvailable) {
    Write-Host ""
    Write-Host "NOTICE: Sodium.Core assembly not found. Cannot encrypt the secret locally." -ForegroundColor Yellow
    Write-Host "Please install the GitHub CLI (winget install GitHub.cli) and re-run this" -ForegroundColor Yellow
    Write-Host "script — it will use 'gh secret set' which handles encryption automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "GitHub CLI install: https://cli.github.com" -ForegroundColor Cyan
    exit 1
}

$secretBytes = [Text.Encoding]::UTF8.GetBytes($plain)
$pubKeyBytes = [Convert]::FromBase64String($pubKeyB64)
$encrypted   = [Sodium.SealedPublicKeyBox]::Create($secretBytes, $pubKeyBytes)
[Array]::Clear($secretBytes, 0, $secretBytes.Length)   # zero sensitive bytes
$encryptedB64 = [Convert]::ToBase64String($encrypted)

# Step 3 – upload the encrypted secret
Write-Host "Uploading encrypted secret ..." -ForegroundColor Cyan
$body = ConvertTo-Json @{
    encrypted_value = $encryptedB64
    key_id          = $keyId
}

Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$Owner/$Repo/actions/secrets/GH_TOKEN" `
    -Headers $headers `
    -Method Put `
    -Body $body `
    -ContentType "application/json" | Out-Null

Write-Host "GH_TOKEN secret registered via REST API." -ForegroundColor Green
