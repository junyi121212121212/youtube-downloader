@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   YouTube Downloader - Full Setup
echo ========================================
echo.
echo This will start both backend and frontend servers
echo Keep both terminal windows open while using the app

echo.
echo Starting Backend Server (yt-dlp w/ FFmpeg autodetect)...
start "YouTube Downloader Backend" cmd /k start_backend_ytdlp.bat

REM Give backend a little time to initialize
for /l %%i in (1,1,5) do (
  echo Waiting for backend... %%i/5
  timeout /t 1 /nobreak >nul
)

echo.
echo Starting Frontend Server...
start "YouTube Downloader Frontend" cmd /k start_frontend.bat

echo.
echo ========================================
echo Both servers are starting!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Close this window when done using the app
echo ========================================
endlocal
pause
