# FestFlow Phase 3.4 — Pre-Sync Data Harmonization Plan

**Document Version:** 1.0.0  
**Phase:** 3.4 (Analysis & Planning Only)  
**Status:** DRAFT FOR HUMAN REVIEW & APPROVAL  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

> [!IMPORTANT]
> **STRICT PROHIBITION NOTICE & SAFETY COMPLIANCE**  
> This phase is strictly **ANALYSIS AND PLANNING ONLY**.  
> - **Zero database writes** (`INSERT`, `UPDATE`, `DELETE`, `replaceOne`, `dropDatabase`) were executed.  
> - **No ObjectIds** were modified on local MongoDB or MongoDB Atlas.  
> - **No orphaned records** were purged or modified.  
> - **No version numbers** were injected.  
> - **No mutation queue jobs** were generated.  
> - **No database credentials**, connection passwords, or cryptographic password hashes are exposed in this document.  
> Any execution of the steps outlined herein requires explicit human review, sign-off, and initiation.

---

## 1. Executive Summary & Objective

The Phase 3.3 Production Readiness Audit revealed that while the background sync worker engine, outbox queue, tombstone tracking, and conflict detection mechanisms are fully operational (passing 294 automated tests), the underlying datasets between the Primary Local MongoDB and the Cloud MongoDB Atlas have diverged in identity due to independent database seeding.

Specifically, the Phase 3.3 audit identified:
1. **14 Unique-Key Collisions** across 5 collections (`users`, `venues`, `clubs`, `certificates`, `payments`), representing 13 distinct documents where identical entities share natural unique keys (e.g. email, venue name, club name, transaction ID) but possess divergent BSON `_id` values.
2. **48 Missing Parent Foreign Key Violations** across 24 local `clubmemberships` documents (2 missing parent references per document: missing `user` and missing `club`), originating from past permission test runs where temporary users/clubs were deleted without cascading deletions.
3. **41 Local Documents Missing `_syncVersion`** across 23 domain models, originating from legacy seed scripts executed prior to the introduction of the Phase 2 version tracking plugin.
4. **Zero Shared ObjectIds** between the seeded application records on Local MongoDB and Atlas.

### Phase 3.4 Objective
To provide a record-level, mathematically sound, and zero-risk Pre-Sync Harmonization Plan that:
- Establishes canonical entity identities between Local MongoDB and Atlas.
- Resolves all 14 unique-key collisions without data loss.
- Isolates and quarantines all 24 orphaned membership records prior to sync worker activation.
- Injects `_syncVersion: 1` into all 41 unversioned local documents using raw database drivers to prevent unintended outbox queue pollution.
- Prepares both databases for an error-free, dry-run verified bulk synchronization in Phase 3.5.

---

## 2. Database Identity & Configuration Verification

### 2.1 Connection Inspection (Sanitized)

| Attribute | Primary Connection (Local MongoDB) | Secondary Connection (MongoDB Atlas) |
| :--- | :--- | :--- |
| **Connection Role** | Primary (Active Application Read/Write) | Secondary (Remote Cloud Sync Destination) |
| **Config Variable** | `LOCAL_MONGODB_URI` (defaults to local fallback) | `MONGODB_URI` |
| **Host / Endpoint** | `127.0.0.1:27017` | `ac-mv9ozsg-shard-00-01.atedvpa.mongodb.net` (Cluster: `Cluster0`) |
| **Database Name** | `festflow` | `test` |
| **Topology** | Standalone Local Daemon | 3-Node Replica Set (`atlas-10k49f-shard-0`) |
| **Total Collections** | 26 (23 domain + 3 system queue collections) | 23 domain collections |
| **Total Record Count** | 62 domain documents | 76 domain documents |

### 2.2 Root Cause of the Atlas `test` Database Name

