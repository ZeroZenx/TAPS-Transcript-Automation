#!/bin/bash

# Start TAPS in Production Mode Locally
# This gives you immediate access while Azure deployment is configured

set -e

cd "$(dirname "$0")/../.."

echo "🚀 Starting TAPS in Production Mode..."
echo ""

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    cd frontend
    npm run build
    cd ..
fi

# Copy frontend to backend public directory
echo "Preparing production build..."
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

# Start production server
echo ""
echo "✅ Starting production server..."
echo ""
echo "🌐 Application will be available at:"
echo "   http://localhost:4000"
echo ""
echo "📊 Health check: http://localhost:4000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
NODE_ENV=production PORT=4000 node server.js

