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
    if [ -d "dist" ]; then
        echo "📁 Copying application files..."
        cp -r dist/* /usr/share/nginx/html/
    else
        echo "❌ No dist directory found. Make sure the application was built."
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
