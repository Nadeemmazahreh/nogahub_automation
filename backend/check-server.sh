#!/bin/bash

# NogaHub Backend Server Status Check Script
# This script checks if the backend server is running and tests key endpoints

echo "🔍 Checking NogaHub Backend Server Status..."

# Check if server process is running
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Server process is running (PID: $(pgrep -f 'node server.js'))"
else
    echo "❌ Server process is not running"
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    health_response=$(curl -s http://localhost:5001/api/health)
    echo "✅ Health endpoint is working: $health_response"
else
    echo "❌ Health endpoint is not responding"
    exit 1
fi

# Test auth endpoint (should require authentication)
echo "🔐 Testing auth endpoint..."
auth_response=$(curl -s http://localhost:5001/api/projects)
if [[ $auth_response == *"Access token required"* ]]; then
    echo "✅ Auth protection is working correctly"
else
    echo "❌ Auth protection may not be working: $auth_response"
fi

# Test login endpoint
echo "🧑‍💼 Testing login endpoint..."
login_response=$(curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"nadeem@nogahub.com","password":"Nadeem123"}')

if [[ $login_response == *"Login successful"* ]]; then
    echo "✅ Login endpoint is working correctly"
    
    # Extract token for further testing
    token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Test projects endpoint with token
    echo "📂 Testing projects endpoint with authentication..."
    projects_response=$(curl -s -X GET http://localhost:5001/api/projects \
        -H "Authorization: Bearer $token")
    
    if [[ $projects_response == *"projects"* ]]; then
        echo "✅ Projects endpoint is working correctly"
        
        # Test stats endpoint
        echo "📊 Testing stats endpoint..."
        stats_response=$(curl -s -X GET http://localhost:5001/api/projects/stats/summary \
            -H "Authorization: Bearer $token")
        
        if [[ $stats_response == *"stats"* ]]; then
            echo "✅ Stats endpoint is working correctly"
        else
            echo "❌ Stats endpoint is not working: $stats_response"
        fi
    else
        echo "❌ Projects endpoint is not working: $projects_response"
    fi
else
    echo "❌ Login endpoint is not working: $login_response"
fi

echo ""
echo "🎉 Server status check completed!"
echo "📍 Server URL: http://localhost:5001"
echo "📋 API Documentation: Check the routes/ directory for available endpoints"