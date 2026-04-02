@echo off
chcp 65001 >nul 2>&1
title 产量登记系统启动器

REM === 先杀掉旧的 cpolar 进程，避免多实例冲突 ===
taskkill /f /im cpolar.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM === 启动后端（VBS隐藏窗口） ===
cscript //nologo "%~dp0启动后端.vbs"

REM === 启动 Cpolar 隧道（覆盖模式写日志，确保每次都是最新地址） ===
set CPOLAR_OUT=%TEMP%\cpolar_out.txt
start "" /min cmd /c "cpolar http 3001 -log stdout > %CPOLAR_OUT% 2>&1"

REM === 等待隧道建立并获取外网地址 ===
powershell -ExecutionPolicy Bypass -File "%~dp0get_cpolar_url.ps1"

REM === 打开浏览器 ===
start "" "http://localhost:3001/index.html"

exit
