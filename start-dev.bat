@echo off
echo.
echo ========================================
echo   PelangiManager Dev Server Startup
echo ========================================
echo.
echo Starting servers...
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo.

cd /d "%~dp0"
npm run dev:clean

pause
