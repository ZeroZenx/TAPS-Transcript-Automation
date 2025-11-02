#!/bin/bash

# Azure Infrastructure Setup Script

set -e

echo "🏗️  Setting up Azure Infrastructure for TAPS"
echo ""

# Configuration
RESOURCE_GROUP="taps-rg"
LOCATION="eastus"
APP_SERVICE_PLAN="taps-appservice-plan"
BACKEND_APP="taps-backend-prod"
DB_SERVER="taps-postgres-prod"
DB_NAME="taps_db"
DB_ADMIN_USER="tapsadmin"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not installed${NC}"
    exit 1
fi

# Login check
if ! az account show &> /dev/null; then
    echo "Please login to Azure..."
    az login
fi

echo -e "${GREEN}✅ Azure CLI ready${NC}"
echo ""

# Create Resource Group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION || true
echo -e "${GREEN}✅ Resource group ready${NC}"

# Create PostgreSQL Flexible Server
echo ""
echo "Creating PostgreSQL database..."
echo -e "${YELLOW}⚠️  You'll be prompted for database admin password${NC}"

az postgres flexible-server create \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER \
    --location $LOCATION \
    --admin-user $DB_ADMIN_USER \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --version 15 \
    --storage-size 32 \
    --public-access 0.0.0.0 \
    --high-availability Disabled \
    || echo "Database server may already exist"

# Create database
echo ""
echo "Creating database..."
az postgres flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $DB_SERVER \
    --database-name $DB_NAME \
    || echo "Database may already exist"

# Create App Service Plan
echo ""
echo "Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux \
    || echo "App Service Plan may already exist"

# Create Web App
echo ""
echo "Creating Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $BACKEND_APP \
    --runtime "NODE:20-lts" \
    || echo "Web App may already exist"

# Configure Node.js
echo ""
echo "Configuring Node.js..."
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP \
    --linux-fx-version "NODE|20-lts"

echo ""
echo -e "${GREEN}✅ Azure infrastructure setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Get database connection string:"
echo "   az postgres flexible-server show-connection-string --server $DB_SERVER --database $DB_NAME --admin-user $DB_ADMIN_USER --admin-password <password>"
echo ""
echo "2. Set environment variables:"
echo "   See DEPLOYMENT.md for full configuration"
echo ""
echo "3. Deploy application:"
echo "   ./scripts/deploy/deploy.sh"

