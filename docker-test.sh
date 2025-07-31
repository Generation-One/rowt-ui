#!/bin/bash

# Docker Test Script for Rowt UI
# Tests both development and production Docker setups

set -e

echo "🐳 Testing Rowt UI Docker Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from example..."
    if [ -f .env.ui.example ]; then
        cp .env.ui.example .env
        print_status "Created .env from .env.ui.example"
    else
        echo "ROWT_API_ENDPOINT=https://your-rowt-server.com" > .env
        echo "NODE_ENV=development" >> .env
        print_status "Created basic .env file"
    fi
fi

# Test Development Setup
echo ""
echo "🔧 Testing Development Setup"
echo "----------------------------"

print_status "Building development image..."
docker-compose build rowt-ui-dev

print_status "Starting development container..."
docker-compose up -d rowt-ui-dev

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker-compose ps rowt-ui-dev | grep -q "Up"; then
    print_status "Development container is running"
else
    print_error "Development container failed to start"
    docker-compose logs rowt-ui-dev
    exit 1
fi

# Test health check
echo "Testing development health check..."
for i in {1..30}; do
    if curl -f http://localhost:8080 &> /dev/null; then
        print_status "Development server is responding at http://localhost:8080"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Development server is not responding after 30 attempts"
        docker-compose logs rowt-ui-dev
        exit 1
    fi
    sleep 2
done

# Stop development container
print_status "Stopping development container..."
docker-compose down

# Test Production Setup
echo ""
echo "🚀 Testing Production Setup"
echo "---------------------------"

print_status "Building production image..."
docker-compose -f docker-compose.prod.yml build rowt-ui

print_status "Starting production container..."
docker-compose -f docker-compose.prod.yml up -d rowt-ui

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 15

# Check if container is running
if docker-compose -f docker-compose.prod.yml ps rowt-ui | grep -q "Up"; then
    print_status "Production container is running"
else
    print_error "Production container failed to start"
    docker-compose -f docker-compose.prod.yml logs rowt-ui
    exit 1
fi

# Test health check
echo "Testing production health check..."
for i in {1..30}; do
    if curl -f http://localhost:3000 &> /dev/null; then
        print_status "Production server is responding at http://localhost:3000"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Production server is not responding after 30 attempts"
        docker-compose -f docker-compose.prod.yml logs rowt-ui
        exit 1
    fi
    sleep 2
done

# Stop production container
print_status "Stopping production container..."
docker-compose -f docker-compose.prod.yml down

# Test Makefile commands
echo ""
echo "🛠️  Testing Makefile Commands"
echo "-----------------------------"

if command -v make &> /dev/null; then
    print_status "Testing 'make dev' command..."
    make dev
    sleep 10
    
    if curl -f http://localhost:8080 &> /dev/null; then
        print_status "Makefile 'dev' command works correctly"
    else
        print_error "Makefile 'dev' command failed"
    fi
    
    make stop
    print_status "Makefile 'stop' command works correctly"
else
    print_warning "Make is not installed, skipping Makefile tests"
fi

# Final cleanup
echo ""
echo "🧹 Cleaning Up"
echo "--------------"

print_status "Removing test containers and images..."
docker-compose down --rmi local --volumes --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down --rmi local --volumes --remove-orphans 2>/dev/null || true

print_status "Cleanup complete"

echo ""
echo "🎉 All Docker tests passed successfully!"
echo ""
echo "Quick start commands:"
echo "  Development: make dev    (http://localhost:8080)"
echo "  Production:  make prod   (http://localhost:3000)"
echo "  Help:        make help"
echo ""
echo "For detailed documentation, see DOCKER.md"
