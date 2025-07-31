#!/usr/bin/env node

/**
 * Docker Configuration Validator
 * Validates Docker Compose files and Dockerfiles without requiring Docker to be installed
 */

const fs = require('fs');
const path = require('path');

console.log('🐳 Validating Docker Configuration');
console.log('==================================\n');

let hasErrors = false;

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ Missing ${description}: ${filePath}`);
    hasErrors = true;
    return false;
  }
}

function validateYamlSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic YAML validation - check for common issues
    const lines = content.split('\n');
    let indentationValid = true;
    let hasServices = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for services section
      if (line.trim() === 'services:') {
        hasServices = true;
      }
      
      // Check for tabs (YAML should use spaces)
      if (line.includes('\t')) {
        console.log(`⚠️  Line ${lineNum}: Uses tabs instead of spaces`);
      }
      
      // Check for basic indentation consistency
      if (line.trim() && line.startsWith(' ')) {
        const spaces = line.match(/^ */)[0].length;
        if (spaces % 2 !== 0) {
          console.log(`⚠️  Line ${lineNum}: Odd number of spaces (${spaces})`);
          indentationValid = false;
        }
      }
    }
    
    if (!hasServices) {
      console.log(`❌ ${filePath}: No 'services' section found`);
      hasErrors = true;
    }
    
    if (indentationValid && hasServices) {
      console.log(`✅ ${filePath}: YAML syntax appears valid`);
    }
    
  } catch (error) {
    console.log(`❌ ${filePath}: Error reading file - ${error.message}`);
    hasErrors = true;
  }
}

function validateDockerfile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let hasFrom = false;
    let hasWorkdir = false;
    let hasExpose = false;
    let hasCmd = false;
    
    for (const line of lines) {
      if (line.startsWith('FROM ')) hasFrom = true;
      if (line.startsWith('WORKDIR ')) hasWorkdir = true;
      if (line.startsWith('EXPOSE ')) hasExpose = true;
      if (line.startsWith('CMD ')) hasCmd = true;
    }
    
    if (!hasFrom) {
      console.log(`❌ ${filePath}: Missing FROM instruction`);
      hasErrors = true;
    }
    if (!hasWorkdir) {
      console.log(`⚠️  ${filePath}: No WORKDIR instruction (recommended)`);
    }
    if (!hasExpose) {
      console.log(`⚠️  ${filePath}: No EXPOSE instruction (recommended)`);
    }
    if (!hasCmd) {
      console.log(`❌ ${filePath}: Missing CMD instruction`);
      hasErrors = true;
    }
    
    if (hasFrom && hasCmd) {
      console.log(`✅ ${filePath}: Dockerfile syntax appears valid`);
    }
    
  } catch (error) {
    console.log(`❌ ${filePath}: Error reading file - ${error.message}`);
    hasErrors = true;
  }
}

function checkPackageJsonScript(scriptName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts && packageJson.scripts[scriptName]) {
      console.log(`✅ package.json has '${scriptName}' script: ${packageJson.scripts[scriptName]}`);
      return true;
    } else {
      console.log(`❌ package.json missing '${scriptName}' script`);
      hasErrors = true;
      return false;
    }
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

// Check required files
console.log('📁 Checking required files:');
checkFile('Dockerfile', 'Production Dockerfile');
checkFile('Dockerfile.dev', 'Development Dockerfile');
checkFile('docker-compose.yml', 'Main Docker Compose file');
checkFile('docker-compose.prod.yml', 'Production Docker Compose file');
checkFile('docker-compose.override.yml', 'Development override file');
checkFile('.dockerignore', 'Docker ignore file');
checkFile('package.json', 'Package.json');
checkFile('dev-server.js', 'Development server');

console.log('\n📋 Validating Docker Compose files:');
if (fs.existsSync('docker-compose.yml')) {
  validateYamlSyntax('docker-compose.yml');
}
if (fs.existsSync('docker-compose.prod.yml')) {
  validateYamlSyntax('docker-compose.prod.yml');
}
if (fs.existsSync('docker-compose.override.yml')) {
  validateYamlSyntax('docker-compose.override.yml');
}

console.log('\n🐋 Validating Dockerfiles:');
if (fs.existsSync('Dockerfile')) {
  validateDockerfile('Dockerfile');
}
if (fs.existsSync('Dockerfile.dev')) {
  validateDockerfile('Dockerfile.dev');
}

console.log('\n📦 Checking package.json scripts:');
checkPackageJsonScript('build');
checkPackageJsonScript('dev');

console.log('\n🔧 Checking environment configuration:');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('ROWT_API_ENDPOINT')) {
      console.log('✅ ROWT_API_ENDPOINT is configured');
    } else {
      console.log('⚠️  ROWT_API_ENDPOINT not found in .env');
    }
  } catch (error) {
    console.log('❌ Error reading .env file');
  }
} else {
  console.log('⚠️  .env file not found (will need to be created)');
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Validation completed with errors');
  console.log('\nPlease fix the errors above before running Docker Compose.');
  process.exit(1);
} else {
  console.log('✅ All validations passed!');
  console.log('\nDocker configuration appears to be valid.');
  console.log('\nNext steps:');
  console.log('1. Ensure Docker and Docker Compose are installed');
  console.log('2. Run: docker-compose build rowt-ui-dev');
  console.log('3. Run: docker-compose up -d rowt-ui-dev');
  console.log('4. Access: http://localhost:8080');
}
