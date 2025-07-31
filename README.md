# Rowt UI Dashboard

A TypeScript-based web dashboard for managing Rowt URL shortener projects and links.

## Quick Setup

1. **Configure the API endpoint**:
   ```bash
   cp .env.ui.example .env
   # Edit .env and set your Rowt server URL
   ```

2. **Build the application**:
   ```bash
   npm install
   npm run build
   ```

   This will:
   - Read configuration from `.env` file
   - Inject configuration at build-time (secure, no client-side .env loading)
   - Bundle the TypeScript code with esbuild (includes rowt-console-sdk)
   - Copy static assets (CSS, favicon, HTML)
   - Create a deployable `dist/` directory

3. **Deploy**: Copy the `dist/` directory to your web server.

## Configuration

The application requires a `.env` file with your Rowt server endpoint:

```env
ROWT_API_ENDPOINT=https://your-rowt-server.com
NODE_ENV=production
```

**Security**: Configuration is read at build-time and injected into the bundle. The `.env` file is never sent to the browser, ensuring secure configuration management.

### Example Configurations

**Local Development:**
```env
ROWT_API_ENDPOINT=http://localhost:3000
NODE_ENV=development
```

**Production:**
```env
ROWT_API_ENDPOINT=https://api.rowt.io
NODE_ENV=production
```

## Deployment

### Static File Server

After building, the `dist/` directory contains all files needed for deployment:

```
dist/
├── index.html          # Main HTML file
├── main.js            # Bundled application (config injected at build-time)
└── public/            # Static assets
    ├── dashboard.css  # Styles
    └── rowtfavicon.png # Favicon
```

**Note**: Configuration is injected at build-time, so no `.env` file is included in the distribution.

Simply copy this directory to any web server (Apache, Nginx, etc.).

### Subpath Hosting

The application works on subpaths without any configuration changes:
- `https://example.com/admin/` ✅
- `https://example.com/rowt-dashboard/` ✅
- `https://example.com/` ✅

### Docker Deployment

The application includes Docker support for easy deployment:

**Quick Start:**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the production configuration
docker-compose -f docker-compose.prod.yml up -d
```

**Manual Build:**
```bash
# Build the Docker image
docker build -t rowt-ui:latest .

# Run the container
docker run -d -p 80:80 --name rowt-ui rowt-ui:latest
```

**Using the build script:**
```bash
# Make executable and run
chmod +x docker-build.sh
./docker-build.sh
```

The Docker setup includes:
- **Multi-stage build** for optimized image size
- **Nginx** for serving static files with proper caching
- **Health checks** for container monitoring
- **Security headers** and performance optimizations

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Watch for changes
npm run dev:watch
```

## Features

- **Project Management**: Create and manage Rowt projects
- **Link Analytics**: View link statistics and interactions
- **User Authentication**: Secure login with JWT tokens
- **Responsive Design**: Works on desktop and mobile
- **Easy Configuration**: Simple .env file setup

## API Integration

Uses the [rowt-console-sdk](https://npmjs.com/package/rowt-console-sdk) for all API interactions.

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## License

MIT License
