#!/usr/bin/env pwsh
# Test AO OS Events Polling Endpoint

param(
    [string]$JWT = $(Read-Host "Enter JWT Bearer token"),
    [string]$ApiBase = "http://localhost:4000/v1"
)

$ErrorActionPreference = "Stop"

Write-Output "==========================================="
Write-Output "   AO OS Events Polling - Endpoint Test"
Write-Output "==========================================="
Write-Output ""

Write-Output "[1/4] Checking API health..."
try {
    $health = Invoke-WebRequest -Uri "$ApiBase/health" -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Output "  OK API is running (HTTP 200)"
    }
}
catch {
    Write-Output "  FAIL API not responding. Start it with: pnpm --filter api dev"
    exit 1
}

Write-Output ""
Write-Output "[2/4] Testing JWT authentication..."
$headers = @{
    Authorization  = "Bearer $JWT"
    "Content-Type" = "application/json"
}

try {
    $testAuth = Invoke-WebRequest -Uri "$ApiBase/staff-audit" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    if ($testAuth.StatusCode -eq 200) {
        Write-Output "  OK JWT token is valid (HTTP 200)"
    }
}
catch {
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    if ($statusCode -eq 401) {
        Write-Output "  FAIL JWT token is invalid or expired (HTTP 401)"
        Write-Output "  Get a fresh token from the staff login flow and retry."
        exit 1
    }

    Write-Output "  FAIL Auth test failed: $statusCode"
    exit 1
}

Write-Output ""
Write-Output "[3/4] Polling events from API..."
$body = $null

try {
    $poll = Invoke-WebRequest -Uri "$ApiBase/events/poll" -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
    if ($poll.StatusCode -ne 200) {
        Write-Output "  FAIL Unexpected status: $($poll.StatusCode)"
        exit 1
    }

    Write-Output "  OK Polling endpoint returned 200"
    $body = $poll.Content | ConvertFrom-Json

    Write-Output ""
    Write-Output "Event Summary"
    Write-Output "Last Polled: $($body.lastPolledAt)"
    Write-Output ""
    Write-Output "Event Counts:"

    $totalEvents = 0
    foreach ($property in $body.eventCounts.PSObject.Properties) {
        $count = [int]$property.Value
        $totalEvents += $count
        if ($count -gt 0) {
            Write-Output "  $($property.Name) : $count"
        }
    }

    if ($totalEvents -eq 0) {
        Write-Output "  (No events since last poll)"
    }
    else {
        Write-Output ""
        Write-Output "Total: $totalEvents events"
    }
}
catch {
    Write-Output "  FAIL Polling failed: $($_.Exception.Message)"
    exit 1
}

Write-Output ""
if ($body -and @($body.events).Count -gt 0) {
    Write-Output "[4/4] Sample Events"
    Write-Output "-------------------"

    $body.events | Select-Object -First 3 | ForEach-Object {
        Write-Output ""
        Write-Output "Type: $($_.type)"
        Write-Output "Occurred: $($_.occurredAt)"
        Write-Output "Data: $($_.data | ConvertTo-Json -Compress)"
    }
}
else {
    Write-Output "[4/4] No events to display"
}

Write-Output ""
Write-Output "==========================================="
Write-Output "OK Test complete - API is working"
Write-Output "==========================================="
Write-Output ""
Write-Output "Next: Trigger the n8n workflow manually."
Write-Output "Then check Notion for new entries."
