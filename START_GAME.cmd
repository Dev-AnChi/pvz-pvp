@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist build\server.mjs (
  echo Chua build game. Hay chay npm ci va npm run build truoc.
  pause
  exit /b 1
)
echo PvZ Duel - http://127.0.0.1:4173
echo Tao phong, gui link Internet cho ban. Giu cua so nay mo.
"%NODE%" tools\serve.mjs
pause
