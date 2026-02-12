@echo off
echo Starting PelangiManager Local Test Environment
echo.

echo [1/3] Cleaning ports...
npx kill-port 3000 5000 3002

echo.
echo [2/3] Starting main app (frontend + backend)...
start "PelangiManager App" cmd /k "npm run dev"

timeout /t 5 /nobreak

echo.
echo [3/3] Starting RainbowAI server (WhatsApp + Scheduler)...
cd RainbowAI
start "RainbowAI Server" cmd /k "npm run dev"

echo.
echo ========================================
echo All services starting!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:   http://localhost:5000
echo RainbowAI: http://localhost:3002
echo Health:    http://localhost:3002/health
echo ========================================
