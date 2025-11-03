#!/bin/bash
# Helper script to start database and run import

echo "🔍 Checking database connection..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo ""
    echo "Please start Docker Desktop, then run:"
    echo "  docker-compose up -d postgres"
    echo ""
    echo "Then wait a few seconds and run:"
    echo "  cd backend && npm run import:data ../data/transcript-requests.tsv"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q postgres; then
    echo "📦 Starting PostgreSQL container..."
    docker-compose up -d postgres
    
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    # Wait for database to be healthy
    for i in {1..30}; do
        if docker exec $(docker ps -q -f name=postgres) pg_isready -U taps_user > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            break
        fi
        echo "   Waiting... ($i/30)"
        sleep 1
    done
fi

# Check database connection
if docker exec $(docker ps -q -f name=postgres) pg_isready -U taps_user > /dev/null 2>&1; then
    echo "✅ Database is connected!"
    echo ""
    echo "🔄 Running migrations..."
    cd backend
    npm run db:migrate
    
    echo ""
    echo "📥 Starting data import..."
    npm run import:data ../data/transcript-requests.tsv
else
    echo "❌ Could not connect to database"
    echo "Try: docker-compose up -d postgres"
    exit 1
fi


