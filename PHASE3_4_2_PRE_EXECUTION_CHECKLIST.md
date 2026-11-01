# FestFlow Phase 3.4.2 — Pre-Execution Quality & Safety Checklist

**Document Version:** 1.0.0  
**Phase:** 3.4.2 (Pre-Execution Gating & Sign-Off Checklist)  
**Status:** DRAFT FOR HUMAN REVIEW & SIGN-OFF  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

## 1. Gating Protocol Instructions

Before any code, script, or configuration change is executed for Phase 3.4 or Phase 3.5:
1. Every checklist item must be verified.
2. Checkboxes must be marked `[x]` only after running the corresponding read-only verification query.
3. If any check fails, execution must halt immediately.

---

## 2. Pre-Execution Checklist

### Gate 1: Human Architectural Sign-Off
- [ ] **1.1 Strategy B Confirmation:** Confirm adoption of the clean Atlas target database `cluster0.atedvpa.mongodb.net/festflow`.
- [ ] **1.2 Faculty Profile Hold:** Confirm that `faculty@festflow.edu` (`Dr. Meenakshi Sundaram`) is held from automated synchronization pending manual verification.
- [ ] **1.3 Legacy Atlas Retention:** Confirm that the existing Atlas `test` database (76 documents) remains 100% untouched.

---

### Gate 2: Pre-Flight Backup & Environment Isolation
- [ ] **2.1 mongod Daemon Health:** Confirm local `mongod` process is running on `127.0.0.1:27017` with healthy journal logs.
- [ ] **2.2 Full BSON Dump Execution:** Run `mongodump --db festflow --out C:\Users\sathy\FestFlow\backups\pre_harmonization_local`.
- [ ] **2.3 Backup Verification:** Verify that `backups/pre_harmonization_local/festflow` contains 26 `.bson` and `.metadata.json` files.
- [ ] **2.4 Application Isolation:** Confirm that no external HTTP clients, Vite dev servers, or background cron workers are actively writing to `festflow`.

---

### Gate 3: Local Harmonization Safety (Read-Only Dry Checks)
- [ ] **3.1 Orphan Record Inventory:** Verify that exactly 24 records in `clubmemberships` have non-existent parent IDs.
- [ ] **3.2 Zero Inbound References:** Verify that 0 documents in FestFlow reference any of the 24 orphan IDs.
- [ ] **3.3 Raw Driver Verification:** Ensure the orphan quarantine script uses `db.collection(...).deleteMany()` rather than Mongoose `deleteMany()` to guarantee zero tombstone creation.
- [ ] **3.4 Unversioned Document Count:** Verify that exactly 41 documents currently match `{ $or: [{ _syncVersion: { $exists: false } }, { _syncVersion: null }] }`.
- [ ] **3.5 Queue Invariance Guarantee:** Verify that `db.collection('syncqueues').countDocuments()` remains unchanged during and after version injection.

---

### Gate 4: Zero-Remap Architecture Verification
- [ ] **4.1 Atlas festflow State:** Verify that `cluster0.atedvpa.mongodb.net/festflow` is completely empty (0 collections, 0 documents).
- [ ] **4.2 Canonical Local IDs:** Confirm that because Atlas `festflow` is empty, **all 38 local documents retain their original ObjectIds without remapping**.
- [ ] **4.3 No Cascade Side-Effects:** Verify that zero foreign keys need to be altered locally, preserving complete referential integrity.

---

### Gate 5: Atlas Cloud Schema & Index Preparation
- [ ] **5.1 Connection String Verification:** Verify the updated URI string format (`...mongodb.net/festflow?retryWrites=true...`).
- [ ] **5.2 Cloud Index Initialization:** Execute schema provisioning script to ensure all 23 unique indexes are created on Atlas `festflow`.
- [ ] **5.3 Cloud Access Verification:** Confirm secondary Atlas connection reports `ready: 1` and host `cluster0.atedvpa.mongodb.net`.

---

### Gate 6: Post-Harmonization Dry-Run Verification
- [ ] **6.1 Dry-Run Execution:** Run `syncDryRunService.executeDryRun()`.
- [ ] **6.2 Assertions:**
  - `totalLocalDocs == 38`
  - `missingVersionLocally == 0`
  - `uniqueKeyCollisionsDiffId == 0`
  - `orphanMissingParents == 0`
  - `safeToSync == 37` (38 minus 1 held faculty record)
  - `requiresManualIntervention == 1` (`faculty@festflow.edu`)

---

## 3. Human Approval & Execution Sign-Off

| Milestone | Human Sign-Off | Date / Timestamp | Status |
| :--- | :--- | :--- | :--- |
| **Phase 3.4 Harmonization Execution** | Awaiting Signature | | HOLD |
| **Phase 3.5 Initial Cloud Sync Rollout** | Awaiting Signature | | HOLD |
