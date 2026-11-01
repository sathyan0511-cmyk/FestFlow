# FestFlow Phase 3.4.2 — Comprehensive Rollback & Disaster Recovery Plan

**Document Version:** 1.0.0  
**Phase:** 3.4.2 (Rollback Architecture & Incident Recovery)  
**Status:** DRAFT FOR HUMAN REVIEW & APPROVAL  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

## 1. Overview & Rollback Philosophy

A robust migration design requires deterministic, non-destructive rollback paths for every individual phase of execution.  
If any script encounters an unhandled exception, syntax error, network disconnection, or data assertion failure, execution must halt immediately and invoke the corresponding rollback procedure.

---

## 2. Failure Scenarios & Targeted Rollback Procedures

### Scenario 1: Partial Orphan Quarantine Failure
*Context:* Script crashes after moving a subset (e.g. 10 of 24) of the orphaned membership records to `_orphaned_clubmemberships_backup`.

**Recovery Procedure:**
1. Connect to local MongoDB via native driver.
2. Read all documents currently stored in `_orphaned_clubmemberships_backup`.
3. Re-insert them into `clubmemberships` using `insertMany()`.
4. Drop the quarantine collection `_orphaned_clubmemberships_backup`.
5. Verify that `clubmemberships` count returns to exactly 25.

```javascript
// Script: rollback_partial_quarantine.js
async function rollbackPartialQuarantine(db) {
  const quarantined = await db.collection('_orphaned_clubmemberships_backup').find({}).toArray();
  if (quarantined.length > 0) {
    // Upsert or insert back into active collection
    for (const doc of quarantined) {
      await db.collection('clubmemberships').replaceOne({ _id: doc._id }, doc, { upsert: true });
    }
    await db.collection('_orphaned_clubmemberships_backup').drop();
    console.log(`✅ Restored ${quarantined.length} records back to clubmemberships.`);
  }
}
```

---

### Scenario 2: Partial Version Injection Failure
*Context:* Script updates `_syncVersion: 1` across some collections, but encounters an error before completing all 41 documents across the 23 collections.

**Recovery Procedure:**
Because version injection is strictly additive (setting `_syncVersion: 1` on unversioned documents):
- Re-running the version injection script is **100% idempotent**.
- The filter `{ $or: [{ _syncVersion: { $exists: false } }, { _syncVersion: null }] }` simply picks up the remaining unversioned documents.
- If an absolute reversion to unversioned state is required:
  ```javascript
  // Script: revert_version_injection.js
  async function revertVersionInjection(db, targetCollectionNames) {
    for (const coll of targetCollectionNames) {
      await db.collection(coll).updateMany(
        { _syncVersion: 1, createdAt: { $lte: ISODate("2026-11-01T10:00:00Z") } },
        { $unset: { _syncVersion: "" } }
      );
    }
  }
  ```

---

### Scenario 3: Partial Initial Synchronization Failure to Atlas `festflow`
*Context:* The background sync worker uploads Tier 0 (Users, Venues, Clubs) and part of Tier 1 to Atlas `festflow`, but encounters a network interruption or dependency error.

**Recovery Procedure:**
Because Atlas `festflow` is a dedicated, newly provisioned database:
- **Clean Reset Option (Immediate):**  
  Drop the collections or drop the entire `festflow` database on Atlas:
  ```javascript
  // Connect to secondary Atlas connection
  const atlasConn = connectDB.getAtlasConnection();
  await atlasConn.db.dropDatabase();
  console.log('✅ Dropped partial Atlas festflow database. Ready for clean re-sync.');
  ```
- **Local Outbox Queue Recovery:**  
  Reset any claimed jobs in the local `SyncQueue` back to `pending`:
  ```javascript
  await db.collection('syncqueues').updateMany(
    { status: { $in: ['processing', 'failed', 'conflict'] } },
    { $set: { status: 'pending', retryCount: 0, lastError: null, lockedAt: null, lockedBy: null } }
  );
  ```

---

## 3. The Master Safety Net: Full BSON Local Database Restoration

If any unforeseen multi-step failure occurs during harmonization execution, the entire local database can be restored to its exact byte-for-byte pre-harmonization snapshot in under 10 seconds.

### Step-by-Step Full Restoration Command

```powershell
# 1. Terminate any running Node.js / FestFlow processes
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# 2. Execute mongorestore from pre-flight backup snapshot
& "C:\Program Files\MongoDB\Server\9.0\bin\mongorestore.exe" `
    --uri="mongodb://127.0.0.1:27017" `
    --db=festflow `
    --drop `
    "C:\Users\sathy\FestFlow\backups\pre_harmonization_local\festflow"

# 3. Verify restoration integrity
node -e "const m = require('mongoose'); m.connect('mongodb://127.0.0.1:27017/festflow').then(async () => { const count = await m.connection.db.collection('clubmemberships').countDocuments(); console.log('Restored clubmemberships count:', count); await m.disconnect(); });"
# Expected Output: Restored clubmemberships count: 25
```

---

## 4. Rollback Verification Protocol

Following any rollback execution, the following verification gates must be met before resuming normal operations:
1. `mongod` logs report 0 uncommitted write transactions.
2. Collection counts match the pre-execution baseline (62 local domain documents, 25 `clubmemberships`).
3. Local application tests (`npm test` in `server`) pass 100%.
4. MongoDB Atlas `test` database remains at exactly 76 documents.
