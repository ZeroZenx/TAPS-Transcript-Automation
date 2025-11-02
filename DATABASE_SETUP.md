# Database Setup Guide

## Current Status

✅ Environment files created (`backend/.env` and `frontend/.env`)  
✅ Database URL configured for Docker Compose  
⏳ Waiting for Docker to start  

## Step 1: Start Docker Desktop

1. Open **Docker Desktop** application
2. Wait for it to fully start (whale icon in menu bar should be steady)
3. Verify Docker is running:
   ```bash
   docker info
   ```

## Step 2: Start PostgreSQL Container

Once Docker is running, execute:

```bash
./setup-database.sh
```

Or manually:
```bash
# Start the database container
docker-compose up -d postgres

# Wait 10 seconds for it to be ready
sleep 10

# Verify it's running
docker ps | grep postgres
```

## Step 3: Run Database Migrations

```bash
cd backend
npm run db:migrate
```

This will:
- Create all tables (User, Request, AuditLog)
- Set up all indexes
- Prepare the database schema

## Step 4: (Optional) Seed Sample Data

```bash
cd backend
npm run db:seed
```

This creates:
- Admin user: `admin@example.com`
- Student user: `student@example.com`
- Sample transcript request

## Verification

Check database connection:
```bash
cd backend
npm run db:studio
```

This opens Prisma Studio in your browser where you can view/edit data.

## Troubleshooting

### Docker Not Running
- Start Docker Desktop application
- Wait for it to fully initialize
- Check: `docker info` should work

### Connection Refused
- Ensure postgres container is running: `docker ps`
- Check container logs: `docker-compose logs postgres`
- Verify DATABASE_URL in `backend/.env`

### Migration Fails
- Ensure database container is running and healthy
- Wait 10 seconds after starting container
- Check DATABASE_URL format matches docker-compose.yml

### Port Already in Use
- Stop existing PostgreSQL if running locally
- Or change port in docker-compose.yml and DATABASE_URL

## Current Configuration

**Database:** PostgreSQL 15 (Docker)  
**Database Name:** taps_db  
**Username:** taps_user  
**Password:** taps_password  
**Port:** 5432  
**Connection:** `postgresql://taps_user:taps_password@localhost:5432/taps_db`

This matches the configuration in `docker-compose.yml`.

## Next Steps After Database Setup

1. ✅ Database running and migrated
2. ⏳ Configure Azure AD (see `NEXT_STEPS.md`)
3. ⏳ Update `.env` files with Azure credentials
4. ⏳ Start development servers

