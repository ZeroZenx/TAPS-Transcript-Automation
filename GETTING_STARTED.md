# 🚀 Getting Started with TAPS

## Quick Setup (5 Minutes)

### 1. Start Docker Desktop
Make sure Docker Desktop application is running.

### 2. Setup Database
```bash
./setup-database.sh
```

This will:
- Start PostgreSQL container
- Wait for it to be ready
- Run database migrations
- Create all tables

### 3. Configure Azure AD (5 minutes)

You need an Azure AD App Registration. Follow the steps in `NEXT_STEPS.md` or:

1. Go to https://portal.azure.com
2. Azure Active Directory > App registrations > New registration
3. Name: `TAPS Transcript System`
4. Redirect URI: `http://localhost:5173` (SPA)
5. Copy Client ID, Tenant ID
6. Create Client Secret

### 4. Create Environment Files

**`backend/.env`:**
```env
DATABASE_URL=postgresql://taps_user:taps_password@localhost:5432/taps_db
AZURE_TENANT_ID=<from-azure>
AZURE_CLIENT_ID=<from-azure>
AZURE_CLIENT_SECRET=<from-azure>
```

**`frontend/.env`:**
```env
VITE_AZURE_CLIENT_ID=<from-azure>
VITE_AZURE_TENANT_ID=<from-azure>
```

### 5. Start Servers

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

### 6. Open Application
Visit: http://localhost:5173

Login with your Azure AD account!

---

## What You Have Now

✅ Complete full-stack application  
✅ Microsoft 365-style UI  
✅ Azure AD authentication  
✅ Role-based access control  
✅ Database with migrations  
✅ All pages and features  
✅ Ready for development  

---

## Need Help?

- **Detailed Setup**: `SETUP.md`
- **Next Steps**: `NEXT_STEPS.md`
- **Project Status**: `PROJECT_STATUS.md`
- **Quick Reference**: `QUICK_START.md`

## Common Issues

**Docker not running?**
- Start Docker Desktop
- Wait for it to fully start
- Run `docker ps` to verify

**Database connection error?**
- Check Docker is running
- Verify DATABASE_URL in backend/.env
- Run `docker-compose ps` to check postgres container

**Azure login not working?**
- Verify Client ID and Tenant ID in both .env files
- Check redirect URI matches Azure portal
- Ensure client secret is valid

---

**You're all set!** 🎉

