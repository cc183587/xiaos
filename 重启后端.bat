@echo off
chcp 65001 >nul
echo ==========================================
echo      工厂产量登记系统 - 后端重启工具
echo ==========================================
echo.

REM 查找并关闭已有的 Node.js 进程（后端服务）
echo [1/3] 正在关闭已有的后端服务...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo      ✓ 已关闭旧的后端进程
) else (
    echo      - 没有运行中的后端进程
)
echo.

REM 等待1秒确保端口释放
timeout /t 1 /nobreak >nul

cd /d "%~dp0factory-backend"

echo [2/3] 正在启动后端服务...
echo      服务地址: http://localhost:3001
echo.
echo [3/3] 启动完成！按 Ctrl+C 可以停止服务
echo ==========================================
echo.

node server.js

pause
