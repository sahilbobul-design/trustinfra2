#!/bin/bash
# Deployment script for TrustInfra

set -e

echo "🚀 TrustInfra Deployment Script"
echo "================================"

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose not found"; exit 1; }

# Environment setup
echo "✓ Setting up environment..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "⚠️  Created .env.local - Please update with your values"
fi

# Install dependencies
echo "✓ Installing dependencies..."
npm install

# Build all services
echo "✓ Building services..."
docker-compose build

# Deploy contracts
echo "✓ Deploying smart contracts..."
npm run build

# Start services
echo "✓ Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "✓ Waiting for services to start..."
sleep 10

# Check service health
echo "✓ Checking service health..."
curl -s http://localhost:5000/api/health | jq . || echo "Backend not ready yet"
curl -s http://localhost:5001/health | jq . || echo "Relayer not ready yet"
curl -s http://localhost:3000 > /dev/null || echo "Dashboard not ready yet"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Access your services at:"
echo "   - Dashboard:  http://localhost:3000"
echo "   - Backend:    http://localhost:5000"
echo "   - Relayer:    http://localhost:5001"
echo "   - Blockchain: http://localhost:8545"
echo ""
echo "📚 View logs with: docker-compose logs -f [service-name]"
echo "🛑 Stop services with: docker-compose down"
