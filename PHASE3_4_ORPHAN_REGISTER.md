# FestFlow Phase 3.4 — Orphaned Records Register & Quarantine Plan

**Document Version:** 1.0.0  
**Status:** DRAFT FOR HUMAN REVIEW & APPROVAL  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  

---

## 1. Executive Summary: The Orphan Phenomenon

The Phase 3.3 production readiness audit reported broken parent references in `clubmemberships`.  
Our deep inspection reveals:
- Total Local `clubmemberships` Records: **25 documents**
- Valid Seeded Records: **1 document** (The valid student membership `6ae7011740e5a2d1e84d5bad` linking student `6ae70115a2ab160fb98025c3` to `6ae70116a2ab160fb98025db`)
- Orphaned Records: **24 documents**
- Total Missing Foreign Key References: **48 broken references** (each of the 24 documents points to both a non-existent `user` AND a non-existent `club`).

### 1.1 Root Cause Analysis

An analysis of the ObjectIds and timestamps of the 24 orphaned records reveals a clear pattern:
They were created during **8 distinct test suite runs** (e.g. `permissions.test.js`, `faculty_and_clubs.test.js`, and worker isolation tests).  
Each test run generated a standard test fixture consisting of **3 club membership records**:
1. Member 1: User A $\to$ Club 1 (role: `member`)
2. Member 2: User A $\to$ Club 2 (role: `member`)
3. Member 3: User B $\to$ Club 3 (role: `coordinator`)

During test teardown, the test suites explicitly deleted their temporary test `users` and test `clubs` via `User.deleteMany(...)` and `Club.deleteMany(...)`. However, because `clubmemberships` lacked cascading deletion hooks, the 3 membership documents created in each test run remained in the local database.  
Over 8 historical test runs, exactly $8 \times 3 = \mathbf{24}$ orphaned records accumulated.

---

## 2. Itemized Orphan Inventory (24 Documents)

All 24 documents were verified against the local database:
- `userExists`: `false` (target ObjectId does not exist in `users`)
- `clubExists`: `false` (target ObjectId does not exist in `clubs`)
- `inboundRefs`: `0` (no other collection in FestFlow points to any of these membership documents)

