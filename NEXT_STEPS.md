# Next Steps to Get TAPS Running

## ✅ What's Been Completed

- ✅ All dependencies installed
- ✅ Prisma client generated
- ✅ Configuration files created
- ✅ Database setup script ready

## 🎯 Immediate Next Steps

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running on your machine.

### Step 2: Run Database Setup
```bash
./setup-database.sh
```

Or manually:
```bash
# Start database
docker-compose up -d postgres

# Wait 10 seconds, then run migrations
cd backend
npm run db:migrate
```

### Step 3: Configure Azure AD (Required for Login)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `TAPS Transcript System`
   - **Supported account types**: Single tenant
   - **Redirect URI**: 
     - Platform: **Single-page application (SPA)**
     - URL: `http://localhost:5173`

5. After creation, copy:
   - **Application (client) ID** → Use in both .env files
   - **Directory (tenant) ID** → Use in both .env files

6. Create Client Secret:
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Copy the **Value** (not the Secret ID)
   - Use this in `backend/.env` as `AZURE_CLIENT_SECRET`

7. Add API Permission:
   - Go to **API permissions**
   - Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**
   - Add **User.Read**
   - Click **Add permissions**
   - (Optional) Click **Grant admin consent**

### Step 4: Update Environment Files

**Create `backend/.env`:**
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://taps_user:taps_password@localhost:5432/taps_db

AZURE_TENANT_ID=your-tenant-id-from-azure
AZURE_CLIENT_ID=your-client-id-from-azure
AZURE_CLIENT_SECRET=your-client-secret-from-azure
AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

FRONTEND_URL=http://localhost:5173
```

**Create `frontend/.env`:**
```env
VITE_API_URL=http://localhost:4000/api
VITE_AZURE_CLIENT_ID=your-client-id-from-azure
VITE_AZURE_TENANT_ID=your-tenant-id-from-azure
VITE_REDIRECT_URI=http://localhost:5173
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 6: Access Application

1. Open browser: http://localhost:5173
2. Click "Sign in with Microsoft"
3. Login with your Azure AD account
4. You'll be automatically created as a STUDENT
5. Admin can change roles in User Management page

## 🔍 Quick Verification

Check if everything is working:
```bash
# Database running?
docker ps | grep postgres

# Backend running?
curl http://localhost:4000/api/health

# Frontend accessible?
open http://localhost:5173
```

## 📋 Development Workflow

1. **Make changes** to code
2. **Backend auto-reloads** (using node --watch)
3. **Frontend hot-reloads** (Vite HMR)
4. **Check browser console** for errors

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure Docker Desktop is running
- Check container: `docker ps`
- Verify DATABASE_URL format in backend/.env
- Wait 10 seconds after starting postgres

### Azure AD Login Not Working
- Verify Client ID matches in both .env files
- Check Tenant ID is correct
- Ensure redirect URI matches Azure portal exactly
- Client secret might be expired - create new one

### Port Already in Use
- Change PORT in backend/.env
- Change port in frontend/vite.config.ts

### Prisma Errors
- Run: `cd backend && npm run db:generate`
- Check DATABASE_URL is correct

## 📚 Additional Resources

- **Detailed Setup**: See `SETUP.md`
- **Project Status**: See `PROJECT_STATUS.md`
- **Quick Reference**: See `QUICK_START.md`
- **Full Documentation**: See `README.md`

## ✅ Ready When:

- [ ] Docker Desktop running
- [ ] Database migrated (`npm run db:migrate` succeeded)
- [ ] Azure AD configured and credentials in .env files
- [ ] Backend server running (Terminal 1)
- [ ] Frontend server running (Terminal 2)
- [ ] Can login at http://localhost:5173

