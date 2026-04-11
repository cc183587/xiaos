Dim oShell
Set oShell = CreateObject("WScript.Shell")
Dim sDir
sDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' 隐藏启动 cpolar
Dim env
Set env = oShell.Environment("PROCESS")
Dim cpolarOut
cpolarOut = env("TEMP") & "\cpolar_out.txt"

oShell.Run "cmd /c cpolar http 3001 -log stdout > """ & cpolarOut & """ 2>&1", 0, False

Set oShell = Nothing