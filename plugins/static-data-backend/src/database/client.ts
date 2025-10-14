/**
 * Database client for sync history tracking
 */

import { Knex } from 'knex';
import { LoggerService } from '@backstage/backend-plugin-api';
import { DatabaseService } from '@backstage/backend-plugin-api';
import {
  SyncHistoryRecord,
  SyncStatistics,
  HealthMetrics,
  StatsPeriod,
} from './types';

export interface DatabaseClient {
  saveSyncHistory(record: SyncHistoryRecord): Promise<void>;
  getLatestSync(): Promise<SyncHistoryRecord | null>;
  getSyncHistory(limit: number, offset: number): Promise<SyncHistoryRecord[]>;
  getSyncById(syncId: string): Promise<SyncHistoryRecord | null>;
  getSyncStatistics(period: StatsPeriod): Promise<SyncStatistics>;
  getHealthMetrics(): Promise<HealthMetrics>;
}

export class SyncHistoryDatabaseClient implements DatabaseClient {
  private readonly TABLE_NAME = 'static_data_sync_history';

  constructor(
    private readonly knex: Knex,
    private readonly logger: LoggerService,
  ) {}

  async saveSyncHistory(record: SyncHistoryRecord): Promise<void> {
    try {
      await this.knex(this.TABLE_NAME).insert({
        id: record.id,
        sync_type: record.syncType,
        start_time: record.startTime,
        end_time: record.endTime,
        duration_ms: record.durationMs,
        status: record.status,
        stats: JSON.stringify(record.stats),
        errors: record.errors ? JSON.stringify(record.errors) : null,
        warnings: record.warnings ? JSON.stringify(record.warnings) : null,
        triggered_by: record.triggeredBy || null,
        config_snapshot: JSON.stringify(record.configSnapshot),
      });

      this.logger.info(`Saved sync history: ${record.id}`);
    } catch (error) {
      this.logger.error('Failed to save sync history', error as Error);
      throw error;
    }
  }

  async getLatestSync(): Promise<SyncHistoryRecord | null> {
    try {
      const row = await this.knex(this.TABLE_NAME)
        .orderBy('start_time', 'desc')
        .first();

      return row ? this.mapRowToRecord(row) : null;
    } catch (error) {
      this.logger.error('Failed to get latest sync', error as Error);
      throw error;
    }
  }

  async getSyncHistory(
    limit: number,
    offset: number,
  ): Promise<SyncHistoryRecord[]> {
    try {
      const rows = await this.knex(this.TABLE_NAME)
        .orderBy('start_time', 'desc')
        .limit(limit)
        .offset(offset);

      return rows.map(row => this.mapRowToRecord(row));
    } catch (error) {
      this.logger.error('Failed to get sync history', error as Error);
      throw error;
    }
  }

  async getSyncById(syncId: string): Promise<SyncHistoryRecord | null> {
    try {
      const row = await this.knex(this.TABLE_NAME)
        .where('id', syncId)
        .first();

      return row ? this.mapRowToRecord(row) : null;
    } catch (error) {
      this.logger.error(`Failed to get sync by id: ${syncId}`, error as Error);
      throw error;
    }
  }

