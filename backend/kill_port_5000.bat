@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a
echo Killed process on port 5000 (if any)
exit /b 0
