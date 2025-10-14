# Sync History - Quick Testing Guide

**Status:** ✅ Backend Implemented and Deployed  
**Commit:** f1c710a  
**Date:** October 14, 2025

---

## 🚀 Quick Start

### 1. Start Backstage

```bash
cd /home/surendra/Desktop/repo/PROJECTS/backstage
yarn dev
```

**Watch for these logs:**
```
[static-data] StaticDataEntityProvider: database client initialized
[static-data] Creating table: static_data_sync_history
[static-data] Table static_data_sync_history created successfully
[static-data] StaticDataEntityProvider: starting SCHEDULED refresh (ID: a1b2c3...)
```

### 2. Test the Endpoints

Open a new terminal and run these curl commands:

#### A. Get Current Settings
```bash
curl http://localhost:7007/api/static-data/settings | jq
```

**Expected Response:**
```json
{
  "configuration": {
    "repository": "suren2787/static-data",
    "branch": "master",
    "scheduleFrequency": "*/30 * * * *"
  },
  "latestSync": {
    "id": "...",
    "syncType": "SCHEDULED",
    "startTime": "2025-10-14T...",
    "endTime": "2025-10-14T...",
    "durationMs": 3200,
    "status": "SUCCESS",
    "stats": {
      "totalEntities": 62,
      "componentsWithApis": 20,
      "totalProvidesApis": 22,
      "totalConsumesApis": 45
    }
  },
  "health": {
    "status": "HEALTHY",
    "consecutiveFailures": 0,
    "uptime": 100
  }
}
```

#### B. Get Sync History
```bash
curl "http://localhost:7007/api/static-data/sync-history?limit=10" | jq
```

#### C. Get Statistics (Last 7 Days)
```bash
curl "http://localhost:7007/api/static-data/sync-statistics?period=7d" | jq
```

#### D. Get Health Metrics
```bash
curl http://localhost:7007/api/static-data/health-metrics | jq
```

#### E. Trigger Manual Refresh
```bash
curl -X POST http://localhost:7007/api/static-data/refresh | jq
```

**Expected Response:**
```json
{
  "message": "Catalog refresh triggered successfully",
  "imported": 62,
  "errors": [],
  "triggeredBy": "manual-trigger",
  "timestamp": "2025-10-14T10:45:00.000Z"
}
```

#### F. View Manual Sync in History
```bash
# Wait a few seconds for sync to complete, then:
curl http://localhost:7007/api/static-data/settings | jq '.latestSync'
```

You should see `"syncType": "MANUAL"` and `"triggeredBy": "manual-trigger"`.

---

## 🗄️ Query Database Directly

### SQLite (Default Dev)

```bash
# Find the database file
ls -lh ~/.local/share/backstage-dev/backstage.sqlite

# Open sqlite3
sqlite3 ~/.local/share/backstage-dev/backstage.sqlite

# View sync history
sqlite> SELECT 
   id,
   sync_type,
   status,
   duration_ms,
   datetime(start_time) as start,
   json_extract(stats, '$.totalEntities') as entities,
   json_extract(stats, '$.apiRelationships.componentsWithApis') as components_with_apis
FROM static_data_sync_history
ORDER BY start_time DESC
LIMIT 10;

# Count syncs by type
sqlite> SELECT sync_type, COUNT(*) as count, AVG(duration_ms) as avg_duration
FROM static_data_sync_history
GROUP BY sync_type;

# View errors
sqlite> SELECT 
   datetime(start_time) as time,
   status,
   errors
FROM static_data_sync_history
WHERE errors IS NOT NULL
ORDER BY start_time DESC;
```

### PostgreSQL (Production)

```bash
psql -U backstage -d backstage -h localhost

-- View sync history
SELECT 
   id,
   sync_type,
   status,
   duration_ms,
   start_time,
   stats->'totalEntities' as entities,
   stats->'apiRelationships'->'componentsWithApis' as components_with_apis
FROM static_data_sync_history
ORDER BY start_time DESC
LIMIT 10;

-- Health metrics
SELECT 
   COUNT(*) as total_syncs,
   SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
   SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failed,
   AVG(duration_ms) as avg_duration,
   MIN(start_time) as first_sync,
   MAX(start_time) as last_sync
FROM static_data_sync_history;
```

---

## 📊 What to Verify

### ✅ Checklist

After starting Backstage and waiting for the first sync:

1. **Database Table Created**
   - [ ] Check logs for "Table static_data_sync_history created successfully"
   - [ ] Query database to confirm table exists

2. **First Sync Recorded**
   - [ ] GET /settings returns `latestSync` (not null)
   - [ ] `syncType` is "SCHEDULED"
   - [ ] `status` is "SUCCESS"
   - [ ] `stats.totalEntities` equals your catalog size (e.g., 62)
   - [ ] `stats.apiRelationships.componentsWithApis` > 0

