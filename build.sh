#!/bin/bash

# Build script for Rowt Dashboard Frontend

echo "Building Rowt Dashboard Frontend..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Copy HTML file to dist directory
echo "Copying HTML file to dist directory..."
cp src/index.html dist/

echo "Build complete!"
echo "Frontend built to ./dist/"
echo "- main.js"
echo "- app.js"
echo "- index.html"
echo "- All component files"

echo ""
echo "The frontend is ready to serve from ./dist/ directory."
