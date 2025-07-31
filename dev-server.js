const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Load configuration from .env file
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
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }

  return config;
}

const config = loadEnvFile();

// Build the application using the same process as production
function buildApplication() {
  console.log('🔧 Building application...');

  const { execSync } = require('child_process');

  try {
    // Use the same build command as production
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build complete');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Build on startup
buildApplication();

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle root path - serve from dist directory (same as production)
  if (req.url === '/') {
    const htmlPath = path.join(__dirname, 'dist', 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html from dist directory');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }

  // Serve all other files from dist directory (same as production)
  let filePath = path.join(__dirname, 'dist', req.url);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 Development Server Started!');
  console.log(`📱 Frontend: http://localhost:${PORT}`);

  if (config.ROWT_API_ENDPOINT) {
    console.log(`🔗 API Endpoint: ${config.ROWT_API_ENDPOINT}`);
    console.log('✅ Configuration loaded from .env file');
  } else {
    console.log('⚠️  No .env file found - application will use fallback configuration');
    console.log('   Create a .env file with ROWT_API_ENDPOINT=your-server-url');
  }

  console.log('');
  console.log('Open http://localhost:8080 in your browser');
});
