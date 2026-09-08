@echo off
title BabySQL Local Studio
cd /d "%~dp0"

echo ===================================================
echo   Starting BabySQL (Local SQLite ^& CSV Studio)
echo ===================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    node bin\babysql.js
    exit /b
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    timeout /t 1 /nobreak >nul
    start "" http://localhost:3000
    python serve.py
    exit /b
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    timeout /t 1 /nobreak >nul
    start "" http://localhost:3000
    py serve.py
    exit /b
)

echo [ERROR] Neither Node.js nor Python was found in your PATH.
echo Please install Node.js (https://nodejs.org) or Python (https://python.org).
pause
