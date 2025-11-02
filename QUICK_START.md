# Quick Start Guide

## Option 1: Using Docker (Recommended for Database)

### Start Database Only
```bash
docker-compose up -d postgres
```

Wait 10 seconds for database to be ready, then:
```bash
cd backend
npm run db:migrate
```

### Start Full Stack
```bash
docker-compose up -d
```

## Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database:
   ```bash
   createdb taps_db
   ```

3. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/taps_db
   ```

4. Run migrations:
   ```bash
   cd backend
   npm run db:migrate
   ```

## Environment Setup

### Backend `.env` file location: `backend/.env`
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://taps_user:taps_password@localhost:5432/taps_db

# Azure AD (get from Azure Portal)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# Optional
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
POWER_AUTOMATE_WEBHOOK_URL=

FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` file location: `frontend/.env`
```env
VITE_API_URL=http://localhost:4000/api
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_REDIRECT_URI=http://localhost:5173
```

## Running the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Visit: http://localhost:5173

## First Time Setup Checklist

- [ ] Database running (Docker or local PostgreSQL)
- [ ] Backend `.env` file created with DATABASE_URL
- [ ] Run `npm run db:migrate` in backend/
- [ ] Azure AD App Registration created
- [ ] Backend `.env` has Azure credentials
- [ ] Frontend `.env` has Azure credentials
- [ ] Both servers running

## Troubleshooting

**Database Connection Error:**
- Check Docker is running: `docker ps`
- Verify DATABASE_URL in backend/.env
- Wait 10 seconds after starting postgres container

**Azure AD Login Issues:**
- Verify Client ID and Tenant ID match in both .env files
- Check redirect URI matches Azure portal configuration
- Ensure client secret is not expired

**Port Already in Use:**
- Backend (4000): Change PORT in backend/.env
- Frontend (5173): Change in frontend/vite.config.ts

