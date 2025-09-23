# Azure Table Storage Migration Plan

## Executive Summary

This plan outlines the migration of all JSON data from the current Netlify Blobs storage to Azure Table Storage, providing improved scalability, native JSON querying capabilities, cost-effectiveness, and enhanced enterprise features optimized for multi-tenant JSON document storage.

## Current State Analysis

### Existing Storage Architecture

**Current Provider**: Netlify Blobs
**Storage Pattern**: Key-value pairs with JSON values
**Access Pattern**: REST API through Netlify Functions

#### Current Data Categories:

1. **Configuration Data** (Static)
   - Hunt locations: `src/data/locations/*.ts`
   - Team configurations: `src/data/teams/config.ts`
   - ~50KB total, rarely changes

2. **Dynamic User Data** (High Frequency)
   - Team progress: `progress/{orgId}/{teamId}/{huntId}.json`
   - App settings: `settings/{orgId}/{teamId}/{huntId}.json`
   - User sessions: `sessions/{sessionId}.json`
   - ~1-10MB per active hunt, frequent updates

3. **Team Management Data** (Medium Frequency)
   - Team data: `teams/team_{teamId}.json`
   - Team code mappings: `team:{teamCode}`
   - ~100KB per team, moderate updates

---

## Azure Table Storage Architecture

### Table Strategy

**Single Table**: `scavengerhuntdata` (max 500TB, auto-partitioned)

#### Partition Strategy (Multi-Tenant Isolation)
```
PartitionKey: "{orgId}#{huntId}"
RowKey: "{dataType}#{entityId}#{version?}"

Examples:
┌─────────────────────────────────────────────────────────────────┐
│ PartitionKey: "bhhs#fall-2025"                                 │
├─────────────────────────────────────────────────────────────────┤
│ RowKey: "progress#team-alpha"           # Current progress      │
│ RowKey: "progress#team-alpha#20240115"  # Backup version       │
│ RowKey: "settings#team-alpha"           # App settings         │
│ RowKey: "session#guid-123"              # Session data         │
│ RowKey: "team#team-alpha"               # Team metadata        │
│ RowKey: "config#locations"              # Hunt locations       │
│ RowKey: "config#teams"                  # Team definitions     │
│ RowKey: "mapping#ALPHA01"               # Team code mapping    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PartitionKey: "vail#valley-default"                            │
├─────────────────────────────────────────────────────────────────┤
│ RowKey: "progress#team-beta"                                   │
│ RowKey: "settings#team-beta"                                   │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Entity Schema

```typescript
interface TableEntity {
  // Azure Table required fields
  partitionKey: string     // "{orgId}#{huntId}"
  rowKey: string          // "{dataType}#{entityId}#{version?}"
  timestamp: Date         // Auto-managed by Azure
  etag: string           // Auto-managed for optimistic concurrency

  // Custom data fields
  jsonData: string       // Serialized JSON content
  dataType: string       // "progress" | "settings" | "session" | "team" | "config" | "mapping"
  entityId: string       // teamId, sessionId, etc.
  version?: string       // ISO date for versioning (backups)
  lastModifiedBy: string // sessionId of last modifier
  isActive: boolean      // For soft deletes
  expiresAt?: Date       // TTL for sessions (auto-cleanup)
}
```

### Data Access Patterns

| Data Type | Access Pattern | Retention | Query Pattern |
|-----------|----------------|-----------|---------------|
| Configuration | Read-heavy | Permanent | By partition + dataType |
| Team Progress | Read/Write heavy | 2 years | By partition + team |
| App Settings | Read/Write medium | 2 years | By partition + team |
| Sessions | Write-heavy | 30 days (TTL) | By partition + session |
| Team Data | Read/Write medium | 2 years | By partition + team |
| Backups | Write-only | 7 years | By partition + version |

---

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Azure Resources
```bash
# Resource Group
az group create --name rg-scavenger-hunt --location eastus2

