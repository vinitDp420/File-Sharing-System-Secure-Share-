@echo off
echo Starting SecureShare Services...

start "Backend" cmd /c "cd backend && npm run dev"
start "Node 1" cmd /c "cd node-simulator && set PORT=6001 && set NODE_ID=N001 && set REGION=us-east && node server.js"
start "Node 2" cmd /c "cd node-simulator && set PORT=6002 && set NODE_ID=N002 && set REGION=us-west && node server.js"
start "Node 3" cmd /c "cd node-simulator && set PORT=6003 && set NODE_ID=N003 && set REGION=eu-central && node server.js"
start "ML Service" cmd /c "cd ml-service && uvicorn main:app --reload --port 8000"
start "Frontend" cmd /c "cd frontend && npm run dev"

echo All services launched!
