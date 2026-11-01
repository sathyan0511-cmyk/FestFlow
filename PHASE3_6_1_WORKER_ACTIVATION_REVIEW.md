# FestFlow Phase 3.6.1 — Worker Activation Safety Review

**Milestone:** Phase 3.6.1 Workstream 4  
**Auditor / Agent:** Antigravity AI  
**Component Audited:** [`server/src/services/syncWorkerService.js`](file:///c:/Users/sathy/FestFlow/server/src/services/syncWorkerService.js)  

---

## 1. Complete Worker Execution Pipeline Trace

The background synchronization worker follows a strictly sequential, fault-tolerant execution lifecycle:

```mermaid
sequenceDiagram
    autonumber
    participant W as SyncWorkerService
    participant Q as SyncQueue (Local MongoDB)
    participant C as MongoDB Atlas (festflow)

    Note over W: 1. Startup & Recovery
    W->>Q: recoverStaleProcessingJobs(staleLockTimeoutMs=300000)
    Note over Q: Resets crashed 'processing' jobs to 'pending'

    Note over W: 2. Job Query & Sorting
    W->>Q: find({ status: 'pending' }).limit(batchSize * 2)
    Note over W: Sorts in memory: Tier 0 -> Tier 4, then createdAt ASC

    loop For each job in batch
        Note over W: 3. Foreign Key Dependency Check (Tier > 0)
        W->>C: isParentReadyForChild(job, atlasConn)
        alt Parent Missing or Failed
            Note over W: Defers job (leaves in 'pending' for next cycle)
        else Parent Confirmed on Atlas
            Note over W: 4. Atomic Claiming
            W->>Q: findOneAndUpdate({ _id: jobId, status: 'pending' }, { $set: { status: 'processing' } })
            alt Claim Rejected (Claimed by another worker)
                Note over W: Skips job (Prevents duplicate processing)
            else Claim Succeeded
                Note over W: 5. ICAS Cloud Synchronization
                W->>C: uploadJobToAtlas(job, atlasConn)
                alt Cloud is Newer (cloudVer > localVer)
                    W->>Q: updateJobStatus(jobId, 'conflict', reason)
                alt Equal Version & Divergent Content
                    W->>Q: updateJobStatus(jobId, 'conflict', reason)
                alt Equal Version & Identical Content
                    W->>Q: updateJobStatus(jobId, 'synced') (Idempotent NO-OP)
                alt Local is Newer (localVer > cloudVer)
                    W->>C: replaceOne({ _id, _syncVersion: cloudVer }, payload)
                    W->>Q: updateJobStatus(jobId, 'synced')
                alt Network / Driver Failure
                    W->>Q: If retryCount >= maxRetries -> 'failed', else -> 'pending'
                end
            end
        end
    end
```

---

## 2. Invariant & Safety Proofs

### Proof 1: Can old queue jobs overwrite any of the 37 Atlas documents?
**Answer: NO.**  
All 37 documents on Atlas `festflow` currently possess `_syncVersion: 1`.  
- Any historical job with `version < 1` is rejected because `cloudVersion (1) > localVersion`.
- Any historical job with `version === 1`:
  - If content is identical: ICAS returns `ALREADY_SYNCED_EQUAL` (zero writes).
  - If content is divergent: ICAS flags `CONFLICT_EQUAL_VERSION_DIFF_CONTENT` (zero writes).
- Any job attempting an update must execute an atomic CAS: `replaceOne({ _id: docId, _syncVersion: cloudVersion })`. If the cloud version does not match, `matchedCount === 0` and the write is rejected.

### Proof 2: Can stale delete jobs delete valid cloud records?
**Answer: NO.**  
Before issuing a deletion, the worker inspects the cloud document. If the document is absent from Atlas, it returns `synced` without issuing `deleteOne()`. None of the 64 historical tombstones match any of the 37 Atlas documents. Furthermore, if a cloud document was recreated or updated to a higher version (`cloudVersion > localVersion`), the delete is aborted and flagged as a conflict.

### Proof 3: Can a job be acknowledged without confirmed cloud persistence?
**Answer: NO.**  
`updateJobStatus(jobId, 'synced')` is called **only** when `uploadJobToAtlas` returns `{ status: 'synced' }`. This requires:
1. `result.acknowledged === true` on native MongoDB driver `insertOne`, `replaceOne`, or `deleteOne`.
2. Or explicit byte-for-byte content equality verification via `isContentEqual(cleanPayload, cloudDoc)`.

### Proof 4: Can two worker instances process the same job?
**Answer: NO.**  
Job claiming uses MongoDB's atomic `findOneAndUpdate`:
```javascript
const claimPendingJob = async (jobId) => {
  return await SyncQueue.findOneAndUpdate(
    { _id: jobId, status: 'pending' },
    { $set: { status: 'processing', processingStartedAt: new Date() } },
    { new: true }
  );
};
```
Because MongoDB guarantees document-level atomicity on updates, only one worker can successfully match `{ _id: jobId, status: 'pending' }`. Any secondary worker receives `null` and immediately skips the job.

### Proof 5: Can a permanently failed job be silently ignored?
**Answer: NO.**  
When `retryCount >= config.maxRetries`, the job transitions to `status: 'failed'` with full error diagnostic strings in `errorDetails`. It remains permanently visible in `SyncQueue`, is reported in `getQueueStats()`, and surfaces an alert on the frontend `SyncStatusBadge` (**`SYNC ERROR`**).
