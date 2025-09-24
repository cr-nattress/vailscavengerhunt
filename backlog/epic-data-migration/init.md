Azure Cosmos DB Migration Plan for Vail Scavenger Hunt
Phase 0: Azure Setup & Preparation
1. Create Azure Resources
bash# Create Azure Cosmos DB Account (Serverless mode for cost efficiency)
# Use Azure Portal or CLI
az group create --name VailScavengerHuntRG --location "West US 2"

az cosmosdb create \
  --name vail-scavenger-hunt-cosmos \
  --resource-group VailScavengerHuntRG \
  --capabilities EnableServerless \
  --default-consistency-level Session \
  --locations regionName="West US 2"
2. Database & Container Setup Script
javascript// scripts/setup-cosmos-db.js
const { CosmosClient } = require("@azure/cosmos");
require('dotenv').config();

async function setupCosmosDB() {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });

  // Create database
  const { database } = await client.databases.createIfNotExists({
    id: "vail-scavenger-hunt"
  });

  console.log("✓ Database created: vail-scavenger-hunt");

  // Container 1: Teams (stores team data and hunt progress)
  await database.containers.createIfNotExists({
    id: "teams",
    partitionKey: { 
      paths: ["/organizationId"],
      kind: "Hash" 
    },
    indexingPolicy: {
      indexingMode: "consistent",
      includedPaths: [{ path: "/*" }],
      excludedPaths: [{ path: "/_etag/?" }]
    }
  });
  console.log("✓ Container created: teams");

  // Container 2: Sessions (24-hour TTL for team locks)
  await database.containers.createIfNotExists({
    id: "sessions",
    partitionKey: { paths: ["/sessionId"] },
    defaultTtl: 86400 // 24 hours auto-expiration
  });
  console.log("✓ Container created: sessions");

  // Container 3: Team Codes (maps codes to teams)
  await database.containers.createIfNotExists({
    id: "team-codes",
    partitionKey: { paths: ["/code"] },
    uniqueKeyPolicy: {
      uniqueKeys: [{ paths: ["/code"] }]
    }
  });
  console.log("✓ Container created: team-codes");

  // Container 4: Settings (app settings per org/team/hunt)
  await database.containers.createIfNotExists({
    id: "settings",
    partitionKey: { paths: ["/organizationId"] }
  });
  console.log("✓ Container created: settings");

  console.log("\n✅ Cosmos DB setup complete!");
}

setupCosmosDB().catch(console.error);
Phase 1: Data Models & Types
1. Cosmos DB Document Models
typescript// src/types/cosmos-models.ts
import { z } from 'zod';

// Base Cosmos document
const CosmosDocumentBase = z.object({
  id: z.string(),
  _etag: z.string().optional(),
  _ts: z.number().optional(),
  ttl: z.number().optional()
});

