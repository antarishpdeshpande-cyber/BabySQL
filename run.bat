@echo off
setlocal enabledelayedexpansion
title BabySQL Enterprise BRM Platform
cd /d "%~dp0"

echo ===================================================
echo   Starting BabySQL Enterprise BRM Platform
echo ===================================================

REM 1. Self-healing check: Ensure dist\index.html exists
if not exist "dist\index.html" (
    echo [SETUP] Production bundle not found in dist\. Attempting automatic setup...
    
    if exist "dist.zip" (
        echo [SETUP] Found dist.zip. Extracting production build...
        powershell -NoProfile -Command "Expand-Archive -Path 'dist.zip' -DestinationPath '.' -Force" >nul 2>&1
    )
    
    if not exist "dist\index.html" (
        where npm >nul 2>nul
        if !errorlevel! equ 0 (
            echo [SETUP] npm detected. Checking dependencies...
            if not exist "node_modules\" (
                echo [SETUP] Installing npm dependencies...
                call npm install
            )
            echo [SETUP] Building production bundle...
            call npm run build
        )
    )
)

REM 2. Verify dist is ready
if not exist "dist\index.html" (
    echo.
    echo ===================================================
    echo  [ERROR] Could not find or extract 'dist\index.html'.
    echo ===================================================
    echo  Please ensure dist.zip is in the BabySQL folder,
    echo  or run 'npm install' and 'npm run build'.
    echo ===================================================
    echo.
    pause
    exit /b 1
)

REM 3. Launch via Node.js if available
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Launching with Node.js engine...
    node bin\babysql.js
    if errorlevel 1 (
        echo.
        echo [ERROR] Node.js server exited with an error.
        pause
    )
    exit /b
)

REM 4. Launch via Python if available
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Launching with Python engine...
    python serve.py
    if errorlevel 1 (
        echo.
        echo [ERROR] Python server exited with an error.
        pause
    )
    exit /b
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Launching with Python engine...
    py serve.py
    if errorlevel 1 (
        echo.
        echo [ERROR] Python server exited with an error.
        pause
    )
    exit /b
)

REM 5. Launch via built-in Windows PowerShell engine (Zero external runtimes required)
where powershell >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Launching with built-in Windows PowerShell engine...
    powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
    if errorlevel 1 (
        echo.
        echo [ERROR] PowerShell server exited with an error.
        pause
    )
    exit /b
)

echo.
echo ===================================================
echo  [ERROR] No supported runtime found (Node, Python, or PowerShell).
echo ===================================================
echo  Please ensure Node.js, Python, or PowerShell is installed.
echo ===================================================
echo.
pause
