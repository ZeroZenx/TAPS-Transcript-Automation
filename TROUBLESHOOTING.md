# Troubleshooting: Connection Failed

## Problem
The page is not loading and showing "connection failed" error.

## Root Cause
The database (PostgreSQL) is not running. The application requires a database connection to function.

## Solution

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application on your Mac
2. Wait for Docker to fully start (you'll see a whale icon in your menu bar)
3. Verify Docker is running:
   ```bash
   docker info
   ```
   If this command works, Docker is running.

### Step 2: Start the Database
Once Docker is running, execute:

```bash
cd /Users/darrenheadley/cursor/TAPS-Transcript-Automation
docker-compose up -d postgres
```

Wait 10 seconds for the database to initialize.

### Step 3: Run Database Migrations
```bash
cd backend
npm run db:migrate
```

### Step 4: Start the Servers

**Terminal 1 - Backend:**
```bash
cd /Users/darrenheadley/cursor/TAPS-Transcript-Automation/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/darrenheadley/cursor/TAPS-Transcript-Automation/frontend
npm run dev
```

### Step 5: Access the Application
Visit: http://localhost:5173

## Quick Start Script

Alternatively, you can use the startup script:

```bash
cd /Users/darrenheadley/cursor/TAPS-Transcript-Automation
./start-app.sh
```

This will:
- Check if Docker is running
- Start the PostgreSQL database
- Run migrations
- Provide instructions to start the servers

## Verify Everything is Running

Check if services are running:
```bash
# Check Docker containers
docker ps

# Check if ports are in use
lsof -i :4000  # Backend
lsof -i :5173  # Frontend
```

## Common Issues

### "Cannot connect to Docker daemon"
- Docker Desktop is not running
- Start Docker Desktop application
- Wait for it to fully initialize

### "Port already in use"
- Another application is using port 4000 or 5173
- Stop the other application or change ports in `.env` files

### "Database connection failed"
- Database container is not running: `docker-compose up -d postgres`
- Wait 10 seconds after starting the container
- Check DATABASE_URL in `backend/.env`

### "Migration failed"
- Database might not be ready yet - wait 10 seconds after starting
- Check Docker logs: `docker-compose logs postgres`

