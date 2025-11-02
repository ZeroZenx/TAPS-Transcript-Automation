# 🚀 Production Deployment Checklist

## Pre-Deployment

### Azure Setup
- [ ] Azure subscription active
- [ ] Azure CLI installed and logged in
- [ ] Resource group created
- [ ] PostgreSQL database created
- [ ] App Service Plan created
- [ ] Web App created

### Configuration
- [ ] Production database connection string
- [ ] Azure AD App Registration for production
  - [ ] Production redirect URI configured
  - [ ] Client ID
  - [ ] Client Secret
  - [ ] Tenant ID
- [ ] SharePoint production site
  - [ ] Site ID
  - [ ] Drive ID
- [ ] Power Automate production webhook URL
- [ ] Production frontend URL

### Code
- [ ] All tests passing
- [ ] Frontend builds successfully
- [ ] Backend verified
- [ ] Environment variables documented

## Deployment Steps

### 1. Infrastructure
```bash
# Run Azure setup
./scripts/deploy/setup-azure.sh
```

### 2. Configure Environment Variables
In Azure Portal → Your Web App → Configuration → Application settings:

Required:
- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_URL=<production-connection-string>`
- `AZURE_TENANT_ID=<tenant-id>`
- `AZURE_CLIENT_ID=<client-id>`
- `AZURE_CLIENT_SECRET=<client-secret>`
- `FRONTEND_URL=<production-frontend-url>`

Optional:
- `SHAREPOINT_SITE_ID=<site-id>`
- `SHAREPOINT_DRIVE_ID=<drive-id>`
- `POWER_AUTOMATE_WEBHOOK_URL=<webhook-url>`

### 3. Deploy Application
```bash
./scripts/deploy/deploy.sh
```

### 4. Run Migrations
```bash
# Set DATABASE_URL in environment
export DATABASE_URL="<production-connection-string>"
cd backend
npm run db:migrate:prod
```

### 5. Verify Deployment
- [ ] Backend health check: `https://your-app.azurewebsites.net/api/health`
- [ ] Frontend accessible
- [ ] Login works
- [ ] Database connection verified

## Post-Deployment

### Monitoring
- [ ] Application Insights configured
- [ ] Alerts set up
- [ ] Log streaming enabled

### Security
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Database firewall configured
- [ ] Authentication working

### Performance
- [ ] CDN configured (if needed)
- [ ] Caching configured
- [ ] Database indexes verified

### Backup
- [ ] Database backup scheduled
- [ ] Backup retention policy set

## Rollback Plan

If deployment fails:
1. Previous deployment in deployment history
2. Can redeploy via Azure Portal
3. Database migrations are versioned

## Support Information

- Application URL: `https://taps-backend-prod.azurewebsites.net`
- Database: Azure PostgreSQL Flexible Server
- Logs: Azure Portal → Web App → Log stream

