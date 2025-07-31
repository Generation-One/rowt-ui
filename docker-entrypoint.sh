#!/bin/sh
set -e

# Docker entrypoint script for Rowt UI
# Handles both development and production modes

echo "🐳 Starting Rowt UI in ${BUILD_MODE:-production} mode..."

if [ "$BUILD_MODE" = "development" ]; then
    echo "🔧 Development mode: Starting dev server on port 8080"
    exec npm run dev
else
    echo "🚀 Production mode: Setting up Nginx"
    
    # Install nginx if not present
    if [ ! -f "/usr/sbin/nginx" ]; then
        echo "📦 Installing Nginx..."
        apk add --no-cache nginx
    fi
    
    # Create nginx directories
    mkdir -p /usr/share/nginx/html
    mkdir -p /var/log/nginx
    mkdir -p /var/lib/nginx/tmp
    
    # Copy built application
    echo "🔍 Checking for dist directory..."
    ls -la
    if [ -d "dist" ]; then
        echo "📁 Found dist directory, copying application files..."
        ls -la dist/
        cp -r dist/* /usr/share/nginx/html/
        echo "✅ Application files copied to Nginx"
    else
        echo "❌ No dist directory found. Make sure the application was built."
        echo "🔍 Current directory contents:"
        ls -la
        echo "🔍 BUILD_MODE: $BUILD_MODE"
        echo "🔍 NODE_ENV: $NODE_ENV"
        exit 1
    fi
    
    # Copy nginx config if it exists
    if [ -f "nginx.conf" ]; then
        echo "⚙️  Copying Nginx configuration..."
        cp nginx.conf /etc/nginx/nginx.conf
    fi
    
    # Set proper permissions
    chown -R nginx:nginx /usr/share/nginx/html
    chown -R nginx:nginx /var/log/nginx
    chown -R nginx:nginx /var/lib/nginx
    
    echo "✅ Starting Nginx..."
    exec nginx -g "daemon off;"
fi
