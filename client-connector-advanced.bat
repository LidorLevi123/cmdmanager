@echo off
setlocal enabledelayedexpansion

:: Configuration - You can modify these or pass as arguments
set DEFAULT_SERVER=http://localhost:5000
set DEFAULT_CLASS=58.0.6

:: Accept command line arguments
set SERVER_URL=%1
set CLASS_ID=%2

:: Use defaults if no arguments provided
if "%SERVER_URL%"=="" set SERVER_URL=%DEFAULT_SERVER%
if "%CLASS_ID%"=="" set CLASS_ID=%DEFAULT_CLASS%

:: Colors for output
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set CYAN=[96m
set RESET=[0m

echo.
echo %CYAN%=========================================
echo   Command Dispatcher Client - Advanced
echo   Fleet Management System v1.0
echo =========================================%RESET%
echo.

:: Display configuration
echo %BLUE%[CONFIG]%RESET% Using configuration:
echo   Server URL: %SERVER_URL%
echo   Class ID: %CLASS_ID%
echo.

:: Validate class ID against allowed values
set VALID_CLASS=0
for %%c in (58.0.6 58.1.1 58.-1.23 58.0.8 58.1.3 58.-1.25) do (
    if "%CLASS_ID%"=="%%c" set VALID_CLASS=1
)

if %VALID_CLASS%==0 (
    echo %RED%[ERROR]%RESET% Invalid Class ID: %CLASS_ID%
    echo   Valid Class IDs: 58.0.6, 58.1.1, 58.-1.23, 58.0.8, 58.1.3, 58.-1.25
    echo.
    echo Usage: %0 [SERVER_URL] [CLASS_ID]
    echo Example: %0 http://192.168.1.100:5000 58.1.1
    pause
    exit /b 1
)

:: Get comprehensive system information
echo %YELLOW%[INFO]%RESET% Gathering comprehensive system information...

:: Get hostname
for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i

:: Get all IP addresses
set IP_COUNT=0
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set /a IP_COUNT+=1
    set IP_RAW=%%i
    set IP!IP_COUNT!=!IP_RAW: =!
    if !IP_COUNT!==1 set PRIMARY_IP=!IP_RAW: =!
)

:: Get MAC address
for /f "tokens=1" %%i in ('getmac /fo csv /nh ^| findstr /v "N/A"') do (
    set MAC_RAW=%%i
    set MAC=!MAC_RAW:"=!
    goto :mac_found
)
:mac_found

:: Get Windows version and build
for /f "tokens=4-10 delims=. " %%i in ('ver') do set WIN_VERSION=%%i.%%j.%%k.%%l
for /f "tokens=3*" %%i in ('reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v ProductName 2^>nul') do set WIN_EDITION=%%j

:: Get system specs
for /f "tokens=2*" %%i in ('wmic computersystem get TotalPhysicalMemory /value ^| findstr "="') do set TOTAL_RAM=%%j
set /a RAM_GB=!TOTAL_RAM!/1024/1024/1024

for /f "tokens=2*" %%i in ('wmic cpu get Name /value ^| findstr "="') do set CPU_NAME=%%j

:: Get current user and domain
set CURRENT_USER=%USERNAME%
set CURRENT_DOMAIN=%USERDOMAIN%

:: Create unique client identifier
set CLIENT_ID=%HOSTNAME%-%CLASS_ID%-%RANDOM%

echo.
echo %GREEN%[SUCCESS]%RESET% System information gathered:
echo   Client ID: %CLIENT_ID%
echo   Hostname: %HOSTNAME%
echo   Primary IP: %PRIMARY_IP%
echo   MAC Address: %MAC%
echo   User: %CURRENT_DOMAIN%\%CURRENT_USER%
echo   Windows: %WIN_EDITION%
echo   Version: %WIN_VERSION%
echo   CPU: %CPU_NAME%
echo   RAM: %RAM_GB% GB
echo   Class ID: %CLASS_ID%
echo.

:: Check curl availability
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%RESET% curl is not available. 
    echo   Windows 10/11 includes curl by default.
    echo   For older versions, download from: https://curl.se/download.html
    pause
    exit /b 1
)

:: Test server connectivity with detailed diagnostics
echo %YELLOW%[INFO]%RESET% Testing server connectivity...
echo   Testing: %SERVER_URL%/api/stats

