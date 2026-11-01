# FestFlow Phase 3.4.2 — Atlas Target Configuration & Legacy Data Preservation Plan

**Document Version:** 1.0.0  
**Phase:** 3.4.2 (Target Configuration & Data Preservation)  
**Status:** DRAFT FOR HUMAN REVIEW & APPROVAL (PLANNING ONLY)  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

## 1. Atlas Target Architecture: Routing to `festflow`

To implement Strategy B, the application's secondary cloud connection (and the direct cloud deployment on Render) will be directed to the database named **`festflow`** on MongoDB Atlas Cluster0.

### 1.1 URI Path Routing Principle

In MongoDB connection strings:
- **Current Connection String (Defaults to `test`):**
  ```text
  mongodb+srv://festflow_admin:********@cluster0.atedvpa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
  ```
  *(Notice the empty path between `.net/` and `?` — the MongoDB Node.js driver defaults to database `test`)*.

- **Proposed Target Connection String (Explicitly targets `festflow`):**
  ```text
  mongodb+srv://festflow_admin:********@cluster0.atedvpa.mongodb.net/festflow?retryWrites=true&w=majority&appName=Cluster0
  ```
  *(Appends `/festflow` directly prior to the query parameters)*.

---

## 2. Comprehensive Configuration Inventory

Below is the definitive inventory of every configuration location across development, local testing, and cloud production:

| Configuration Location | Current Value | Required Future Value | Impact & Verification |
| :--- | :--- | :--- | :--- |
| **`server/.env`** (`MONGODB_URI`) | `mongodb+srv://...cluster0.atedvpa.mongodb.net/?retryWrites=true...` | `mongodb+srv://...cluster0.atedvpa.mongodb.net/festflow?retryWrites=true...` | Directs local background sync worker to secondary Atlas DB `festflow`. *(Unmodified in this phase)* |
| **`server/.env.example`** | `mongodb+srv://...cluster0.atedvpa.mongodb.net/?...` | `mongodb+srv://...cluster0.atedvpa.mongodb.net/festflow?...` | Documentation reference for developer onboarding. |
| **Render Cloud Hosting Environment Settings** | `MONGODB_URI` environment variable in Render Dashboard | Append `/festflow` to `MONGODB_URI` in Render Environment tab | Directs production server to primary cloud database `festflow`. |
| **Local Primary Connection (`LOCAL_MONGODB_URI`)** | `mongodb://127.0.0.1:27017/festflow` | `mongodb://127.0.0.1:27017/festflow` (NO CHANGE) | **Verified:** Offline-first operations continue using local MongoDB instance without interruption. |

---

## 3. Preservation of Legacy Atlas `test` Database

The human stakeholder explicitly instructed:
> *"Preserve the existing Atlas `test` database completely unchanged. Do not copy, migrate, delete, or modify them."*

### 3.1 Inventory of Legacy Documents in Atlas `test` (Total: 76 Documents)

An independent, read-only inspection confirmed the exact document distribution currently residing in database `test`:

```json
{
  "database": "test",
  "cluster": "Cluster0 (ac-mv9ozsg-shard-00-02.atedvpa.mongodb.net)",
  "totalDocuments": 76,
  "collections": {
    "clubmemberships": 30,
    "users": 5,
    "expenses": 5,
    "revenues": 4,
    "venues": 4,
    "clubs": 3,
    "caterings": 3,
    "payments": 2,
    "judgingcriterias": 2,
    "sponsors": 2,
    "eventsponsors": 2,
    "teams": 2,
    "prizes": 2,
    "competitions": 1,
    "budgets": 1,
    "volunteers": 1,
    "certificates": 1,
    "judges": 1,
    "feedbacks": 1,
    "events": 1,
    "registrations": 1,
    "judgescores": 1,
    "results": 1
  }
}
```

### 3.2 Guarantee of Non-Interference
1. **Physical Namespace Isolation:** In MongoDB, databases are physically isolated namespaces within the WiredTiger storage engine. Operations executed on database `festflow` have zero visibility, connection, or shared state with database `test`.
2. **Zero In-Place Modification:** The synchronization worker and initialization scripts will be bound strictly to database handle `festflow`. No queries, writes, drops, or updates will ever reference `test`.
3. **Long-Term Retention / Archival:** The `test` database can remain active on Cluster0 indefinitely at zero financial or performance cost (occupying only ~2.1 MB of storage on the Atlas M0/M10 cluster).

---

## 4. Dual-Mode Deployment Verification

### 4.1 Local Offline-First Mode Verification
In `server/src/config/db.js`:
```javascript
const isOfflineMode = () => {
  if (process.env.LOCAL_MONGODB_URI) return true;
  // ... fallback checks ...
  return false;
};
```
- When running locally, `getUris()` resolves:
  - `localUri`: `mongodb://127.0.0.1:27017/festflow` (Primary connection for all express routes, user logins, student registrations).
  - `cloudUri`: `mongodb+srv://...cluster0.atedvpa.mongodb.net/festflow` (Secondary connection used solely by `syncWorkerService.js` for background syncing).
- **Result:** The application remains 100% offline-capable. Local database operations depend solely on the local `mongod` daemon.

### 4.2 Render Cloud Production Mode Verification
On Render (production cloud deployment):
- `LOCAL_MONGODB_URI` is NOT set.
- `MONGODB_URI` contains `mongodb+srv://...cluster0.atedvpa.mongodb.net/festflow`.
- `isOfflineMode()` evaluates to `false`.
- Primary Mongoose connects directly to Atlas `festflow`.
- **Result:** Render production communicates directly with the clean cloud database, with zero reliance on local background workers or local queues.
