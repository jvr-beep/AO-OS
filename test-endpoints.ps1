#!/usr/bin/env pwsh

# Test AO OS Member Identity + Auth Endpoints
# Requires API running on http://localhost:4000

$apiBase = "http://localhost:4000"
$staffEmail = "staff@ao-os.local"
$staffPassword = "TestPassword123!"

Write-Host "=== Testing AO OS Member Identity + Auth Endpoints ===" -f Cyan
Write-Host "API: $apiBase" -f Gray
Write-Host ""

# 1. Login as staff user to get JWT
Write-Host "[1] LOGIN (staff)" -f Yellow
try {
    $loginRes = Invoke-WebRequest -Uri "$apiBase/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -UseBasicParsing `
        -Body (ConvertTo-Json @{
            email = $staffEmail
            password = $staffPassword
        })
    
    $loginData = $loginRes.Content | ConvertFrom-Json
    $jwt = $loginData.accessToken
    
    Write-Host "OK - Got JWT token" -f Green
    Write-Host "    Token: $($jwt.Substring(0, 20))..." -f Gray
} catch {
    Write-Host "FAILED - Login failed: $_" -f Red
    exit 1
}

# 2. Create Anonymous Member (walk-in)
Write-Host ""
Write-Host "[2] CREATE ANONYMOUS MEMBER (walk-in)" -f Yellow
try {
    $anonRes = Invoke-WebRequest -Uri "$apiBase/v1/identity/members/anonymous" `
        -Method POST `
        -ContentType "application/json" `
        -UseBasicParsing `
        -Headers @{ Authorization = "Bearer $jwt" } `
        -Body (ConvertTo-Json @{
            alias = "BlueFox"
        })
    
    $anonData = $anonRes.Content | ConvertFrom-Json
    Write-Host "OK - Created anonymous member" -f Green
    Write-Host "    ID: $($anonData.id)" -f Gray
    Write-Host "    Alias: $($anonData.alias)" -f Gray
    Write-Host "    Type: $($anonData.type)" -f Gray
} catch {
    Write-Host "FAILED - Create anonymous member failed: $_" -f Red
    exit 1
}

# 3. Create Registered Member (admin invite)
Write-Host ""
Write-Host "[3] CREATE REGISTERED MEMBER (admin invite)" -f Yellow
$testEmail = "newuser-$(Get-Random)@test.local"
try {
    $regRes = Invoke-WebRequest -Uri "$apiBase/v1/identity/members/registered" `
        -Method POST `
        -ContentType "application/json" `
        -UseBasicParsing `
        -Headers @{ Authorization = "Bearer $jwt" } `
        -Body (ConvertTo-Json @{
            email = $testEmail
            displayName = "Test User"
        })
    
    $regData = $regRes.Content | ConvertFrom-Json
    Write-Host "OK - Created registered member (invite sent)" -f Green
    Write-Host "    ID: $($regData.id)" -f Gray
    Write-Host "    Email: $($regData.email)" -f Gray
    Write-Host "    Status: $($regData.status)" -f Gray
} catch {
    Write-Host "FAILED - Create registered member failed: $_" -f Red
    exit 1
}

# 4. Self-Serve Signup
Write-Host ""
Write-Host "[4] SELF-SERVE SIGNUP" -f Yellow
$signupEmail = "signup-$(Get-Random)@test.local"
try {
    $signupRes = Invoke-WebRequest -Uri "$apiBase/v1/auth/signup" `
        -Method POST `
        -ContentType "application/json" `
        -UseBasicParsing `
        -Body (ConvertTo-Json @{
            email = $signupEmail
            password = "SecurePassword123!"
        })
    
    $signupData = $signupRes.Content | ConvertFrom-Json
    Write-Host "OK - Signed up (verification email sent)" -f Green
    Write-Host "    Email: $($signupData.email)" -f Gray
} catch {
    Write-Host "FAILED - Signup failed: $_" -f Red
    exit 1
}

# 5. Password Reset Request (non-enumerable)
Write-Host ""
Write-Host "[5] PASSWORD RESET REQUEST" -f Yellow
try {
    $resetRes = Invoke-WebRequest -Uri "$apiBase/v1/auth/password-reset/request" `
        -Method POST `
        -ContentType "application/json" `
        -UseBasicParsing `
        -Body (ConvertTo-Json @{
            email = $signupEmail
        })
    
    Write-Host "OK - Reset email sent (non-enumerable flow)" -f Green
} catch {
    Write-Host "FAILED - Password reset request failed: $_" -f Red
    exit 1
}

Write-Host ""
Write-Host "===== All endpoint tests passed! =====" -f Green
