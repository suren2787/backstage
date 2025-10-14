# Sync History & Settings Dashboard Feature

**Created:** October 14, 2025  
**Status:** 📋 Planning  
**Priority:** HIGH

---

## 🎯 Feature Overview

**Goal:** Track all sync operations in a database and display sync history and statistics on a settings/dashboard page.

### User Stories

1. **As an architect**, I want to see when the last sync happened, so I know if my data is fresh
2. **As an admin**, I want to see sync statistics (success/failure rate, duration), so I can monitor system health
3. **As a developer**, I want to see what changed in the last sync, so I can understand impact
4. **As an operator**, I want to see error details when syncs fail, so I can troubleshoot issues

---

## 📊 What to Track

### Sync History Record

```typescript
interface SyncHistoryRecord {
  // Identity
  id: string;                           // UUID
  syncType: 'SCHEDULED' | 'MANUAL';     // How sync was triggered
  
  // Timing
  startTime: Date;
  endTime: Date;
  durationMs: number;
  
  // Status
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
  
  // Statistics
  stats: {
    totalEntities: number;
    entitiesAdded: number;
    entitiesUpdated: number;
    entitiesRemoved: number;
    entitiesUnchanged: number;
    
    // By entity type
    byType: {
      [entityType: string]: {
        added: number;
        updated: number;
        removed: number;
      };
    };
    
    // API relationships
    apiRelationships: {
      componentsWithApis: number;
      totalProvidesApis: number;
      totalConsumesApis: number;
    };
  };
  
  // Details
  errors?: SyncError[];
  warnings?: string[];
  
  // Metadata
  triggeredBy?: string;                 // username for manual syncs
  configSnapshot: {
    repository: string;
    branch: string;
    scheduleFrequency?: string;
  };
}

interface SyncError {
  phase: 'FETCH' | 'PARSE' | 'TRANSFORM' | 'CATALOG_APPLY';
  entity?: string;
  error: string;
  stackTrace?: string;
}
```

### Settings Dashboard Data

```typescript
interface SyncSettings {
  // Current configuration
  configuration: {
    repository: string;
    branch: string;
    scheduleFrequency: string;          // cron expression
    lastConfigUpdate: Date;
  };
  
  // Latest sync
  latestSync: SyncHistoryRecord | null;
  
  // Statistics (last 24 hours / 7 days / 30 days)
  statistics: {
    period: '24h' | '7d' | '30d';
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDurationMs: number;
    
    // Trends
    entityGrowth: {
      date: string;
      count: number;
    }[];
    
    syncTrend: {
      date: string;
      success: number;
      failure: number;
    }[];
  };
  
  // Health
  health: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    lastSuccessfulSync: Date | null;
    consecutiveFailures: number;
    uptime: number;                     // percentage
  };
}
```

---

## 🗄️ Database Schema

### Database Schema (Auto-Created by Plugin)

**Important:** The plugin automatically creates this table in Backstage's existing database on first run.

### Unified Schema (PostgreSQL + SQLite Compatible)

**Key Design Decision:** Use `JSON` column type (not `JSONB`) for cross-database compatibility.

```sql
-- This schema works with both PostgreSQL and SQLite
CREATE TABLE static_data_sync_history (
    id TEXT PRIMARY KEY,                -- UUID as TEXT for SQLite compatibility
    sync_type TEXT NOT NULL CHECK (sync_type IN ('SCHEDULED', 'MANUAL')),
    
    start_time TIMESTAMP NOT NULL,      -- Both DBs support TIMESTAMP
    end_time TIMESTAMP NOT NULL,
    duration_ms INTEGER NOT NULL,
    
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE')),
    
    stats TEXT NOT NULL,                -- JSON as TEXT (parsed in application)
    errors TEXT,                         -- JSON as TEXT
    warnings TEXT,                       -- JSON array as TEXT
    
    triggered_by TEXT,
    config_snapshot TEXT NOT NULL,      -- JSON as TEXT
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_history_start_time ON static_data_sync_history(start_time DESC);
CREATE INDEX idx_sync_history_status ON static_data_sync_history(status);
CREATE INDEX idx_sync_history_sync_type ON static_data_sync_history(sync_type);
```

