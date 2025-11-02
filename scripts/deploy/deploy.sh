#!/bin/bash

# TAPS Production Deployment Script

set -e

echo "🚀 TAPS Production Deployment"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "Logging in..."
    az login
fi

echo -e "${GREEN}✅ Azure CLI ready${NC}"
echo ""

# Configuration
RESOURCE_GROUP="taps-rg"
LOCATION="eastus"
APP_SERVICE_PLAN="taps-appservice-plan"
BACKEND_APP="taps-backend-prod"
DB_SERVER="taps-postgres-prod"
DB_NAME="taps_db"

# Check if resource group exists
if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "Creating resource group..."
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo -e "${GREEN}✅ Resource group created${NC}"
else
    echo -e "${GREEN}✅ Resource group exists${NC}"
fi

# Build frontend
echo ""
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Prepare backend
echo ""
echo "📦 Preparing backend..."
cd backend
npm ci
npm run db:generate

# Copy frontend build to backend public directory
echo ""
echo "📦 Copying frontend build to backend..."
mkdir -p public
cp -r ../frontend/dist/* public/

# Deploy to Azure
echo ""
echo "🚀 Deploying to Azure App Service..."
cd ..
az webapp up \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP \
    --plan $APP_SERVICE_PLAN \
    --location $LOCATION \
    --runtime "NODE:20-lts" \
    --sku B1

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in Azure Portal"
echo "2. Run database migrations: cd backend && npm run db:migrate:prod"
echo "3. Visit your app: https://${BACKEND_APP}.azurewebsites.net"

