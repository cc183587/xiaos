@echo off
chcp 65001 >nul
echo ========================================
echo   工厂产量工资管理系统 - 启动脚本
echo ========================================
echo.

REM 获取本机局域网 IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set IP=%%a
  goto :found_ip
)
:found_ip
set IP=%IP: =%

echo [1/3] 检测到本机 IP: %IP%
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js！
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

echo [2/3] 安装依赖（首次运行需要等一下）...
cd /d "%~dp0factory-backend"
call npm install --silent
if errorlevel 1 (
  echo [错误] 依赖安装失败，请检查网络连接！
  pause
  exit /b 1
)

echo [3/3] 启动服务器...
echo.
echo ========================================
echo   启动成功！
echo ========================================
echo.
echo  本机访问:    http://localhost:3001
echo  手机访问:    http://%IP%:3001
echo.
echo  把手机访问地址发给员工，确保手机和
echo  电脑连接同一个 WiFi 即可！
echo.
echo  [提示] 关闭此窗口=关闭服务器
echo ========================================
echo.

REM 开放防火墙（如果有管理员权限）
netsh advfirewall firewall add rule name="Factory System Port 3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1

node --experimental-sqlite server.js