Inspection of `server/.env` and `server/src/config/db.js` reveals:
```text
MONGODB_URI=mongodb+srv://festflow_admin:********@cluster0.atedvpa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

> [!WARNING]
> **Database Name Omission in Atlas URI**  
> Notice that the connection URI omits the path database name following `.mongodb.net/`.  
> In accordance with the standard MongoDB Node.js driver specification, when the database path is omitted, the driver defaults to the database named **`test`**.  
>  
> **Findings on Atlas Cluster `Cluster0`:**  
> - Databases currently existing on `Cluster0`: `admin`, `local`, and `test`.  
> - **There is NO database named `festflow` on MongoDB Atlas.**  
> - The 76 documents currently residing on Atlas were written to the `test` database during previous development, staging, and initial cloud seed phases.

### 2.3 Architectural Recommendation on Database Identity

1. **Short-Term (Harmonization & Staging):**  
   Harmonize against the existing `test` database on Atlas because it holds the active cloud state, history, and records created during earlier cloud deployments.
2. **Production Cutover (Mandatory Hardening):**  
   Before final production go-live, update `MONGODB_URI` in `.env` and cloud hosting environment variables (e.g. Render/Vercel) to explicitly append `/festflow`:
   ```text
   MONGODB_URI=mongodb+srv://festflow_admin:********@cluster0.atedvpa.mongodb.net/festflow?retryWrites=true&w=majority&appName=Cluster0
   ```
   If a clean database name is adopted, a cloud database copy or fresh migration from the harmonized local database will be executed under human supervision.

---

## 3. High-Level Harmonization Strategy

### 3.1 The Canonical ObjectId Principle

When an entity exists in both Local MongoDB and MongoDB Atlas under identical natural keys (e.g. email `student@festflow.edu`), which ObjectId should be deemed canonical?

```
┌────────────────────────────────────────────────────────┐
│                   Divergence Analysis                  │
├───────────────────────────┬────────────────────────────┤
│ Local Database            │ Atlas Database             │
│ - Seeded locally          │ - Deployed earlier         │
│ - Local ObjectIds         │ - Cloud ObjectIds          │
│ - 62 documents            │ - 76 documents             │
│ - References local IDs    │ - References cloud IDs     │
└─────────────┬─────────────┴─────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│        Adopt Atlas Canonical ObjectIds for Shared      │
│                  Foundational Records                  │
└────────────────────────────────────────────────────────┘
```

**Decision:**  
**Adopt Atlas ObjectIds as the Canonical Truth for all 13 shared colliding records.**

**Rationale:**
1. **Shared Remote Identity:** MongoDB Atlas is the central source of truth for cloud clients, third-party webhooks, and remote users. Retaining Atlas ObjectIds avoids breaking external cloud references.
2. **Dependency Cascade Control:** Because the 14 collisions are concentrated in foundational Tier 0 and Tier 1 entities (`User`, `Venue`, `Club`), remapping local child references locally before sync ensures that when local records are synchronized to Atlas, they link seamlessly to existing Atlas entities without duplicate key exceptions.
3. **Idempotency:** By aligning local IDs to Atlas IDs prior to synchronization, the sync worker's `_id` preservation logic (`replaceOne({ _id }, payload, { upsert: true })`) will safely match existing cloud records rather than attempting an invalid insertion with a colliding unique index.

### 3.2 Four Pillars of the Harmonization Plan

```mermaid
flowchart TD
    Pillar1["Pillar 1: Quarantine 24 Orphans\n(Eliminates 48 broken FKs)"] --> Pillar2["Pillar 2: Direct Version Injection\n(Set _syncVersion: 1 on 41 records)"]
    Pillar2 --> Pillar3["Pillar 3: Canonical ObjectId Remapping\n(Remap 13 colliding docs & inbound refs)"]
    Pillar3 --> Pillar4["Pillar 4: Post-Harmonization Dry Run\n(Validate 0 collisions, 0 orphans, 100% safe)"]
