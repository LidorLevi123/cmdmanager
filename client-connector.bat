@echo off
setlocal enabledelayedexpansion

:: Configuration - Update these values as needed
set SERVER_URL=http://localhost:5000
set CLASS_ID=58.0.6

:: Colors for output
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set RESET=[0m

echo.
echo %BLUE%=====================================
echo   Command Dispatcher Client
echo   Fleet Management System
echo =====================================%RESET%
echo.

:: Get system information
echo %YELLOW%[INFO]%RESET% Gathering system information...

:: Get hostname
for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i

:: Get IP address (primary network adapter)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP_RAW=%%i
    set IP=!IP_RAW: =!
    goto :ip_found
)
:ip_found

:: Get Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j

:: Get current user
set USERNAME=%USERNAME%

:: Get current date and time
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set CURRENT_DATE=%%i/%%j/%%k
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set CURRENT_TIME=%%i:%%j

echo.
echo %GREEN%[SUCCESS]%RESET% System information gathered:
echo   Hostname: %HOSTNAME%
echo   IP Address: %IP%
echo   User: %USERNAME%
echo   Windows Version: %VERSION%
echo   Date/Time: %CURRENT_DATE% %CURRENT_TIME%
echo   Class ID: %CLASS_ID%
echo.

:: Check if curl is available
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%RESET% curl is not available. Please install curl or use Windows 10/11 which includes it.
    echo   You can download curl from: https://curl.se/download.html
    pause
    exit /b 1
)

:: Test server connectivity
echo %YELLOW%[INFO]%RESET% Testing connection to server...
curl -s --connect-timeout 5 "%SERVER_URL%/api/stats" >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%RESET% Cannot connect to server at %SERVER_URL%
    echo   Please check:
    echo   1. Server is running
    echo   2. SERVER_URL is correct
    echo   3. Network connectivity
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%RESET% Server connection verified
echo.

:: Main connection loop
echo %BLUE%[CONNECTING]%RESET% Starting long-polling connection...
echo   Server: %SERVER_URL%
echo   Endpoint: /api/get-command-long-poll/%CLASS_ID%
echo   Press Ctrl+C to disconnect
echo.

:connect_loop
echo %YELLOW%[%DATE% %TIME%]%RESET% Waiting for commands...

:: Make the long-polling request with system information
curl -s ^
  -H "X-Hostname: %HOSTNAME%" ^
  -H "X-IP: %IP%" ^
  -H "X-User: %USERNAME%" ^
  -H "X-Version: %VERSION%" ^
  -H "Connection: keep-alive" ^
  --max-time 300 ^
  "%SERVER_URL%/api/get-command-long-poll/%CLASS_ID%"

:: Check if we received a response (command)
if %errorlevel% == 0 (
    echo.
    echo %GREEN%[COMMAND RECEIVED]%RESET% Command dispatched at %DATE% %TIME%
    echo %BLUE%[INFO]%RESET% Reconnecting for next command...
    echo.
    timeout /t 2 /nobreak >nul
) else if %errorlevel% == 28 (
    echo %YELLOW%[TIMEOUT]%RESET% Connection timed out, reconnecting...
) else (
    echo %RED%[ERROR]%RESET% Connection lost (Error: %errorlevel%), attempting to reconnect...
    timeout /t 5 /nobreak >nul
)

:: Reconnect
goto connect_loop

:: This point should never be reached, but just in case
echo.
echo %BLUE%[INFO]%RESET% Client disconnected
pause