param(
    [string]$ApiBase = "http://localhost:4000",
    [string]$WebBase = "",
    [string]$Email = "",
    [securestring]$Password,
    [switch]$SkipLogin,
    [switch]$ProvisionWorkspaceUser,
    [string]$GivenName = "",
    [string]$FamilyName = "",
    [ValidateSet("admin", "operations", "front_desk")]
    [string]$AoRole = "front_desk",
    [string[]]$Alias = @(),
    [string]$OrgUnitPath = "/",
    [string]$RecoveryEmail = "",
    [switch]$CreateAoStaffUser,
    [switch]$VerifyRemoteLogs,
    [string]$HostName = "",
    [string]$RemoteContainerName = "ao-os-api",
    [int]$LogWindowMinutes = 10
)

$ErrorActionPreference = "Stop"

function Get-ApiRoot {
    param([string]$Base)

    $trimmed = $Base.TrimEnd("/")
    if ($trimmed.EndsWith("/v1")) {
        return $trimmed
    }

    return "$trimmed/v1"
}

function Get-MaskedEmail {
    param([string]$Value)

    $normalized = $Value.Trim().ToLowerInvariant()
    $parts = $normalized.Split("@")
    if ($parts.Length -ne 2) {
        return $normalized
    }

    $localPart = $parts[0]
    $domain = $parts[1]
    if ($localPart.Length -le 2) {
        return "{0}*@{1}" -f $localPart.Substring(0, 1), $domain
    }

    return "{0}***@{1}" -f $localPart.Substring(0, 2), $domain
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $requestHeaders = @{
        "Accept" = "application/json"
    }

    foreach ($key in $Headers.Keys) {
        $requestHeaders[$key] = $Headers[$key]
    }

    $invokeParams = @{
        Method  = $Method
        Uri     = $Url
        Headers = $requestHeaders
    }

    if ($null -ne $Body) {
        $invokeParams["ContentType"] = "application/json"
        $invokeParams["Body"] = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }

    try {
        $response = Invoke-WebRequest @invokeParams
        $json = $null
        if ($response.Content) {
            try {
                $json = $response.Content | ConvertFrom-Json -Depth 8
            }
            catch {
                $json = $null
            }
        }

        return [pscustomobject]@{
            Ok         = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
            StatusCode = [int]$response.StatusCode
            Json       = $json
            Text       = $response.Content
        }
    }
    catch {
        $statusCode = 0
        $content = ""
        $json = $null

        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $content = $reader.ReadToEnd()
                $reader.Dispose()
            }
            catch {
                $content = ""
            }

            if ($content) {
                try {
                    $json = $content | ConvertFrom-Json -Depth 8
                }
                catch {
                    $json = $null
                }
            }
        }

        return [pscustomobject]@{
            Ok         = $false
            StatusCode = $statusCode
            Json       = $json
            Text       = $content
        }
    }
}