# Storage Account
az storage account create \
  --name stscavengerhunt \
  --resource-group rg-scavenger-hunt \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true

# Container with hierarchical namespace
az storage container create \
  --name scavenger-hunt-data \
  --account-name stscavengerhunt \
  --public-access off
```

#### 1.2 Access Control
```bash
# Create managed identity for app
az ad sp create-for-rbac --name "scavenger-hunt-app"

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee {service-principal-id} \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/{subscription}/resourceGroups/rg-scavenger-hunt"
```

### Phase 2: Service Integration (Week 2)

#### 2.1 Azure SDK Integration
```typescript
// src/services/AzureTableService.ts
import { TableClient, TableEntity, AzureNamedKeyCredential } from '@azure/data-tables'

interface ScavengerHuntEntity extends TableEntity {
  jsonData: string
  dataType: string
  entityId: string
  version?: string
  lastModifiedBy: string
  isActive: boolean
  expiresAt?: Date
}

export class AzureTableService {
  private tableClient: TableClient
  private tableName = 'scavengerhuntdata'

  constructor() {
    const account = process.env.AZURE_STORAGE_ACCOUNT_NAME!
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!

    const credential = new AzureNamedKeyCredential(account, accountKey)
    this.tableClient = new TableClient(
      `https://${account}.table.core.windows.net`,
      this.tableName,
      credential
    )
  }

  /**
   * Store JSON data with automatic versioning for backups
   */
  async upsertJson(
    orgId: string,
    huntId: string,
    dataType: string,
    entityId: string,
    data: any,
    sessionId: string,
    createBackup = false
  ): Promise<void> {
    const partitionKey = `${orgId}#${huntId}`
    const rowKey = `${dataType}#${entityId}`

    const entity: ScavengerHuntEntity = {
      partitionKey,
      rowKey,
      jsonData: JSON.stringify(data, null, 2),
      dataType,
      entityId,
      lastModifiedBy: sessionId,
      isActive: true
    }

    // Set TTL for sessions (30 days)
    if (dataType === 'session') {
      entity.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    // Upsert current version
    await this.tableClient.upsertEntity(entity, 'Replace')

    // Create backup version if requested
    if (createBackup) {
      const backupEntity = {
        ...entity,
        rowKey: `${dataType}#${entityId}#${new Date().toISOString().split('T')[0]}`,
        version: new Date().toISOString()
      }
      await this.tableClient.upsertEntity(backupEntity, 'Replace')
    }
  }

  /**
   * Retrieve JSON data by keys
   */
  async getJson<T>(
    orgId: string,
    huntId: string,
    dataType: string,
    entityId: string
  ): Promise<T | null> {
    try {
      const partitionKey = `${orgId}#${huntId}`
      const rowKey = `${dataType}#${entityId}`

      const entity = await this.tableClient.getEntity<ScavengerHuntEntity>(
        partitionKey,
        rowKey
      )

      if (!entity.isActive) return null

      return JSON.parse(entity.jsonData) as T
    } catch (error: any) {
      if (error.statusCode === 404) return null
      throw error
    }
  }

  /**
   * Query entities by data type (e.g., all teams in a hunt)
   */
  async queryByType<T>(
    orgId: string,
    huntId: string,
    dataType: string
  ): Promise<Array<{ entityId: string; data: T }>> {
    const partitionKey = `${orgId}#${huntId}`
    const filter = `PartitionKey eq '${partitionKey}' and dataType eq '${dataType}' and isActive eq true`

    const entities = this.tableClient.listEntities<ScavengerHuntEntity>({
      queryOptions: { filter }
    })

    const results: Array<{ entityId: string; data: T }> = []

    for await (const entity of entities) {
      results.push({
        entityId: entity.entityId,
        data: JSON.parse(entity.jsonData) as T
      })
    }

    return results
  }

  /**
   * Soft delete entity
   */
  async deleteEntity(
    orgId: string,
    huntId: string,
    dataType: string,
    entityId: string
  ): Promise<void> {
    const partitionKey = `${orgId}#${huntId}`
    const rowKey = `${dataType}#${entityId}`

    try {
      const entity = await this.tableClient.getEntity<ScavengerHuntEntity>(
        partitionKey,
        rowKey
      )

      await this.tableClient.upsertEntity({
        ...entity,
        isActive: false
      }, 'Replace')
    } catch (error: any) {
      if (error.statusCode !== 404) throw error
    }
  }
}
```

#### 2.2 Entity Key Builder Utility
```typescript
// src/utils/azureTableKeys.ts
export class AzureTableKeys {
  /**
   * Generate partition key for multi-tenant isolation
   */
  static partition(orgId: string, huntId: string): string {
    return `${orgId}#${huntId}`
  }