  async getSyncStatistics(period: StatsPeriod): Promise<SyncStatistics> {
    try {
      const intervalMap = {
        '24h': '1 day',
        '7d': '7 days',
        '30d': '30 days',
      };

      const interval = intervalMap[period];

      // Get aggregate statistics
      const stats = await this.knex(this.TABLE_NAME)
        .where(
          'start_time',
          '>=',
          this.knex.raw(
            this.knex.client.config.client === 'better-sqlite3'
              ? `datetime('now', '-${interval}')`
              : `NOW() - INTERVAL '${interval}'`,
          ),
        )
        .select(
          this.knex.raw('COUNT(*) as total_syncs'),
          this.knex.raw(
            "SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_syncs",
          ),
          this.knex.raw(
            "SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed_syncs",
          ),
          this.knex.raw('AVG(duration_ms) as avg_duration_ms'),
        )
        .first();

      // Get daily trend
      const trend = await this.knex(this.TABLE_NAME)
        .where(
          'start_time',
          '>=',
          this.knex.raw(
            this.knex.client.config.client === 'better-sqlite3'
              ? `datetime('now', '-${interval}')`
              : `NOW() - INTERVAL '${interval}'`,
          ),
        )
        .select(
          this.knex.raw(
            this.knex.client.config.client === 'better-sqlite3'
              ? "DATE(start_time) as date"
              : 'DATE(start_time) as date',
          ),
          this.knex.raw(
            "SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success",
          ),
          this.knex.raw(
            "SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failure",
          ),
        )
        .groupByRaw(
          this.knex.client.config.client === 'better-sqlite3'
            ? 'DATE(start_time)'
            : 'DATE(start_time)',
        )
        .orderBy('date', 'asc');

      return {
        period,
        totalSyncs: parseInt(stats?.total_syncs || '0', 10),
        successfulSyncs: parseInt(stats?.successful_syncs || '0', 10),
        failedSyncs: parseInt(stats?.failed_syncs || '0', 10),
        averageDurationMs: parseFloat(stats?.avg_duration_ms || '0'),
        syncTrend: trend.map((row: any) => ({
          date: row.date,
          success: parseInt(row.success, 10),
          failure: parseInt(row.failure, 10),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get sync statistics', error as Error);
      throw error;
    }
  }

  async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      // Get recent syncs to calculate consecutive failures
      const recentSyncs = await this.knex(this.TABLE_NAME)
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
      const uptime =
        stats.totalSyncs > 0
          ? (stats.successfulSyncs / stats.totalSyncs) * 100
          : 100;

      // Find last successful sync
      const lastSuccessfulSync = await this.knex(this.TABLE_NAME)
        .where('status', 'SUCCESS')
        .orderBy('start_time', 'desc')
        .first();

      // Determine health status
      let status: HealthMetrics['status'] = 'HEALTHY';
      if (consecutiveFailures >= 3 || uptime < 80) {
        status = 'UNHEALTHY';
      } else if (consecutiveFailures >= 1 || uptime < 95) {
        status = 'DEGRADED';
      }

      return {
        status,
        lastSuccessfulSync: lastSuccessfulSync
          ? new Date(lastSuccessfulSync.start_time)
          : null,
        consecutiveFailures,
        uptime,
      };
    } catch (error) {
      this.logger.error('Failed to get health metrics', error as Error);
      throw error;
    }
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
      warnings: row.warnings ? JSON.parse(row.warnings) : undefined,
      triggeredBy: row.triggered_by,
      configSnapshot: JSON.parse(row.config_snapshot),
    };
  }
}

/**
 * Factory function to create database client
 */
export async function createDatabaseClient(
  database: DatabaseService,
  logger: LoggerService,
): Promise<DatabaseClient> {
  const knex = await database.getClient();

  // Ensure table exists
  await ensureTable(knex, logger);

  return new SyncHistoryDatabaseClient(knex, logger);
}

/**
 * Create sync history table if it doesn't exist
 */
async function ensureTable(knex: Knex, logger: LoggerService): Promise<void> {
  const TABLE_NAME = 'static_data_sync_history';

  try {
    const hasTable = await knex.schema.hasTable(TABLE_NAME);

    if (!hasTable) {
      logger.info(`Creating table: ${TABLE_NAME}`);

      await knex.schema.createTable(TABLE_NAME, table => {
        table.string('id', 36).primary();
        table.string('sync_type', 20).notNullable();
        table.timestamp('start_time').notNullable();
        table.timestamp('end_time').notNullable();
        table.integer('duration_ms').notNullable();
        table.string('status', 20).notNullable();
        table.text('stats').notNullable();
        table.text('errors').nullable();
        table.text('warnings').nullable();
        table.string('triggered_by', 255).nullable();
        table.text('config_snapshot').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });

      // Create indexes
      await knex.schema.table(TABLE_NAME, table => {
        table.index('start_time', 'idx_sync_history_start_time');
        table.index('status', 'idx_sync_history_status');
        table.index('sync_type', 'idx_sync_history_sync_type');
      });

      logger.info(`Table ${TABLE_NAME} created successfully`);
    } else {
      logger.debug(`Table ${TABLE_NAME} already exists`);
    }
  } catch (error) {
    logger.error(`Failed to ensure table ${TABLE_NAME}`, error as Error);
    throw error;
  }
}
