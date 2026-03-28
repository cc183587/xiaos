@echo off
chcp 65001 >nul
setlocal

:: 配置
set DB_PATH=..\database\factory.db
set BACKUP_DIR=..\backups
set MAX_BACKUPS=7

:: 获取当前日期时间
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "SS=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%SS%"

echo ====================================
echo   工厂系统 - 数据库备份
echo ====================================
echo.

:: 检查数据库文件是否存在
if not exist "%DB_PATH%" (
    echo [错误] 数据库文件不存在: %DB_PATH%
    pause
    exit /b 1
)

:: 创建备份目录
if not exist "%BACKUP_DIR%" (
    echo [信息] 创建备份目录: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
)

:: 备份文件名
set "BACKUP_FILE=%BACKUP_DIR%\factory_backup_%timestamp%.db"

:: 复制数据库文件
echo [1/2] 正在备份数据库...
copy "%DB_PATH%" "%BACKUP_FILE%" >nul

if %errorlevel% equ 0 (
    echo [成功] 备份完成: %BACKUP_FILE%
) else (
    echo [错误] 备份失败！
    pause
    exit /b 1
)

:: 清理旧备份（保留最近7个）
echo [2/2] 清理旧备份...
cd "%BACKUP_DIR%"
for /f "skip=%MAX_BACKUPS% delims=" %%f in ('dir /b /o-d factory_backup_*.db') do (
    echo [删除] %%f
    del "%%f" >nul
)

echo.
echo ====================================
echo   备份完成！
echo ====================================
echo.
echo 当前备份位置: %BACKUP_FILE%
echo 备份目录: %BACKUP_DIR%
echo.
echo 保留最近 %MAX_BACKUPS% 个备份
echo.

endlocal
pause