**Benefits:**
- ✅ Works with Backstage's default SQLite (development)
- ✅ Works with PostgreSQL (production)
- ✅ No separate migration scripts needed
- ✅ Knex handles differences automatically
```

---

## 🏗️ Implementation Plan

### Phase 1: Database Integration (Week 1)

#### 1.1 Database Client Setup

**Create:** `plugins/static-data-backend/src/database/client.ts`

```typescript
import { Knex } from 'knex';
import { PluginDatabaseManager } from '@backstage/backend-common';

export interface DatabaseClient {
  saveSyncHistory(record: SyncHistoryRecord): Promise<void>;
  getLatestSync(): Promise<SyncHistoryRecord | null>;
  getSyncHistory(limit: number, offset: number): Promise<SyncHistoryRecord[]>;
  getSyncStatistics(period: '24h' | '7d' | '30d'): Promise<SyncStatistics>;
  getHealthMetrics(): Promise<HealthMetrics>;
}

export class PostgresDatabaseClient implements DatabaseClient {
  constructor(private readonly knex: Knex) {}
  
  async saveSyncHistory(record: SyncHistoryRecord): Promise<void> {
    await this.knex('static_data_sync_history').insert({
      id: record.id,
      sync_type: record.syncType,
      start_time: record.startTime,
      end_time: record.endTime,
      duration_ms: record.durationMs,
      status: record.status,
      stats: JSON.stringify(record.stats),
      errors: record.errors ? JSON.stringify(record.errors) : null,
      warnings: record.warnings,
      triggered_by: record.triggeredBy,
      config_snapshot: JSON.stringify(record.configSnapshot),
    });
  }
  
  async getLatestSync(): Promise<SyncHistoryRecord | null> {
    const row = await this.knex('static_data_sync_history')
      .orderBy('start_time', 'desc')
      .first();
    
    return row ? this.mapRowToRecord(row) : null;
  }
  
  async getSyncHistory(limit: number, offset: number): Promise<SyncHistoryRecord[]> {
    const rows = await this.knex('static_data_sync_history')
      .orderBy('start_time', 'desc')
      .limit(limit)
      .offset(offset);
    
    return rows.map(row => this.mapRowToRecord(row));
  }
  
  async getSyncStatistics(period: '24h' | '7d' | '30d'): Promise<SyncStatistics> {
    const intervalMap = {
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };
    
    const stats = await this.knex('static_data_sync_history')
      .where('start_time', '>=', this.knex.raw(`NOW() - INTERVAL '${intervalMap[period]}'`))
      .select(
        this.knex.raw('COUNT(*) as total_syncs'),
        this.knex.raw("SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_syncs"),
        this.knex.raw("SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed_syncs"),
        this.knex.raw('AVG(duration_ms) as avg_duration_ms'),
      )
      .first();
    
    // Get daily trend
    const trend = await this.knex('static_data_sync_history')
      .where('start_time', '>=', this.knex.raw(`NOW() - INTERVAL '${intervalMap[period]}'`))
      .select(
        this.knex.raw("DATE(start_time) as date"),
        this.knex.raw("SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success"),
        this.knex.raw("SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failure"),
      )
      .groupByRaw('DATE(start_time)')
      .orderBy('date', 'asc');
    
    return {
      period,
      totalSyncs: parseInt(stats.total_syncs),
      successfulSyncs: parseInt(stats.successful_syncs),
      failedSyncs: parseInt(stats.failed_syncs),
      averageDurationMs: parseFloat(stats.avg_duration_ms) || 0,
      syncTrend: trend,
    };
  }
  
