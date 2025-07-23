@echo off
:: Administrative script to install Command Dispatcher Client as startup service
:: Run this as Administrator to set up automatic startup
:: This script can be run from anywhere (desktop, USB drive, etc.)

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

:: Get the directory where this installer is located
set SOURCE_DIR=%~dp0
set INSTALL_DIR=C:\CommandDispatcher
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo Source directory: %SOURCE_DIR%
echo Installation target: %INSTALL_DIR%
echo.

:: Check if required files exist in source directory
echo [1/6] Checking required files...
set MISSING_FILES=0

if not exist "%SOURCE_DIR%start-hidden-client.vbs" (
    echo     ERROR: start-hidden-client.vbs not found in %SOURCE_DIR%
    set MISSING_FILES=1
)

if not exist "%SOURCE_DIR%client-config.txt" (
    echo     ERROR: client-config.txt not found in %SOURCE_DIR%
    set MISSING_FILES=1
)

if %MISSING_FILES%==1 (
    echo.
    echo ERROR: Required files are missing from source directory.
    echo Please ensure the following files are in the same folder as this installer:
    echo   - start-hidden-client.vbs
    echo   - client-config.txt
    pause
    exit /b 1
)

echo     All required files found in source directory

echo.
echo [2/6] Creating installation directory...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%" 2>nul
    if %errorlevel% neq 0 (
        echo     ERROR: Cannot create %INSTALL_DIR%
        pause
        exit /b 1
    )
    echo     Created: %INSTALL_DIR%
) else (
    echo     Directory already exists: %INSTALL_DIR%
)

if not exist "%INSTALL_DIR%\Logs" (
    mkdir "%INSTALL_DIR%\Logs" 2>nul
    echo     Created: %INSTALL_DIR%\Logs
) else (
    echo     Logs directory already exists
)

echo.
echo [3/6] Copying client files...
copy "%SOURCE_DIR%start-hidden-client.vbs" "%INSTALL_DIR%\start-hidden-client.vbs" >nul
if %errorlevel% neq 0 (
    echo     ERROR: Failed to copy start-hidden-client.vbs
    pause
    exit /b 1
)

copy "%SOURCE_DIR%client-config.txt" "%INSTALL_DIR%\client-config.txt" >nul
if %errorlevel% neq 0 (
    echo     ERROR: Failed to copy client-config.txt
    pause
    exit /b 1
)

echo     Files copied successfully to %INSTALL_DIR%

echo.
echo [4/6] Setting up Windows Startup integration...

:: Method 1: Startup folder (runs when user logs in)
copy "%INSTALL_DIR%\start-hidden-client.vbs" "%STARTUP_DIR%\CommandDispatcher.vbs" >nul
if %errorlevel% neq 0 (
    echo     WARNING: Failed to copy to startup folder
) else (
    echo     Added to user startup folder
)

:: Method 2: Registry entry (alternative method)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "CommandDispatcher" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\start-hidden-client.vbs\"" /f >nul 2>&1
if %errorlevel% neq 0 (
    echo     WARNING: Failed to add registry entry
) else (
    echo     Added to registry startup
)

echo.
echo [5/6] Creating uninstaller...
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
echo [6/6] Testing and starting client...

:: Show current configuration
echo Current configuration:
type "%INSTALL_DIR%\client-config.txt" | findstr /v "^#" | findstr /v "^$"
echo.

:: Test if VBScript can run
echo Testing VBScript execution...
wscript.exe //NoLogo "%INSTALL_DIR%\start-hidden-client.vbs" &

:: Wait a moment for it to start
timeout /t 3 /nobreak >nul

:: Check if process started
tasklist /FI "IMAGENAME eq wscript.exe" | findstr "wscript.exe" >nul 2>&1
if %errorlevel% == 0 (
    echo     SUCCESS: Client started and running in background
    echo     Process: wscript.exe is running
) else (
    echo     WARNING: Could not verify client startup
    echo     Please check logs in %INSTALL_DIR%\Logs\ for details
)

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo The Command Dispatcher Client is now:
echo   * Running in background (hidden)
echo   * Set to start automatically at Windows boot
echo   * Logging activity to: %INSTALL_DIR%\Logs\
echo   * Using configuration from: %INSTALL_DIR%\client-config.txt
echo.
echo Management:
echo   * View logs: Check %INSTALL_DIR%\Logs\
echo   * Edit config: %INSTALL_DIR%\client-config.txt
echo   * Restart client: Run %INSTALL_DIR%\start-hidden-client.vbs
echo   * Uninstall: Run %INSTALL_DIR%\uninstall.bat
echo.
echo Status check:
echo   * Task Manager: Look for "wscript.exe" process
echo   * Log files: Latest file in %INSTALL_DIR%\Logs\
echo   * Web dashboard: Should show this client connected
echo.

echo Press any key to exit...
pause >nul