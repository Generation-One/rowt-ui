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

### PUT /projects/:id
Updates an existing project by ID.

**Auth:** JWT

**Path Parameters:**
- `id` (string, required): The unique identifier of the project to update

**Request Body:**
```json
{
  "name": "Updated App Name",
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
  "message": "Project updated successfully",
  "project": {
    "id": "project-uuid",
    "name": "Updated App Name",
    "baseUrl": "https://myapp.com",
    "fallbackUrl": "https://myapp.com/download",
    "appstoreId": "123456789",
    "playstoreId": "com.example.myapp",
    "iosScheme": "myapp://",
    "androidScheme": "myapp://",
    "apiKey": "project-api-key",
    "userId": "1"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or missing project ID
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Project not found or access denied
- `500 Internal Server Error`: Server error

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

### PUT /link/:id
Updates an existing link by ID.

**Auth:** Public (with API key)

**Path Parameters:**
- `id` (string, required): The unique identifier of the link to update

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "apiKey": "project-api-key",
  "url": "myapp://updated-page/123",
  "title": "Updated title",
  "description": "Updated description",
  "imageUrl": "https://example.com/new-image.jpg",
  "fallbackUrlOverride": "https://example.com/new-fallback",
  "additionalMetadata": {
    "og:title": "Updated Page",
    "og:description": "Updated description",
    "twitter:card": "summary_large_image"
  },
  "properties": {
    "campaign": "autumn2024",
    "source": "newsletter",
    "utm_medium": "email"
  },
  "active": true
}
```

**Success Response (200):**
```json
{
  "message": "Link updated successfully",
  "link": {
    "id": "link-uuid",
    "url": "myapp://updated-page/123",
    "title": "Updated title",
    "description": "Updated description",
    "imageUrl": "https://example.com/new-image.jpg",
    "fallbackUrlOverride": "https://example.com/new-fallback",
    "additionalMetadata": {
      "og:title": "Updated Page",
      "og:description": "Updated description"
    },
    "properties": {
      "campaign": "autumn2024",
      "source": "newsletter"
    },
    "lifetimeClicks": 42,
    "createdAt": "2025-01-31T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body, missing link ID, project ID mismatch, or JSONB size limit exceeded
- `403 Forbidden`: Invalid API key or unauthorized access
- `404 Not Found`: Link not found
- `500 Internal Server Error`: Server error

### DELETE /link/:id
Deletes an existing link by ID.

**Auth:** Public (with API key)

**Path Parameters:**
- `id` (string, required): The unique identifier of the link to delete

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "apiKey": "project-api-key"
}
```

**Success Response (200):**
```json
{
  "message": "Link deleted successfully",
  "linkId": "link-uuid"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body, missing link ID, or project ID mismatch
- `403 Forbidden`: Invalid API key or unauthorized access
- `404 Not Found`: Link not found
- `500 Internal Server Error`: Server error

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

## Validation Rules & Important Notes

### Link Management (PUT/DELETE /link/:id)

**Validation Rules:**
- `projectId`: Must be a valid UUID string
- `apiKey`: Must be a non-empty string matching the project's API key
- `url`: Must be a valid URL format (if provided)
- `imageUrl`: Must be a valid URL format (if provided)
- `fallbackUrlOverride`: Must be a valid URL format (if provided)
- `additionalMetadata`: JSONB object, max 10KB size
- `properties`: JSONB object, max 10KB size
- `active`: Must be a boolean (if provided)

**Authorization:**
- API key in request body must match the project's API key
- Link must belong to the project specified by `projectId`
- Only link owners can update/delete their links

**Important Notes:**
- PUT endpoint supports partial updates - only provided fields will be updated
- JSONB fields (`additionalMetadata`, `properties`) have a 10KB size limit each
- Deleting a link will also delete all associated interaction records
- Link ID and creation timestamp cannot be modified via PUT endpoint
- Rate limiting: 30 requests per minute by default

### Project Management (PUT /projects/:id)

**Validation Rules:**
- `name`: Must be a non-empty string (if provided)
- `baseUrl`: Must be a valid URL format (if provided)
- `fallbackUrl`: Must be a valid URL format (if provided)
- `appstoreId`: Must be a string (if provided)
- `playstoreId`: Must be a string (if provided)
- `iosScheme`: Must be a string (if provided)
- `androidScheme`: Must be a string (if provided)

**Authorization:**
- Valid JWT token must be provided in Authorization header
- Project must belong to the authenticated user
- User ID in JWT must match the project's userId

**Important Notes:**
- PUT endpoint supports partial updates - only provided fields will be updated
- Project ID, API key, user ID, and creation timestamp cannot be modified
- Rate limiting: 30 requests per minute by default

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

// Create a project
const newProject = await rowtConsole.createProject({
  userId: user.id,
  name: "My App",
  baseUrl: "https://myapp.com",
  fallbackUrl: "https://myapp.com/download"
});

// Update a project (using direct API call)
const response = await fetch(`https://your-rowt-server.com/projects/${projectId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    name: "Updated App Name",
    baseUrl: "https://updated-app.com"
  })
});

// Create a link
const link = await rowtConsole.createLink({
  projectId: project.id,
  apiKey: project.apiKey,
  url: "myapp://page/123",
  title: "Check out this page"
});

// Update a link (using direct API call)
const updateResponse = await fetch(`https://your-rowt-server.com/link/${linkId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: project.id,
    apiKey: project.apiKey,
    title: "Updated title",
    active: true
  })
});

// Delete a link (using direct API call)
const deleteResponse = await fetch(`https://your-rowt-server.com/link/${linkId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: project.id,
    apiKey: project.apiKey
  })
});
```
