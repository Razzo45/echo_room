# Quick Admin Panel Testing Script (PowerShell)
# This script helps you quickly test the admin panel locally

Write-Host "🚀 Admin Panel Testing Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file. Please update DATABASE_URL if needed." -ForegroundColor Green
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host ""
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
Write-Host ""

# Check database connection and apply migrations
Write-Host "🗄️  Applying database migrations..." -ForegroundColor Cyan
Write-Host "   (If this fails, try: npx prisma db push)" -ForegroundColor Yellow
try {
    npx prisma migrate deploy
} catch {
    Write-Host "   Migration failed, trying db push..." -ForegroundColor Yellow
    npx prisma db push
}
Write-Host ""

# Start dev server
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure your DATABASE_URL in .env is correct"
Write-Host "   2. Run: npm run dev"
Write-Host "   3. Visit: http://localhost:3000/admin/login"
Write-Host "   4. Login with password: admin123 (or check your ADMIN_PASSWORD)"
Write-Host ""
Write-Host "📖 For detailed testing guide, see: ADMIN_TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