// Team document (combines team info + hunt progress)
export const TeamDocumentSchema = CosmosDocumentBase.extend({
  // Partition key
  organizationId: z.string(),
  
  // Team identifiers
  teamId: z.string(),
  huntId: z.string(),
  name: z.string(),
  displayName: z.string(),
  
  // Score tracking
  score: z.number().default(0),
  
  // Hunt progress (matches your existing structure)
  huntProgress: z.record(z.string(), z.object({
    done: z.boolean().default(false),
    notes: z.string().optional(),
    photo: z.string().url().optional(),
    revealedHints: z.number().default(0),
    completedAt: z.string().datetime().optional(),
    lastModifiedBy: z.string().uuid().optional()
  })).default({}),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Session document (replaces team lock)
export const SessionDocumentSchema = CosmosDocumentBase.extend({
  sessionId: z.string().uuid(), // Partition key
  teamId: z.string(),
  organizationId: z.string(),
  huntId: z.string(),
  
  // Session data
  startTime: z.string().datetime(),
  userAgent: z.string(),
  deviceHint: z.string().optional(),
  
  // Team lock data
  lockToken: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  
  // Status
  isActive: z.boolean().default(true),
  ttl: z.number().default(86400) // 24-hour TTL
});

// Team code mapping
export const TeamCodeDocumentSchema = CosmosDocumentBase.extend({
  code: z.string().toUpperCase(), // Partition key
  teamId: z.string(),
  teamName: z.string(),
  organizationId: z.string(),
  huntId: z.string(),
  eventId: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime()
});

// Settings document
export const SettingsDocumentSchema = CosmosDocumentBase.extend({
  organizationId: z.string(), // Partition key
  teamId: z.string(),
  huntId: z.string(),
  
  locationName: z.string(),
  teamName: z.string(),
  eventName: z.string(),
  sessionId: z.string().uuid(),
  
  lastModifiedBy: z.string().uuid().optional(),
  lastModifiedAt: z.string().datetime()
});

export type TeamDocument = z.infer<typeof TeamDocumentSchema>;
export type SessionDocument = z.infer<typeof SessionDocumentSchema>;
export type TeamCodeDocument = z.infer<typeof TeamCodeDocumentSchema>;
export type SettingsDocument = z.infer<typeof SettingsDocumentSchema>;
Phase 2: Data Access Layer
1. Cosmos DB Client Wrapper
typescript// src/lib/cosmos/client.ts
import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos";

class CosmosDBService {
  private client: CosmosClient;
  private database: Database;
  private _teams: Container;
  private _sessions: Container;
  private _teamCodes: Container;
  private _settings: Container;

  constructor() {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;

    if (!endpoint || !key) {
      throw new Error("Cosmos DB configuration missing");
    }

    this.client = new CosmosClient({ endpoint, key });
    this.database = this.client.database("vail-scavenger-hunt");
    
    this._teams = this.database.container("teams");
    this._sessions = this.database.container("sessions");
    this._teamCodes = this.database.container("team-codes");
    this._settings = this.database.container("settings");
  }

  get teams() { return this._teams; }
  get sessions() { return this._sessions; }
  get teamCodes() { return this._teamCodes; }
  get settings() { return this._settings; }

  // Helper for query execution with error handling
  async executeQuery<T>(container: Container, query: SqlQuerySpec): Promise<T[]> {
    try {
      const { resources } = await container.items
        .query<T>(query)
        .fetchAll();
      return resources;
    } catch (error) {
      console.error("Cosmos query error:", error);
      throw error;
    }
  }

  // Helper for single item operations
  async getItem<T>(
    container: Container, 
    id: string, 
    partitionKey: string
  ): Promise<T | null> {
    try {
      const { resource } = await container
        .item(id, partitionKey)
        .read<T>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async upsertItem<T>(container: Container, item: T): Promise<T> {
    const { resource } = await container.items.upsert(item);
    return resource as T;
  }
}

export const cosmosDB = new CosmosDBService();
2. Repository Pattern Implementation
typescript// src/lib/cosmos/repositories/TeamRepository.ts
import { cosmosDB } from '../client';
import { TeamDocument, TeamDocumentSchema } from '../../../types/cosmos-models';
import { SqlQuerySpec } from '@azure/cosmos';

export class TeamRepository {
  async getTeam(
    organizationId: string, 
    teamId: string
  ): Promise<TeamDocument | null> {
    const doc = await cosmosDB.getItem<TeamDocument>(
      cosmosDB.teams,
      teamId,
      organizationId
    );
    
    return doc ? TeamDocumentSchema.parse(doc) : null;
  }

  async getTeamByHunt(
    organizationId: string,
    teamId: string,
    huntId: string
  ): Promise<TeamDocument | null> {
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.teamId = @teamId 
        AND c.huntId = @huntId
      `,
      parameters: [
        { name: "@orgId", value: organizationId },
        { name: "@teamId", value: teamId },
        { name: "@huntId", value: huntId }
      ]
    };

    const results = await cosmosDB.executeQuery<TeamDocument>(
      cosmosDB.teams, 
      query
    );
    
    return results[0] ? TeamDocumentSchema.parse(results[0]) : null;
  }

  async updateHuntProgress(
    organizationId: string,
    teamId: string,
    locationId: string,
    progress: {
      done?: boolean;
      notes?: string;
      photo?: string;
      revealedHints?: number;
    },
    sessionId: string
  ): Promise<TeamDocument> {
    const team = await this.getTeam(organizationId, teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Update progress for specific location
    team.huntProgress[locationId] = {
      ...team.huntProgress[locationId],
      ...progress,
      lastModifiedBy: sessionId
    };

    // Update completion timestamp if marked as done
    if (progress.done) {
      team.huntProgress[locationId].completedAt = new Date().toISOString();
      
      // Calculate new score
      const completedLocations = Object.values(team.huntProgress)
        .filter(p => p.done).length;
      team.score = completedLocations * 10; // 10 points per location
    }

    team.updatedAt = new Date().toISOString();
    
    const updated = await cosmosDB.upsertItem(cosmosDB.teams, team);
    return TeamDocumentSchema.parse(updated);
  }

  async getLeaderboard(
    organizationId: string, 
    huntId: string
  ): Promise<TeamDocument[]> {
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.huntId = @huntId 
        ORDER BY c.score DESC
      `,
      parameters: [
        { name: "@orgId", value: organizationId },
        { name: "@huntId", value: huntId }
      ]
    };

    const results = await cosmosDB.executeQuery<TeamDocument>(
      cosmosDB.teams,
      query
    );
    
    return results.map(r => TeamDocumentSchema.parse(r));
  }
}

export const teamRepository = new TeamRepository();
Phase 3: Netlify Functions Update
1. Team Verification Function
typescript// netlify/functions/team-verify.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { teamRepository } from "../../src/lib/cosmos/repositories/TeamRepository";
import { teamCodeRepository } from "../../src/lib/cosmos/repositories/TeamCodeRepository";
import { sessionRepository } from "../../src/lib/cosmos/repositories/SessionRepository";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { code, deviceHint } = JSON.parse(event.body || "{}");
    
    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Team code required",
          code: "MISSING_CODE"
        })
      };
    }

    // 1. Verify team code exists and is active
    const teamCode = await teamCodeRepository.getByCode(code.toUpperCase());
    
    if (!teamCode || !teamCode.isActive) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "That code didn't work. Check with your host.",
          code: "TEAM_CODE_INVALID"
        })
      };
    }

    // 2. Get team details
    const team = await teamRepository.getTeamByHunt(
      teamCode.organizationId,
      teamCode.teamId,
      teamCode.huntId
    );

    if (!team) {
      // Create new team if doesn't exist
      const newTeam = await teamRepository.createTeam({
        id: teamCode.teamId,
        teamId: teamCode.teamId,
        organizationId: teamCode.organizationId,
        huntId: teamCode.huntId,
        name: teamCode.teamName,
        displayName: teamCode.teamName,
        score: 0,
        huntProgress: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      team = newTeam;
    }

    // 3. Create session with 24-hour TTL
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    // Generate JWT token
    const lockToken = jwt.sign(
      {
        teamId: team.teamId,
        sessionId,
        organizationId: team.organizationId,
        huntId: team.huntId,
        exp: Math.floor(expiresAt / 1000)
      },
      process.env.TEAM_LOCK_JWT_SECRET!
    );

    // Save session to Cosmos DB
    await sessionRepository.createSession({
      id: sessionId,
      sessionId,
      teamId: team.teamId,
      organizationId: team.organizationId,
      huntId: team.huntId,
      startTime: new Date().toISOString(),
      userAgent: event.headers["user-agent"] || "",
      deviceHint,
      lockToken,
      issuedAt: now,
      expiresAt,
      isActive: true,
      ttl: 86400 // 24-hour TTL for auto-cleanup
    });

    // Return success response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({
        teamId: team.teamId,
        teamName: team.displayName,
        lockToken,
        ttlSeconds: 86400,
        sessionId,
        organizationId: team.organizationId,
        huntId: team.huntId
      })
    };

  } catch (error) {
    console.error("Team verification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error during verification",
        code: "SERVER_ERROR"
      })
    };
  }
};
2. Save Progress Function
typescript// netlify/functions/save-progress.ts
import type { Handler } from "@netlify/functions";
import { teamRepository } from "../../src/lib/cosmos/repositories/TeamRepository";
import jwt from "jsonwebtoken";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing authentication" })
      };
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.TEAM_LOCK_JWT_SECRET!);
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid or expired token" })
      };
    }

    // Parse request body
    const { progress, locationId } = JSON.parse(event.body || "{}");
    const { orgId, teamId, huntId } = event.queryStringParameters || {};

    // Validate required parameters
    if (!orgId || !teamId || !huntId || !locationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" })
      };
    }

    // Verify token matches requested team
    if (decoded.teamId !== teamId || 
        decoded.organizationId !== orgId ||
        decoded.huntId !== huntId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Access denied" })
      };
    }

    // Update progress in Cosmos DB
    const updatedTeam = await teamRepository.updateHuntProgress(
      orgId,
      teamId,
      locationId,
      progress,
      decoded.sessionId
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        score: updatedTeam.score,
        progress: updatedTeam.huntProgress[locationId]
      })
    };

  } catch (error) {
    console.error("Save progress error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to save progress" })
    };
  }
};
3. Photo Upload Function (Cloudinary Integration)
typescript// netlify/functions/upload-photo.ts
import type { Handler } from "@netlify/functions";
import { v2 as cloudinary } from "cloudinary";
import { teamRepository } from "../../src/lib/cosmos/repositories/TeamRepository";
import jwt from "jsonwebtoken";
import busboy from "busboy";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    // Verify authentication
    const token = event.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token!, process.env.TEAM_LOCK_JWT_SECRET!) as any;

    // Parse multipart form data
    const { file, metadata } = await parseMultipartForm(event);
    
    // Upload to Cloudinary with metadata
    const uploadResult = await cloudinary.uploader.upload(file, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "scavenger/entries",
      public_id: `${metadata.locationSlug}-${metadata.teamSlug}-${Date.now()}`,
      tags: [
        metadata.eventName,
        metadata.teamName,
        metadata.locationTitle
      ],
      context: {
        teamId: decoded.teamId,
        sessionId: decoded.sessionId,
        locationSlug: metadata.locationSlug,
        uploadedAt: new Date().toISOString()
      }
    });

    // Update team progress with photo URL
    await teamRepository.updateHuntProgress(
      decoded.organizationId,
      decoded.teamId,
      metadata.locationSlug,
      {
        photo: uploadResult.secure_url,
        done: true
      },
      decoded.sessionId
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        photoUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        locationSlug: metadata.locationSlug,
        title: metadata.locationTitle,
        uploadedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error("Photo upload error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Upload failed" })
    };
  }
};
Phase 4: Frontend Integration Updates
1. API Service Layer
typescript// src/services/HuntAPI.ts
import { TeamVerifyResponse, LocationProgress, PhotoMetadata } from '../types';