```

1. **Pillar 1: Quarantine Orphaned Test Memberships (24 Documents / 48 Broken References)**  
   Move the 24 orphaned `ClubMembership` records into an offline quarantine collection `_orphaned_clubmemberships_backup` on Local MongoDB. Remove them from active `clubmemberships`.  
   *Result:* 0 broken parent references in `clubmemberships`.

2. **Pillar 2: Direct Version Injection (41 Documents)**  
   Execute a raw MongoDB driver update to inject `_syncVersion: 1` into all local documents where `_syncVersion` is missing or null.  
   *Safety Mechanism:* Executed strictly via `db.collection(coll).updateMany()`, completely bypassing Mongoose middleware so that NO jobs are written to `SyncQueue`.

3. **Pillar 3: Canonical ObjectId Remap (13 Documents / 14 Collisions)**  
   For each colliding entity, replace the local `_id` with the Atlas canonical `_id`, and cascade the update across all inbound foreign keys in local child collections (e.g. `Event.venue`, `Event.club`, `Event.organizers`, `Registration.user`, etc.).

4. **Pillar 4: Zero-Defect Dry-Run Validation**  
   Re-run `syncDryRunService.executeDryRun()`. The report must verify:
   - `idCollisionsSameId: 0` (or valid upsert matches)
   - `uniqueKeyCollisionsDiffId: 0`
   - `orphanMissingParents: 0`
   - `missingVersionLocally: 0`
   - `safeToSync: 38` (100% of active records)

---

## 4. Execution Order & Safety Gates

Execution of Phase 3.4 is strictly phased and gated by human approval.

```mermaid
graph TD
    Gate0["Gate 0: Pre-Flight Safety Snapshot\nFull mongodump of local & Atlas DBs"] --> Step1["Step 1: Raw Driver Version Injection\n(41 docs in local MongoDB)"]
    Step1 --> Step2["Step 2: Orphan Isolation & Quarantine\n(24 test docs to _orphaned_clubmemberships_backup)"]
    Step2 --> Gate1{"Gate 1: Verification Check\n41 versioned, 24 quarantined?"}
    Gate1 -- Pass --> Step3["Step 3: Remap Canonical ObjectIds\n(Cascade across all inbound local refs)"]
    Gate1 -- Fail --> Rollback1["Rollback via mongorestore"]
    Step3 --> Step4["Step 4: Execute Post-Harmonization Dry Run\n(Automated read-only verification)"]
    Step4 --> Gate2{"Gate 2: Dry Run Check\nCollisions == 0 & Orphans == 0?"}
    Gate2 -- Pass --> Ready["Ready for Phase 3.5 Controlled Rollout Approval"]
    Gate2 -- Fail --> Rollback2["Rollback via mongorestore"]
```

### Safety Gate Specifications

- **Gate 0 (Pre-Flight Snapshot):** Prior to executing any database commands, take a complete local BSON dump via `mongodump --db festflow --out C:\Users\sathy\FestFlow\backups\pre_harmonization_local`.
- **Gate 1 (Isolation Integrity):** Verify that `clubmemberships` count in `festflow` dropped from 25 to exactly 1 (the valid seeded student membership), while `_orphaned_clubmemberships_backup` contains exactly 24 documents.
- **Gate 2 (Harmonization Verification):** The automated dry run must return exit code 0 with zero unique key collisions and zero broken foreign keys.

---

## 5. Detailed Deliverables Navigation

For granular record-level data, reference the companion deliverables:

1. **[Collision Register](file:///c:/Users/sathy/FestFlow/PHASE3_4_COLLISION_REGISTER.md):** Full inventory of all 14 collisions, field differences, inbound reference counts, and resolution rules.
2. **[Orphan Register](file:///c:/Users/sathy/FestFlow/PHASE3_4_ORPHAN_REGISTER.md):** Itemized breakdown of all 24 orphaned membership records, missing parent IDs, and quarantine commands.
3. **[ObjectId Remap Plan](file:///c:/Users/sathy/FestFlow/PHASE3_4_OBJECTID_REMAP_PLAN.md):** Exhaustive Old-ID $\to$ New-ID mapping dictionary and foreign-key cascade update scripts.
4. **[Post-Harmonization Dry Run](file:///c:/Users/sathy/FestFlow/PHASE3_4_POST_HARMONIZATION_DRY_RUN.md):** Simulated verification metrics, post-harmonization dataset distribution, and tier-by-tier synchronization forecast.

---

## 6. Prohibitions & Rollback Guarantees

### 6.1 Prohibitions
- No data is deleted permanently; orphaned records are quarantined in an offline collection for audit retention.
- No Mongoose model methods (`new Model().save()`, `Model.create()`, `Model.findOneAndUpdate()`) shall be used during harmonization, ensuring the `syncQueuePlugin` outbox queue is not triggered.
- No synchronization to MongoDB Atlas is enabled during this phase.

### 6.2 Rollback Procedure
If any discrepancy occurs during the future execution of the harmonization scripts:
```powershell
# Emergency Rollback Command
& "C:\Program Files\MongoDB\Server\9.0\bin\mongorestore.exe" --db festflow --drop "C:\Users\sathy\FestFlow\backups\pre_harmonization_local\festflow"
```
This restores local MongoDB to the exact byte-for-byte state prior to script execution.
