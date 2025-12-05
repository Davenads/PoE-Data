@echo off
echo ========================================
echo   Kill All Node.js Processes
echo ========================================
echo.
echo This will force-stop all running Node.js
echo processes, including the bot and any
echo zombie processes.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Killing all node.exe processes...
taskkill /F /IM node.exe /T 2>nul

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Success!
    echo ========================================
    echo All Node.js processes have been stopped.
    echo.
    echo You can now safely run:
    echo   dev.bat
    echo.
) else (
    echo.
    echo ========================================
    echo   No Processes Found
    echo ========================================
    echo No Node.js processes were running.
    echo.
)

echo Verifying...
timeout /t 2 /nobreak >nul

tasklist | findstr "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [WARNING] Some Node.js processes are still running.
    echo You may need to close them manually via Task Manager.
    echo.
) else (
    echo.
    echo [OK] All Node.js processes successfully terminated.
    echo.
)

pause
