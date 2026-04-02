@echo off
chcp 65001 >nul
title 获取本机IP地址
echo.
echo ========================================
echo       正在获取本机IP地址...
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
)

echo.
echo [本机局域网IP地址]
echo %IP%
echo.
echo [手机访问地址]
echo http://%IP%:3001/index.html
echo.
echo ========================================
echo  请确保手机和电脑连接同一WiFi
echo  然后在手机浏览器中访问上面的地址
echo ========================================
echo.
pause
