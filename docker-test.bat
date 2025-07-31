@echo off
REM Docker Test Script for Rowt UI (Windows)
REM Tests both development and production Docker setups

echo 🐳 Testing Rowt UI Docker Setup
echo ================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from example...
    if exist .env.ui.example (
        copy .env.ui.example .env >nul
        echo ✅ Created .env from .env.ui.example
    ) else (
        echo ROWT_API_ENDPOINT=https://your-rowt-server.com > .env
        echo NODE_ENV=development >> .env
        echo ✅ Created basic .env file
    )
)

echo.
echo 🔧 Testing Development Setup
echo ----------------------------

echo ✅ Building development image...
docker-compose build rowt-ui-dev
if errorlevel 1 (
    echo ❌ Failed to build development image
    exit /b 1
)

echo ✅ Starting development container...
docker-compose up -d rowt-ui-dev
if errorlevel 1 (
    echo ❌ Failed to start development container
    exit /b 1
)

echo Waiting for container to be ready...
timeout /t 10 /nobreak >nul

echo Testing development health check...
for /l %%i in (1,1,30) do (
    curl -f http://localhost:8080 >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Development server is responding at http://localhost:8080
        goto dev_success
    )
    timeout /t 2 /nobreak >nul
)

echo ❌ Development server is not responding after 30 attempts
docker-compose logs rowt-ui-dev
exit /b 1

:dev_success
echo ✅ Stopping development container...
docker-compose down

echo.
echo 🚀 Testing Production Setup
echo ---------------------------

echo ✅ Building production image...
docker-compose -f docker-compose.prod.yml build rowt-ui
if errorlevel 1 (
    echo ❌ Failed to build production image
    exit /b 1
)

echo ✅ Starting production container...
docker-compose -f docker-compose.prod.yml up -d rowt-ui
if errorlevel 1 (
    echo ❌ Failed to start production container
    exit /b 1
)

echo Waiting for container to be ready...
timeout /t 15 /nobreak >nul

echo Testing production health check...
for /l %%i in (1,1,30) do (
    curl -f http://localhost:3000 >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Production server is responding at http://localhost:3000
        goto prod_success
    )
    timeout /t 2 /nobreak >nul
)

echo ❌ Production server is not responding after 30 attempts
docker-compose -f docker-compose.prod.yml logs rowt-ui
exit /b 1

:prod_success
echo ✅ Stopping production container...
docker-compose -f docker-compose.prod.yml down

echo.
echo 🧹 Cleaning Up
echo --------------

echo ✅ Removing test containers and images...
docker-compose down --rmi local --volumes --remove-orphans 2>nul
docker-compose -f docker-compose.prod.yml down --rmi local --volumes --remove-orphans 2>nul

echo ✅ Cleanup complete

echo.
echo 🎉 All Docker tests passed successfully!
echo.
echo Quick start commands:
echo   Development: docker-compose up -d rowt-ui-dev  (http://localhost:8080)
echo   Production:  docker-compose -f docker-compose.prod.yml up -d  (http://localhost:3000)
echo.
echo For detailed documentation, see DOCKER.md
