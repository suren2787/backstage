/**
 * Types for sync history tracking
 */

export type SyncType = 'SCHEDULED' | 'MANUAL';
export type SyncStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
export type SyncPhase = 'FETCH' | 'PARSE' | 'TRANSFORM' | 'CATALOG_APPLY';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type StatsPeriod = '24h' | '7d' | '30d';

export interface SyncError {
  phase: SyncPhase;
  entity?: string;
  error: string;
  stackTrace?: string;
}

export interface SyncStats {
  totalEntities: number;
  entitiesAdded: number;
  entitiesUpdated: number;
  entitiesRemoved: number;
  entitiesUnchanged: number;
  
  byType: {
    [entityType: string]: {
      added: number;
      updated: number;
      removed: number;
    };
  };
  
  apiRelationships: {
    componentsWithApis: number;
    totalProvidesApis: number;
    totalConsumesApis: number;
  };
}

export interface SyncHistoryRecord {
  id: string;
  syncType: SyncType;
  
  startTime: Date;
  endTime: Date;
  durationMs: number;
  
  status: SyncStatus;
  
  stats: SyncStats;
  
  errors?: SyncError[];
  warnings?: string[];
  
  triggeredBy?: string;
  configSnapshot: {
    repository: string;
    branch: string;
    scheduleFrequency?: string;
  };
}

export interface SyncStatistics {
  period: StatsPeriod;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDurationMs: number;
  
  syncTrend: Array<{
    date: string;
    success: number;
    failure: number;
  }>;
}

export interface HealthMetrics {
  status: HealthStatus;
  lastSuccessfulSync: Date | null;
  consecutiveFailures: number;
  uptime: number;
}

export interface SyncSettings {
  configuration: {
    repository: string;
    branch: string;
    scheduleFrequency: string;
    lastConfigUpdate: Date;
  };
  
  latestSync: SyncHistoryRecord | null;
  statistics: SyncStatistics;
  health: HealthMetrics;
}
