@echo off
setlocal
title INV-DDS-PRO
cd /d "%~dp0"

where npm >nul 2>nul
if not errorlevel 1 goto :start

set "PORTABLE_NODE=%TEMP%\opencode\node-v22\node-v22.23.4-win-x64"
if exist "%PORTABLE_NODE%\npm.cmd" (
  set "PATH=%PORTABLE_NODE%;%PATH%"
  goto :start
)

echo.
echo No se encontro Node.js ni npm.
echo Instala Node.js 20 o superior y vuelve a ejecutar este archivo.
echo https://nodejs.org/
echo.
pause
exit /b 1

:start
echo.
echo Iniciando INV-DDS-PRO...
echo La aplicacion se abrira en http://localhost:5173
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173'"
call npm run dev
