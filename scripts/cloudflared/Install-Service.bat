@echo off
REM Cloudflared Windows Service Installation Script
REM Run this as Administrator

setlocal enabledelayedexpansion

echo.
echo ============================================
echo Cloudflared Service Installation
echo ============================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

echo [*] Running as Administrator - proceeding...
echo.

REM Check if cloudflared.exe exists
if not exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    echo ERROR: cloudflared.exe not found at C:\Program Files (x86)\cloudflared\
    echo Please install cloudflared first.
    pause
    exit /b 1
)

echo [+] cloudflared.exe found
echo.

REM Check if config exists
if not exist "%USERPROFILE%\.cloudflared\config.yml" (
    echo ERROR: config.yml not found at %USERPROFILE%\.cloudflared\
    echo Please create a config file first.
    pause
    exit /b 1
)

echo [+] config.yml found
echo.

REM Install service
echo [*] Installing cloudflared service...
cd /d "C:\Program Files (x86)\cloudflared"
cloudflared.exe service install
if %errorLevel% neq 0 (
    echo.
    echo WARNING: Service install returned error code %errorLevel%
    echo This may mean the service already exists (which is OK)
    echo.
) else (
    echo [+] Service installed successfully
)

echo.

REM Start service
echo [*] Starting cloudflared service...
net start cloudflared
if %errorLevel% neq 0 (
    echo WARNING: Could not start service (it may already be running)
)

echo.

REM Set to autostart
echo [*] Configuring service for autostart...
sc config cloudflared start=auto >nul 2>&1
if %errorLevel% equ 0 (
    echo [+] Service set to autostart
) else (
    echo WARNING: Could not set autostart
)

echo.

REM Verify service status
echo [*] Checking service status...
sc query cloudflared | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo [+] Service is RUNNING
) else (
    sc query cloudflared | find "STOPPED" >nul 2>&1
    if %errorLevel% equ 0 (
        echo WARNING: Service is STOPPED - it should be running
        echo Try: net start cloudflared
    ) else (
        echo ERROR: Could not determine service status
    )
)

echo.
echo ============================================
echo Installation Complete
echo ============================================
echo.
echo Next steps:
echo - Tunnel should now be running and accessible at:
echo   https://api.aosanctuary.com/v1/health
echo.
echo - To verify: curl.exe -i "https://api.aosanctuary.com/v1/health"
echo.
echo - Service will auto-start on Windows reboot
echo.
echo - To view service status: sc query cloudflared
echo - To stop service: net stop cloudflared
echo - To start service: net start cloudflared
echo.

pause