  async getHealthMetrics(): Promise<HealthMetrics> {
    const latestSync = await this.getLatestSync();
    
    // Get consecutive failures
    const recentSyncs = await this.knex('static_data_sync_history')
      .orderBy('start_time', 'desc')
      .limit(10)
      .select('status');
    
    let consecutiveFailures = 0;
    for (const sync of recentSyncs) {
      if (sync.status === 'FAILURE') {
        consecutiveFailures++;
      } else {
        break;
      }
    }
    
    // Calculate uptime (last 30 days)
    const stats = await this.getSyncStatistics('30d');
    const uptime = stats.totalSyncs > 0 
      ? (stats.successfulSyncs / stats.totalSyncs) * 100 
      : 100;
    
    // Determine health status
    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    if (consecutiveFailures >= 3 || uptime < 80) {
      status = 'UNHEALTHY';
    } else if (consecutiveFailures >= 1 || uptime < 95) {
      status = 'DEGRADED';
    }
    
    return {
      status,
      lastSuccessfulSync: latestSync?.status === 'SUCCESS' ? latestSync.startTime : null,
      consecutiveFailures,
      uptime,
    };
  }
  
  private mapRowToRecord(row: any): SyncHistoryRecord {
    return {
      id: row.id,
      syncType: row.sync_type,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      durationMs: row.duration_ms,
      status: row.status,
      stats: JSON.parse(row.stats),
      errors: row.errors ? JSON.parse(row.errors) : undefined,
      warnings: row.warnings,
      triggeredBy: row.triggered_by,
      configSnapshot: JSON.parse(row.config_snapshot),
    };
  }
}

// Factory function - Uses existing Backstage database
export async function createDatabaseClient(
  database: PluginDatabaseManager
): Promise<DatabaseClient> {
  // Get a database client for this plugin
  const knex = await database.getClient();
  
  // Ensure table exists (idempotent migration)
  await setupTable(knex);
  
  return new PostgresDatabaseClient(knex);
}

async function setupTable(knex: Knex): Promise<void> {
  // Check if table exists
  const hasTable = await knex.schema.hasTable('static_data_sync_history');
  
  if (!hasTable) {
    await knex.schema.createTable('static_data_sync_history', table => {
      table.uuid('id').primary();
      table.string('sync_type', 20).notNullable();
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.integer('duration_ms').notNullable();
      table.string('status', 20).notNullable();
      
      // Use JSON instead of JSONB for SQLite compatibility
      table.json('stats').notNullable();
      table.json('errors').nullable();
      table.json('warnings').nullable();  // Store as JSON array instead of text[]
      
      table.string('triggered_by', 255).nullable();
      table.json('config_snapshot').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
    
    // Create indexes
    await knex.schema.alterTable('static_data_sync_history', table => {
      table.index('start_time', 'idx_sync_history_start_time');
      table.index('status', 'idx_sync_history_status');
      table.index('sync_type', 'idx_sync_history_sync_type');
    });
  }
}
```

#### 1.2 Update Provider to Track Sync

**Modify:** `plugins/static-data-backend/src/provider.ts`

```typescript
import { v4 as uuid } from 'uuid';
import { DatabaseClient } from './database/client';

export class StaticDataProvider implements EntityProvider {
  private databaseClient: DatabaseClient;
  
  constructor(
    // ... existing params
    databaseClient: DatabaseClient,
  ) {
    // ...
    this.databaseClient = databaseClient;
  }
  
  async refresh(options?: { manual?: boolean; triggeredBy?: string }): Promise<void> {
    const syncId = uuid();
    const startTime = new Date();
    const syncType = options?.manual ? 'MANUAL' : 'SCHEDULED';
    
    this.logger.info(`Starting ${syncType} sync (ID: ${syncId})`);
    
    const errors: SyncError[] = [];
    const warnings: string[] = [];
    let entities: Entity[] = [];
    
    try {
      // Fetch data
      const fetchedData = await this.fetchStaticData();
      
      // Transform to entities
      entities = await this.transformToEntities(fetchedData);
      
      // Parse build.gradle for API relationships
      await this.enrichWithApiRelationships(entities);
      
      // Apply to catalog
      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: this.getProviderName(),
        })),
      });
      
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      
      // Calculate statistics
      const stats = this.calculateStats(entities);
      
      // Save to database
      await this.databaseClient.saveSyncHistory({
        id: syncId,
        syncType,
        startTime,
        endTime,
        durationMs,
        status: errors.length > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
        stats,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        triggeredBy: options?.triggeredBy,
        configSnapshot: {
          repository: this.config.repository,
          branch: this.config.branch,
          scheduleFrequency: this.scheduleFrequency,
        },
      });
      
      this.logger.info(`Sync completed successfully (ID: ${syncId}, Duration: ${durationMs}ms)`);
      
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      
      errors.push({
        phase: 'CATALOG_APPLY',
        error: error.message,
        stackTrace: error.stack,
      });
      
      // Save failure to database
      await this.databaseClient.saveSyncHistory({
        id: syncId,
        syncType,
        startTime,
        endTime,
        durationMs,
        status: 'FAILURE',
        stats: this.calculateStats(entities),
        errors,
        triggeredBy: options?.triggeredBy,
        configSnapshot: {
          repository: this.config.repository,
          branch: this.config.branch,
          scheduleFrequency: this.scheduleFrequency,
        },
      });
      
      this.logger.error(`Sync failed (ID: ${syncId})`, error);
      throw error;
    }
  }
  
  private calculateStats(entities: Entity[]): SyncStats {
    const byType: { [key: string]: { added: number; updated: number; removed: number } } = {};
    
    entities.forEach(entity => {
      const kind = entity.kind;
      if (!byType[kind]) {
        byType[kind] = { added: 0, updated: 0, removed: 0 };
      }
      byType[kind].added++;  // Simplified - in reality, track changes
    });
    
    // Count API relationships
    const componentsWithApis = entities.filter(e => 
      e.kind === 'Component' && 
      (e.spec?.providesApis || e.spec?.consumesApis)
    ).length;
    
    const totalProvidesApis = entities
      .filter(e => e.kind === 'Component')
      .reduce((sum, e) => sum + (e.spec?.providesApis?.length || 0), 0);
    
    const totalConsumesApis = entities
      .filter(e => e.kind === 'Component')
      .reduce((sum, e) => sum + (e.spec?.consumesApis?.length || 0), 0);
    
    return {
      totalEntities: entities.length,
      entitiesAdded: entities.length,  // Simplified
      entitiesUpdated: 0,
      entitiesRemoved: 0,
      entitiesUnchanged: 0,
      byType,
      apiRelationships: {
        componentsWithApis,
        totalProvidesApis,
        totalConsumesApis,
      },
    };
  }
}
```

#### 1.3 Update Module Registration

**Modify:** `plugins/static-data-backend/src/module.ts`

```typescript
import { createDatabaseClient } from './database/client';

