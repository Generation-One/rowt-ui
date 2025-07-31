# Rowt Server API Documentation

This document provides comprehensive documentation for the Rowt Server API endpoints. The Rowt Server provides URL shortening and deep linking capabilities with analytics tracking.

## Base URL

All API requests should be made to your Rowt server instance:
```
https://your-rowt-server.com
```

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Some endpoints (like link creation and redirection) use API key authentication or are public.

## Rate Limiting

- `/auth/login`: 5 requests per minute
- `/auth/refresh`: 30 requests per minute  
- `/:shortCode`: 10 requests per minute per shortCode
- Other endpoints: Standard rate limiting applies

---

## Authentication Endpoints

### POST /auth/login
Authenticates a user and returns JWT tokens.

**Auth:** Public  
**Rate Limit:** 5 requests per minute

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "tokens": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  },
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin",
    "emailVerified": true,
    "customerId": "stripe-id"
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Invalid email or password"
}
```

### POST /auth/refresh
Refreshes an expired access token.

**Auth:** Public  
**Rate Limit:** 30 requests per minute

**Request Body:**
```json
{
  "refresh_token": "your-refresh-token"
}
```

**Success Response (200):**
```json
{
  "access_token": "new-jwt-token",
  "refresh_token": "new-refresh-token"
}
```

### POST /auth/logout
Invalidates tokens.

**Auth:** Public

**Request Body:**
```json
{
  "refresh_token": "your-refresh-token",
  "access_token": "your-access-token"
}
```

**Success Response (200):**
```json
{
  "message": "Logout successful"
}
```

### POST /auth/validate
Validates user credentials without creating tokens.

**Auth:** Public

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "message": "Valid User",
  "isValid": true
}
```

### POST /auth/updatepassword
Updates a user's password.

**Auth:** JWT

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "new-secure-password"
}
```

**Success Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "user",
  "emailVerified": true
}
```

### GET /auth/profile
Returns the current user's profile.

**Auth:** JWT

**Success Response (200):**
```json
{
  "email": "admin@example.com",
  "userId": 1,
  "role": "admin"
}
```

---

## Project Endpoints

### POST /projects/create
Creates a new project.

**Auth:** JWT

**Request Body:**
```json
{
  "userId": "1",
  "name": "My App",
  "baseUrl": "https://myapp.com",
  "fallbackUrl": "https://myapp.com/download",
  "appstoreId": "123456789",
  "playstoreId": "com.example.myapp",
  "iosScheme": "myapp://",
  "androidScheme": "myapp://"
}
```

**Success Response (200):**
```json
{
  "id": "project-uuid",
  "apiKey": "auto-generated-api-key",
  "name": "My App",
  "baseUrl": "https://myapp.com",
  "fallbackUrl": "https://myapp.com/download",
  "appstoreId": "123456789",
  "playstoreId": "com.example.myapp",
  "iosScheme": "myapp://",
  "androidScheme": "myapp://",
  "userId": "1"
}
```

### POST /projects/update
Updates an existing project.

**Auth:** JWT

**Request Body:**
```json
{
  "id": "project-uuid",
  "apiKey": "api-key",
  "userId": "1",
  "name": "Updated App Name",
  "baseUrl": "https://myapp.com",
  "fallbackUrl": "https://myapp.com/download",
  "appstoreId": "123456789",
  "playstoreId": "com.example.myapp",
  "iosScheme": "myapp://",
  "androidScheme": "myapp://"
}
```

### POST /projects/getUserProjects
Returns all projects for the current user.

**Auth:** JWT

**Success Response (200):**
```json
[
  {
    "id": "project-uuid-1",
    "apiKey": "api-key-1",
    "name": "App 1",
    "baseUrl": "https://app1.com",
    "fallbackUrl": "https://app1.com/download",
    "appstoreId": "123456789",
    "playstoreId": "com.example.app1",
    "iosScheme": "app1://",
    "androidScheme": "app1://",
    "userId": "1"
  }
]
```

### POST /projects/getById
Returns a specific project with optional links and interactions.

**Auth:** JWT

**Request Body:**
```json
{
  "id": "project-uuid",
  "options": {
    "includeLinks": true,
    "includeInteractions": true,
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "getPreviousPeriod": true
  }
}
```

### POST /projects/generateApiKey
Generates a new API key for a project.

**Auth:** JWT

**Request Body:**
```json
{
  "projectId": "project-uuid"
}
```

**Success Response (200):**
```json
{
  "apiKey": "new-api-key"
}
```

---

## Link Endpoints

### POST /link
Creates a new deeplink.

**Auth:** Public (with API key)

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "apiKey": "project-api-key",
  "url": "myapp://page/123",
  "title": "Check out this page",
  "description": "Great content inside",
  "imageUrl": "https://example.com/image.jpg",
  "fallbackUrlOverride": "https://example.com/fallback",
  "additionalMetadata": {
    "og:type": "article",
    "twitter:card": "summary_large_image",
    "og:site_name": "My App"
  },
  "properties": {
    "source": "email",
    "campaign": "summer2023",
    "utm_medium": "social"
  },
  "expiration": "2024-12-31T23:59:59.999Z"
}
```

**Success Response (200):**
Returns the short URL path (e.g., `abcd1234`) which can be appended to your Rowt server base URL.

### POST /link/byProjectId
Returns all links for a specific project.

**Auth:** JWT

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "includeInteractions": true
}
```

### GET /:shortCode
Handles redirection and analytics tracking for a short link.

**Auth:** Public  
**Rate Limit:** 10 requests per minute per shortCode

**Parameters:**
- `shortCode`: The short code of the link (e.g., `abcd1234`)

**Response:** HTML page with metadata and JavaScript for app detection and redirection.

---

## User Endpoints (Multi-tenant Mode)

### POST /users/create
Creates a new user (multi-tenant mode only).

**Auth:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "role": "user"
}
```

### GET /users/currentUser
Gets the current authenticated user.

**Auth:** JWT

**Success Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "user",
  "emailVerified": true,
  "customerId": "stripe-customer-id"
}
```

### POST /users/usage
Gets usage statistics for a user.

**Auth:** JWT

**Request Body:**
```json
{
  "userId": 1
}
```

**Success Response (200):**
```json
{
  "links": 42,
  "interactions": 1024,
  "period": {
    "start": "2023-05-17T00:00:00.000Z",
    "end": "2023-06-17T00:00:00.000Z"
  }
}
```

### POST /users/tier
Gets the subscription tier for a user (multi-tenant only).

**Auth:** JWT

**Request Body:**
```json
{
  "userId": 1
}
```

**Success Response (200):**
```json
{
  "tier": 2,
  "allowances": {
    "links": 5000,
    "interactions": 175000
  }
}
```

---

## Error Responses

Common error response format:
```json
{
  "statusCode": 400,
  "message": "Error description"
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

---

## SDK Usage

For easier integration, use the official SDKs:
- [rowt-console-sdk](https://npmjs.com/rowt-console-sdk) - For admin consoles
- [rowt-sdk](https://npmjs.com/rowt-sdk) - For client applications

Example with rowt-console-sdk:
```javascript
import RowtConsole from "rowt-console-sdk";

const rowtConsole = new RowtConsole("https://your-rowt-server.com");

// Login
const user = await rowtConsole.login({
  email: "user@example.com",
  password: "password"
});

// Get projects
const projects = await rowtConsole.getUserProjects();
```
