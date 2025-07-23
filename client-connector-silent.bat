@echo off
:: Silent version of the client connector - runs hidden in background
:: This version is designed for automatic startup without visible windows

:: Configuration - Update these for your environment
set SERVER_URL=http://localhost:5000
set CLASS_ID=58.0.6

:: Create log directory if it doesn't exist
if not exist "C:\CommandDispatcher\Logs" mkdir "C:\CommandDispatcher\Logs"

:: Set log file with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "LOG_FILE=C:\CommandDispatcher\Logs\client_%YYYY%%MM%%DD%_%HH%%Min%%Sec%.log"

:: Redirect all output to log file
echo [%date% %time%] Starting Command Dispatcher Client >> "%LOG_FILE%"
echo Server: %SERVER_URL% >> "%LOG_FILE%"
echo Class ID: %CLASS_ID% >> "%LOG_FILE%"
echo ================================================ >> "%LOG_FILE%"

:: Get system information quietly
for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP_RAW=%%i
    set IP=!IP_RAW: =!
    goto :ip_found
)
:ip_found

echo [%date% %time%] System Info - Hostname: %HOSTNAME%, IP: %IP% >> "%LOG_FILE%"

:: Check if curl is available
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: curl not available >> "%LOG_FILE%"
    exit /b 1
)

:: Test server connectivity
curl -s --connect-timeout 5 "%SERVER_URL%/api/stats" >nul 2>&1
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: Cannot connect to server %SERVER_URL% >> "%LOG_FILE%"
    exit /b 1
)

echo [%date% %time%] Server connection verified >> "%LOG_FILE%"

:: Main connection loop with error handling
set RECONNECT_COUNT=0

:connect_loop
setlocal enabledelayedexpansion
set /a RECONNECT_COUNT+=1
echo [%date% %time%] Connection attempt #%RECONNECT_COUNT% >> "%LOG_FILE%"

:: Make the long-polling request
curl -s ^
  -H "X-Hostname: %HOSTNAME%" ^
  -H "X-IP: %IP%" ^
  -H "X-User: %USERNAME%" ^
  -H "Connection: keep-alive" ^
  --connect-timeout 10 ^
  --max-time 300 ^
  "%SERVER_URL%/api/get-command-long-poll/%CLASS_ID%" >> "%LOG_FILE%" 2>&1

set CURL_EXIT=!errorlevel!

if !CURL_EXIT! == 0 (
    echo [%date% %time%] Command received successfully >> "%LOG_FILE%"
    timeout /t 2 /nobreak >nul
) else if !CURL_EXIT! == 28 (
    echo [%date% %time%] Connection timeout - reconnecting >> "%LOG_FILE%"
) else (
    echo [%date% %time%] Connection error: !CURL_EXIT! - waiting 30 seconds >> "%LOG_FILE%"
    timeout /t 30 /nobreak >nul
)

endlocal
goto connect_loop