export default createBackendModule({
  pluginId: 'static-data',
  moduleId: 'catalog',
  register(env) {
    env.registerInit({
      deps: {
        catalog: coreServices.catalogProcessingExtension,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
        database: coreServices.database,  // Use existing Backstage database service
      },
      async init({ catalog, config, logger, scheduler, database }) {
        // Initialize database client using Backstage's database
        // This automatically uses the configured database (PostgreSQL/SQLite)
        const databaseClient = await createDatabaseClient(database);
        
        // Create provider with database client
        const provider = StaticDataProvider.fromConfig(config, {
          logger,
          databaseClient,
        });
        
        // Store provider instance globally for API access
        providerInstance = provider;
        
        // Register with catalog
        catalog.addEntityProvider(provider);
        
        // Schedule automatic refresh
        const scheduleFrequency = config.getOptionalString('staticData.schedule.frequency') || '*/30 * * * *';
        
        await scheduler.scheduleTask({
          id: 'static-data-refresh',
          frequency: { cron: scheduleFrequency },
          timeout: { minutes: 10 },
          fn: async () => {
            logger.info('Running scheduled catalog refresh');
            await provider.refresh({ manual: false });
          },
        });
        
        logger.info(`Static data catalog scheduled to refresh: ${scheduleFrequency}`);
      },
    });
  },
});
```

---

### Phase 2: API Endpoints (Week 1-2)

#### 2.1 Settings & History Endpoints

**Modify:** `plugins/static-data-backend/src/index.ts`

```typescript
import { DatabaseClient } from './database/client';

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, databaseClient } = options;
  const router = Router();
  
  // ... existing endpoints
  
  // 1. Get sync settings and latest sync
  router.get('/settings', async (req, res) => {
    try {
      const latestSync = await databaseClient.getLatestSync();
      const health = await databaseClient.getHealthMetrics();
      const stats24h = await databaseClient.getSyncStatistics('24h');
      
      const settings: SyncSettings = {
        configuration: {
          repository: config.getString('staticData.github.repo'),
          branch: config.getString('staticData.github.branch'),
          scheduleFrequency: config.getOptionalString('staticData.schedule.frequency') || '*/30 * * * *',
          lastConfigUpdate: new Date(),  // Could track this separately
        },
        latestSync,
        statistics: stats24h,
        health,
      };
      
      res.json(settings);
    } catch (error) {
      logger.error('Failed to fetch sync settings', error);
      res.status(500).json({ error: 'Failed to fetch sync settings' });
    }
  });
  
  // 2. Get sync history with pagination
  router.get('/sync-history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await databaseClient.getSyncHistory(limit, offset);
      
      res.json({
        history,
        pagination: {
          limit,
          offset,
          hasMore: history.length === limit,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch sync history', error);
      res.status(500).json({ error: 'Failed to fetch sync history' });
    }
  });
  
  // 3. Get specific sync details
  router.get('/sync-history/:syncId', async (req, res) => {
    try {
      const sync = await databaseClient.getSyncById(req.params.syncId);
      
      if (!sync) {
        return res.status(404).json({ error: 'Sync not found' });
      }
      
      res.json(sync);
    } catch (error) {
      logger.error('Failed to fetch sync details', error);
      res.status(500).json({ error: 'Failed to fetch sync details' });
    }
  });
  
  // 4. Get sync statistics
  router.get('/sync-statistics', async (req, res) => {
    try {
      const period = (req.query.period as '24h' | '7d' | '30d') || '7d';
      
      const statistics = await databaseClient.getSyncStatistics(period);
      
      res.json(statistics);
    } catch (error) {
      logger.error('Failed to fetch sync statistics', error);
      res.status(500).json({ error: 'Failed to fetch sync statistics' });
    }
  });
  
  // 5. Get health metrics
  router.get('/health', async (req, res) => {
    try {
      const health = await databaseClient.getHealthMetrics();
      res.json(health);
    } catch (error) {
      logger.error('Failed to fetch health metrics', error);
      res.status(500).json({ error: 'Failed to fetch health metrics' });
    }
  });
  
  // 6. Manual refresh with tracking
  router.post('/refresh', async (req, res) => {
    try {
      const triggeredBy = req.user?.entity?.metadata?.name || 'unknown';
      
      // Trigger refresh with metadata
      await providerInstance.refresh({ 
        manual: true, 
        triggeredBy 
      });
      
      res.json({ 
        message: 'Catalog refresh triggered successfully',
        triggeredBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to trigger refresh', error);
      res.status(500).json({ error: 'Failed to trigger refresh' });
    }
  });
  
  return router;
}
```

---

### Phase 3: Frontend Settings Page (Week 2-3)

#### 3.1 Create Settings Page Component

**Create:** `plugins/static-data-backend/src/components/SettingsPage/`

```typescript
// SettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Alert,
} from '@material-ui/core';
import { formatDistanceToNow } from 'date-fns';

export const StaticDataSettingsPage = () => {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const backendUrl = useApi(configApiRef).getString('backend.baseUrl');
  
  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/static-data/settings`);
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };
  
  const triggerManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${backendUrl}/api/static-data/refresh`, { method: 'POST' });
      setTimeout(fetchSettings, 2000); // Refresh settings after 2s
    } catch (error) {
      console.error('Failed to trigger refresh', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  if (loading) {
    return <LinearProgress />;
  }
  
  if (!settings) {
    return <Alert severity="error">Failed to load sync settings</Alert>;
  }
  
  const { configuration, latestSync, health, statistics } = settings;
  
  return (
    <div style={{ padding: 24 }}>
      <Typography variant="h4" gutterBottom>
        Static Data Catalog Sync
      </Typography>
      
      {/* Health Status */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Health Status
              </Typography>
              <Chip 
                label={health.status}
                color={health.status === 'HEALTHY' ? 'primary' : 'secondary'}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Last Sync
              </Typography>
              <Typography variant="h6">
                {latestSync 
                  ? formatDistanceToNow(new Date(latestSync.startTime), { addSuffix: true })
                  : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Uptime (30d)
              </Typography>
              <Typography variant="h6">
                {health.uptime.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Actions
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={triggerManualRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Manual Refresh'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Latest Sync Details */}
      {latestSync && (
        <Card style={{ marginBottom: 24 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Latest Sync Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>Status:</strong> {latestSync.status}</Typography>
                <Typography><strong>Type:</strong> {latestSync.syncType}</Typography>
                <Typography><strong>Duration:</strong> {latestSync.durationMs}ms</Typography>
                <Typography>
                  <strong>Started:</strong> {new Date(latestSync.startTime).toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Statistics:</Typography>
                <Typography>Total Entities: {latestSync.stats.totalEntities}</Typography>
                <Typography>Components with APIs: {latestSync.stats.apiRelationships.componentsWithApis}</Typography>
                <Typography>Total Provides APIs: {latestSync.stats.apiRelationships.totalProvidesApis}</Typography>
                <Typography>Total Consumes APIs: {latestSync.stats.apiRelationships.totalConsumesApis}</Typography>
              </Grid>
            </Grid>
            
            {latestSync.errors && latestSync.errors.length > 0 && (
              <Alert severity="error" style={{ marginTop: 16 }}>
                <Typography variant="subtitle2">Errors:</Typography>
                {latestSync.errors.map((err, idx) => (
                  <Typography key={idx}>{err.error}</Typography>
                ))}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Configuration */}
      <Card style={{ marginBottom: 24 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell><strong>Repository</strong></TableCell>
                <TableCell>{configuration.repository}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Branch</strong></TableCell>
                <TableCell>{configuration.branch}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Schedule</strong></TableCell>
                <TableCell>{configuration.scheduleFrequency}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Statistics (24h) */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statistics (Last 24 Hours)
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography color="textSecondary">Total Syncs</Typography>
              <Typography variant="h5">{statistics.totalSyncs}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography color="textSecondary">Successful</Typography>
              <Typography variant="h5" style={{ color: 'green' }}>
                {statistics.successfulSyncs}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography color="textSecondary">Failed</Typography>
              <Typography variant="h5" style={{ color: 'red' }}>
                {statistics.failedSyncs}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography color="textSecondary">Avg Duration</Typography>
              <Typography variant="h5">
                {Math.round(statistics.averageDurationMs)}ms
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### 3.2 Register Page in App

**Modify:** `packages/app/src/App.tsx`

```typescript
import { StaticDataSettingsPage } from '@internal/plugin-static-data-backend';

const routes = (
  <FlatRoutes>
    {/* ... existing routes */}
    
    <Route path="/static-data-settings" element={<StaticDataSettingsPage />} />
  </FlatRoutes>
);
```

#### 3.3 Add to Sidebar Navigation

**Modify:** `packages/app/src/components/Root/Root.tsx`

```typescript
import SettingsIcon from '@material-ui/icons/Settings';

<SidebarItem icon={SettingsIcon} to="static-data-settings" text="Data Sync" />
```

---

## 📊 Example Dashboard UI

```
┌────────────────────────────────────────────────────────────────┐
│                   Static Data Catalog Sync                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ HEALTHY  │  │ 2 min ago│  │ 99.2%    │  │ Manual       │  │
│  │ ✓        │  │ Last Sync│  │ Uptime   │  │ [Refresh]    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│                                                                 │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Latest Sync Details                                       ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ Status: SUCCESS          │ Total Entities: 62            ┃  │
│  ┃ Type: SCHEDULED           │ Components: 20                ┃  │
│  ┃ Duration: 3.2s            │ APIs: 16                      ┃  │
│  ┃ Started: 2025-10-14 14:30│ Components with APIs: 20      ┃  │
│  ┃                           │ Total Provides: 22            ┃  │
│  ┃                           │ Total Consumes: 45            ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                 │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Configuration                                             ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ Repository:  suren2787/static-data-repo                  ┃  │
│  ┃ Branch:      master                                       ┃  │
│  ┃ Schedule:    */30 * * * * (Every 30 minutes)            ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                 │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Statistics (Last 24 Hours)                                ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ Total: 48    Successful: 48    Failed: 0    Avg: 3.1s   ┃  │
│  ┃                                                           ┃  │
│  ┃ Chart:                                                    ┃  │
│  ┃    48▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        ┃  │
│  ┃     0░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ┃  │
│  ┃       00 02 04 06 08 10 12 14 16 18 20 22 24 (hour)     ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Updates

### app-config.yaml

**No database configuration needed!** The plugin uses Backstage's existing database configuration.

```yaml
# Backstage's existing database config (no changes needed)
backend:
  database:
    client: better-sqlite3  # or 'pg' for PostgreSQL
    connection: ':memory:'  # or your existing connection config
    # The static-data plugin will automatically use this

staticData:
  github:
    repo: ${STATIC_DATA_REPO}
    branch: ${STATIC_DATA_BRANCH}
    token: ${STATIC_DATA_GITHUB_TOKEN}
  
  schedule:
    frequency: ${STATIC_DATA_SCHEDULE_FREQUENCY:-*/30 * * * *}
  
  # New: Sync history retention
  history:
    retentionDays: 90  # Keep sync history for 90 days
    maxRecords: 10000   # Maximum records to keep
```

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "uuid": "^9.0.0",
    "date-fns": "^2.30.0"
    // knex and database drivers already included in Backstage
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}

// Note: These are already available in Backstage:
// - knex (via @backstage/backend-common)
// - @backstage/backend-common (PluginDatabaseManager)
// - Database drivers (pg, better-sqlite3)
```

---

## ✅ Testing Plan

### Unit Tests

```typescript
// database/client.test.ts
describe('DatabaseClient', () => {
  it('should save sync history', async () => {
    const client = new PostgresDatabaseClient(knex);
    await client.saveSyncHistory(mockRecord);
    const saved = await client.getLatestSync();
    expect(saved).toMatchObject(mockRecord);
  });
  
  it('should calculate statistics correctly', async () => {
    // Insert 10 successful, 2 failed syncs
    const stats = await client.getSyncStatistics('24h');
    expect(stats.totalSyncs).toBe(12);
    expect(stats.successfulSyncs).toBe(10);
  });
});
```

### Integration Tests

```typescript
// Test full flow
describe('Sync with Database Tracking', () => {
  it('should record sync in database', async () => {
    await provider.refresh({ manual: true, triggeredBy: 'test-user' });
    
    const latestSync = await databaseClient.getLatestSync();
    expect(latestSync).toBeDefined();
    expect(latestSync.syncType).toBe('MANUAL');
    expect(latestSync.triggeredBy).toBe('test-user');
  });
});
```

---

## 🚀 Rollout Plan

### Week 1: Core Implementation
- [ ] Database schema setup
- [ ] DatabaseClient implementation
- [ ] Update provider with tracking
- [ ] Update module registration
- [ ] Unit tests

### Week 2: API & Testing
- [ ] Add API endpoints
- [ ] Integration tests
- [ ] API documentation
- [ ] Manual testing

### Week 3: Frontend
- [ ] Settings page component
- [ ] Register in app
- [ ] UI polish
- [ ] User testing

### Week 4: Polish & Deploy
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment guide
- [ ] Production rollout

---

## 📈 Success Metrics

- ✅ 100% of syncs tracked in database
- ✅ Settings page shows accurate real-time data
- ✅ < 100ms query time for latest sync
- ✅ < 1s query time for statistics
- ✅ Zero data loss on database failures
- ✅ UI updates within 30 seconds of sync completion

---

## 🎯 Future Enhancements

1. **Alerting**: Send alerts on consecutive failures
2. **Webhooks**: Notify external systems on sync completion
3. **Comparison View**: Show what changed between syncs
4. **Export**: Download sync history as CSV/JSON
5. **Retention Policy**: Auto-cleanup old sync records
6. **Performance Metrics**: Track parse time per repository
7. **Detailed Logs**: Link to full logs for failed syncs

---

**Ready to implement?** Let me know and we can start with Phase 1! 🚀