  /**
   * Generate row keys for different data types
   */
  static rowKey = {
    progress: (teamId: string) => `progress#${teamId}`,
    progressBackup: (teamId: string, date: string) => `progress#${teamId}#${date}`,
    settings: (teamId: string) => `settings#${teamId}`,
    session: (sessionId: string) => `session#${sessionId}`,
    team: (teamId: string) => `team#${teamId}`,
    mapping: (teamCode: string) => `mapping#${teamCode}`,
    config: (configType: string) => `config#${configType}` // 'locations' or 'teams'
  }

  /**
   * Parse entity details from row key
   */
  static parseRowKey(rowKey: string): { dataType: string; entityId: string; version?: string } {
    const parts = rowKey.split('#')
    return {
      dataType: parts[0],
      entityId: parts[1],
      version: parts[2] // Optional backup version
    }
  }

  /**
   * Parse partition details
   */
  static parsePartition(partitionKey: string): { orgId: string; huntId: string } {
    const [orgId, huntId] = partitionKey.split('#')
    return { orgId, huntId }
  }
}
```

### Phase 3: Data Migration Service (Week 3)

#### 3.1 Migration Service
```typescript
// src/services/MigrationService.ts
export class MigrationService {
  private netlifyService = new NetlifyStateService()
  private azureService = new AzureTableService()

  async migrateAllData(): Promise<MigrationReport> {
    const report: MigrationReport = {
      startTime: new Date(),
      configData: { migrated: 0, errors: [] },
      teamData: { migrated: 0, errors: [] },
      progressData: { migrated: 0, errors: [] },
      sessionData: { migrated: 0, errors: [] }
    }

    console.log('[Migration] Starting Azure Table Storage migration...')

    // Migrate by organization/hunt combinations
    const huntConfigs = [
      { orgId: 'bhhs', huntId: 'fall-2025' },
      { orgId: 'vail', huntId: 'valley-default' },
      { orgId: 'vail', huntId: 'village-default' }
    ]

    for (const { orgId, huntId } of huntConfigs) {
      await this.migrateHunt(orgId, huntId, report)
    }

    report.endTime = new Date()
    return report
  }

  private async migrateHunt(
    orgId: string,
    huntId: string,
    report: MigrationReport
  ): Promise<void> {
    console.log(`[Migration] Migrating ${orgId}/${huntId}...`)

    try {
      // 1. Migrate configuration data
      await this.migrateConfigData(orgId, huntId, report)

      // 2. Migrate team mappings
      await this.migrateTeamMappings(orgId, huntId, report)

      // 3. Migrate team progress data
      await this.migrateProgressData(orgId, huntId, report)

      // 4. Migrate app settings
      await this.migrateSettingsData(orgId, huntId, report)

      // 5. Migrate session data
      await this.migrateSessionData(orgId, huntId, report)

    } catch (error) {
      console.error(`[Migration] Failed to migrate ${orgId}/${huntId}:`, error)
    }
  }

