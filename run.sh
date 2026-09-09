#!/usr/bin/env bash
set -e

# Change to script directory
cd "$(dirname "$0")"

echo "==================================================="
echo "  Starting BabySQL (Local SQLite & CSV Studio)"
echo "==================================================="

# 1. Check if dist/index.html exists; if not, extract from dist.zip
if [ ! -f "dist/index.html" ]; then
    if [ -f "dist.zip" ]; then
        echo "[SETUP] Extracting production build from dist.zip..."
        unzip -q dist.zip 2>/dev/null || tar -xf dist.zip 2>/dev/null
    fi
fi

# 2. Check if Node.js is available
if command -v node >/dev/null 2>&1; then
    exec node bin/babysql.js "$@"
fi

# 3. Check if Python 3 is available
if command -v python3 >/dev/null 2>&1; then
    echo "BabySQL launching via Python 3..."
    (sleep 1 && (open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null)) &
    exec python3 serve.py "$@"
fi

# 4. Check if Python is available
if command -v python >/dev/null 2>&1; then
    echo "BabySQL launching via Python..."
    (sleep 1 && (open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null)) &
    exec python serve.py "$@"
fi

echo "[ERROR] Neither Node.js nor Python was found."
echo "Please install Node.js (https://nodejs.org) or Python (https://python.org)."
exit 1