export class HuntAPI {
  private baseUrl = '/.netlify/functions';
  private lockData: any = null;

  constructor() {
    // Load existing lock from localStorage
    this.loadLock();
  }

  private loadLock() {
    const stored = localStorage.getItem('hunt.team.lock.v1');
    if (stored) {
      const lock = JSON.parse(stored);
      if (Date.now() < lock.expiresAt) {
        this.lockData = lock;
      } else {
        localStorage.removeItem('hunt.team.lock.v1');
      }
    }
  }

  private saveLock(data: any) {
    this.lockData = {
      ...data,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (data.ttlSeconds * 1000)
    };
    localStorage.setItem('hunt.team.lock.v1', JSON.stringify(this.lockData));
  }

  async verifyTeam(code: string): Promise<TeamVerifyResponse> {
    const response = await fetch(`${this.baseUrl}/team-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code,
        deviceHint: this.generateDeviceHint()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }

    const data = await response.json();
    this.saveLock(data);
    return data;
  }

  async saveProgress(
    orgId: string,
    teamId: string,
    huntId: string,
    locationId: string,
    progress: LocationProgress
  ): Promise<void> {
    if (!this.lockData) throw new Error('No active team session');

    const response = await fetch(
      `${this.baseUrl}/save-progress?orgId=${orgId}&teamId=${teamId}&huntId=${huntId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.lockData.lockToken}`
        },
        body: JSON.stringify({ locationId, progress })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save progress');
    }
  }

  async uploadPhoto(
    file: File,
    metadata: PhotoMetadata
  ): Promise<{ photoUrl: string }> {
    if (!this.lockData) throw new Error('No active team session');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${this.baseUrl}/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.lockData.lockToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Photo upload failed');
    }

    return response.json();
  }

  async getLeaderboard(orgId: string, huntId: string) {
    const response = await fetch(
      `${this.baseUrl}/get-leaderboard?orgId=${orgId}&huntId=${huntId}`,
      {
        headers: this.lockData ? {
          'Authorization': `Bearer ${this.lockData.lockToken}`
        } : {}
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    return response.json();
  }

  private generateDeviceHint(): string {
    return btoa([
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|'));
  }

  isAuthenticated(): boolean {
    return !!this.lockData && Date.now() < this.lockData.expiresAt;
  }

  getTeamInfo() {
    return this.lockData ? {
      teamId: this.lockData.teamId,
      teamName: this.lockData.teamName,
      organizationId: this.lockData.organizationId,
      huntId: this.lockData.huntId,
      sessionId: this.lockData.sessionId
    } : null;
  }

  logout() {
    this.lockData = null;
    localStorage.removeItem('hunt.team.lock.v1');
  }
}

export const huntAPI = new HuntAPI();
Phase 5: Migration Scripts
1. Data Migration from Netlify Blobs
javascript// scripts/migrate-netlify-to-cosmos.js
const { getStore } = require("@netlify/blobs");
const { CosmosClient } = require("@azure/cosmos");
require('dotenv').config();

async function migrateData() {
  console.log("Starting migration from Netlify Blobs to Cosmos DB...\n");

  // Initialize Netlify Blobs
  const store = getStore({
    name: process.env.NETLIFY_BLOBS_STORE_NAME,
    token: process.env.NETLIFY_AUTH_TOKEN,
    siteID: process.env.NETLIFY_SITE_ID,
  });

  // Initialize Cosmos DB
  const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });

  const database = cosmosClient.database("vail-scavenger-hunt");
  
  // Migrate settings
  console.log("📁 Migrating settings...");
  const settingsBlobs = await store.list({ prefix: "settings/" });
  let settingsCount = 0;
  
  for await (const blob of settingsBlobs.blobs) {
    const data = await store.get(blob.key);
    if (data) {
      const settings = JSON.parse(data);
      const [, orgId, teamId, huntId] = blob.key.split('/');
      
      await database.container("settings").items.upsert({
        id: `${orgId}-${teamId}-${huntId}`,
        organizationId: orgId,
        teamId,
        huntId,
        ...settings,
        migratedAt: new Date().toISOString()
      });
      
      settingsCount++;
      console.log(`  ✓ Migrated settings for ${teamId}`);
    }
  }

  // Migrate progress data
  console.log("\n📊 Migrating progress data...");
  const progressBlobs = await store.list({ prefix: "progress/" });
  let progressCount = 0;
  
  for await (const blob of progressBlobs.blobs) {
    const data = await store.get(blob.key);
    if (data) {
      const progress = JSON.parse(data);
      const [, orgId, teamId, huntId] = blob.key.split('/');
      
      // Check if team exists, create if not
      const { resource: existingTeam } = await database
        .container("teams")
        .item(teamId, orgId)
        .read()
        .catch(() => ({ resource: null }));

      if (!existingTeam) {
        await database.container("teams").items.create({
          id: teamId,
          teamId,
          organizationId: orgId,
          huntId,
          name: teamId, // Will be updated from config
          displayName: teamId,
          score: calculateScore(progress),
          huntProgress: progress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update existing team
        existingTeam.huntProgress = progress;
        existingTeam.score = calculateScore(progress);
        existingTeam.updatedAt = new Date().toISOString();
        await database.container("teams").items.upsert(existingTeam);
      }
      
      progressCount++;
      console.log(`  ✓ Migrated progress for ${teamId}`);
    }
  }

  // Migrate sessions
  console.log("\n🔐 Migrating active sessions...");
  const sessionBlobs = await store.list({ prefix: "sessions/" });
  let sessionCount = 0;
  
  for await (const blob of sessionBlobs.blobs) {
    const data = await store.get(blob.key);
    if (data) {
      const session = JSON.parse(data);
      
      await database.container("sessions").items.upsert({
        ...session,
        sessionId: session.id,
        ttl: 86400, // Set TTL for auto-cleanup
        migratedAt: new Date().toISOString()
      });
      
      sessionCount++;
      console.log(`  ✓ Migrated session ${session.id}`);
    }
  }

  console.log("\n✅ Migration Complete!");
  console.log(`  - Settings: ${settingsCount}`);
  console.log(`  - Teams/Progress: ${progressCount}`);
  console.log(`  - Sessions: ${sessionCount}`);
}

function calculateScore(progress) {
  return Object.values(progress).filter(p => p.done).length * 10;
}

migrateData().catch(console.error);
2. Team Codes Import
javascript// scripts/import-team-codes.js
const { CosmosClient } = require("@azure/cosmos");
const teamCodes = require("../src/data/team-codes.json");
require('dotenv').config();

async function importTeamCodes() {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });

  const container = client
    .database("vail-scavenger-hunt")
    .container("team-codes");

  console.log("Importing team codes to Cosmos DB...\n");

  for (const code of teamCodes) {
    const document = {
      id: code.code,
      code: code.code.toUpperCase(),
      teamId: code.teamId,
      teamName: code.teamName,
      organizationId: code.organizationId || "bhhs",
      huntId: code.huntId || "fall-2025",
      eventId: code.eventId || "vail-hunt-2025",
      isActive: true,
      createdAt: new Date().toISOString()
    };

    await container.items.upsert(document);
    console.log(`✓ Imported code: ${code.code} -> ${code.teamName}`);
  }

  console.log("\n✅ Team codes import complete!");
}

importTeamCodes().catch(console.error);
Phase 6: Environment Configuration
1. Environment Variables
bash# .env.production (Add to Netlify Environment Variables)

# Azure Cosmos DB
COSMOS_ENDPOINT=https://vail-scavenger-hunt-cosmos.documents.azure.com:443/
COSMOS_KEY=your-cosmos-primary-key
COSMOS_DATABASE=vail-scavenger-hunt

# Cloudinary (Keep existing)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=scavenger/entries

# JWT & Security
TEAM_LOCK_JWT_SECRET=your-jwt-secret-minimum-32-chars
TEAM_LOCK_TTL_SECONDS=86400

# Feature Flags for gradual rollout
VITE_USE_COSMOS=true
VITE_USE_NETLIFY_BLOBS=false
VITE_ENABLE_DUAL_WRITE=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_MAX_UPLOAD_SIZE=10485760
Phase 7: Testing & Deployment
1. Integration Tests
typescript// tests/cosmos-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cosmosDB } from '../src/lib/cosmos/client';
import { teamRepository } from '../src/lib/cosmos/repositories/TeamRepository';

describe('Cosmos DB Integration', () => {
  const testOrgId = 'test-org';
  const testTeamId = `test-team-${Date.now()}`;
  const testHuntId = 'test-hunt';

  afterAll(async () => {
    // Cleanup test data
    try {
      await cosmosDB.teams.item(testTeamId, testOrgId).delete();
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  it('should create and retrieve team', async () => {
    const team = {
      id: testTeamId,
      teamId: testTeamId,
      organizationId: testOrgId,
      huntId: testHuntId,
      name: 'Test Team',
      displayName: 'Test Team Display',
      score: 0,
      huntProgress: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await teamRepository.createTeam(team);
    const retrieved = await teamRepository.getTeam(testOrgId, testTeamId);
    
    expect(retrieved).toBeTruthy();
    expect(retrieved?.name).toBe('Test Team');
  });

  it('should update hunt progress', async () => {
    await teamRepository.updateHuntProgress(
      testOrgId,
      testTeamId,
      'test-location',
      { done: true, notes: 'Test note' },
      'test-session'
    );

    const team = await teamRepository.getTeam(testOrgId, testTeamId);
    expect(team?.huntProgress['test-location'].done).toBe(true);
    expect(team?.score).toBe(10);
  });
});
2. Deployment Checklist
markdown## Pre-Deployment Checklist

### Azure Setup
- [ ] Cosmos DB account created in West US 2
- [ ] Database "vail-scavenger-hunt" created
- [ ] All 4 containers created with correct partition keys
- [ ] Connection strings obtained
- [ ] RBAC/Keys configured

### Code Preparation
- [ ] All TypeScript models created
- [ ] Repository classes implemented
- [ ] Netlify functions updated
- [ ] Frontend API service updated
- [ ] Migration scripts tested locally

### Netlify Configuration
- [ ] Environment variables added to Netlify
- [ ] Build command verified: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Functions directory: `netlify/functions`

### Testing
- [ ] Unit tests passing
- [ ] Integration tests with Cosmos DB passing
- [ ] Local Netlify Dev testing complete
- [ ] Preview deployment tested

## Deployment Steps

1. **Initial Deployment (Feature Flag OFF)**
   - Set `VITE_USE_COSMOS=false`
   - Deploy to production
   - Verify existing functionality works

2. **Dual-Write Mode (Optional Safety)**
   - Set `VITE_ENABLE_DUAL_WRITE=true`
   - Deploy and monitor for 24 hours
   - Check both Cosmos and Netlify Blobs

3. **Data Migration**
   - Run `npm run migrate:cosmos`
   - Verify data in Azure Portal
   - Test with a few team codes

4. **Enable Cosmos DB**
   - Set `VITE_USE_COSMOS=true`
   - Set `VITE_USE_NETLIFY_BLOBS=false`
   - Deploy to production

5. **Monitor & Verify**
   - Check Application Insights
   - Test all critical paths
   - Monitor Cosmos DB metrics

## Rollback Plan

If issues occur:
1. Set `VITE_USE_COSMOS=false`
2. Set `VITE_USE_NETLIFY_BLOBS=true`  
3. Redeploy immediately
4. Investigate Cosmos DB logs
Cost Analysis
yamlMonthly Cost Breakdown:

Current:
  - Netlify Pro: $19/month
  - Netlify Blobs: Included
  - Cloudinary: $89/month
  - Total: ~$108/month

With Cosmos DB:
  - Netlify Pro: $19/month
  - Cloudinary: $89/month (unchanged)
  - Azure Cosmos DB (Serverless):
    - Storage: ~$5/month (20GB)
    - Request Units: ~$10-20/month
    - Backup: ~$5/month
  - Total: ~$128-138/month

Benefits:
  - Better querying capabilities
  - Global distribution ready
  - Automatic scaling
  - Built-in backup/restore
  - TTL for automatic cleanup
  - Better monitoring/analytics
This migration plan provides:

Gradual rollout with feature flags
Zero downtime migration
Easy rollback capability
Comprehensive testing at each stage
Cost-effective Azure Cosmos DB serverless tier
Maintains your existing Netlify + Cloudinary infrastructure

The plan is modular and can be adapted based on your actual codebase structure in the features/demo-01 branch.