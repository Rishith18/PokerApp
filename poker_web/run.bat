@echo off
REM Poker Web Interface Startup Script for Windows

echo ================================================
echo   Poker Web Interface - Startup Script
echo ================================================
echo.

REM Check if we're in the right directory
if not exist "backend\app.py" (
    echo Error: Must run from poker_web directory
    echo Usage: cd poker_web ^&^& run.bat
    exit /b 1
)

REM Check if strategy file exists
if not exist "..\strategy_ext.pkl" (
    echo Warning: strategy_ext.pkl not found in parent directory
    echo You may need to train the bot first by running: python ..\main.py
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

REM Start the server
echo.
echo ================================================
echo   Starting Poker Web Server
echo ================================================
echo.
echo Server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python backend\app.py
