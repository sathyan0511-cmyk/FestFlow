# FestFlow Phase 3.5.0 — Pre-Sync Quality & Verification Checklist

**Document Version:** 1.0.0  
**Phase:** 3.5.0 (Preflight Synchronization Gating Checklist)  
**Status:** DRAFT FOR HUMAN REVIEW & SIGN-OFF  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

## 1. Gating Protocol Instructions

Before authorizing Phase 3.5 Initial Cloud Synchronization:
1. Every checklist item must be verified.
2. Checkboxes must be marked `[x]` only after running the corresponding read-only verification query.
3. If any check fails, synchronization execution must NOT proceed.

---

## 2. Pre-Sync Verification Checklist

### Gate 1: Dataset Eligibility & Exclusion Audits
- [ ] **1.1 Active Local Document Total:** Confirm local database contains exactly **38 active domain documents**.
- [ ] **1.2 Quarantine Isolation:** Confirm that `_orphaned_clubmemberships_backup` contains exactly **24 documents** and active `clubmemberships` contains exactly **1 document**.
- [ ] **1.3 Faculty Profile Hold:** Confirm that `faculty@festflow.edu` (`Dr. Meenakshi Sundaram`, `6ae70115a2ab160fb98025c5`) is explicitly excluded from the initial sync candidate list.
- [ ] **1.4 Total Initial Sync Candidates:** Confirm that candidate count is exactly **37 documents** ($38 - 1 = 37$).

---

### Gate 2: Local Referential Integrity & Versioning
- [ ] **2.1 Zero Broken Parent FKs:** Run `syncDryRunService.executeDryRun()` and verify `orphanMissingParents == 0`.
- [ ] **2.2 Zero Unversioned Documents:** Verify that across all 23 domain collections, documents matching `{ $or: [{ _syncVersion: { $exists: false } }, { _syncVersion: null }] }` == **0**.
- [ ] **2.3 Local ObjectId Preservation:** Confirm all 37 candidate records retain their original BSON `_id` values.
- [ ] **2.4 Unique Constraint Parity:** Verify zero internal unique-key collisions in the active local dataset.

---

### Gate 3: Legacy Queue & Tombstone Decoupling
- [ ] **3.1 Queue Freeze:** Confirm that `SyncQueue` (241 jobs) and `SyncTombstones` (64 records) are **completely bypassed** by the initial sync mechanism.
- [ ] **3.2 Background Worker Inactive:** Verify that the background synchronization worker daemon (`syncWorkerService`) is **stopped/disabled** before initial sync begins.
- [ ] **3.3 Tombstone Protection:** Verify that zero tombstones will be transmitted to Atlas `festflow` during the initial upload.

---

### Gate 4: Atlas Cloud Target Readiness
- [ ] **4.1 Target Namespace:** Confirm target URI explicitly specifies `/festflow` (`cluster0.atedvpa.mongodb.net/festflow`).
- [ ] **4.2 Target Database Pristine State:** Confirm that Atlas `festflow` currently contains **0 documents**.
- [ ] **4.3 Legacy Atlas Retention:** Confirm that Atlas `test` database contains **exactly 76 documents** and remains completely untouched.
- [ ] **4.4 Index Provisioning Ready:** Confirm script is prepared to execute schema and unique index creation on Atlas `festflow` prior to batch uploads.

---

### Gate 5: Execution Engine & Idempotency Safeguards
- [ ] **5.1 Strict Tier Ordering:** Confirm upload engine enforces sequential execution: Tier 0 (11 docs) $\to$ Tier 1 (4 docs) $\to$ Tier 2 (13 docs) $\to$ Tier 3 (7 docs) $\to$ Tier 4 (2 docs).
- [ ] **5.2 Monotonic Version Guard:** Confirm every write uses `updateOne({ _id, $or: [{ _syncVersion: { $lt: doc._syncVersion } }] }, { $set: doc }, { upsert: true })`.
- [ ] **5.3 BSON Native Serialization:** Confirm native Date, ObjectId, and nested Array types are preserved without string conversion.
- [ ] **5.4 Batch Checkpointing:** Confirm intermediate write results are logged to disk for automatic resumption in case of network drop.

---

### Gate 6: Rollback & Disaster Recovery Readiness
- [ ] **6.1 Fresh Local Backup Verified:** Confirm BSON backup snapshot exists at `C:\Users\sathy\FestFlow\backups\backup_2026-11-01T14-02-51-817Z_phase3_4_3\festflow`.
- [ ] **6.2 Standalone Cloud Drop Command:** Confirm emergency rollback script is prepared to drop Atlas `festflow` if any tier encounters an unresolvable error.

---

## 3. Human Approval & Execution Sign-Off

| Milestone | Human Sign-Off | Date / Timestamp | Status |
| :--- | :--- | :--- | :--- |
| **Phase 3.5.0 Preflight Audit Acceptance** | Awaiting Signature | | HOLD |
| **Phase 3.5 Initial Synchronization Authorization** | Awaiting Signature | | HOLD |
