@echo off
echo ========================================
echo   Redis Connection Check
echo ========================================
echo.

echo Checking WSL Redis status...
wsl bash -c "systemctl is-active redis-server 2>/dev/null || service redis-server status 2>/dev/null || echo 'Redis service check failed'"

echo.
echo Getting WSL IP address...
for /f "tokens=*" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo WSL IP: %WSL_IP%

echo.
echo Testing Redis connection...
wsl bash -c "redis-cli -h 127.0.0.1 -a 'SvS-Manager-501555123' --no-auth-warning ping 2>&1"

echo.
echo Checking Redis bind address...
wsl bash -c "ps aux | grep redis-server | grep -v grep"

echo.
echo ========================================
echo   Redis Info
echo ========================================
echo.
echo If Redis is bound to 127.0.0.1 only, you need to:
echo 1. Find Redis config: wsl find /etc -name redis.conf 2^>^/dev^/null
echo 2. Edit config: wsl sudo nano /path/to/redis.conf
echo 3. Change "bind 127.0.0.1" to "bind 0.0.0.0"
echo 4. Restart Redis: wsl sudo service redis-server restart
echo.
echo Current .env.local Redis config:
findstr "REDIS_" .env.local
echo.
pause
