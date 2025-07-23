' Debug version of the client for testing - shows message boxes for troubleshooting
' DO NOT use this for production - only for testing installation issues

Dim objShell, objFSO, objHTTP, scriptPath, configPath
Dim serverURL, classID, hostname, ipAddress

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS script is located
scriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
configPath = scriptPath & "\client-config.txt"

' Default configuration
serverURL = "http://localhost:5000"
classID = "58.0.6"

MsgBox "Debug Client Starting..." & vbCrLf & "Config file: " & configPath, vbInformation, "Debug Client"

' Read configuration from config file if it exists
If objFSO.FileExists(configPath) Then
    Dim configFile, line
    Set configFile = objFSO.OpenTextFile(configPath, 1)
    
    Do While Not configFile.AtEndOfStream
        line = Trim(configFile.ReadLine)
        
        ' Skip comments and empty lines
        If Left(line, 1) <> "#" And Len(line) > 0 Then
            If InStr(line, "SERVER_URL=") = 1 Then
                serverURL = Mid(line, 12)
            ElseIf InStr(line, "CLASS_ID=") = 1 Then
                classID = Mid(line, 10)
            End If
        End If
    Loop
    
    configFile.Close
    MsgBox "Configuration loaded:" & vbCrLf & "Server: " & serverURL & vbCrLf & "Class: " & classID, vbInformation, "Config Loaded"
Else
    MsgBox "Config file not found: " & configPath & vbCrLf & "Using defaults", vbExclamation, "Config Warning"
End If

' Get system information
hostname = objShell.ExpandEnvironmentStrings("%COMPUTERNAME%")
ipAddress = "127.0.0.1" ' Simplified for debug

MsgBox "System Info:" & vbCrLf & "Hostname: " & hostname & vbCrLf & "IP: " & ipAddress, vbInformation, "System Info"

' Test server connectivity
Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")

On Error Resume Next
objHTTP.Open "GET", serverURL & "/api/stats", False
objHTTP.setTimeouts 5000, 5000, 15000, 15000
objHTTP.Send

If Err.Number = 0 And objHTTP.Status = 200 Then
    MsgBox "Server connection successful!" & vbCrLf & "Server: " & serverURL & vbCrLf & "Response: " & objHTTP.Status, vbInformation, "Connection Success"
    
    ' Try one polling request
    objHTTP.Open "GET", serverURL & "/api/get-command-long-poll/" & classID, False
    objHTTP.setRequestHeader "X-Hostname", hostname
    objHTTP.setRequestHeader "X-Class-ID", classID
    objHTTP.setTimeouts 10000, 10000, 10000, 10000 ' Short timeout for testing
    objHTTP.Send
    
    If Err.Number = 0 Then
        MsgBox "Polling test successful!" & vbCrLf & "Status: " & objHTTP.Status & vbCrLf & "Ready for production use", vbInformation, "Polling Success"
    Else
        MsgBox "Polling test failed!" & vbCrLf & "Error: " & Err.Description, vbCritical, "Polling Error"
    End If
Else
    MsgBox "Server connection failed!" & vbCrLf & "Server: " & serverURL & vbCrLf & "Error: " & Err.Description & vbCrLf & "Status: " & objHTTP.Status, vbCritical, "Connection Failed"
End If

On Error Goto 0

MsgBox "Debug test complete. Check results above.", vbInformation, "Debug Complete"