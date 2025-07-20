#!/bin/bash

# NogaHub Backend Server Start Script
# This script starts the backend server on port 5001

echo "🚀 Starting NogaHub Backend Server..."

# Kill any existing server process
pkill -f "node server.js" > /dev/null 2>&1

# Start the server in the background
nohup npm start > server.log 2>&1 &

# Wait a moment for server to start
sleep 3

# Check if server is running
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Server is running successfully on port 5001!"
    echo "📍 Health check: http://localhost:5001/api/health"
    echo "📋 Login endpoint: http://localhost:5001/api/auth/login"
    echo "📂 Projects endpoint: http://localhost:5001/api/projects"
    echo "📊 Stats endpoint: http://localhost:5001/api/projects/stats/summary"
    echo ""
    echo "🧑‍💼 Available users:"
    echo "  Admin: nadeem@nogahub.com / Nadeem123"
    echo "  Admin: issa@nogahub.com / Issa123"
    echo "  User: kareem@nogahub.com / Kareem123"
    echo "  User: ammar@nogahub.com / Ammar123"
else
    echo "❌ Server failed to start. Check server.log for details."
fi