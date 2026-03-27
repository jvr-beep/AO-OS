#!/usr/bin/env pwsh
# Test AO OS Events Polling Endpoint

param(
    [string]$JWT = $(Read-Host "Enter JWT Bearer token"),
    [string]$ApiBase = "http://localhost:4000/v1"
)

Write-Output "═══════════════════════════════════════════"
Write-Output "   AO OS Events Polling - Endpoint Test"
Write-Output "═══════════════════════════════════════════"
Write-Output ""

# Step 1: Check API is running
Write-Output "[1/4] Checking API health..."
try {
    $health = Invoke-WebRequest -Uri "$ApiBase/health" -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Output "  ✓ API is running (HTTP 200)"
    }
} catch {
    Write-Output "  ✗ API not responding. Start it: pnpm --filter api dev"
    exit 1
}

Write-Output ""

# Step 2: Test authentication
Write-Output "[2/4] Testing JWT authentication..."
$headers = @{
    'Authorization' = "Bearer $JWT"
    'Content-Type' = 'application/json'
}

try {
    $testAuth = Invoke-WebRequest -Uri "$ApiBase/staff-audit" `
      -Headers $headers `
      -Method Get `
      -ErrorAction Stop
    
    if ($testAuth.StatusCode -eq 200) {
        Write-Output "  ✓ JWT token is valid (HTTP 200)"
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Output "  ✗ JWT token is invalid or expired (HTTP 401)"
        Write-Output "    Get a fresh token: Log into http://localhost:3000, open Dev Tools → Cookies"
        exit 1
    } else {
        Write-Output "  ✗ Auth test failed: $($_.Exception.Response.StatusCode)"
        exit 1
    }
}

Write-Output ""

# Step 3: Poll events
Write-Output "[3/4] Polling events from API..."
try {
    $poll = Invoke-WebRequest -Uri "$ApiBase/events/poll" `
      -Headers $headers `
      -Method Get `
      -ErrorAction Stop
    
    if ($poll.StatusCode -eq 200) {
        Write-Output "  ✓ Polling endpoint returned 200"
        
        $body = $poll.Content | ConvertFrom-Json
        
        Write-Output ""
        Write-Output "─ Event Summary ─"
        Write-Output "Last Polled: $($body.lastPolledAt)"
        Write-Output ""
        Write-Output "Event Counts:"
        
        $totalEvents = 0
        $body.eventCounts | Get-Member -MemberType NoteProperty | ForEach-Object {
            $type = $_.Name
            $count = $body.eventCounts.$type
            $totalEvents += $count
            if ($count -gt 0) {
                Write-Output "  • $type : $count"
            }
        }
        
        if ($totalEvents -eq 0) {
            Write-Output "  (No events since last poll)"
        } else {
            Write-Output ""
            Write-Output "Total: $totalEvents events"
        }
        
    } else {
        Write-Output "  ✗ Unexpected status: $($poll.StatusCode)"
        exit 1
    }
} catch {
    Write-Output "  ✗ Polling failed: $($_.Exception.Message)"
    exit 1
}

Write-Output ""

# Step 4: Show sample events
if ($body.events.Count -gt 0) {
    Write-Output "[4/4] Sample Events"
    Write-Output "─────────────────"
    
    $body.events | Select-Object -First 3 | ForEach-Object {
        Write-Output ""
        Write-Output "Type: $($_.type)"
        Write-Output "Occurred: $($_.occurredAt)"
        Write-Output "Data: $($_.data | ConvertTo-Json -Compress)"
    }
} else {
    Write-Output "[4/4] No events to display"
}

Write-Output ""
Write-Output "═══════════════════════════════════════════"
Write-Output "✓ Test Complete - API is working!"
Write-Output "═══════════════════════════════════════════"
Write-Output ""
Write-Output "Next: Go to N8N and trigger the workflow manually"
Write-Output "Then check Notion for new entries"
