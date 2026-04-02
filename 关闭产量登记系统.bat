@echo off
chcp 65001 >nul
echo 正在关闭产量登记系统...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cpolar.exe >nul 2>&1
echo 已关闭所有服务！
timeout /t 2 >nul
