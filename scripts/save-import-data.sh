#!/bin/bash
# Helper script to save imported data
# Usage: ./scripts/save-import-data.sh

echo "Paste your tab-separated data (press Ctrl+D when done):"
cat > data/transcript-requests.tsv

echo ""
echo "✅ Data saved to data/transcript-requests.tsv"
echo ""
echo "To import, run:"
echo "  cd backend && npm run import:data ../data/transcript-requests.tsv"


