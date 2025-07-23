' VBScript to run the client connector in hidden mode
' This script will start the batch file without showing any command prompt window

Dim objShell, objFSO, scriptPath, batchPath, configPath
Dim serverURL, classID

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS script is located
scriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
batchPath = scriptPath & "\client-connector-silent.bat"
configPath = scriptPath & "\client-config.txt"

' Read configuration from config file if it exists
serverURL = "http://localhost:5000"
classID = "58.0.6"

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

' Create a temporary batch file with the configuration
Dim tempBatch, tempBatchPath
tempBatchPath = objShell.ExpandEnvironmentStrings("%TEMP%") & "\client-dispatcher-" & Int((999999-100000+1)*Rnd+100000) & ".bat"

Set tempBatch = objFSO.CreateTextFile(tempBatchPath, True)
tempBatch.WriteLine "@echo off"
tempBatch.WriteLine "set SERVER_URL=" & serverURL
tempBatch.WriteLine "set CLASS_ID=" & classID
tempBatch.WriteLine "call """ & batchPath & """"
tempBatch.WriteLine "del """ & tempBatchPath & """"
tempBatch.Close

' Run the batch file hidden (0 = hidden, False = don't wait for completion)
objShell.Run """" & tempBatchPath & """", 0, False

' Log the startup
Dim logFile, logPath
logPath = "C:\CommandDispatcher\Logs\startup.log"

' Create directory if it doesn't exist
If Not objFSO.FolderExists("C:\CommandDispatcher\Logs") Then
    objFSO.CreateFolder("C:\CommandDispatcher")
    objFSO.CreateFolder("C:\CommandDispatcher\Logs")
End If

Set logFile = objFSO.OpenTextFile(logPath, 8, True) ' 8 = append mode
logFile.WriteLine "[" & Now & "] Command Dispatcher Client started silently"
logFile.WriteLine "Server: " & serverURL & ", Class: " & classID
logFile.Close

Set objShell = Nothing
Set objFSO = Nothing