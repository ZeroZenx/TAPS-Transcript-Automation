# 🚀 DEPLOY NOW - Step by Step

## ✅ Pre-Deployment Complete

- ✅ Azure CLI installed
- ✅ Code ready for production
- ✅ Build process verified
- ⏳ **Azure login required** (interactive)

## 🎯 Deployment Steps

### Step 1: Login to Azure (Required - Interactive)
```bash
az login
```
This will:
- Open your browser
- Ask you to sign in
- Complete authentication

**After login completes, proceed to Step 2.**

### Step 2: Verify Login
```bash
az account show
```
Should show your Azure subscription info.

### Step 3: Set Subscription (If Multiple)
```bash
# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your Subscription Name"
```

### Step 4: Deploy Infrastructure
```bash
cd "/Users/darrenheadley/cursor/Student Debt Validation Web App "
./scripts/deploy/setup-azure.sh
```

This creates:
- Resource group (`taps-rg`)
- PostgreSQL database
- App Service Plan
- Web App

### Step 5: Configure Environment Variables

After infrastructure is created, set these in Azure Portal:

1. Go to: https://portal.azure.com
2. Navigate to: Resource Groups → `taps-rg` → `taps-backend-prod`
3. Configuration → Application settings
4. Add these settings:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=<get-from-database-connection-string>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
FRONTEND_URL=https://taps-backend-prod.azurewebsites.net
SHAREPOINT_SITE_ID=<optional>
SHAREPOINT_DRIVE_ID=<optional>
POWER_AUTOMATE_WEBHOOK_URL=<optional>
```

### Step 6: Deploy Application
```bash
./scripts/deploy/deploy.sh
```

### Step 7: Run Database Migrations
```bash
# Get connection string
az postgres flexible-server show-connection-string \
  --server taps-postgres-prod \
  --database taps_db \
  --admin-user tapsadmin \
  --admin-password <your-password>

# Set it temporarily and run migrations
export DATABASE_URL="<connection-string-from-above>"
cd backend
npm run db:migrate:prod
```

### Step 8: Verify Deployment
Visit: `https://taps-backend-prod.azurewebsites.net/api/health`

Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

## 🎉 You're Live!

Your application will be available at:
`https://taps-backend-prod.azurewebsites.net`

## ⚡ Quick Command Sequence

```bash
# 1. Login
az login

# 2. Setup infrastructure
./scripts/deploy/setup-azure.sh

# 3. Configure env vars in Azure Portal (see above)

# 4. Deploy
./scripts/deploy/deploy.sh

# 5. Run migrations (after getting DATABASE_URL)
export DATABASE_URL="<connection-string>"
cd backend && npm run db:migrate:prod
```

## 🆘 Troubleshooting

**Login Issues:**
- Make sure you have an active Azure subscription
- Try: `az login --use-device-code` for device code flow

**Deployment Fails:**
- Check resource group exists: `az group list`
- Verify subscription: `az account show`
- Check logs: `az webapp log tail --name taps-backend-prod`

**Database Connection:**
- Get connection string from Azure Portal → Database → Connection strings
- Verify firewall allows Azure services

---

**Ready?** Start with: `az login`

