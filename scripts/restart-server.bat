@echo off
echo Stopping server on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do taskkill /F /PID %%a

echo Starting server...
cd /d "%~dp0"
npm run dev
