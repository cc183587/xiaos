@echo off
chcp 65001 >nul
echo ========================================
echo    工厂产量工资管理系统 - 一键启动
echo ========================================
echo.

:: 获取本机局域网IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
)

echo [1/3] 启动后端服务...
cd factory-backend
start "Factory Backend" cmd /k "node server.js"
cd ..

timeout /t 2 >nul

echo [2/3] 启动内网穿透...
where cpolar >nul 2>&1
if %errorlevel% equ 0 (
    start "Cpolar内网穿透" cmd /k "cpolar http 3001"
    echo [信息] Cpolar 已启动，请查看 Cpolar 窗口获取外网地址
) else (
    echo [警告] 未检测到 Cpolar，仅启动本地和局域网访问
    echo [提示] 请访问 https://www.cpolar.com/ 安装 Cpolar 并配置 authtoken
)

timeout /t 2 >nul

echo [3/3] 打开前端页面...
start http://localhost:3001/index.html

echo.
echo ======================= 启动完成 ======================
echo   本机访问:   http://localhost:3001/index.html
echo   局域网访问: http://%IP%:3001/index.html
if %errorlevel% equ 0 (
    echo   外网访问:   请查看 Cpolar 窗口
)
echo.
echo  [提示] 手机访问请确保手机和电脑连接同一 WiFi
echo  [提示] 外网访问需要安装 Cpolar 并配置 authtoken
echo  [提示] 关闭窗口 = 关闭服务器
echo =========================================================
echo.

pause
