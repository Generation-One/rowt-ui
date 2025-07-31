# Rowt UI Docker Makefile
# Provides convenient commands for Docker operations

.PHONY: help dev prod build clean logs stop restart health

# Default target
help:
	@echo "Rowt UI Docker Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make dev-logs     - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo "  make prod-logs    - View production logs"
	@echo ""
	@echo "General:"
	@echo "  make build        - Build all images"
	@echo "  make stop         - Stop all containers"
	@echo "  make clean        - Remove containers and images"
	@echo "  make restart      - Restart all containers"
	@echo "  make health       - Check container health"
	@echo "  make shell        - Open shell in development container"
	@echo ""

# Development commands
dev:
	@echo "Starting development environment..."
	docker-compose up -d rowt-ui-dev
	@echo "Development server available at http://localhost:8080"

dev-build:
	@echo "Building and starting development environment..."
	docker-compose build --build-arg BUILD_MODE=development rowt-ui-dev
	docker-compose up -d rowt-ui-dev
	@echo "Development server available at http://localhost:8080"

dev-logs:
	docker-compose logs -f rowt-ui-dev

# Production commands
prod:
	@echo "Starting production environment..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d rowt-ui
	@echo "Production server available at http://localhost:3000"

prod-build:
	@echo "Building and starting production environment..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --build-arg BUILD_MODE=production rowt-ui
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d rowt-ui
	@echo "Production server available at http://localhost:3000"

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f rowt-ui

# General commands
build:
	@echo "Building all images..."
	docker-compose build
	docker-compose -f docker-compose.prod.yml build

stop:
	@echo "Stopping all containers..."
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

clean:
	@echo "Cleaning up containers, images, and volumes..."
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.prod.yml down -v --rmi all
	docker system prune -f

restart:
	@echo "Restarting containers..."
	make stop
	make dev

health:
	@echo "Container health status:"
	docker-compose ps
	@echo ""
	docker-compose -f docker-compose.prod.yml ps

shell:
	@echo "Opening shell in development container..."
	docker-compose exec rowt-ui-dev sh

# Utility commands
logs:
	docker-compose logs -f

install:
	@echo "Installing dependencies in development container..."
	docker-compose exec rowt-ui-dev npm install

test:
	@echo "Running tests in development container..."
	docker-compose exec rowt-ui-dev npm test

# Quick setup for new developers
setup:
	@echo "Setting up Rowt UI development environment..."
	@echo "1. Building development image..."
	docker-compose build --build-arg BUILD_MODE=development rowt-ui-dev
	@echo "2. Starting development environment..."
	docker-compose up -d rowt-ui-dev
	@echo "3. Waiting for container to be ready..."
	sleep 10
	@echo ""
	@echo "✅ Setup complete!"
	@echo "Development server: http://localhost:8080"
	@echo "View logs: make dev-logs"
	@echo "Stop server: make stop"
