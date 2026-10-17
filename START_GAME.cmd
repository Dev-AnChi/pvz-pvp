@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo PvZ Duel - http://127.0.0.1:4173
echo Mo dia chi tren trong trinh duyet. Ctrl+C de dung server.
node tools\serve.mjs
pause
