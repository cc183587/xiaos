@echo off
chcp 65001 >nul

set SCRIPT_PATH=%~dp0factory-backend\scripts\backup.bat

echo ====================================
echo   设置自动定时备份任务
echo ====================================
echo.
echo 此脚本将创建一个 Windows 任务计划，每天自动备份数据库
echo.

:: 获取当前路径（转换为绝对路径）
set "ABS_PATH=%SCRIPT_PATH%"
for %%i in ("%ABS_PATH%") do set "ABS_PATH=%%~fi"

echo 备份脚本路径: %ABS_PATH%
echo.

:: 创建任务计划
schtasks /create /tn "工厂系统数据库备份" /tr "\"%ABS_PATH%\"" /sc daily /st 02:00 /f

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo   任务计划创建成功！
    echo ====================================
    echo.
    echo 任务名称: 工厂系统数据库备份
    echo 执行时间: 每天凌晨 02:00
    echo 备份位置: factory-backend\backups\
    echo.
    echo 如需修改时间，请运行:
    echo schtasks /change /tn "工厂系统数据库备份" /st HH:MM
    echo.
    echo 如需删除任务，请运行:
    echo schtasks /delete /tn "工厂系统数据库备份" /f
    echo.
) else (
    echo.
    echo [错误] 任务计划创建失败！
    echo 请确保以管理员身份运行此脚本
    echo.
)

pause
