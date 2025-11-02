# TAPS Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Azure AD App Registration (for authentication)

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Database Setup

Create a PostgreSQL database:
```bash
createdb taps_db
```

Or using psql:
```sql
CREATE DATABASE taps_db;
```

Set your database URL in `backend/.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/taps_db
```

Run migrations:
```bash
cd backend
npm run db:migrate
npm run db:generate
```

(Optional) Seed sample data:
```bash
npm run db:seed
```

### 4. Environment Configuration

#### Backend (.env)
Create `backend/.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/taps_db

# Azure AD
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# SharePoint (optional for development)
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=

# Power Automate (optional)
POWER_AUTOMATE_WEBHOOK_URL=

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000/api
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_REDIRECT_URI=http://localhost:5173
```

### 5. Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - Name: `TAPS Transcript System`
   - Supported account types: Your organization only
   - Redirect URI: `http://localhost:5173` (SPA)
5. After creation, note:
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Go to **Certificates & secrets**
7. Create a new **Client secret** and save the value
8. Go to **API permissions**
   - Add **Microsoft Graph** > **User.Read**
   - Grant admin consent if needed

### 6. Run Development Servers

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

Visit: http://localhost:5173

### 7. First Login

1. Click "Sign in with Microsoft"
2. Use your Azure AD credentials
3. If you're the first user, you'll be created with STUDENT role
4. Admin can change your role in User Management

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists

### Azure AD Login Issues
- Verify client ID and tenant ID in .env files
- Check redirect URI matches Azure portal
- Ensure client secret is valid

### Prisma Errors
- Run `npm run db:generate` after schema changes
- Check DATABASE_URL is correct
- Ensure database exists

### Frontend Build Issues
- Clear node_modules and reinstall
- Check TypeScript errors: `npm run build`
- Verify all environment variables are set

## Production Deployment

See README.md for Azure App Service deployment instructions.