3. **Manual Refresh Works**
   - [ ] POST /refresh returns success message
   - [ ] New sync record created with `syncType: "MANUAL"`
   - [ ] `triggeredBy: "manual-trigger"`

4. **Statistics Calculated**
   - [ ] GET /sync-statistics returns `totalSyncs >= 1`
   - [ ] `successfulSyncs >= 1`
   - [ ] `averageDurationMs` > 0
   - [ ] `syncTrend` array has entries

5. **Health Metrics**
   - [ ] GET /health-metrics returns `status: "HEALTHY"`
   - [ ] `consecutiveFailures: 0`
   - [ ] `uptime: 100` (or close to it)
   - [ ] `lastSuccessfulSync` is recent

6. **API Relationships Still Work**
   - [ ] GET /api-consumers/payment-gateway-api-v2 returns consumers
   - [ ] GET /api-providers/payment-gateway-api-v2 returns providers
   - [ ] GET /api-relations returns full relationship map

---

## 🎯 Expected Behavior

### Scheduled Syncs (Every 30 Minutes)
```
[10:00] SCHEDULED sync starts → SUCCESS → Recorded in DB
[10:30] SCHEDULED sync starts → SUCCESS → Recorded in DB
[11:00] SCHEDULED sync starts → SUCCESS → Recorded in DB
```

### Manual Syncs
```
[10:15] Manual trigger → MANUAL sync → SUCCESS → Recorded with triggeredBy
[10:45] Manual trigger → MANUAL sync → SUCCESS → Recorded with triggeredBy
```

### Database Growth
- **1 hour:** ~2 sync records (2 scheduled)
- **1 day:** ~48 sync records (+ any manual)
- **1 week:** ~336 sync records
- **1 month:** ~1,440 sync records

Database size per record: ~2-5 KB (depending on error details)

---

## 🐛 Troubleshooting

### Issue: No sync history showing

**Check:**
```bash
# Is database initialized?
sqlite3 ~/.local/share/backstage-dev/backstage.sqlite ".tables"
# Should see: static_data_sync_history

# Check logs
tail -f packages/backend/dist/backend.log | grep static-data

# Force a sync
curl -X POST http://localhost:7007/api/static-data/refresh
```

### Issue: Health status showing DEGRADED

**Cause:** Recent sync failure or uptime < 95%

**Check:**
```bash
# Get recent syncs
curl "http://localhost:7007/api/static-data/sync-history?limit=5" | jq '.history[] | {syncType, status, durationMs}'

# Check for errors
curl http://localhost:7007/api/static-data/settings | jq '.latestSync.errors'
```

### Issue: Statistics showing 0 syncs

**Wait:** First sync happens on Backstage startup, then every 30 minutes.

**Force sync:**
```bash
curl -X POST http://localhost:7007/api/static-data/refresh
# Wait 5 seconds
curl http://localhost:7007/api/static-data/sync-statistics | jq
```

---

## 📈 Monitoring Commands

### Real-time Sync Monitoring
```bash
# Watch sync history (updates every 2 seconds)
watch -n 2 'curl -s http://localhost:7007/api/static-data/settings | jq ".latestSync | {syncType, status, durationMs, componentsWithApis: .stats.apiRelationships.componentsWithApis}"'
```

### Health Dashboard
```bash
# One-line health summary
curl -s http://localhost:7007/api/static-data/health-metrics | jq '{status, uptime, lastSync: .lastSuccessfulSync, failures: .consecutiveFailures}'
```

### Statistics Summary
```bash
# 24h/7d/30d comparison
for period in 24h 7d 30d; do
  echo "=== $period ==="
  curl -s "http://localhost:7007/api/static-data/sync-statistics?period=$period" | jq '{period, totalSyncs, successRate: (.successfulSyncs / .totalSyncs * 100), avgDuration: .averageDurationMs}'
done
```

---

## 🎉 Success Indicators

**You know it's working when:**

1. ✅ `/settings` endpoint returns complete configuration
2. ✅ `latestSync` is not null and has recent timestamp
3. ✅ `latestSync.stats.totalEntities` matches your catalog size
4. ✅ `health.status` is "HEALTHY"
5. ✅ Manual refresh creates a new sync record immediately
6. ✅ Database query shows multiple sync records
7. ✅ Statistics endpoint returns growing sync counts over time
8. ✅ All API relationship endpoints still working (consumers/providers)

---

## 📝 Next Steps

Once verified working:

1. **Monitor for 24 hours** to ensure scheduled syncs happen correctly
2. **Test failure scenarios** (temporarily break GitHub token to see FAILURE status)
3. **Implement frontend UI** to visualize this data (see SYNC_HISTORY_FEATURE.md)
4. **Set up alerts** for consecutive failures (future enhancement)

---

**All backend features are implemented and ready to test!** 🚀

Run the commands above and verify everything is working as expected.
