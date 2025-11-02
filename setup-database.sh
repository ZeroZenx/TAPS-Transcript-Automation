#!/bin/bash

# TAPS Database Setup Script

echo "🚀 TAPS Database Setup"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
if docker-compose ps postgres | grep -q "Up"; then
    echo "✅ Database container is running"
else
    echo "❌ Database container failed to start"
    exit 1
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
cd backend
npm run db:migrate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Configure Azure AD credentials in backend/.env and frontend/.env"
    echo "2. Start backend: cd backend && npm run dev"
    echo "3. Start frontend: cd frontend && npm run dev"
else
    echo ""
    echo "❌ Migration failed. Check DATABASE_URL in backend/.env"
    exit 1
fi

