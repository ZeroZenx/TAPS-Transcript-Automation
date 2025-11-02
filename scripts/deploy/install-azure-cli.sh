#!/bin/bash

# Install Azure CLI

echo "📥 Installing Azure CLI..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        echo "Using Homebrew to install Azure CLI..."
        brew update && brew install azure-cli
    else
        echo "⚠️  Homebrew not found. Installing via direct download..."
        curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
else
    echo "❌ Unsupported OS. Please install Azure CLI manually:"
    echo "   https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

echo ""
echo "✅ Azure CLI installed!"
echo ""
echo "Next step: Login to Azure"
echo "Run: az login"

