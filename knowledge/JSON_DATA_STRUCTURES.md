# JSON Data Structures Reference

This document describes all JSON data structures used in the Vail Scavenger Hunt application, including configuration data, user data, team data, and API formats.

## Table of Contents
1. [Configuration Data](#configuration-data)
2. [Team & User Data](#team--user-data)
3. [API Request/Response Formats](#api-requestresponse-formats)
4. [Storage Formats](#storage-formats)
5. [Environment Configuration](#environment-configuration)

---

## Configuration Data

### Hunt Location Configuration

Location data defines the stops/locations for each scavenger hunt.

**File Pattern**: `src/data/locations/{organization}.ts`

```json
{
  "name": "BHHS Fall 2025",
  "locations": [
    {
      "id": "covered-bridge",
      "title": "Covered Bridge",
      "clue": "The wooden crossing every skier knows",
      "hints": [
        "The most iconic photo spot in Vail.",
        "It's the gateway into the village."
      ],
      "position": {
        "lat": 39.6403,
        "lng": -106.3742
      },
      "description": "Historic covered bridge in Vail Village",
      "address": "123 Bridge St, Vail, CO"
    }
  ]
}
```

**Fields**:
- `name`: Display name for the hunt
- `locations[]`: Array of location objects
  - `id`: Unique identifier (kebab-case)
  - `title`: Display name for the location
  - `clue`: Main clue text shown to users
  - `hints[]`: Array of progressive hints
  - `position` *(optional)*: GPS coordinates
  - `description` *(optional)*: Additional description
  - `address` *(optional)*: Physical address

### Team Configuration

Team configuration defines organizations, hunts, and available teams.

**File**: `src/data/teams/config.ts`

```json
{
  "organizations": {
    "bhhs": {
      "id": "bhhs",
      "name": "Berkshire Hathaway HomeServices",
      "hunts": {
        "fall-2025": {
          "id": "fall-2025",
          "name": "Fall 2025",
          "teams": [
            {
              "id": "berrypicker",
              "displayName": "Berrypicker"
            },
            {
              "id": "poppyfieldswest",
              "displayName": "Poppyfields West"
            }
          ]
        }
      }
    }
  }
}
```

**Structure**:
- `organizations`: Key-value map of organization configurations
  - `{orgId}`: Organization configuration
    - `id`: Organization identifier
    - `name`: Display name
    - `hunts`: Key-value map of hunt configurations
      - `{huntId}`: Hunt configuration
        - `id`: Hunt identifier
        - `name`: Display name
        - `teams[]`: Array of available teams

---

## Team & User Data

### Team Lock (localStorage)

Stores team authentication state for 24-hour sessions.

**Storage Key**: `hunt.team.lock.v1`

```json
{
  "teamId": "TEAM_alpha_001",
  "issuedAt": 1758644561000,
  "expiresAt": 1758730961000,
  "teamCodeHash": "QUxQSEEwMQ==",
  "lockToken": "eyJ0ZWFtSWQiOiJURUFNX2FscGhhXzAwMSIsImV4cCI6MTc1ODczMDk2MSwiaWF0IjoxNzU4NjQ0NTYxfQ=="
}
```

**Fields**:
- `teamId`: Unique team identifier
- `issuedAt`: Unix timestamp when lock was created
- `expiresAt`: Unix timestamp when lock expires
- `teamCodeHash`: Base64 hash of team code (for logging)
- `lockToken`: JWT token for server authentication

### Team Data (Server Storage)

Stored in Netlify Blobs at path: `teams/team_{teamId}.json`

```json
{
  "teamId": "TEAM_alpha_001",
  "name": "Team Alpha",
  "score": 150,
  "huntProgress": {
    "covered-bridge": {
      "done": true,
      "notes": "Found it easily!",
      "photo": "https://res.cloudinary.com/...",
      "revealedHints": 0,
      "completedAt": "2024-01-15T14:30:00Z",
      "lastModifiedBy": "session-guid-123"
    },
    "chair-lift": {
      "done": false,
      "revealedHints": 2
    }
  },
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

**Fields**:
- `teamId`: Unique team identifier
- `name`: Team display name
- `score`: Current team score
- `huntProgress`: Object mapping location IDs to progress
  - `{locationId}`: Progress for specific location
    - `done`: Whether location is completed
    - `notes` *(optional)*: User notes
    - `photo` *(optional)*: Photo URL
    - `revealedHints` *(optional)*: Number of hints revealed
    - `completedAt` *(optional)*: ISO timestamp when completed
    - `lastModifiedBy` *(optional)*: Session ID of last modifier
- `updatedAt`: ISO timestamp of last update

### User Session Data

```json
{
  "id": "1fc25113-bd34-4757-a073-a456c92e5a1a",
  "location": "BHHS",
  "startTime": "2024-01-15T14:00:00Z",
  "userAgent": "Mozilla/5.0...",
  "teamName": "berrypicker",
  "eventName": "Fall 2025"
}
```

### App Settings (Server Storage)

```json
{
  "locationName": "BHHS",
  "teamName": "berrypicker",
  "sessionId": "1fc25113-bd34-4757-a073-a456c92e5a1a",
  "eventName": "Fall 2025",
  "organizationId": "bhhs",
  "huntId": "fall-2025",
  "lastModifiedBy": "session-guid-123",
  "lastModifiedAt": "2024-01-15T14:30:00Z"
}
```

---

## API Request/Response Formats

### Team Verification

**Request**: `POST /api/team-verify`
```json
{
  "code": "ALPHA01",
  "deviceHint": "optional-device-fingerprint"
}
```

**Response**: `200 OK`
```json
{
  "teamId": "TEAM_alpha_001",
  "teamName": "Team Alpha",
  "lockToken": "eyJ0ZWFtSWQi...",
  "ttlSeconds": 86400
}
```

**Error Response**: `401 Unauthorized`
```json
{
  "error": "That code didn't work. Check with your host.",
  "code": "TEAM_CODE_INVALID"
}
```

### Photo Upload

**Request Metadata**:
```json
{
  "dateISO": "2024-01-15T14:30:00Z",
  "locationSlug": "covered-bridge",
  "teamSlug": "berrypicker",
  "sessionId": "1fc25113-bd34-4757-a073-a456c92e5a1a",
  "eventName": "Fall 2025",
  "teamName": "Berrypicker",
  "locationName": "BHHS",
  "locationTitle": "Covered Bridge"
}
```

**Response**:
```json
{
  "photoUrl": "https://res.cloudinary.com/scavenger/image/upload/v123456789/stops/covered-bridge-abc123.jpg",
  "publicId": "stops/covered-bridge-abc123",
  "locationSlug": "covered-bridge",
  "title": "Covered Bridge",
  "uploadedAt": "2024-01-15T14:30:00Z"
}
```

### Collage Generation

**Response**:
```json
{
  "collageUrl": "https://res.cloudinary.com/scavenger/image/upload/v123456789/collages/team-berrypicker-abc123.jpg",
  "uploaded": [
    {
      "publicId": "stops/covered-bridge-abc123",
      "secureUrl": "https://res.cloudinary.com/...",
      "title": "Covered Bridge"
    }
  ]
}
```

### Progress Operations

**Save Progress**: `POST /api/progress/{orgId}/{teamId}/{huntId}`
```json
{
  "progress": {
    "covered-bridge": {
      "done": true,
      "notes": "Found it!",
      "photo": "https://res.cloudinary.com/..."
    }
  },
  "sessionId": "1fc25113-bd34-4757-a073-a456c92e5a1a",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

---

## Storage Formats

### Netlify Blobs Storage

**Settings**: `settings/{orgId}/{teamId}/{huntId}.json`
```json
{
  "locationName": "BHHS",
  "teamName": "berrypicker",
  "sessionId": "guid",
  "eventName": "Fall 2025"
}
```

**Progress**: `progress/{orgId}/{teamId}/{huntId}.json`
```json
{
  "covered-bridge": {
    "done": true,
    "photo": "https://res.cloudinary.com/..."
  }
}
```

**Sessions**: `sessions/{sessionId}.json`
```json
{
  "id": "session-guid",
  "location": "BHHS",
  "startTime": "2024-01-15T14:00:00Z"
}
```

### Team Code Mappings (Table Storage)

**Key**: `team:{teamCode}`
```json
{
  "partitionKey": "team",
  "rowKey": "ALPHA01",
  "teamId": "TEAM_alpha_001",
  "teamName": "Team Alpha",
  "isActive": true,
  "createdAt": "2024-01-15T14:00:00Z",
  "eventId": "vail-hunt-2024"
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=scavenger/entries

# Netlify Blobs Configuration
NETLIFY_BLOBS_STORE_NAME=vail-hunt-state

# Team Lock Configuration
TEAM_LOCK_JWT_SECRET=your-jwt-secret-here
TEAM_LOCK_TTL_SECONDS=86400
DEVICE_HINT_SEED=your-device-seed-here
TEAM_TABLE_NAME=team-mappings

# Feature Flags
VITE_ENABLE_TEAM_LOCKS=true
VITE_MAX_UPLOAD_BYTES=10485760
VITE_ALLOW_LARGE_UPLOADS=false
```

---

## Data Validation

All JSON data structures are validated using Zod schemas defined in `src/types/schemas.ts`. Key validation rules:

- **Date Formats**: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **GUIDs**: RFC 4122 format with hyphens
- **Slugs**: Lowercase alphanumeric with hyphens only
- **URLs**: Valid HTTP/HTTPS URLs
- **Team IDs**: Alphanumeric strings with underscores

## Error Handling

Standard error response format:
```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE_CONSTANT",
  "status": 400,
  "context": {
    "additionalData": "value"
  }
}
```

Common error codes:
- `TEAM_CODE_INVALID`: Invalid or inactive team code
- `TEAM_LOCK_EXPIRED`: Team session expired
- `TEAM_MISMATCH`: Team access violation
- `STORAGE_ERROR`: Server storage failure
- `INVALID_TOKEN`: Invalid authentication token

---

*This document reflects the current state of the application's data structures and should be updated when new formats are added or existing ones are modified.*