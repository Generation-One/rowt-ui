#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8080;
const API_BASE_URL = 'https://localhost/rowt';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json'
};

function serveFile(filePath, res) {
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
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle root path
  if (req.url === '/') {
    const htmlPath = path.join(__dirname, 'dist/index.html');
    fs.readFile(htmlPath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }

      // Inject API endpoint configuration
      const scriptTag = `<script>window.ROWT_API_ENDPOINT = '${API_BASE_URL}'; console.log('Local dev: API endpoint set to', window.ROWT_API_ENDPOINT);</script>`;
      const modifiedContent = content.replace('<head>', `<head>\n    ${scriptTag}`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(modifiedContent);
    });
    return;
  }

  // Serve static files from frontend dist directory
  let filePath = path.join(__dirname, 'dist', req.url);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
    } else {
      serveFile(filePath, res);
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 Local Development Server Started!');
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API Backend: ${API_BASE_URL}`);
  console.log('');
  console.log('Make sure your Docker container is running for API access!');
  console.log('');
  console.log('Open http://localhost:8080 in your browser');
});
