#!/bin/bash

# Quick verification script

echo "🔍 Quick TAPS Verification"
echo ""

# Check frontend build
echo "Checking frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

# Check backend structure
echo "Checking backend structure..."
if [ -f "backend/server.js" ] && [ -f "backend/routes/auth.js" ]; then
    echo "✅ Backend structure complete"
else
    echo "❌ Backend structure incomplete"
    exit 1
fi

# Check Prisma
if [ -d "backend/node_modules/@prisma/client" ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Prisma client not generated"
    exit 1
fi

echo ""
echo "🎉 All checks passed!"
echo ""
echo "Next: Configure database and Azure AD"
echo "See: NEXT_STEPS.md"