| # | Batch | Membership `_id` | Missing `user` ID | User Exists? | Missing `club` ID | Club Exists? | Role | Inbound Refs |
| :- | :---: | :--- | :--- | :-: | :--- | :-: | :---: | :-: |
| **1** | Run 1 | `6ae70128cd84100f497fdd4b` | `6ae701271cca5a1875b176bf` | ❌ No | `6ae701271cca5a1875b176b4` | ❌ No | `member` | 0 |
| **2** | Run 1 | `6ae70128cd84100f497fdd4c` | `6ae701271cca5a1875b176bf` | ❌ No | `6ae701271cca5a1875b176b9` | ❌ No | `member` | 0 |
| **3** | Run 1 | `6ae70128cd84100f497fdd4d` | `6ae701281cca5a1875b17735` | ❌ No | `6ae701271cca5a1875b176b7` | ❌ No | `coordinator` | 0 |
| **4** | Run 2 | `6ae7047fcd84100f497fddca` | `6ae7047ec8c60eb25eccbb05` | ❌ No | `6ae7047ec8c60eb25eccbadf` | ❌ No | `member` | 0 |
| **5** | Run 2 | `6ae7047fcd84100f497fddcf` | `6ae7047ec8c60eb25eccbb05` | ❌ No | `6ae7047ec8c60eb25eccbaf3` | ❌ No | `member` | 0 |
| **6** | Run 2 | `6ae70480cd84100f497fddda` | `6ae70480c8c60eb25eccbbd1` | ❌ No | `6ae7047ec8c60eb25eccbaec` | ❌ No | `coordinator` | 0 |
| **7** | Run 3 | `6ae72f4ecd84100f497fdee1` | `6ae72f4da6baec4b6b031fdb` | ❌ No | `6ae72f4da6baec4b6b031fb6` | ❌ No | `member` | 0 |
| **8** | Run 3 | `6ae72f4ecd84100f497fdee6` | `6ae72f4da6baec4b6b031fdb` | ❌ No | `6ae72f4da6baec4b6b031fcb` | ❌ No | `member` | 0 |
| **9** | Run 3 | `6ae72f4ecd84100f497fdef1` | `6ae72f4ea6baec4b6b0320c6` | ❌ No | `6ae72f4da6baec4b6b031fc3` | ❌ No | `coordinator` | 0 |
| **10**| Run 4 | `6ae7311ccd84100f497fdff9` | `6ae7311c8c8d5340c990e2fd` | ❌ No | `6ae7311b8c8d5340c990e2dc` | ❌ No | `member` | 0 |
| **11**| Run 4 | `6ae7311ccd84100f497fdffe` | `6ae7311c8c8d5340c990e2fd` | ❌ No | `6ae7311c8c8d5340c990e2ed` | ❌ No | `member` | 0 |
| **12**| Run 4 | `6ae7311dcd84100f497fe009` | `6ae7311d8c8d5340c990e3f1` | ❌ No | `6ae7311b8c8d5340c990e2e6` | ❌ No | `coordinator` | 0 |
| **13**| Run 5 | `6ae733b6cd84100f497fe0ef` | `6ae733b59f395c7bac434eee` | ❌ No | `6ae733b59f395c7bac434ecc` | ❌ No | `member` | 0 |
| **14**| Run 5 | `6ae733b6cd84100f497fe0f4` | `6ae733b59f395c7bac434eee` | ❌ No | `6ae733b59f395c7bac434edf` | ❌ No | `member` | 0 |
| **15**| Run 5 | `6ae733b6cd84100f497fe0ff` | `6ae733b69f395c7bac434ff9` | ❌ No | `6ae733b59f395c7bac434ed7` | ❌ No | `coordinator` | 0 |
| **16**| Run 6 | `6ae736a8cd84100f497fe1ec` | `6ae736a7cc3ebd3692999bdb` | ❌ No | `6ae736a7cc3ebd3692999bb5` | ❌ No | `member` | 0 |
| **17**| Run 6 | `6ae736a8cd84100f497fe1f1` | `6ae736a7cc3ebd3692999bdb` | ❌ No | `6ae736a7cc3ebd3692999bcc` | ❌ No | `member` | 0 |
| **18**| Run 6 | `6ae736a8cd84100f497fe1fc` | `6ae736a8cc3ebd3692999cf4` | ❌ No | `6ae736a7cc3ebd3692999bc7` | ❌ No | `coordinator` | 0 |
| **19**| Run 7 | `6ae73a47cd84100f497fe2fa` | `6ae73a46a6a7bac31b9606b6` | ❌ No | `6ae73a46a6a7bac31b96068f` | ❌ No | `member` | 0 |
| **20**| Run 7 | `6ae73a47cd84100f497fe2ff` | `6ae73a46a6a7bac31b9606b6` | ❌ No | `6ae73a46a6a7bac31b9606a7` | ❌ No | `member` | 0 |
| **21**| Run 7 | `6ae73a47cd84100f497fe30a` | `6ae73a47a6a7bac31b9607d9` | ❌ No | `6ae73a46a6a7bac31b9606a1` | ❌ No | `coordinator` | 0 |
| **22**| Run 8 | `6ae73c1dcd84100f497fe408` | `6ae73c1d33847b5bc4e04bf5` | ❌ No | `6ae73c1c33847b5bc4e04bcf` | ❌ No | `member` | 0 |
| **23**| Run 8 | `6ae73c1dcd84100f497fe40d` | `6ae73c1d33847b5bc4e04bf5` | ❌ No | `6ae73c1c33847b5bc4e04be3` | ❌ No | `member` | 0 |
| **24**| Run 8 | `6ae73c1ecd84100f497fe418` | `6ae73c1e33847b5bc4e04d1a` | ❌ No | `6ae73c1c33847b5bc4e04bdb` | ❌ No | `coordinator` | 0 |

---

## 3. Impact of Orphans if Left Unresolved

