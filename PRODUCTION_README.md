# 🚀 TAPS Production Deployment

## Quick Start

### 1. Setup Azure Infrastructure (One-time)
```bash
az login
./scripts/deploy/setup-azure.sh
```

### 2. Configure Environment
- Update environment variables in Azure Portal
- See `PRODUCTION_CHECKLIST.md` for full list

### 3. Deploy
```bash
./scripts/deploy/deploy.sh
```

### 4. Run Migrations
```bash
export DATABASE_URL="<production-connection-string>"
cd backend && npm run db:migrate:prod
```

## Architecture

```
┌─────────────────┐
│  Azure App      │
│  Service        │─── Backend (Node.js + Express)
│  (Backend)      │
└────────┬────────┘
         │
         ├───> Azure PostgreSQL (Database)
         │
         ├───> Azure AD (Authentication)
         │
         └───> SharePoint (File Storage)
```

## Files Structure

- `scripts/deploy/` - Deployment scripts
- `.github/workflows/` - CI/CD workflows
- `.azure/` - ARM templates
- `DEPLOYMENT.md` - Detailed deployment guide
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist

## Deployment Methods

### Option 1: Automated Script (Recommended)
```bash
./scripts/deploy/deploy.sh
```

### Option 2: Azure CLI
```bash
az webapp up --name taps-backend-prod --resource-group taps-rg
```

### Option 3: GitHub Actions
- Push to `main` branch
- Automatic deployment via GitHub Actions

### Option 4: VS Code Azure Extension
- Install Azure App Service extension
- Right-click `backend` folder → Deploy to Web App

## Environment Variables

All production environment variables must be set in Azure Portal:
- Web App → Configuration → Application settings

Required variables are listed in `PRODUCTION_CHECKLIST.md`

## Monitoring

- **Logs**: Azure Portal → Web App → Log stream
- **Metrics**: Azure Portal → Web App → Metrics
- **Application Insights**: Enable for detailed analytics

## Troubleshooting

### Deployment Fails
- Check Azure CLI login: `az account show`
- Verify resource group exists
- Check App Service Plan status

### Database Connection Issues
- Verify DATABASE_URL format
- Check database firewall rules
- Ensure database server is running

### Application Not Starting
- Check logs: `az webapp log tail --name taps-backend-prod`
- Verify NODE_ENV=production
- Check PORT=8080

## Support

- Documentation: See `DEPLOYMENT.md` for detailed guide
- Checklist: See `PRODUCTION_CHECKLIST.md`
- Quick Deploy: See `QUICK_DEPLOY.md`

---

**Ready to deploy?** Start with `QUICK_DEPLOY.md` for fastest path to production!

