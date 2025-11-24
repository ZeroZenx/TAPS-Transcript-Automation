#!/bin/bash

# TAPS Application Startup Script

echo "🚀 Starting TAPS Application..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "📦 Please start Docker Desktop and wait for it to fully initialize."
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start PostgreSQL database
echo "🗄️  Starting PostgreSQL database..."
cd "$(dirname "$0")"
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready (10 seconds)..."
sleep 10

# Check if database is ready
if docker-compose exec -T postgres pg_isready -U taps_user > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "⚠️  Database might not be ready yet. Continuing anyway..."
fi

# Run migrations
echo ""
echo "📊 Running database migrations..."
cd backend
npm run db:migrate

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Now start the servers in separate terminals:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:5173"
echo ""

