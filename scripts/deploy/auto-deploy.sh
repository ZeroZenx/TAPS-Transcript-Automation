#!/bin/bash

# Complete Automated Deployment Script
# This script handles the entire deployment process

set -e

echo "🚀 TAPS Automated Deployment"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found${NC}"
    echo "Installing Azure CLI..."
    
    if command -v brew &> /dev/null; then
        brew install azure-cli
    else
        echo "Please install Azure CLI manually: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Azure CLI found${NC}"

# Check login
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "Please login to Azure..."
    echo "This will open a browser for authentication..."
    az login
    
    if ! az account show &> /dev/null; then
        echo -e "${RED}❌ Login failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Logged in to Azure${NC}"
echo ""

# Show current subscription
echo "Current Azure subscription:"
az account show --query "{Name:name, SubscriptionId:id}" --output table
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Run setup
echo ""
echo "🏗️  Setting up Azure infrastructure..."
bash scripts/deploy/setup-azure.sh

# Run deployment
echo ""
echo "🚀 Deploying application..."
bash scripts/deploy/deploy.sh

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in Azure Portal"
echo "2. Run database migrations"
echo "3. Visit your app!"