  private async migrateConfigData(
    orgId: string,
    huntId: string,
    report: MigrationReport
  ): Promise<void> {
    try {
      // Get location data from TypeScript files
      const locationData = await this.getLocationDataFromCode(orgId, huntId)

      await this.azureService.upsertJson(
        orgId,
        huntId,
        'config',
        'locations',
        locationData,
        'migration-service'
      )

      // Get team configuration data
      const teamsConfig = await this.getTeamsConfigFromCode()

      await this.azureService.upsertJson(
        orgId,
        huntId,
        'config',
        'teams',
        teamsConfig,
        'migration-service'
      )

      report.configData.migrated += 2
      console.log(`[Migration] Migrated config data for ${orgId}/${huntId}`)
    } catch (error) {
      report.configData.errors.push(`${orgId}/${huntId}: ${error.message}`)
    }
  }

  private async migrateProgressData(
    orgId: string,
    huntId: string,
    report: MigrationReport
  ): Promise<void> {
    try {
      // Query Netlify Blobs for progress data pattern
      const progressKeys = await this.netlifyService.listKeys(`progress/${orgId}/*/huntId}.json`)

      for (const key of progressKeys) {
        const progressData = await this.netlifyService.get(key)
        const teamId = this.extractTeamIdFromKey(key)

        await this.azureService.upsertJson(
          orgId,
          huntId,
          'progress',
          teamId,
          progressData,
          'migration-service',
          true // Create backup
        )

        report.progressData.migrated++
      }

      console.log(`[Migration] Migrated ${progressKeys.length} progress records for ${orgId}/${huntId}`)
    } catch (error) {
      report.progressData.errors.push(`${orgId}/${huntId}: ${error.message}`)
    }
  }

  // Additional migration methods...
}
```

### Phase 4: Service Layer Updates (Week 4)

#### 4.1 Update Existing Services
```typescript
// src/services/ProgressService.ts (Updated)
export class ProgressService {
  private azureService = new AzureTableService()

  async getProgress(orgId: string, teamId: string, huntId: string): Promise<ProgressData> {
    try {
      const data = await this.azureService.getJson<ProgressData>(
        orgId,
        huntId,
        'progress',
        teamId
      )
      return data || {}
    } catch (error) {
      console.error('[ProgressService] Failed to load progress:', error)
      return {}
    }
  }

  async saveProgress(
    orgId: string,
    teamId: string,
    huntId: string,
    progress: ProgressData,
    sessionId: string
  ): Promise<boolean> {
    try {
      const enrichedProgress = {
        ...progress,
        lastModifiedBy: sessionId,
        lastModifiedAt: new Date().toISOString()
      }

      // Save with automatic backup creation
      await this.azureService.upsertJson(
        orgId,
        huntId,
        'progress',
        teamId,
        enrichedProgress,
        sessionId,
        true // Create backup version
      )

      return true
    } catch (error) {
      console.error('[ProgressService] Failed to save progress:', error)
      return false
    }
  }

  /**
   * Get all team progress for a hunt (admin/leaderboard view)
   */
  async getAllTeamProgress(
    orgId: string,
    huntId: string
  ): Promise<Array<{ teamId: string; progress: ProgressData }>> {
    try {
      const results = await this.azureService.queryByType<ProgressData>(
        orgId,
        huntId,
        'progress'
      )

      return results.map(({ entityId, data }) => ({
        teamId: entityId,
        progress: data
      }))
    } catch (error) {
      console.error('[ProgressService] Failed to load all team progress:', error)
      return []
    }
  }

  /**
   * Get progress history for a team (backup versions)
   */
  async getProgressHistory(
    orgId: string,
    teamId: string,
    huntId: string
  ): Promise<Array<{ date: string; progress: ProgressData }>> {
    try {
      // Query for backup versions using row key pattern
      const partitionKey = AzureTableKeys.partition(orgId, huntId)
      const filter = `PartitionKey eq '${partitionKey}' and dataType eq 'progress' and entityId eq '${teamId}' and version ne null`

      // Implementation would require custom query for version entities
      // This is a simplified example
      return []
    } catch (error) {
      console.error('[ProgressService] Failed to load progress history:', error)
      return []
    }
  }
}
```

### Phase 5: Advanced Features (Week 5)

#### 5.1 Caching Strategy
```typescript
// src/services/AzureTableCacheService.ts
export class AzureTableCacheService extends AzureTableService {
  private cache = new Map<string, { data: any, expiry: number, etag?: string }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly CONFIG_CACHE_TTL = 30 * 60 * 1000 // 30 minutes for config

