#!/bin/bash

# Start TAPS Application
# This ensures Prisma is generated and server starts correctly

cd "$(dirname "$0")"

echo "🚀 Starting TAPS Application..."
echo ""

# Generate Prisma client
echo "📦 Generating Prisma client..."
cd backend
npm run db:generate

# Start server
echo ""
echo "🌐 Starting server..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "        YOUR APPLICATION WILL BE AVAILABLE AT:"
echo ""
echo "        http://localhost:4000"
echo "═══════════════════════════════════════════════════════════════"
echo ""

NODE_ENV=production PORT=4000 JWT_SECRET=taps-local-secret-key node server.js

