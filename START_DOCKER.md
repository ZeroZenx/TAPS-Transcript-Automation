# 🐳 Start Docker Desktop

## Quick Start

1. **Open Docker Desktop**
   - Launch the Docker Desktop application
   - Wait for it to start (you'll see a whale icon in your menu bar)

2. **Verify Docker is Running**
   ```bash
   docker info
   ```
   Should show Docker system information (not an error)

3. **Start Database**
   ```bash
   ./setup-database.sh
   ```

That's it! The script will handle the rest.

## What Happens Next

Once Docker is running and you execute `./setup-database.sh`:

1. ✅ PostgreSQL container starts
2. ✅ Database becomes ready (10 seconds)
3. ✅ Migrations run automatically
4. ✅ All tables created
5. ✅ Ready for development!

## Manual Alternative

If you prefer manual steps:

```bash
# Start database
docker-compose up -d postgres

# Wait for it to be ready
sleep 10

# Run migrations
cd backend
npm run db:migrate
```

## Check Status

```bash
# Is Docker running?
docker info

# Is database container running?
docker ps | grep postgres

# Check database logs
docker-compose logs postgres
```

## Troubleshooting

**"Cannot connect to Docker daemon"**
- Docker Desktop is not running
- Start Docker Desktop application
- Wait for it to fully initialize

**"Port already in use"**
- Another PostgreSQL instance might be running
- Stop it or change the port in docker-compose.yml

**Container exits immediately**
- Check logs: `docker-compose logs postgres`
- Ensure Docker has enough resources allocated

## Current Status

- ✅ Environment files configured
- ✅ Database URL ready
- ✅ Migration scripts ready
- ⏳ **Waiting for Docker Desktop to start**

**Next:** Start Docker Desktop → Run `./setup-database.sh`