  /**
   * Get JSON with caching and ETag-based freshness checks
   */
  async getJsonCached<T>(
    orgId: string,
    huntId: string,
    dataType: string,
    entityId: string
  ): Promise<T | null> {
    const cacheKey = `${orgId}#${huntId}#${dataType}#${entityId}`
    const cached = this.cache.get(cacheKey)

    const ttl = dataType === 'config' ? this.CONFIG_CACHE_TTL : this.CACHE_TTL

    // Return cached data if still fresh
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T
    }

    try {
      // Get fresh data from Azure Table
      const partitionKey = AzureTableKeys.partition(orgId, huntId)
      const rowKey = AzureTableKeys.rowKey[dataType as keyof typeof AzureTableKeys.rowKey](entityId)

      const entity = await this.tableClient.getEntity<ScavengerHuntEntity>(
        partitionKey,
        rowKey
      )

      if (!entity.isActive) return null

      const data = JSON.parse(entity.jsonData) as T

      // Cache with ETag for freshness detection
      this.cache.set(cacheKey, {
        data,
        expiry: Date.now() + ttl,
        etag: entity.etag
      })

      return data
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Cache null result to avoid repeated requests
        this.cache.set(cacheKey, {
          data: null,
          expiry: Date.now() + (ttl / 10) // Shorter TTL for null results
        })
        return null
      }
      throw error
    }
  }

  /**
   * Invalidate cache for specific entity
   */
  invalidateEntity(orgId: string, huntId: string, dataType: string, entityId: string) {
    const cacheKey = `${orgId}#${huntId}#${dataType}#${entityId}`
    this.cache.delete(cacheKey)
  }

  /**
   * Invalidate all cache entries for a hunt
   */
  invalidateHunt(orgId: string, huntId: string) {
    const prefix = `${orgId}#${huntId}#`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Cache statistics for monitoring
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      memory: JSON.stringify([...this.cache.entries()]).length,
      hitRate: this.calculateHitRate() // Implementation detail
    }
  }
}
```

#### 5.2 Conflict Resolution
```typescript
// src/services/ConflictResolution.ts
export class ConflictResolution {
  async resolveProgressConflict(
    localProgress: ProgressData,
    remoteProgress: ProgressData
  ): Promise<ProgressData> {
    const resolved: ProgressData = {}

    // Merge strategy: latest completion wins, combine notes
    const allStopIds = new Set([
      ...Object.keys(localProgress),
      ...Object.keys(remoteProgress)
    ])

    for (const stopId of allStopIds) {
      const local = localProgress[stopId]
      const remote = remoteProgress[stopId]

      if (!local) {
        resolved[stopId] = remote
      } else if (!remote) {
        resolved[stopId] = local
      } else {
        // Both exist - merge intelligently
        resolved[stopId] = {
          done: local.done || remote.done, // Either completed = completed
          notes: this.mergeNotes(local.notes, remote.notes),
          photo: local.photo || remote.photo,
          revealedHints: Math.max(local.revealedHints || 0, remote.revealedHints || 0),
          completedAt: this.getLatestDate(local.completedAt, remote.completedAt),
          lastModifiedBy: this.getLatestModifier(local, remote)
        }
      }
    }

    return resolved
  }
}
```

---

## Environment Configuration

### Azure-Specific Environment Variables
```bash
# Azure Storage Account Configuration
AZURE_STORAGE_ACCOUNT_NAME=stscavengerhunt
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Service Principal (for production)
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Table Configuration
AZURE_TABLE_NAME=scavengerhuntdata
AZURE_TABLE_BASE_URL=https://stscavengerhunt.table.core.windows.net

