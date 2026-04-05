@echo off
chcp 65001 >nul
title 产量登记系统后端

echo ========================================
echo    产量登记系统后端服务
echo    含 PushPlus 微信推送功能
echo ========================================
echo.

:: 结束旧进程
echo [1/2] 检查端口 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo        结束旧进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo [2/2] 启动后端服务...
echo.
cd /d "%~dp0factory-backend"
node server.js

pause
