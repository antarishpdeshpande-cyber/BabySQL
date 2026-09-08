@echo off
title BabySQL Local Studio
cd /d "%~dp0"
echo ===================================================
echo   Starting BabySQL (Local SQLite & CSV Studio)
echo   Opening: http://localhost:3000
echo ===================================================
timeout /t 1 /nobreak >nul
start "" http://localhost:3000
python serve.py
