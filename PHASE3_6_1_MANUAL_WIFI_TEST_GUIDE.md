# FestFlow Phase 3.6.1 — Manual Physical Wi-Fi Verification Guide

**Document Version:** 1.0.0  
**Status:** **NOT VERIFIED (PENDING HUMAN EXECUTION ON LAPTOP)**  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Auditor / Agent:** Antigravity AI  

---

## 1. Objective & Safety Mandate

In compliance with Safety Rule 13:
> *"Do not claim real offline functionality based only on mocked tests. If actual Wi-Fi disconnection cannot be automated safely, provide exact manual test instructions and clearly mark the test NOT VERIFIED until performed."*

This guide provides step-by-step instructions for the developer/user to physically disconnect their laptop Wi-Fi and verify real offline operation, mutation durability, and cloud synchronization upon reconnection.

> [!IMPORTANT]
> **Isolated Test Data Rule:**  
> Use a dedicated test club name (e.g., *"RoboTech Isolated Offline Test Club"*) or test event. **Do NOT modify or delete the 37 existing production-like records.**

---

## 2. Step-by-Step Manual Test Protocol

### Step 1: Initial Online Startup
1. Open PowerShell terminal 1:
   ```powershell
   cd C:\Users\sathy\FestFlow\server
   npm run dev
   ```
   *Expected output:* `🚀 FestFlow Server running on port 5000...` and `☁️ Secondary Database Connected (MongoDB Atlas): ... [DB: festflow]`
2. Open PowerShell terminal 2:
   ```powershell
   cd C:\Users\sathy\FestFlow\client
   npm run dev
   ```
   *Expected output:* `Local: http://localhost:5173/`
3. Open browser at `http://localhost:5173/`.
4. Inspect the top-right navigation bar:
   - Verify the `SyncStatusBadge` displays **`SYNCED`** (Emerald badge with checkmark).

---

### Step 2: Physical Network Disconnection
1. On your Windows taskbar, click the network icon and **Turn Wi-Fi OFF** (or disconnect your Ethernet cable).
2. Within 5–10 seconds, observe the `SyncStatusBadge` in `Navbar.jsx`:
   - It should transition to **`OFFLINE`** (Slate badge with CloudOff icon).
3. Click the badge to open the inspector popover:
   - **Local MongoDB**: `Connected (Primary)`
   - **MongoDB Atlas**: `Offline / Standby`
   - **Device Network**: `Offline`
   - **Pending Changes**: `0`

---

### Step 3: Offline Authentication & Navigation
1. Navigate to `http://localhost:5173/login`.
2. Log in using local credentials:
   - **Email:** `admin@festflow.edu`
   - **Password:** `Admin@123`
3. Confirm login succeeds immediately with zero network delay.
4. Refresh the page while still offline (`Ctrl + F5`):
   - Confirm you remain logged in and your session is **NOT** logged out.

---

### Step 4: Perform an Offline Mutation
1. Navigate to **Events** $\rightarrow$ **Create Event** (or **Clubs** $\rightarrow$ **Create Club**).
2. Create a test event:
   - **Title:** `Offline Hackathon Challenge 2026`
   - **Club:** Select `CodeNexus Developers Club`
   - **Venue:** Select `Dr. APJ Abdul Kalam Auditorium`
   - **Registration Fee:** `0` (Free event)
3. Click **Submit**:
   - Confirm the event is created locally and appears in the event feed.
4. Inspect the top-right `SyncStatusBadge`:
   - It should transition to **`PENDING (1)`** (Amber badge with clock icon).
   - In the popover, confirm **`Pending Changes: 1`**.

---

### Step 5: Offline Server Crash & Restart Test
1. In Terminal 1 (server), press `Ctrl + C` to stop the backend.
2. Restart the backend while still offline:
   ```powershell
   npm run dev
   ```
3. Refresh the browser:
   - Verify the created event is still visible.
   - Verify `SyncStatusBadge` still shows **`PENDING (1)`**.

---

### Step 6: Restore Wi-Fi & Reconnection Verification
1. Turn your Windows Wi-Fi back **ON**.
2. Within 10–15 seconds, observe the `SyncStatusBadge`:
   - It should transition from **`PENDING`** $\rightarrow$ **`SYNCING`** $\rightarrow$ **`SYNCED`** (Emerald badge).
3. Open the popover:
   - **Local MongoDB**: `Connected`
   - **MongoDB Atlas**: `Connected`
   - **Pending Changes**: `0`

---

### Step 7: Cloud Parity Verification
1. To verify the new event reached Atlas `festflow` without duplicates, run:
   ```powershell
   node -e "require('dotenv').config({ path: 'server/.env' }); const { MongoClient } = require('mongodb'); async function check() { const c = new MongoClient(process.env.CLOUD_MONGODB_URI); await c.connect(); const db = c.db('festflow'); const found = await db.collection('events').find({ title: 'Offline Hackathon Challenge 2026' }).toArray(); console.log('Atlas Event Match Count:', found.length); await c.close(); } check();"
   ```
2. Confirm the output prints:
   `Atlas Event Match Count: 1`

---

## 3. Post-Test Cleanup
Delete the created isolated test event from the UI once verified. The deletion will automatically queue a tombstone and clean up the cloud record.

---

## 4. Verification Checkbox for User

- [ ] Initial online startup verified.
- [ ] Physical Wi-Fi disconnected.
- [ ] Offline login & page refresh preserved session.
- [ ] Offline event creation succeeded locally.
- [ ] Status badge displayed `PENDING (1)`.
- [ ] Server restart preserved event & pending queue.
- [ ] Physical Wi-Fi reconnected.
- [ ] Event synchronized to Atlas `festflow` (`Match Count: 1`).
- [ ] Status badge returned to `SYNCED`.
- [ ] Cleaned up isolated test event.

**Signed off by Human Operator:** `____________________`  
**Date Tested:** `____________________`
