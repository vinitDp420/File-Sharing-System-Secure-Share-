# SecureShare — Local Development Startup Script (PowerShell)
# Run: .\start.ps1

Write-Host "🚀 Starting SecureShare..." -ForegroundColor Cyan

# 1. Generate datasets
Write-Host "📊 Generating datasets..." -ForegroundColor Yellow
Set-Location datasets
python generate_datasets.py
Set-Location ..

# 2. Install backend deps
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# 3. Install node-simulator deps
Write-Host "📦 Installing node-simulator dependencies..." -ForegroundColor Yellow
Set-Location node-simulator
npm install
Set-Location ..

# 4. Install frontend deps
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "To start all services (in separate terminals):" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd backend; npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: cd node-simulator; $env:PORT=6001; $env:NODE_ID='N001'; $env:REGION='us-east'; node server.js" -ForegroundColor White
Write-Host "  Terminal 3: cd node-simulator; $env:PORT=6002; $env:NODE_ID='N002'; $env:REGION='us-west'; node server.js" -ForegroundColor White
Write-Host "  Terminal 4: cd node-simulator; $env:PORT=6003; $env:NODE_ID='N003'; $env:REGION='eu-central'; node server.js" -ForegroundColor White
Write-Host "  Terminal 5: cd ml-service; pip install -r requirements.txt; uvicorn main:app --reload --port 8000" -ForegroundColor White
Write-Host "  Terminal 6: cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use Docker: docker compose up --build" -ForegroundColor Green
