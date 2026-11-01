# FestFlow Phase 3.1: Background Sync Worker Foundation Report

**Project Directory:** `C:\Users\sathy\FestFlow`  
**Date:** 2026-11-01  
**Milestone:** Phase 3.1 Background Synchronization Worker Foundation  
**Architecture:** Offline-First Dual Database (Local MongoDB Standalone Engine + Secondary Cloud Atlas Engine)  
**Status:** **IMPLEMENTED & VERIFIED (PASS - 44/44 WORKER TESTS, 195/195 TOTAL INTEGRATION & REGRESSION TESTS)**

---

## 1. Architecture Implemented

FestFlow's Phase 3.1 background sync worker foundation (`server/src/services/syncWorkerService.js`) bridges the persistent local mutation queue (`SyncQueue`) and MongoDB Atlas via non-blocking, idempotent, rate-limited batch processing.

```mermaid
flowchart TD
    subgraph Local["Local Offline Engine (Laptop Primary)"]
        Client["Web / Mobile / API Traffic"] --> Express["Express Server (:5000)"]
        Express --> PrimaryMongoose[("Primary Local MongoDB\n(127.0.0.1:27017/festflow)")]
        PrimaryMongoose --> SchemaPlugin["Mongoose syncPlugin"]
        SchemaPlugin --> OutboxQueue[("SyncQueue\n(syncqueues)")]
        SchemaPlugin --> Tombstones[("SyncTombstone\n(synctombstones)")]
        Worker["SyncWorkerService\n(Background Poller)"] -->|Atomic Claim\n& Reconcile| OutboxQueue
        Worker -->|Look up| Tombstones
    end

    subgraph Remote["Cloud Synchronisation Destination"]
        SecondaryConn["Mongoose Secondary Connection\n(connectAtlas)"] -->|Native MongoDB Collection API| AtlasCluster[("MongoDB Atlas Remote Cluster\n(festflow)")]
    end

    Worker -->|Direct Driver Writes\nZero Local Hooks Triggered| SecondaryConn
```

### Key Architectural Principles
1. **Local Primacy**: All student, organizer, faculty, and administrator interactions run with sub-millisecond latency on local MongoDB without internet reliance.
2. **Asynchronous Cloud Sync**: The sync worker operates out-of-band in the background, polling the outbox and batch-uploading eligible mutations when Atlas is reachable.
3. **Hook Loop Prevention**: Uploads to Atlas utilize native MongoDB Collection operations (`atlasConn.collection(...)`) via the secondary connection. Local Mongoose middleware hooks are never re-triggered by cloud sync writes.
4. **Zero Untracked Mutations**: Deletions and updates preserve full version history, tombstones, and original ObjectIds across the local-to-cloud boundary.

---

## 2. Files Created and Modified

