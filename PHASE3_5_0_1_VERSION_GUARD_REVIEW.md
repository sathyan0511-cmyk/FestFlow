# FestFlow Phase 3.5.0.1 — Version Guard & Upsert Safety Review

**Document Version:** 1.0.0  
**Phase:** 3.5.0.1 (Algorithmic Verification & Race Condition Analysis)  
**Status:** COMPLETE (DESIGN REVIEW ONLY — NOT EXECUTED)  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

## 1. Evaluation of the Proposed Single-Operation Version Guard

In Phase 3.5.0, the following atomic operation was proposed to protect writes against stale overwrites:

```javascript
// PROPOSED OPERATION (UNDER AUDIT):
await atlasColl.updateOne(
  {
    _id: doc._id,
    $or: [
      { _syncVersion: { $lt: doc._syncVersion } },
      { _syncVersion: { $exists: false } }
    ]
  },
  { $set: doc },
  { upsert: true }
);
```

### 1.1 Detailed Behavioral Analysis Across All Six Scenarios

| Scenario | Condition in Cloud | Query Filter Result | MongoDB Engine Behavior with `upsert: true` | Outcome & Risk Evaluation |
| :--- | :--- | :---: | :--- | :--- |
| **1. Missing Atlas Document** | Cloud has no document with `_id: doc._id`. | 0 Matched | Engine executes an `INSERT`. Equality predicate `_id: doc._id` and `$set: doc` merge into new document. | ✅ **SAFE** (`upsertedCount: 1`) |
| **2. Lower Atlas Version** | Cloud doc exists with `_syncVersion < doc._syncVersion`. | 1 Matched | Engine executes an `UPDATE` in-place. | ✅ **SAFE** (`matchedCount: 1, modifiedCount: 1`) |
| **3. Equal Atlas Version** | Cloud doc exists with `_syncVersion === doc._syncVersion` (e.g. idempotent retry). | **0 Matched** | **CRITICAL FLAW:** Query matches 0 documents. Because `upsert: true`, engine attempts an `INSERT`. Since `_id: doc._id` already exists, MongoDB throws **`E11000 duplicate key error collection: ... index: _id_`**. | ❌ **FATAL FLAW:** Idempotent retries crash with duplicate key exception instead of a clean no-op. |
| **4. Higher Atlas Version** | Cloud doc exists with `_syncVersion > doc._syncVersion` (cloud is newer). | **0 Matched** | **CRITICAL FLAW:** Engine attempts an `INSERT` of `_id: doc._id`. Crashes with **`E11000 duplicate key error`** rather than detecting and reporting a version conflict. | ❌ **FATAL FLAW:** Conflates version conflict with database insertion error. |
| **5. Duplicate-Key Race** | Two workers simultaneously execute upsert for the same missing document. | 0 Matched for both | Both attempt insertion. One succeeds; second throws `E11000`. | ⚠️ **UNHANDLED EXCEPTION** |
| **6. Concurrent Writes** | Local worker updates while a remote user modifies Atlas document. | Version fluctuates | No optimistic lock verification after failure. | ⚠️ **UNSAFE** |

---

## 2. Root Cause of the Flaw with `{ upsert: true }`

In MongoDB, an `upsert` is defined as:
> *"If no documents match the filter, updateOne() inserts a single document."*

When a document exists on Atlas with `_syncVersion >= doc._syncVersion`:
1. The version guard filter (`{ _syncVersion: { $lt: doc._syncVersion } }`) correctly evaluates to **false**.
2. However, the driver now treats the query as **"no documents match"**.
3. With `upsert: true`, MongoDB tries to insert a new document with the specified `_id`.
4. The BSON primary key index `_id_` rejects the insert with an unhandled `MongoServerError: E11000 duplicate key error`.

---

## 3. Recommended Correct Conflict-Aware Algorithm

To eliminate duplicate key crashes, handle idempotent retries cleanly, and guarantee monotonic version progression, the initial sync must implement a two-step **Inspect-and-Compare-and-Swap (ICAS)** algorithm:

```javascript
/**
 * Safe, Conflict-Aware Initial Sync Algorithm
 * Guarantees zero duplicate key errors and prevents stale overwrites.
 */
async function syncDocumentSafe(atlasColl, localDoc) {
  const localVer = localDoc._syncVersion || 1;

  // STEP 1: Inspect cloud document
  const cloudDoc = await atlasColl.findOne(
    { _id: localDoc._id },
    { projection: { _id: 1, _syncVersion: 1 } }
  );

  // CASE A: Document does NOT exist on Atlas -> Insert via insertOne()
  if (!cloudDoc) {
    try {
      await atlasColl.insertOne(localDoc);
      return { status: 'INSERTED', localVer };
    } catch (err) {
      if (err.code === 11000) {
        // Race condition: another process concurrently inserted the document.
        // Fall through to re-read and evaluate.
        const reReadDoc = await atlasColl.findOne({ _id: localDoc._id });
        return evaluateCloudVsLocal(atlasColl, localDoc, reReadDoc);
      }
      throw err;
    }
  }

  // CASE B: Document already exists on Atlas -> Evaluate versions
  return evaluateCloudVsLocal(atlasColl, localDoc, cloudDoc);
}

async function evaluateCloudVsLocal(atlasColl, localDoc, cloudDoc) {
  const localVer = localDoc._syncVersion || 1;
  const cloudVer = cloudDoc._syncVersion || 1;

  // 1. Cloud is strictly newer -> STALE LOCAL SNAPSHOT
  if (cloudVer > localVer) {
    return {
      status: 'CONFLICT_CLOUD_NEWER',
      action: 'REJECT_STALE_OVERWRITE',
      localVer,
      cloudVer,
      reason: `Atlas version (${cloudVer}) is newer than local version (${localVer}). Overwrite blocked.`
    };
  }

  // 2. Cloud has identical version -> IDEMPOTENT NO-OP
  if (cloudVer === localVer) {
    return {
      status: 'ALREADY_SYNCED',
      action: 'NO_OP',
      localVer,
      cloudVer
    };
  }

  // 3. Local is newer -> Atomic Compare-and-Swap Update
  const updateResult = await atlasColl.updateOne(
    { _id: localDoc._id, _syncVersion: cloudVer }, // Atomic precondition
    { $set: localDoc }
  );

  if (updateResult.matchedCount === 0) {
    // Concurrent write modified the document between findOne and updateOne
    return {
      status: 'CONFLICT_CONCURRENT_WRITE',
      action: 'RETRY_OR_ABORT',
      localVer,
      cloudVer
    };
  }

  return {
    status: 'UPDATED',
    action: 'VERSION_INCREMENTED',
    localVer,
    cloudVer
  };
}
```

---

## 4. Architectural Guarantees of the Correct Algorithm

1. **Zero Duplicate Key Exceptions on Equal Versions:** When an identical record is retried, it returns `{ status: 'ALREADY_SYNCED' }` without issuing an invalid insert.
2. **Absolute Protection Against Stale Overwrites:** If an Atlas document is at version 2 and an offline laptop attempts to sync version 1, it is immediately caught and blocked with `{ status: 'CONFLICT_CLOUD_NEWER' }`.
3. **Concurrency Safety:** The atomic precondition `{ _id: localDoc._id, _syncVersion: cloudVer }` guarantees that if two sync workers execute simultaneously, only one succeeds; the second receives `matchedCount: 0` and detects the concurrent write.
