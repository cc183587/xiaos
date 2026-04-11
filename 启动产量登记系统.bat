@echo off
chcp 65001 >nul 2>&1
title 产量登记系统启动器

REM === 设置窗口大小（宽度x高度） ===
mode con: cols=30 lines=10

REM === 先杀掉旧的 cpolar 进程，避免多实例冲突 ===
taskkill /f /im cpolar.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM === 启动后端（VBS隐藏窗口） ===
cscript //nologo "%~dp0启动后端.vbs"

REM === 启动 Cpolar 隧道（VBS隐藏窗口） ===
cscript //nologo "%~dp0启动cpolar.vbs"

REM === 等待隧道建立并获取外网地址 ===
powershell -ExecutionPolicy Bypass -File "%~dp0get_cpolar_url.ps1"

REM === 打开浏览器 ===
start "" "http://localhost:3001/index.html"

REM === 发送 Server酱 推送通知 ===
powershell -ExecutionPolicy Bypass -Command "& {$key=Get-Content '%~dp0factory-backend\data\settings.json' -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json | Select-Object -ExpandProperty serverchan_key -ErrorAction SilentlyContinue; if($key){$ip=(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'WLAN','以太网','Ethernet' -ErrorAction SilentlyContinue | Where-Object{$_.IPAddress -notlike '127.*'} | Select-Object -First 1).IPAddress; $lan=\"http://$ip`:3001/index.html\"; $wan=Get-Content $env:TEMP\cpolar_out.txt -ErrorAction SilentlyContinue | Select-String -Pattern 'https://[^\s]+\.cpolar\.top' | Select-Object -Last 1 | ForEach-Object{$_.Matches[0].Value}; $msg=\"🚀 产量登记系统已启动\\n\\n📱 外网地址：$wan\\n\\n🏠 内网地址：$lan\"; Invoke-RestMethod -Uri \"https://sctapi.ftqq.com/$key.send\" -Method Post -Body @{title='产量登记系统启动';desp=$msg} -ContentType 'application/x-www-form-urlencoded' -ErrorAction SilentlyContinue | Out-Null; Write-Host 'Server酱推送已发送'} else {Write-Host '未配置 Server酱 SendKey，跳过推送'}}"

exit
