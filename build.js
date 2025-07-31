#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Build script that reads .env file and injects configuration at build time
 */

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const config = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          config[key] = value;
        }
      }
    }
  }
  
  return config;
}

function buildWithConfig() {
  console.log('🔧 Loading configuration...');
  
  const config = loadEnvFile();
  
  if (!config.ROWT_API_ENDPOINT) {
    console.error('❌ Error: ROWT_API_ENDPOINT not found in .env file');
    console.error('Please create a .env file with ROWT_API_ENDPOINT=your-server-url');
    process.exit(1);
  }
  
  console.log('✅ Configuration loaded:');
  console.log(`   API Endpoint: ${config.ROWT_API_ENDPOINT}`);
  console.log(`   Environment: ${config.NODE_ENV || 'production'}`);
  
  // Build the application with esbuild, injecting configuration
  console.log('📦 Building application...');
  
  const defineFlags = Object.entries(config)
    .map(([key, value]) => `--define:process.env.${key}='"${value}"'`)
    .join(' ');
  
  const buildCommand = `esbuild src/main.ts --bundle --outfile=dist/main.js --format=esm --platform=browser --target=es2020 ${defineFlags}`;

  try {
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('✅ Bundle created successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  // Copy assets
  console.log('📁 Copying assets...');
  try {
    const fs = require('fs');
    const path = require('path');

    // Copy dev.html to dist/index.html
    fs.copyFileSync('dev.html', 'dist/index.html');

    // Copy public directory to dist/public
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const files = fs.readdirSync(src);
      for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyDir('public', 'dist/public');
    console.log('✅ Assets copied successfully');
  } catch (error) {
    console.error('❌ Asset copy failed:', error.message);
    process.exit(1);
  }
  
  console.log('🚀 Build complete! Deploy the dist/ directory to your web server.');
}

buildWithConfig();
