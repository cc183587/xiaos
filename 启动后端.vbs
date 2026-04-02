Dim oShell
Set oShell = CreateObject("WScript.Shell")
Dim sDir
sDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' 隐藏启动后端
oShell.Run "cmd /c cd /d """ & sDir & "factory-backend"" && node server.js", 0, False

Set oShell = Nothing
