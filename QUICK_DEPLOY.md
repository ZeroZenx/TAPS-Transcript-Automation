# ⚡ Quick Production Deployment

## Fast Track to Production

### Prerequisites
- Azure account with active subscription
- Azure CLI installed (`az --version`)

### Step 1: Login to Azure
```bash
az login
```

### Step 2: Set Up Infrastructure
```bash
./scripts/deploy/setup-azure.sh
```

This creates:
- Resource group
- PostgreSQL database
- App Service Plan
- Web App

### Step 3: Get Database Connection String
```bash
# After setup, get connection string
az postgres flexible-server show-connection-string \
  --server taps-postgres-prod \
  --database taps_db \
  --admin-user tapsadmin \
  --admin-password <your-password>
```

### Step 4: Configure Environment Variables

In Azure Portal:
1. Go to your Web App
2. Configuration → Application settings
3. Add these variables:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=<connection-string-from-step-3>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
FRONTEND_URL=https://taps-backend-prod.azurewebsites.net
SHAREPOINT_SITE_ID=<optional>
SHAREPOINT_DRIVE_ID=<optional>
POWER_AUTOMATE_WEBHOOK_URL=<optional>
```

### Step 5: Deploy
```bash
./scripts/deploy/deploy.sh
```

### Step 6: Run Migrations
```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="<your-connection-string>"
cd backend
npm run db:migrate:prod
```

### Step 7: Verify
Visit: `https://taps-backend-prod.azurewebsites.net/api/health`

Should return: `{"status":"ok"}`

## ⚠️ Important Production Notes

1. **Azure AD**: Update redirect URI to production URL
2. **Database**: Use production connection string
3. **Security**: All secrets in Azure Key Vault (recommended)
4. **HTTPS**: Automatically enabled on Azure App Service
5. **Monitoring**: Enable Application Insights

## 🎉 You're Live!

Your application is now in production at:
`https://taps-backend-prod.azurewebsites.net`

## Next Steps

- Set up custom domain (optional)
- Configure Application Insights
- Set up backup schedules
- Configure alerts

