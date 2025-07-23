' VBScript to run the client connector in hidden mode
' This script implements the client logic directly in VBScript for better reliability

Dim objShell, objFSO, objHTTP, scriptPath, configPath
Dim serverURL, classID, hostname, ipAddress

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")

' Get the directory where this VBS script is located
scriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
configPath = scriptPath & "\client-config.txt"

' Default configuration
serverURL = "http://localhost:5000"
classID = "58.0.6"

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
End If

' Create log directory if it doesn't exist
If Not objFSO.FolderExists("C:\CommandDispatcher") Then
    objFSO.CreateFolder("C:\CommandDispatcher")
End If
If Not objFSO.FolderExists("C:\CommandDispatcher\Logs") Then
    objFSO.CreateFolder("C:\CommandDispatcher\Logs")
End If

' Get system information
hostname = objShell.ExpandEnvironmentStrings("%COMPUTERNAME%")
ipAddress = GetIPAddress()

' Log startup
LogMessage "Command Dispatcher Client started silently"
LogMessage "Server: " & serverURL & ", Class: " & classID
LogMessage "Hostname: " & hostname & ", IP: " & ipAddress

' Test server connectivity
If Not TestServerConnection() Then
    LogMessage "ERROR: Cannot connect to server " & serverURL
    WScript.Quit 1
End If

LogMessage "Server connection verified, starting main loop"

' Main connection loop
Dim reconnectCount
reconnectCount = 0

Do
    reconnectCount = reconnectCount + 1
    LogMessage "Connection attempt #" & reconnectCount
    
    On Error Resume Next
    
    ' Configure HTTP request
    objHTTP.Open "GET", serverURL & "/api/get-command-long-poll/" & classID, False
    objHTTP.setRequestHeader "X-Hostname", hostname
    objHTTP.setRequestHeader "X-IP", ipAddress
    objHTTP.setRequestHeader "X-User", objShell.ExpandEnvironmentStrings("%USERNAME%")
    objHTTP.setRequestHeader "X-Class-ID", classID
    objHTTP.setRequestHeader "Connection", "keep-alive"
    objHTTP.setRequestHeader "User-Agent", "CommandDispatcher-Client-VBS/1.0"
    objHTTP.setTimeouts 10000, 10000, 300000, 300000 ' 5 minute timeout
    
    ' Send request
    objHTTP.Send
    
    If Err.Number = 0 Then
        If objHTTP.Status = 200 Then
            LogMessage "Command received: " & objHTTP.responseText
            WScript.Sleep 2000 ' Brief pause before reconnecting
        Else
            LogMessage "Server returned HTTP " & objHTTP.Status
        End If
    Else
        LogMessage "Connection error: " & Err.Description
        WScript.Sleep 30000 ' Wait 30 seconds on error
        Err.Clear
    End If
    
    On Error Goto 0
Loop

' Helper functions
Function GetIPAddress()
    On Error Resume Next
    Dim objWMI, colItems, objItem
    Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
    Set colItems = objWMI.ExecQuery("SELECT IPAddress FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=True")
    
    For Each objItem in colItems
        If Not IsNull(objItem.IPAddress) Then
            GetIPAddress = objItem.IPAddress(0)
            Exit Function
        End If
    Next
    
    GetIPAddress = "unknown"
    On Error Goto 0
End Function

Function TestServerConnection()
    On Error Resume Next
    objHTTP.Open "GET", serverURL & "/api/stats", False
    objHTTP.setTimeouts 5000, 5000, 15000, 15000
    objHTTP.Send
    
    If Err.Number = 0 And objHTTP.Status = 200 Then
        TestServerConnection = True
    Else
        TestServerConnection = False
    End If
    
    Err.Clear
    On Error Goto 0
End Function

Sub LogMessage(message)
    Dim logFile, logPath
    logPath = "C:\CommandDispatcher\Logs\client_" & Year(Now) & Right("0" & Month(Now), 2) & Right("0" & Day(Now), 2) & ".log"
    
    On Error Resume Next
    Set logFile = objFSO.OpenTextFile(logPath, 8, True) ' 8 = append mode
    logFile.WriteLine "[" & Now & "] " & message
    logFile.Close
    On Error Goto 0
End Sub