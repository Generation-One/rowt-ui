# Unified Dockerfile for Rowt UI (Development and Production)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache wget curl

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables
ARG ROWT_API_ENDPOINT
ARG NODE_ENV=production
ARG BUILD_MODE=production

# Validate required arguments
RUN if [ -z "$ROWT_API_ENDPOINT" ]; then \
      echo "❌ ERROR: ROWT_API_ENDPOINT is required but not provided"; \
      echo "   Please set ROWT_API_ENDPOINT when building:"; \
      echo "   docker-compose build --build-arg ROWT_API_ENDPOINT=https://your-server.com"; \
      exit 1; \
    fi

# Create .env file for build process
RUN echo "ROWT_API_ENDPOINT=${ROWT_API_ENDPOINT}" > .env && \
    echo "NODE_ENV=${NODE_ENV}" >> .env

# Conditional build based on BUILD_MODE
RUN echo "BUILD_MODE is: $BUILD_MODE" && \
    if [ "$BUILD_MODE" = "production" ]; then \
      echo "🔧 Running production build..." && \
      npm run build && \
      echo "✅ Production build complete" && \
      ls -la dist/ || echo "❌ Build failed - no dist directory"; \
    else \
      echo "🔧 Skipping build for development mode"; \
    fi

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports (8080 for dev, 80 for production)
EXPOSE 8080 80

# Health check (works for both dev and production)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD if [ "$BUILD_MODE" = "development" ]; then \
        curl -f http://localhost:8080/ || exit 1; \
      else \
        wget --no-verbose --tries=1 --spider http://localhost/ || exit 1; \
      fi

# Use entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
