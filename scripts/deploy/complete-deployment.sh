#!/bin/bash

# Complete TAPS Deployment Automation
# This script handles the ENTIRE deployment process end-to-end

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         TAPS - COMPLETE PRODUCTION DEPLOYMENT                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Verify Prerequisites
echo -e "${BLUE}[1/7]${NC} Verifying prerequisites..."
echo ""

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found${NC}"
    echo "Installing Azure CLI..."
    if command -v brew &> /dev/null; then
        brew install azure-cli
    else
        echo "Please install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Azure CLI found${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found${NC}"

echo ""
echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Step 2: Azure Authentication
echo -e "${BLUE}[2/7]${NC} Azure Authentication"
echo ""

if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "Attempting login with device code..."
    echo ""
    echo "A device code will be displayed. Go to https://microsoft.com/devicelogin"
    echo "and enter the code to authenticate."
    echo ""
    
    if ! az login --use-device-code; then
        echo -e "${RED}❌ Login failed. Please run: az login${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Authenticated to Azure${NC}"
ACCOUNT=$(az account show --query "{Name:name, SubscriptionId:id}" -o tsv)
echo "Account: $(echo $ACCOUNT | cut -f1)"
echo ""

# Step 3: Set Subscription (if multiple)
echo -e "${BLUE}[3/7]${NC} Verifying subscription"
SUBSCRIPTIONS=$(az account list --query "[].{Name:name, Id:id, IsDefault:isDefault}" -o tsv | wc -l | tr -d ' ')
if [ "$SUBSCRIPTIONS" -gt 1 ]; then
    echo "Multiple subscriptions found. Using default..."
    az account show --query "{Name:name, Id:id}" -o table
else
    echo -e "${GREEN}✅ Using current subscription${NC}"
fi
echo ""

# Step 4: Build Application
echo -e "${BLUE}[4/7]${NC} Building application"
echo ""

echo "Building frontend..."
cd frontend
npm ci --silent
npm run build
echo -e "${GREEN}✅ Frontend built${NC}"

echo "Preparing backend..."
cd ../backend
npm ci --silent
npm run db:generate
echo -e "${GREEN}✅ Backend prepared${NC}"

cd ..
echo ""

# Step 5: Setup Azure Infrastructure
echo -e "${BLUE}[5/7]${NC} Setting up Azure infrastructure"
echo ""

bash scripts/deploy/setup-azure.sh

echo ""

# Step 6: Configure Environment
echo -e "${BLUE}[6/7]${NC} Configuration"
echo ""
echo -e "${YELLOW}⚠️  Environment variables need to be set manually${NC}"
echo ""
echo "After deployment, configure these in Azure Portal:"
echo "  Web App → Configuration → Application settings"
echo ""
echo "Required variables:"
echo "  - DATABASE_URL"
echo "  - AZURE_TENANT_ID"
echo "  - AZURE_CLIENT_ID"
echo "  - AZURE_CLIENT_SECRET"
echo "  - FRONTEND_URL"
echo ""

# Step 7: Deploy Application
echo -e "${BLUE}[7/7]${NC} Deploying application"
echo ""

bash scripts/deploy/deploy.sh

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ✅ DEPLOYMENT COMPLETE!                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Get deployment URL
RESOURCE_GROUP="taps-rg"
WEB_APP="taps-backend-prod"

if az webapp show --resource-group $RESOURCE_GROUP --name $WEB_APP &> /dev/null; then
    URL=$(az webapp show --resource-group $RESOURCE_GROUP --name $WEB_APP --query defaultHostName -o tsv)
    echo -e "${GREEN}🌐 Your application is live at:${NC}"
    echo "   https://${URL}"
    echo ""
    echo -e "${GREEN}🔍 Health check:${NC}"
    echo "   https://${URL}/api/health"
    echo ""
fi

echo -e "${YELLOW}⚠️  Final Steps:${NC}"
echo ""
echo "1. Configure environment variables in Azure Portal"
echo "2. Run database migrations:"
echo "   export DATABASE_URL='<your-connection-string>'"
echo "   cd backend && npm run db:migrate:prod"
echo ""
echo "3. Test your application"
echo ""

echo -e "${GREEN}🎉 Deployment process complete!${NC}"

