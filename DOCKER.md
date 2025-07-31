# Docker Setup for Rowt UI

This document explains how to run the Rowt UI application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Development Mode

Run the application in development mode with hot reloading:

```bash
# Start development environment
docker-compose up rowt-ui-dev

# Or run in background
docker-compose up -d rowt-ui-dev
```

The application will be available at `http://localhost:8080`

### Production Mode

Run the application in production mode:

```bash
# Build and start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d rowt-ui

# Or use the production compose file directly
docker-compose -f docker-compose.prod.yml up -d rowt-ui
```

The application will be available at `http://localhost:3000` (or port 80 in prod config)

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Required: Rowt API endpoint
ROWT_API_ENDPOINT=https://your-rowt-server.com

# Optional: Environment
NODE_ENV=development

# Optional: Custom ports
DEV_PORT=8080
PROD_PORT=3000
```

### Docker Compose Files

- `docker-compose.yml` - Base configuration
- `docker-compose.override.yml` - Development overrides (auto-loaded)
- `docker-compose.prod.yml` - Production configuration

## Available Services

### rowt-ui (Production)
- **Port**: 3000:80
- **Purpose**: Production-ready application with Nginx
- **Health Check**: Included
- **Auto-restart**: Yes

### rowt-ui-dev (Development)
- **Port**: 8080:8080
- **Purpose**: Development with hot reloading
- **Volumes**: Source code mounted for live editing
- **Health Check**: Included

## Commands

### Development

```bash
# Start development environment
docker-compose up rowt-ui-dev

# View logs
docker-compose logs -f rowt-ui-dev

# Stop development environment
docker-compose down

# Rebuild development image
docker-compose build rowt-ui-dev
```

### Production

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f rowt-ui

# Stop production environment
docker-compose -f docker-compose.prod.yml down

# Rebuild production image
docker-compose -f docker-compose.prod.yml build rowt-ui
```

### Maintenance

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean up everything
docker system prune -a
```

## Health Checks

Both development and production containers include health checks:

- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds (production), 10 seconds (development)

Check health status:
```bash
docker-compose ps
```

## Networking

All services use the `rowt-network` bridge network for internal communication.

## Volumes

### Development
- Source code is mounted as a volume for live editing
- `node_modules` and `dist` are excluded to prevent conflicts

### Production
- No volumes mounted (immutable container)
- All assets are built into the image

## Troubleshooting

### Port Conflicts
If ports are already in use, modify the port mappings in the compose files:

```yaml
ports:
  - "8081:8080"  # Change host port
```

### File Watching Issues (Development)
If file changes aren't detected in development:

```yaml
environment:
  - CHOKIDAR_USEPOLLING=true
```

### Build Issues
Clear Docker cache and rebuild:

```bash
docker-compose build --no-cache rowt-ui-dev
```

### Permission Issues
On Linux, ensure proper file permissions:

```bash
sudo chown -R $USER:$USER .
```

## Production Deployment

For production deployment with Traefik reverse proxy:

1. Create external Traefik network:
```bash
docker network create traefik-network
```

2. Update domain in `docker-compose.prod.yml`:
```yaml
labels:
  - "traefik.http.routers.rowt-ui.rule=Host(`your-domain.com`)"
```

3. Start with Traefik:
```bash
docker-compose -f docker-compose.prod.yml --profile traefik up -d
```

## Security Considerations

- The production image runs as non-root user
- Only necessary files are included in the final image
- Health checks ensure container reliability
- Nginx serves static files efficiently

## Monitoring

Monitor container health and logs:

```bash
# Check container status
docker-compose ps

# View real-time logs
docker-compose logs -f

# Check resource usage
docker stats
```
