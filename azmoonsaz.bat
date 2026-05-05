@echo off
title Local Server - Quiz App (Node.js)
cd /d "%~dp0"

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Please install Node.js from nodejs.org
    pause
    exit /b
)

echo Starting server on port 8000...
start http://localhost:8000
npx http-server -p 8000

pause