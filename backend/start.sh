#!/bin/bash

# Backend Start Script
# Stops any running backend instances and starts a new one

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Checking for running uvicorn processes..."

# Find and kill any existing uvicorn processes
PIDS=$(ps aux | grep "uvicorn server.src.I1_entry.app:app" | grep -v grep | awk '{print $2}')

if [ -n "$PIDS" ]; then
    echo "🛑 Stopping existing backend instances..."
    echo "$PIDS" | xargs kill
    sleep 1
    echo "✅ Stopped old instances"
else
    echo "✅ No running instances found"
fi

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./setup.sh first."
    exit 1
fi

echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
echo "📦 Checking dependencies..."
python -c "import fastapi; import uvicorn" 2>/dev/null || {
    echo "⚠️  Some dependencies are missing. Run ./check_deps.sh to install them."
    exit 1
}

# Start the server
echo "🚀 Starting backend server..."
echo "📍 Local: http://localhost:8000"
echo "📍 Network: http://$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1):8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn server.src.I1_entry.app:app --host 0.0.0.0 --port 8000 --reload
