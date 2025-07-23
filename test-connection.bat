@echo off
:: Simple test script to verify client setup before installation
echo.
echo ==========================================
echo   Command Dispatcher Connection Test
echo ==========================================
echo.

:: Check if required files exist
echo [1/4] Checking required files...
set MISSING_FILES=0

if not exist "start-hidden-client.vbs" (
    echo     ERROR: start-hidden-client.vbs not found
    set MISSING_FILES=1
)

if not exist "client-config.txt" (
    echo     ERROR: client-config.txt not found
    set MISSING_FILES=1
)

if %MISSING_FILES%==1 (
    echo.
    echo ERROR: Required files are missing. Please ensure you have:
    echo   - start-hidden-client.vbs
    echo   - client-config.txt
    pause
    exit /b 1
)

echo     All required files found

:: Read configuration
echo.
echo [2/4] Reading configuration...
for /f "tokens=*" %%i in ('findstr "SERVER_URL=" client-config.txt ^| findstr /v "^#"') do (
    set CONFIG_LINE=%%i
    set SERVER_URL=!CONFIG_LINE:SERVER_URL=!
)
for /f "tokens=*" %%i in ('findstr "CLASS_ID=" client-config.txt ^| findstr /v "^#"') do (
    set CONFIG_LINE=%%i
    set CLASS_ID=!CONFIG_LINE:CLASS_ID=!
)

echo     Server URL: %SERVER_URL%
echo     Class ID: %CLASS_ID%

:: Test server connectivity
echo.
echo [3/4] Testing server connection...
curl -s --connect-timeout 10 "%SERVER_URL%/api/stats" > temp_test.json 2>nul
if %errorlevel% neq 0 (
    echo     ERROR: Cannot connect to server
    echo     Please check:
    echo       1. Server is running at %SERVER_URL%
    echo       2. Network connectivity
    echo       3. Firewall settings
    if exist temp_test.json del temp_test.json
    pause
    exit /b 1
)

echo     Server connection successful

:: Test VBScript execution
echo.
echo [4/4] Testing VBScript execution...
echo     Starting test connection (will run for 10 seconds)...

:: Create a temporary test VBS that runs for only 10 seconds
(
echo Dim objShell, objFSO, objHTTP
echo Set objShell = CreateObject("WScript.Shell"^)
echo Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0"^)
echo.
echo ' Test server connection
echo On Error Resume Next
echo objHTTP.Open "GET", "%SERVER_URL%/api/stats", False
echo objHTTP.setTimeouts 5000, 5000, 15000, 15000
echo objHTTP.Send
echo.
echo If Err.Number = 0 And objHTTP.Status = 200 Then
echo     WScript.Echo "SUCCESS: VBScript can connect to server"
echo Else
echo     WScript.Echo "ERROR: VBScript connection failed"
echo End If
echo.
echo On Error Goto 0
) > temp_test.vbs

cscript //NoLogo temp_test.vbs
set VBS_RESULT=%errorlevel%
del temp_test.vbs

if %VBS_RESULT% neq 0 (
    echo     ERROR: VBScript execution failed
    pause
    exit /b 1
)

:: Cleanup
if exist temp_test.json del temp_test.json

echo.
echo ==========================================
echo   All tests passed successfully!
echo ==========================================
echo.
echo Your client setup is ready for installation.
echo You can now run: install-startup-service.bat
echo.
pause