curl -s --connect-timeout 10 --max-time 15 "%SERVER_URL%/api/stats" > temp_response.json 2>nul
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%RESET% Cannot connect to server
    echo   Server: %SERVER_URL%
    echo   Possible issues:
    echo   1. Server is not running
    echo   2. Incorrect server URL
    echo   3. Network/firewall blocking connection
    echo   4. Server is on different port
    echo.
    echo %YELLOW%[TIP]%RESET% Try testing manually: curl %SERVER_URL%/api/stats
    if exist temp_response.json del temp_response.json
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%RESET% Server connection verified
if exist temp_response.json (
    echo %BLUE%[SERVER INFO]%RESET% Server is responding normally
    del temp_response.json
)
echo.

:: Register client connection and start main loop
echo %CYAN%[STARTING]%RESET% Initializing long-polling connection...
echo   Server: %SERVER_URL%
echo   Endpoint: /api/get-command-long-poll/%CLASS_ID%
echo   Client ID: %CLIENT_ID%
echo   Connection timeout: 5 minutes
echo.
echo %YELLOW%[READY]%RESET% Waiting for commands... (Press Ctrl+C to exit)
echo.

set RECONNECT_COUNT=0

:connect_loop
set /a RECONNECT_COUNT+=1
echo %BLUE%[%DATE% %TIME%] Connection #%RECONNECT_COUNT%%RESET% Polling for commands...

:: Enhanced curl request with comprehensive headers
curl -s -w "HTTP_CODE:%%{http_code};TIME:%%{time_total}" ^
  -H "X-Hostname: %HOSTNAME%" ^
  -H "X-Client-ID: %CLIENT_ID%" ^
  -H "X-Primary-IP: %PRIMARY_IP%" ^
  -H "X-MAC: %MAC%" ^
  -H "X-User: %CURRENT_DOMAIN%\%CURRENT_USER%" ^
  -H "X-Windows-Version: %WIN_VERSION%" ^
  -H "X-Windows-Edition: %WIN_EDITION%" ^
  -H "X-CPU: %CPU_NAME%" ^
  -H "X-RAM-GB: %RAM_GB%" ^
  -H "X-Class-ID: %CLASS_ID%" ^
  -H "Connection: keep-alive" ^
  -H "User-Agent: CommandDispatcher-Client/1.0" ^
  --connect-timeout 10 ^
  --max-time 300 ^
  "%SERVER_URL%/api/get-command-long-poll/%CLASS_ID%" > response.tmp 2>nul

set CURL_EXIT=%errorlevel%

:: Parse response
if exist response.tmp (
    for /f "tokens=*" %%i in (response.tmp) do (
        set RESPONSE=%%i
        if "!RESPONSE:~0,10!"=="HTTP_CODE:" (
            for /f "tokens=1,2 delims=;" %%a in ("!RESPONSE!") do (
                set HTTP_CODE=%%a
                set TIME_INFO=%%b
                set HTTP_CODE=!HTTP_CODE:HTTP_CODE:=!
                set TIME_INFO=!TIME_INFO:TIME:=!
            )
        ) else (
            echo %GREEN%[COMMAND RECEIVED]%RESET% %DATE% %TIME%
            echo %CYAN%Response:%RESET% !RESPONSE!
        )
    )
    del response.tmp
)

:: Handle different response scenarios
if %CURL_EXIT% == 0 (
    if defined HTTP_CODE (
        if "!HTTP_CODE!"=="200" (
            echo %GREEN%[SUCCESS]%RESET% Command processed successfully
            echo %BLUE%[INFO]%RESET% Response time: !TIME_INFO! seconds
        ) else (
            echo %YELLOW%[WARNING]%RESET% Server returned HTTP !HTTP_CODE!
        )
    )
    echo %YELLOW%[INFO]%RESET% Reconnecting for next command...
    timeout /t 1 /nobreak >nul
) else if %CURL_EXIT% == 28 (
    echo %YELLOW%[TIMEOUT]%RESET% No commands received (5min timeout), reconnecting...
) else if %CURL_EXIT% == 7 (
    echo %RED%[CONNECTION ERROR]%RESET% Failed to connect to server
    echo %YELLOW%[RETRY]%RESET% Waiting 10 seconds before retry...
    timeout /t 10 /nobreak >nul
) else (
    echo %RED%[ERROR]%RESET% Connection error (Code: %CURL_EXIT%)
    echo %YELLOW%[RETRY]%RESET% Waiting 5 seconds before retry...
    timeout /t 5 /nobreak >nul
)

:: Clear variables for next iteration
set HTTP_CODE=
set TIME_INFO=
set RESPONSE=

goto connect_loop

:: Cleanup (should not be reached)
echo.
echo %BLUE%[SHUTDOWN]%RESET% Client disconnecting...
if exist response.tmp del response.tmp
if exist temp_response.json del temp_response.json