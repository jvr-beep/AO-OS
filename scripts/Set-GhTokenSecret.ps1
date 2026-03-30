[CmdletBinding()]
param(
  [string]$SecretName = "GH_TOKEN",
  [string]$Repository
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Parse-RepositoryFromRemote {
  param([string]$RemoteUrl)

  if ($RemoteUrl -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
    return "$($Matches.owner)/$($Matches.repo)"
  }

  throw "Could not parse owner/repo from remote URL: $RemoteUrl"
}

function ConvertTo-PlainText {
  param([Security.SecureString]$Secure)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Protect-SecretWithSodium {
  param(
    [string]$PublicKey,
    [string]$SecretPlain
  )

  $nodeExe = Get-Command node -ErrorAction SilentlyContinue
  $npxExe = Get-Command npx -ErrorAction SilentlyContinue

  if (-not $nodeExe -or -not $npxExe) {
    throw "Node.js and npx are required for REST fallback encryption. Install GitHub CLI (gh) or Node.js and retry."
  }

  $tempScript = Join-Path $env:TEMP ("gh-secret-encrypt-" + [Guid]::NewGuid().ToString() + ".mjs")
  $nodeSource = @'
import fs from "node:fs";
import sodium from "libsodium-wrappers";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
await sodium.ready;

const publicKey = sodium.from_base64(input.key, sodium.base64_variants.ORIGINAL);
const message = sodium.from_string(input.secret);
const encrypted = sodium.crypto_box_seal(message, publicKey);

process.stdout.write(
  sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL)
);
'@

  Set-Content -Path $tempScript -Value $nodeSource -Encoding UTF8 -NoNewline

  try {
    $inputJson = @{ key = $PublicKey; secret = $SecretPlain } | ConvertTo-Json -Compress
    $encrypted = $inputJson | & npx -y -p libsodium-wrappers node $tempScript 2>$null

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($encrypted)) {
      throw "Failed to encrypt secret with libsodium fallback. Install GitHub CLI (gh) and retry."
    }

    return $encrypted.Trim()
  }
  finally {
    Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue
  }
}

if (-not $Repository) {
  $remoteUrl = git remote get-url origin 2>$null
  if (-not $remoteUrl) {
    throw "Could not detect git origin remote. Run this script inside a git repo or pass -Repository owner/repo."
  }
  $Repository = Parse-RepositoryFromRemote -RemoteUrl $remoteUrl
}

Write-Host "Repository detected: $Repository"

$secureToken = Read-Host "Paste GitHub PAT" -AsSecureString
$plainToken = ConvertTo-PlainText -Secure $secureToken
$plainBytes = [Text.Encoding]::UTF8.GetBytes($plainToken)
$env:GH_TOKEN = $plainToken

Write-Host ("Token captured: *** (length {0})" -f $plainToken.Length)

try {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    Write-Host "Trying GitHub CLI first..."
    $plainToken | & gh secret set $SecretName --repo $Repository

    if ($LASTEXITCODE -eq 0) {
      Write-Host "Secret '$SecretName' set successfully via GitHub CLI."
      return
    }

    Write-Warning "GitHub CLI path failed. Falling back to GitHub REST API."
  }

  $parts = $Repository.Split("/", 2)
  if ($parts.Length -ne 2) {
    throw "Repository must be in owner/repo format."
  }

  $owner = $parts[0]
  $repo = $parts[1]
  $headers = @{
    Authorization          = "Bearer $plainToken"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
  }

  Write-Host "Fetching repository public key for secret encryption..."
  $publicKeyResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/actions/secrets/public-key" -Method GET -Headers $headers

  $encryptedValue = Protect-SecretWithSodium -PublicKey $publicKeyResponse.key -SecretPlain $plainToken

  $secretBody = @{
    encrypted_value = $encryptedValue
    key_id          = $publicKeyResponse.key_id
  } | ConvertTo-Json -Compress

  Write-Host "Uploading encrypted secret via REST API..."
  Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/actions/secrets/$SecretName" -Method PUT -Headers $headers -ContentType "application/json" -Body $secretBody | Out-Null

  Write-Host "Secret '$SecretName' set successfully via GitHub REST API."
}
catch {
  Write-Error $_
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Install GitHub CLI and retry: https://cli.github.com/"
  }
  throw
}
finally {
  if ($null -ne $plainBytes) {
    [Array]::Clear($plainBytes, 0, $plainBytes.Length)
  }

  $plainToken = ""
  Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
}
