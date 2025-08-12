@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

echo ========================================
echo   YouTube Downloader Backend (yt-dlp)
echo ========================================
echo.

echo [1/4] Ensuring Python and pip are available...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Python not found on PATH. Please install Python 3 and try again.
  pause
  exit /b 1
)

echo [2/4] Installing Python dependencies (yt-dlp, Flask, etc.)...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -r requirements_ytdlp.txt || (
  echo ERROR: Failed to install Python dependencies.
  pause
  exit /b 1
)

echo [3/4] Checking for FFmpeg...
set "LOCAL_FFMPEG=!CD!\ffmpeg\bin\ffmpeg.exe"
if exist "!LOCAL_FFMPEG!" (
  echo Local FFmpeg found: "!LOCAL_FFMPEG!"
  set "PATH=!CD!\ffmpeg\bin;!PATH!"
  set "FFMPEG_PATH=!LOCAL_FFMPEG!"
) else (
  where ffmpeg >nul 2>nul
  if !ERRORLEVEL! NEQ 0 (
    echo FFmpeg not found on PATH. Attempting portable install locally...
    set "FF_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    set "FF_ZIP=!CD!\ffmpeg-release-essentials.zip"
    echo   - Downloading FFmpeg from: !FF_URL!
    set "DL_CMD=Try { Invoke-WebRequest -Uri '!FF_URL!' -OutFile '!FF_ZIP!' -UseBasicParsing } Catch { Write-Error $_; exit 1 }"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "!DL_CMD!"
    if exist "!FF_ZIP!" (
      echo   - Extracting FFmpeg...
      rmdir /s /q "!CD!\ffmpeg" 2>nul
      rmdir /s /q "!CD!\ffmpeg_tmp" 2>nul
      set "EXP_CMD=Expand-Archive -Path '!FF_ZIP!' -DestinationPath '!CD!\ffmpeg_tmp' -Force"
      powershell -NoProfile -ExecutionPolicy Bypass -Command "!EXP_CMD!"
      del "!FF_ZIP!" >nul 2>nul
      for /d %%D in ("!CD!\ffmpeg_tmp\ffmpeg-*") do (
        mkdir "!CD!\ffmpeg" 2>nul
        xcopy /e /i /y "%%D\bin" "!CD!\ffmpeg\bin" >nul
      )
      rmdir /s /q "!CD!\ffmpeg_tmp" >nul 2>nul
      if exist "!CD!\ffmpeg\bin\ffmpeg.exe" (
        set "LOCAL_FFMPEG=!CD!\ffmpeg\bin\ffmpeg.exe"
        echo   - FFmpeg installed locally at: "!LOCAL_FFMPEG!"
        set "PATH=!CD!\ffmpeg\bin;!PATH!"
        set "FFMPEG_PATH=!LOCAL_FFMPEG!"
      ) else (
        echo   - Failed to set up FFmpeg automatically. You can install it manually and try again.
      )
    ) else (
      echo   - Failed to download FFmpeg. You can install it manually and try again.
    )
  ) else (
    for /f "usebackq tokens=*" %%p in (`where ffmpeg`) do set "FF_SYSTEM=%%p"
    echo FFmpeg found on PATH: "!FF_SYSTEM!"
  )
)

echo [4/4] Starting backend server on http://localhost:5000 ...
echo (Leave this window open. Press Ctrl+C to stop.)
python install_videos_ytdlp.py

echo.
pause
endlocal
