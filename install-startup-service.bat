@echo off
:: Administrative script to install Command Dispatcher Client as startup service
:: Run this as Administrator to set up automatic startup

echo.
echo ==========================================
echo   Command Dispatcher Client Installer
echo ==========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

set INSTALL_DIR=C:\CommandDispatcher
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo [1/5] Creating installation directory...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    mkdir "%INSTALL_DIR%\Logs"
    echo     Created: %INSTALL_DIR%
) else (
    echo     Directory already exists: %INSTALL_DIR%
)

echo.
echo [2/5] Copying client files...
copy "start-hidden-client.vbs" "%INSTALL_DIR%\start-hidden-client.vbs" >nul
copy "client-config.txt" "%INSTALL_DIR%\client-config.txt" >nul
echo     Files copied to %INSTALL_DIR%

echo.
echo [3/5] Setting up Windows Startup integration...

:: Method 1: Startup folder (runs when user logs in)
copy "%INSTALL_DIR%\start-hidden-client.vbs" "%STARTUP_DIR%\CommandDispatcher.vbs" >nul
echo     Added to user startup folder

:: Method 2: Registry entry (alternative method)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "CommandDispatcher" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\start-hidden-client.vbs\"" /f >nul
echo     Added to registry startup

echo.
echo [4/5] Creating uninstaller...
(
echo @echo off
echo echo Removing Command Dispatcher Client...
echo taskkill /f /im wscript.exe /fi "WINDOWTITLE eq start-hidden-client.vbs*" ^>nul 2^>^&1
echo del "%STARTUP_DIR%\CommandDispatcher.vbs" ^>nul 2^>^&1
echo reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "CommandDispatcher" /f ^>nul 2^>^&1
echo rd /s /q "%INSTALL_DIR%" ^>nul 2^>^&1
echo echo Command Dispatcher Client has been removed.
echo pause
) > "%INSTALL_DIR%\uninstall.bat"
echo     Created: %INSTALL_DIR%\uninstall.bat

echo.
echo [5/5] Configuration setup...
echo.
echo Current configuration in %INSTALL_DIR%\client-config.txt:

:: Show current config
type "%INSTALL_DIR%\client-config.txt" | findstr /v "^#" | findstr /v "^$"

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo The Command Dispatcher Client will now:
echo   * Start automatically when Windows boots
echo   * Run completely hidden (no visible windows)
echo   * Log activity to: %INSTALL_DIR%\Logs\
echo   * Use configuration from: %INSTALL_DIR%\client-config.txt
echo.
echo To modify settings:
echo   1. Edit: %INSTALL_DIR%\client-config.txt
echo   2. Restart the computer or run: %INSTALL_DIR%\start-hidden-client.vbs
echo.
echo To uninstall:
echo   Run: %INSTALL_DIR%\uninstall.bat
echo.
echo To view logs:
echo   Check: %INSTALL_DIR%\Logs\
echo.

:: Offer to start immediately
set /p START_NOW="Start the client now? (y/n): "
if /i "%START_NOW%"=="y" (
    echo.
    echo Starting Command Dispatcher Client...
    wscript.exe "%INSTALL_DIR%\start-hidden-client.vbs"
    echo Client started in background mode.
    echo Check logs in %INSTALL_DIR%\Logs\ for status.
)

echo.
echo Press any key to exit...
pause >nul