@echo off
title BabySQL Local Studio
cd /d "%~dp0"

echo ===================================================
echo   Starting BabySQL (Local SQLite ^& CSV Studio)
echo ===================================================

:: 1. Self-healing check: Ensure dist\index.html exists
if not exist "dist\index.html" (
    echo [SETUP] Production bundle not found in dist\. Attempting automatic setup...
    
    :: Check if dist.zip exists and extract it
    if exist "dist.zip" (
        echo [SETUP] Found dist.zip. Extracting production build...
        tar -xf dist.zip 2>nul
        if not exist "dist\index.html" (
            powershell -NoProfile -Command "Expand-Archive -Path 'dist.zip' -DestinationPath '.' -Force" 2>nul
        )
    )
    
    :: If still missing, check if npm is available to build from source
    if not exist "dist\index.html" (
        where npm >nul 2>nul
        if %errorlevel% equ 0 (
            echo [SETUP] npm detected. Checking dependencies...
            if not exist "node_modules\" (
                echo [SETUP] Installing npm dependencies (first-time setup)...
                call npm install
            )
            echo [SETUP] Building production bundle (npm run build)...
            call npm run build
        )
    )
)

:: 2. Verify dist is ready
if not exist "dist\index.html" (
    echo.
    echo ===================================================
    echo  [ERROR] Could not find or build the 'dist' folder.
    echo ===================================================
    echo  Please ensure Node.js is installed (https://nodejs.org)
    echo  and run the following commands in this folder:
    echo     npm install
    echo     npm run build
    echo ===================================================
    echo.
    pause
    exit /b 1
)

:: 3. Launch via Node.js if available
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