### 2.1 Files Created
- [`server/src/services/syncWorkerService.js`](file:///c:/Users/sathy/FestFlow/server/src/services/syncWorkerService.js): The core background synchronization worker implementing batch processing, dependency ordering, atomic job claiming, conflict detection, and runtime-mode isolation.
- [`PHASE3_IMPLEMENTATION_PLAN.md`](file:///c:/Users/sathy/FestFlow/PHASE3_IMPLEMENTATION_PLAN.md): Detailed architectural plan describing the worker lifecycle, collection tier mappings, failure handling, and connection management.
- [`server/tests/phase3_worker.test.js`](file:///c:/Users/sathy/FestFlow/server/tests/phase3_worker.test.js): Comprehensive 16-test suite (44 assertions) testing worker lifecycle, Atlas uploads, retries, concurrency, conflict recording, dependency failure isolation, and shutdown.
- [`PHASE3_WORKER_IMPLEMENTATION_REPORT.md`](file:///c:/Users/sathy/FestFlow/PHASE3_WORKER_IMPLEMENTATION_REPORT.md): This formal report.

### 2.2 Files Modified
- [`server/src/models/SyncQueue.js`](file:///c:/Users/sathy/FestFlow/server/src/models/SyncQueue.js):
  - Added `'processing'` to status enum (`['pending', 'processing', 'in_progress', 'synced', 'failed', 'conflict']`).
  - Added `processingStartedAt: { type: Date, default: null }` for stale lock recovery.
- [`server/src/services/syncQueueService.js`](file:///c:/Users/sathy/FestFlow/server/src/services/syncQueueService.js):
  - Updated `updateJobStatus()` to handle `'processing'`, `'synced'`, `'pending'`, and `'failed'` transitions cleanly.
  - Added `claimPendingJob(jobId)` for atomic job locking.
  - Added `recoverStaleProcessingJobs(lockTimeoutMs)` to rescue stranded jobs after unexpected server crashes.
  - Enhanced `recordConflict()` to update jobs in `pending`, `processing`, or `in_progress` to `'conflict'`.
- [`server/src/server.js`](file:///c:/Users/sathy/FestFlow/server/src/server.js):
  - Integrated `syncWorker.start()` upon successful server startup in offline-first mode.
  - Integrated `syncWorker.stop()` inside graceful shutdown handlers (`SIGINT`, `SIGTERM`).
  - Extended `/api/health` to expose `syncWorker` telemetry (enabled, running, Atlas connectivity, pending/processing/failed counts).

---

## 3. Queue Processing Lifecycle

The background worker enforces a deterministic state machine:

```text
[pending] ──(atomic claim)──> [processing] ──(confirmed by Atlas)──> [synced]
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
             (transient error)          (cloud version > local)
           [pending] (retryCount+1)          [conflict]
                         │
                 (retries >= max)
                         ▼
                     [failed]
```

### 3.1 Lifecycle Stages
1. **Atomic Claiming**:
   Worker queries pending jobs and atomically locks them:
   ```javascript
   const claimed = await SyncQueue.findOneAndUpdate(
     { _id: jobId, status: 'pending' },
     { $set: { status: 'processing', processingStartedAt: new Date() } },
     { new: true }
   );
   ```
   If two worker cycles or processes attempt to claim the same job, MongoDB's atomic findAndModify ensures only one caller gets the document; the other receives `null` and safely skips it.
2. **Execution & Confirmation**:
   The job's mutation is executed against the secondary Atlas connection. The job is marked as `synced` **only after Atlas driver confirmation** (`result.acknowledged === true`).
3. **Preservation**:
   Queue records are never deleted after synchronization. They remain in `synced` status with `syncedAt` populated for auditability, telemetry, and debugging.

---

## 4. Retry and Recovery Strategy

### 4.1 Transient Failures & Exponential Backoff
- When an Atlas write fails due to network dropouts or transient cloud timeouts:
  - If `retryCount + 1 < SYNC_MAX_RETRIES` (default `5`):
    - Status is reverted from `processing` to `pending`.
    - `retryCount` is incremented by 1.
    - Sanitized `errorDetails` are saved.
    - The job will be picked up on the next polling interval.
- When `retryCount + 1 >= SYNC_MAX_RETRIES`:
  - Status is updated to `failed`.
  - Detailed diagnostic error is stored for manual inspection.
  - The job does not re-poll endlessly, preventing worker starvation.

### 4.2 Stale Processing Recovery (Crash Resilience)
If the server process is abruptly killed (`SIGKILL` or power failure) while jobs are in `processing`:
- Upon server restart (and periodically during worker execution), `recoverStaleProcessingJobs()` scans for jobs in `processing` whose `processingStartedAt` is older than `staleLockTimeoutMs` (default 5 minutes) or `null`.
- These stranded jobs are automatically reset to `pending` with `retryCount` incremented by 1.

---

## 5. Atlas Upload Strategy & Conflict Handling

### 5.1 CREATE & UPDATE Mutations
1. Worker inspects Atlas for the existing document:
   `const cloudDoc = await atlasColl.findOne({ _id: documentId });`
2. **Version Checks**:
   - **Cloud Version > Local Version**:
     A newer mutation occurred on the cloud. The worker calls `syncQueueService.recordConflict()`, updates the job status to `'conflict'`, and skips local overwrite.
   - **Cloud Version == Local Version**:
     The document is already at this version on Atlas (e.g. from an unacknowledged previous write). The worker marks the job as `'synced'` idempotently.
   - **Local Version > Cloud Version (or Document Missing)**:
     The worker executes an idempotent document upsert:
     ```javascript
     const cleanPayload = { ...payload, _id: documentId, _syncVersion: version };
     const result = await atlasColl.replaceOne({ _id: documentId }, cleanPayload, { upsert: true });
     ```
     Once confirmed (`result.acknowledged === true`), the job status updates to `synced`.

### 5.2 DELETE Mutations
1. Worker inspects Atlas for the existing document.
2. If `cloudDoc` exists and its version is strictly greater than `job.version`, a conflict is logged.
3. Otherwise, native deletion is executed:
   ```javascript
   const result = await atlasColl.deleteOne({ _id: documentId });
   ```
   Confirmed deletion marks the job as `synced`.

---

## 6. Dependency Ordering Map

Foreign key relationships between the 23 domain models require parent records to be synchronized before dependent children:

| Tier | Domain Collections | Referenced Parents |
| :---: | :--- | :--- |
| **Tier 0** (Roots) | `venues`, `sponsors`, `users`, `clubs` | *(None / Self-Sufficient)* |
| **Tier 1** (Scoped Entities) | `events`, `clubmemberships` | `clubs`, `venues`, `users` |
| **Tier 2** (Event Subsystems) | `registrations`, `caterings`, `budgets`, `expenses`, `revenues`, `eventsponsors`, `competitions`, `feedbacks`, `volunteers`, `certificates` | `events`, `users`, `sponsors` |
| **Tier 3** (Dependent Subsystems) | `payments`, `teams`, `judges`, `judgingcriterias`, `prizes` | `registrations`, `competitions`, `users` |
| **Tier 4** (Deep Evaluation) | `judgescores`, `results` | `competitions`, `teams`, `judges`, `judgingcriterias`, `prizes` |

### Dependency Failure Isolation
When a batch is processed:
1. Jobs are sorted by `dependencyTier ASC, createdAt ASC, version ASC`.
2. If an upload for a parent job (e.g. an `events` record) fails or enters conflict, any dependent child jobs in the same batch referencing that parent document are **deferred**.
3. Dependent records remain `pending` until the parent record successfully transitions to `synced`.

---

## 7. Runtime-Mode Separation

| Environment | Mode | Primary DB | Secondary DB | Sync Worker Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | `offline-first` | Local MongoDB (`127.0.0.1:27017/festflow`) | MongoDB Atlas (`CLOUD_MONGODB_URI`) | Worker starts and polls. Uploads when Atlas is connected. Idles when offline. |
| **Production / Render** | `direct-cloud` | MongoDB Atlas (`MONGODB_URI`) | *(None)* | **Sync worker is completely disabled**. No polling, no secondary connection, zero overhead. |

Configuration Settings:
- `ENABLE_CLOUD_SYNC` (default `true` in offline mode)
- `SYNC_INTERVAL_MS` (default `5000` ms)
- `SYNC_BATCH_SIZE` (default `25` jobs)
- `SYNC_MAX_RETRIES` (default `5` attempts)

---

## 8. Test Commands and Actual Results

All 6 test suites were executed sequentially:

### 8.1 Phase 3.1 Background Sync Worker Suite
```powershell
Set-Location server; node tests/phase3_worker.test.js
```
```text
🧪 Starting Phase 3.1 Background Sync Worker Foundation Test Suite...

✅ Primary Database Connected (Local MongoDB): 127.0.0.1 [DB: festflow]
--- Test 1: Worker starts when enabled ---
[PASS] 1a. Worker start() returned true
[PASS] 1b. Worker isRunning is true
[PASS] 1c. Worker stopped cleanly

--- Test 2: Worker remains disabled when configuration disables it ---
[PASS] 2a. start() returned false when enabled: false
[PASS] 2b. worker.isRunning remains false

--- Test 3: Worker does not run in production direct-Atlas mode ---
[PASS] 3a. Worker config automatically forces enabled: false in direct-cloud mode
[PASS] 3b. Worker did not start in production direct-cloud mode

--- Test 4: Worker waits when Atlas is unavailable ---
[PASS] 4a. processBatch() skipped cleanly when Atlas disconnected
[PASS] 4b. 0 jobs processed while Atlas offline

--- Test 5: Pending CREATE job is uploaded to Atlas ---
[PASS] 5a. Batch reported at least 1 job synced
[PASS] 5b. Job status transitioned from pending to synced
[PASS] 5c. syncedAt timestamp recorded
[PASS] 5d. Document exists in Atlas collection
[PASS] 5e. Document payload preserved on Atlas
[PASS] 5f. Document _syncVersion is 1 on Atlas

--- Test 6: Pending UPDATE job is uploaded ---
[PASS] 6a. UPDATE job status transitioned to synced
[PASS] 6b. Atlas document capacity updated to 650
[PASS] 6c. Atlas document version updated to 2

--- Test 7: Pending DELETE job processes tombstone ---
[PASS] 7a. DELETE job status transitioned to synced
[PASS] 7b. Document successfully removed from Atlas collection

--- Test 8: Successful jobs acknowledged ONLY after Atlas confirmation ---
[PASS] 8a. Job was NOT marked synced when Atlas unacknowledged write
[PASS] 8b. Job remained pending for subsequent retry

--- Test 9: Failed uploads increment retry counts ---
[PASS] 9a. Retry count incremented to 1
[PASS] 9b. errorDetails saved in job record

--- Test 10: Retry limits are enforced ---
[PASS] 10a. Job transitioned to failed after exceeding maxRetries
[PASS] 10b. Retry count reflects max retry limit

--- Test 11: Stale processing jobs recover after restart ---
[PASS] 11a. Recovered 1 stale processing jobs
[PASS] 11b. Stale job reverted to pending

--- Test 12: Duplicate processing is prevented via atomic claim ---
[PASS] 12a. Exactly one worker successfully claimed the job atomically
[PASS] 12b. Competing claim returned null

--- Test 13: Older versions cannot overwrite newer Atlas data ---
[PASS] 13a. Newer Atlas data was NOT overwritten
[PASS] 13b. Atlas version remained 5

--- Test 14: Conflicts are recorded correctly ---
[PASS] 14a. Queue job status updated to conflict
[PASS] 14b. Conflict record saved in sync_conflicts
[PASS] 14c. Conflict captured cloudVersion 5
[PASS] 14d. Conflict captured localVersion 3
[PASS] 14e. Conflict status is unresolved

--- Test 15: Dependency failures do not acknowledge dependent jobs ---
[PASS] 15a. Dependent child job was detected and deferred
[PASS] 15b. Child job remained pending and was NOT incorrectly synced
[PASS] 15c. Parent job returned to pending with retry details

--- Test 16: Graceful shutdown works ---
[PASS] 16a. Worker is actively running
[PASS] 16b. worker.stop() completed successfully
[PASS] 16c. worker.isRunning is false
[PASS] 16d. Polling timer cleared

====================================================
PHASE 3.1 WORKER SUITE: 44 PASSED, 0 FAILED out of 44 tests
====================================================
```

### 8.2 Full Verification & Regression Summary Table

| Suite | Component Tested | Assertions | Result |
| :--- | :--- | :---: | :---: |
| `tests/phase3_worker.test.js` | Worker lifecycle, Atlas upload, retries, conflicts, dependencies | 44 | **44 PASSED / 0 FAILED** |
| `tests/phase2_final_verification.test.js` | OS SIGKILL, Tombstone aborts, Concurrency, deleteMany | 30 | **30 PASSED / 0 FAILED** |
| `tests/phase2_sync_queue.test.js` | Mongoose mutation hooks, retries, queue statistics | 42 | **42 PASSED / 0 FAILED** |
| `tests/phase2_reliability_simulation.test.js` | Execution order, consecutive saves, cold-start restarts | 26 | **26 PASSED / 0 FAILED** |
| `tests/runServerTest.js` | Core FestFlow business APIs (14 modules) | 14 modules | **ALL 14 PASSED** |
| `tests/permissions.test.js` | Multi-club authorization & RBAC | 17 | **17 PASSED / 0 FAILED** |
| `tests/faculty_and_clubs.test.js` | Faculty hierarchy & organizer assignment | 22 | **22 PASSED / 0 FAILED** |
| **Total Test Checks** | **End-to-End System Reliability** | **195** | **100% SUCCESS** |

---

## 9. Known Limitations (Phase 3.1 Scope)

1. **Unidirectional Upload Only**: Phase 3.1 implements Local-to-Atlas synchronization only. Remote-to-local synchronization (downloading modifications made directly on Atlas to the local machine) is intentionally excluded per design specifications.
2. **Batch Window Granularity**: Dependency sorting operates within the fetched batch window (`SYNC_BATCH_SIZE * 2`). Extremely deep dependency chains across thousands of pending mutations will resolve across consecutive poll cycles.
3. **No Automatic Conflict Resolution**: Conflicts between cloud and local versions are safely captured in `SyncConflict` and jobs enter status `'conflict'`. Automated resolution strategies (e.g. last-write-wins or field-level merging) are scheduled for subsequent milestones.

---

## 10. Manual Testing Instructions

### 10.1 Verifying Worker Status via Health Endpoint
1. Start the FestFlow server:
   ```powershell
   cd C:\Users\sathy\FestFlow\server
   npm run dev
   ```
2. Query the health endpoint using PowerShell or curl:
   ```powershell
   Invoke-RestMethod http://localhost:5000/api/health | ConvertTo-Json -Depth 5
   ```
3. Verify the response includes the `syncWorker` telemetry:
   ```json
   {
     "status": "online",
     "mode": "offline-local",
     "syncWorker": {
       "enabled": true,
       "running": true,
       "atlasConnected": true,
       "pendingCount": 123,
       "processingCount": 0,
       "failedCount": 0,
       "syncedCount": 0
     }
   }
   ```

### 10.2 Verifying Offline Resiliency
1. Disconnect Wi-Fi or set `CLOUD_MONGODB_URI=""`.
2. Observe server console:
   ```text
   ⚠️ MongoDB Atlas disconnected. FestFlow continues operating in Offline-First mode.
   ```
3. Issue a POST request to create an event or venue.
4. Verify HTTP 201 response immediately succeeds on local MongoDB.
5. Reconnect Wi-Fi; observe Atlas reconnection log and background sync processing.

---

## 11. Stop Condition & Next Steps

Phase 3.1 Background Sync Worker Foundation is complete, verified, and safely isolated. Per prompt instructions:
- **Phase 3.2 has NOT been started.**
- **No live bulk synchronization of existing records to MongoDB Atlas was executed.**
- Standing by for user review and approval.