# Performance Settings
AZURE_TABLE_CACHE_TTL=300000
AZURE_TABLE_CONFIG_CACHE_TTL=1800000
AZURE_TABLE_RETRY_ATTEMPTS=3
AZURE_TABLE_TIMEOUT=30000
AZURE_TABLE_MAX_BATCH_SIZE=100

# Migration Settings
MIGRATION_BATCH_SIZE=50
MIGRATION_CONCURRENT_REQUESTS=5
MIGRATION_BACKUP_ENABLED=true
```

---

## Migration Timeline & Costs

### Timeline
| Phase | Duration | Deliverables |
|-------|----------|-------------|
| 1 | Week 1 | Azure infrastructure setup |
| 2 | Week 2 | SDK integration & basic services |
| 3 | Week 3 | Data migration tools & execution |
| 4 | Week 4 | Service layer updates & testing |
| 5 | Week 5 | Advanced features & optimization |

### Cost Estimates (Monthly)

#### Storage Costs (Azure Table Storage)
- **Data Storage**: ~10GB @ $0.045/GB = $0.45/month
- **No tier management** - all data in single tier
- **Built-in redundancy** included
- **Total Storage**: ~$0.45/month

#### Transaction Costs
- **Read Operations**: ~100K @ $0.0004/10K = $4/month
- **Write Operations**: ~50K @ $0.0065/10K = $3.25/month
- **Query Operations**: ~20K @ $0.0004/10K = $0.80/month
- **Total Transactions**: ~$8.05/month

#### **Total Estimated Cost**: ~$8.50/month

**Cost Savings vs Blob**: 70% reduction (~$21.50/month savings)

---

## Benefits of Azure Migration

### Performance Benefits
- **Native JSON Querying**: Filter and sort without downloading entire documents
- **Partition Isolation**: Perfect multi-tenant performance scaling
- **Low Latency**: < 10ms average response time for point queries
- **Auto-scaling**: 20,000 operations/second per partition
- **Built-in Caching**: Client-side ETags for efficient updates

### Enterprise Features
- **RBAC**: Role-based access control with Azure AD
- **Audit Logging**: Complete audit trail with Azure Monitor
- **Point-in-time Recovery**: Built-in backup and restore
- **Encryption**: Encryption at rest and in transit (AES-256)
- **Compliance**: SOC, HIPAA, PCI compliance included
- **SLA**: 99.99% availability guarantee

### Developer Experience
- **Native JSON**: No file path management or serialization complexity
- **Rich Querying**: LINQ-style filtering and projection
- **Optimistic Concurrency**: Built-in ETag conflict resolution
- **Monitoring**: Azure Monitor integration with custom metrics
- **DevOps**: ARM templates and Terraform support
- **Local Development**: Azure Storage Emulator for testing

---

## Risk Mitigation

### Data Migration Risks
- **Data Loss**: Comprehensive backup before migration
- **Downtime**: Parallel running during cutover
- **Performance**: Load testing with production data
- **Rollback**: Complete rollback plan and procedures

### Operational Risks
- **Cost Overrun**: Monitoring and alerting on usage
- **Security**: Principle of least privilege
- **Availability**: Multi-region deployment options
- **Compliance**: Regular compliance audits

---

## Success Criteria

1. **Zero Data Loss**: All existing data successfully migrated
2. **Performance**: ≤ 200ms response times for data operations
3. **Reliability**: 99.9% uptime SLA
4. **Cost**: Monthly costs under $50
5. **Security**: All data encrypted, audit logs enabled
6. **Scalability**: Support for 10x current data volume

---

*This migration plan provides a comprehensive roadmap for moving from Netlify Blobs to Azure Table Storage, optimized for multi-tenant JSON document storage with significant cost savings and enhanced querying capabilities.*