function Assert-Required {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Get-PlainTextSecret {
    param([securestring]$Secret)

    if ($null -eq $Secret) {
        return ""
    }

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Invoke-ProvisionUser {
    param(
        [string]$PrimaryEmail,
        [string]$Given,
        [string]$Family,
        [securestring]$SecretPassword,
        [string[]]$Aliases,
        [string]$Role,
        [string]$OuPath,
        [string]$Recovery,
        [bool]$AlsoCreateAoStaffUser
    )

    $repoRoot = Split-Path -Parent $PSScriptRoot
    $plainPassword = Get-PlainTextSecret $SecretPassword
    $arguments = @(
        "google-workspace:provision-user",
        "--",
        "--primary-email", $PrimaryEmail,
        "--given-name", $Given,
        "--family-name", $Family,
        "--password", $plainPassword,
        "--org-unit-path", $OuPath,
        "--ao-role", $Role
    )

    foreach ($item in $Aliases) {
        if ($item) {
            $arguments += @("--alias", $item)
        }
    }

    if ($Recovery) {
        $arguments += @("--recovery-email", $Recovery)
    }

    if ($AlsoCreateAoStaffUser) {
        $arguments += "--create-ao-staff-user"
    }

    Push-Location $repoRoot
    try {
        & pnpm @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Workspace provisioning command failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Get-RemoteResetLogSummary {
    param(
        [string]$TargetHost,
        [string]$ContainerName,
        [int]$WindowMinutes,
        [string]$MaskedEmail
    )

    $logOutput = ssh -o BatchMode=yes $TargetHost "docker logs --since ${WindowMinutes}m $ContainerName 2>&1"
    if ($LASTEXITCODE -ne 0) {
        throw "Remote log fetch failed for $TargetHost/$ContainerName."
    }

    $lines = @($logOutput)
    $matchingLines = $lines | Where-Object { $_ -match [regex]::Escape($MaskedEmail) }

    $requested = @($matchingLines | Where-Object { $_ -match 'staff_password_reset_requested' })
    $deliveryCompleted = @($matchingLines | Where-Object { $_ -match 'staff_password_reset_delivery_completed' })
    $deliveryFailed = @($matchingLines | Where-Object { $_ -match 'staff_password_reset_delivery_failed' })
    $emailCompleted = @($matchingLines | Where-Object { $_ -match 'email_delivery_completed' -and $_ -match 'staff-password-reset' })
    $emailFailed = @($matchingLines | Where-Object { $_ -match 'email_delivery_failed' -and $_ -match 'staff-password-reset' })

    return [pscustomobject]@{
        RequestedCount         = $requested.Count
        DeliveryCompletedCount = $deliveryCompleted.Count
        DeliveryFailedCount    = $deliveryFailed.Count
        EmailCompletedCount    = $emailCompleted.Count
        EmailFailedCount       = $emailFailed.Count
        RequestedLine          = if ($requested.Count -gt 0) { $requested[-1] } else { $null }
        DeliveryCompletedLine  = if ($deliveryCompleted.Count -gt 0) { $deliveryCompleted[-1] } else { $null }
        DeliveryFailedLine     = if ($deliveryFailed.Count -gt 0) { $deliveryFailed[-1] } else { $null }
        EmailCompletedLine     = if ($emailCompleted.Count -gt 0) { $emailCompleted[-1] } else { $null }
        EmailFailedLine        = if ($emailFailed.Count -gt 0) { $emailFailed[-1] } else { $null }
    }
}

Assert-Required ($Email -ne "") "-Email is required."
Assert-Required ($SkipLogin -or $null -ne $Password) "-Password is required unless -SkipLogin is set."

if ($ProvisionWorkspaceUser) {
    Assert-Required ($GivenName -ne "") "-GivenName is required with -ProvisionWorkspaceUser."
    Assert-Required ($FamilyName -ne "") "-FamilyName is required with -ProvisionWorkspaceUser."
    Assert-Required ($null -ne $Password) "-Password is required with -ProvisionWorkspaceUser."
}

if ($VerifyRemoteLogs) {
    Assert-Required ($HostName -ne "") "-HostName is required with -VerifyRemoteLogs."
}

$apiRoot = Get-ApiRoot $ApiBase
$normalizedEmail = $Email.Trim().ToLowerInvariant()
$plainPassword = Get-PlainTextSecret $Password
$failures = New-Object System.Collections.Generic.List[string]

Write-Host "=== AO OS Staff Login + Reset Smoke ===" -ForegroundColor Cyan
Write-Host "API Root:        $apiRoot"
if ($WebBase) {
    Write-Host "Web Base:         $WebBase"
}
Write-Host "Staff Email:      $normalizedEmail"
if ($VerifyRemoteLogs) {
    Write-Host "Remote Host:      $HostName"
    Write-Host "Remote Container: $RemoteContainerName"
}

if ($ProvisionWorkspaceUser) {
    Write-Host "Provisioning Workspace-backed user..." -ForegroundColor Cyan
    Invoke-ProvisionUser -PrimaryEmail $normalizedEmail -Given $GivenName -Family $FamilyName -SecretPassword $Password -Aliases $Alias -Role $AoRole -OuPath $OrgUnitPath -Recovery $RecoveryEmail -AlsoCreateAoStaffUser $CreateAoStaffUser.IsPresent
}

$health = Invoke-JsonRequest -Method "GET" -Url "$apiRoot/health"
Write-Host ("Health:          {0}" -f $health.StatusCode)
if ($health.StatusCode -ne 200) {
    $failures.Add("API health check failed with status $($health.StatusCode).")
}

if ($WebBase) {
    $webResponse = Invoke-JsonRequest -Method "GET" -Url ($WebBase.TrimEnd("/") + "/login")
    Write-Host ("Web /login:      {0}" -f $webResponse.StatusCode)
    if ($webResponse.StatusCode -ne 200) {
        $failures.Add("Web login route failed with status $($webResponse.StatusCode).")
    }
}

$loginResponse = $null
if (-not $SkipLogin) {
    $loginResponse = Invoke-JsonRequest -Method "POST" -Url "$apiRoot/auth/login" -Body @{ email = $normalizedEmail; password = $plainPassword }
    Write-Host ("Staff login:      {0}" -f $loginResponse.StatusCode)
    if (-not $loginResponse.Ok) {
        $failures.Add("Staff login failed with status $($loginResponse.StatusCode).")
    }
}

$resetResponse = Invoke-JsonRequest -Method "POST" -Url "$apiRoot/auth/staff-password-reset/request" -Body @{ email = $normalizedEmail }
Write-Host ("Reset request:    {0}" -f $resetResponse.StatusCode)
if (@(200, 201) -notcontains $resetResponse.StatusCode) {
    $failures.Add("Staff password reset request failed with status $($resetResponse.StatusCode).")
}

if ($VerifyRemoteLogs) {
    $maskedEmail = Get-MaskedEmail $normalizedEmail
    $summary = Get-RemoteResetLogSummary -TargetHost $HostName -ContainerName $RemoteContainerName -WindowMinutes $LogWindowMinutes -MaskedEmail $maskedEmail

    Write-Host ("Masked email:     {0}" -f $maskedEmail)
    Write-Host ("Reset requested:  {0}" -f $summary.RequestedCount)
    Write-Host ("Reset delivered:  {0}" -f $summary.DeliveryCompletedCount)
    Write-Host ("Email delivered:  {0}" -f $summary.EmailCompletedCount)
    Write-Host ("Reset failed:     {0}" -f $summary.DeliveryFailedCount)
    Write-Host ("Email failed:     {0}" -f $summary.EmailFailedCount)

    if ($summary.RequestedCount -eq 0) {
        $failures.Add("Remote logs did not show staff_password_reset_requested for $maskedEmail in the last $LogWindowMinutes minutes.")
    }

    if (($summary.DeliveryCompletedCount -eq 0) -and ($summary.EmailCompletedCount -eq 0)) {
        $failures.Add("Remote logs did not show successful reset email delivery for $maskedEmail in the last $LogWindowMinutes minutes.")
    }

    if ($summary.DeliveryFailedLine) {
        Write-Host "Latest reset delivery failure:" -ForegroundColor Yellow
        Write-Host $summary.DeliveryFailedLine
    }

    if ($summary.EmailFailedLine) {
        Write-Host "Latest email delivery failure:" -ForegroundColor Yellow
        Write-Host $summary.EmailFailedLine
    }
}

if ($failures.Count -gt 0) {
    Write-Host "=== Smoke failed ===" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "=== Smoke passed ===" -ForegroundColor Green
