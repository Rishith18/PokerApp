#!/bin/bash

# Poker Web Interface Startup Script

echo "================================================"
echo "  Poker Web Interface - Startup Script"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "Error: Must run from poker_web directory"
    echo "Usage: cd poker_web && ./run.sh"
    exit 1
fi

# Check if strategy file exists
if [ ! -f "../strategy_ext.pkl" ]; then
    echo "Warning: strategy_ext.pkl not found in parent directory"
    echo "You may need to train the bot first by running: python ../main.py"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Start the server
echo ""
echo "================================================"
echo "  Starting Poker Web Server"
echo "================================================"
echo ""
echo "Server will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python backend/app.py
