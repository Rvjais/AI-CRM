#!/bin/bash

# Quick script to restart the server after killing any process on port 5000

echo "🔍 Checking for processes on port 5000..."

# Find and kill process on port 5000
PID=$(lsof -ti :5000)

if [ ! -z "$PID" ]; then
    echo "Found process $PID using port 5000"
    echo "Killing process..."
    kill -9 $PID
    sleep 1
    echo "✅ Process killed"
else
    echo "No process found on port 5000"
fi

echo ""
echo "🚀 Starting server..."
npm run dev
