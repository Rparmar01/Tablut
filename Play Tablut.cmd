@echo off
setlocal

set "GAME_DIR=%~dp0"
set "GAME_FILE=%GAME_DIR%index.html"

if not exist "%GAME_FILE%" (
  echo Could not find "%GAME_FILE%".
  echo Make sure this launcher stays in the same folder as index.html.
  pause
  exit /b 1
)

start "" "%GAME_FILE%"
exit /b 0
