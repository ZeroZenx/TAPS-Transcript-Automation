# 🚀 TAPS Production Deployment Guide

## Production Architecture

### Azure Services Required
- **Azure App Service** - Hosts Node.js backend
- **Azure Database for PostgreSQL** - Production database
- **Azure Static Web Apps** (or App Service) - Hosts React frontend
- **Azure Key Vault** - Secure credential storage (optional)
- **Azure Application Insights** - Monitoring (optional)

## Pre-Deployment Checklist

- [ ] Azure account with active subscription
- [ ] Azure CLI installed and logged in
- [ ] Production database configured
- [ ] Azure AD App Registration configured for production
- [ ] SharePoint site configured for production
- [ ] Power Automate webhook URL for production
- [ ] Domain name (optional)

## Step 1: Create Azure Resources

### Create Resource Group
```bash
az group create --name taps-rg --location eastus
```

### Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group taps-rg \
  --name taps-postgres-prod \
  --location eastus \
  --admin-user tapsadmin \
  --admin-password <strong-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0
```

### Create Database
```bash
az postgres flexible-server db create \
  --resource-group taps-rg \
  --server-name taps-postgres-prod \
  --database-name taps_db
```

### Create App Service Plan
```bash
az appservice plan create \
  --name taps-appservice-plan \
  --resource-group taps-rg \
  --location eastus \
  --sku B1
```

### Create Web App (Backend)
```bash
az webapp create \
  --resource-group taps-rg \
  --plan taps-appservice-plan \
  --name taps-backend-prod \
  --runtime "NODE:20-lts"
```

### Create Static Web App (Frontend)
```bash
az staticwebapp create \
  --name taps-frontend-prod \
  --resource-group taps-rg \
  --location eastus \
  --sku Standard
```

## Step 2: Configure Production Environment

### Set Backend Environment Variables
```bash
az webapp config appsettings set \
  --resource-group taps-rg \
  --name taps-backend-prod \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="<connection-string>" \
    AZURE_TENANT_ID="<tenant-id>" \
    AZURE_CLIENT_ID="<client-id>" \
    AZURE_CLIENT_SECRET="<client-secret>" \
    SHAREPOINT_SITE_ID="<site-id>" \
    SHAREPOINT_DRIVE_ID="<drive-id>" \
    POWER_AUTOMATE_WEBHOOK_URL="<webhook-url>" \
    FRONTEND_URL="<production-frontend-url>"
```

## Step 3: Configure Deployment

See deployment scripts in `scripts/deploy/` directory.

## Step 4: Run Database Migrations

```bash
# Connect to production database and run migrations
cd backend
npm run db:migrate:prod
```

## Step 5: Deploy Application

```bash
./scripts/deploy/deploy.sh
```

## Monitoring & Maintenance

- Set up Application Insights
- Configure alerts
- Set up backup schedules
- Monitor database performance

