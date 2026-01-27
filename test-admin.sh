#!/bin/bash

# Quick Admin Panel Testing Script
# This script helps you quickly test the admin panel locally

echo "🚀 Admin Panel Testing Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update DATABASE_URL if needed."
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo ""

# Check database connection and apply migrations
echo "🗄️  Applying database migrations..."
echo "   (If this fails, try: npx prisma db push)"
npx prisma migrate deploy || npx prisma db push
echo ""

# Start dev server
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure your DATABASE_URL in .env is correct"
echo "   2. Run: npm run dev"
echo "   3. Visit: http://localhost:3000/admin/login"
echo "   4. Login with password: admin123 (or check your ADMIN_PASSWORD)"
echo ""
echo "📖 For detailed testing guide, see: ADMIN_TESTING_GUIDE.md"
echo ""