If synchronization is initiated without resolving these 24 records:
1. **Tier 1 Sync Blockade:** In `syncWorkerService.js`, the dependency validation check `isParentReadyForChild()` will verify whether `doc.user` and `doc.club` exist on Atlas. Because neither parent exists, all 24 jobs will fail parent resolution.
2. **Deadlock / Permanent Retries:** The sync worker will attempt retrying these jobs until the retry limit (5 retries) is exhausted.
3. **Queue Bloat:** 24 permanent failed jobs would clutter the `SyncQueue` with unresolvable errors.

---

## 4. Quarantine & Isolation Plan

To maintain 100% data preservation and audit compliance, the 24 records will NOT be permanently discarded. Instead, they will be archived into a dedicated quarantine collection:

```
[ Active clubmemberships ] (25 records)
           │
           ├─► Valid Seed Record (1 record: 6ae7011740e5a2d1e84d5bad) ──► Retained in active collection
           │
           └─► 24 Orphaned Records (0 inbound refs, missing parents)
                     │
                     ▼
          [ Copy to `_orphaned_clubmemberships_backup` ] (Preserves BSON data & audit trail)
                     │
                     ▼
          [ Remove from active `clubmemberships` via raw driver ]
```

### 4.1 Safety Guarantee
- The quarantine operation is performed using `mongodb` driver native methods (`db.collection(...).insertMany(...)` and `db.collection(...).deleteMany(...)`).
- This guarantees that **no Mongoose `pre('deleteOne')` or `pre('deleteMany')` hooks fire**, preventing the creation of tombstones or deletion queue jobs in `SyncQueue` and `SyncTombstone`.
- The valid student membership record (`6ae7011740e5a2d1e84d5bad`) is untouched.

---

## 5. Proposed Quarantine Execution Script

```javascript
/**
 * Safe Quarantine Procedure for Orphaned ClubMemberships
 * To be executed in Phase 3.4 implementation after human approval.
 */
async function quarantineOrphanedMemberships(db) {
  const orphanIds = [
    new ObjectId('6ae70128cd84100f497fdd4b'), new ObjectId('6ae70128cd84100f497fdd4c'),
    new ObjectId('6ae70128cd84100f497fdd4d'), new ObjectId('6ae7047fcd84100f497fddca'),
    new ObjectId('6ae7047fcd84100f497fddcf'), new ObjectId('6ae70480cd84100f497fddda'),
    new ObjectId('6ae72f4ecd84100f497fdee1'), new ObjectId('6ae72f4ecd84100f497fdee6'),
    new ObjectId('6ae72f4ecd84100f497fdef1'), new ObjectId('6ae7311ccd84100f497fdff9'),
    new ObjectId('6ae7311ccd84100f497fdffe'), new ObjectId('6ae7311dcd84100f497fe009'),
    new ObjectId('6ae733b6cd84100f497fe0ef'), new ObjectId('6ae733b6cd84100f497fe0f4'),
    new ObjectId('6ae733b6cd84100f497fe0ff'), new ObjectId('6ae736a8cd84100f497fe1ec'),
    new ObjectId('6ae736a8cd84100f497fe1f1'), new ObjectId('6ae736a8cd84100f497fe1fc'),
    new ObjectId('6ae73a47cd84100f497fe2fa'), new ObjectId('6ae73a47cd84100f497fe2ff'),
    new ObjectId('6ae73a47cd84100f497fe30a'), new ObjectId('6ae73c1dcd84100f497fe408'),
    new ObjectId('6ae73c1dcd84100f497fe40d'), new ObjectId('6ae73c1ecd84100f497fe418')
  ];

  // 1. Fetch exact docs
  const docsToQuarantine = await db.collection('clubmemberships').find({ _id: { $in: orphanIds } }).toArray();
  
  if (docsToQuarantine.length === 24) {
    // 2. Insert into quarantine backup collection
    await db.collection('_orphaned_clubmemberships_backup').insertMany(docsToQuarantine);
    // 3. Remove from active collection
    const deleteRes = await db.collection('clubmemberships').deleteMany({ _id: { $in: orphanIds } });
    console.log(`Successfully quarantined ${deleteRes.deletedCount} orphaned memberships.`);
  }
}
```
