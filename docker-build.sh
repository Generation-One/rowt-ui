#!/bin/bash

# Rowt UI Docker Build Script
set -e

echo "🐳 Building Rowt UI Docker Image..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with ROWT_API_ENDPOINT=your-server-url"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$ROWT_API_ENDPOINT" ]; then
    echo "❌ Error: ROWT_API_ENDPOINT not set in .env file"
    exit 1
fi

echo "✅ Configuration loaded:"
echo "   API Endpoint: $ROWT_API_ENDPOINT"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t rowt-ui:latest .

echo "✅ Docker image built successfully!"

# Optional: Run the container
read -p "🚀 Do you want to start the container now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting Rowt UI container..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Container started!"
    echo "📱 Frontend available at: http://localhost"
    echo "🔗 API Endpoint: $ROWT_API_ENDPOINT"
    echo ""
    echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "To stop: docker-compose -f docker-compose.prod.yml down"
fi
