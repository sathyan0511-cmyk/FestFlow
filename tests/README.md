# FestFlow Test Suites & Quality Assurance Specification

FestFlow includes automated end-to-end integration and authorization test suites that validate API contracts, role-based access control, multi-club isolation boundaries, and database integrity directly against the live **MongoDB Atlas** cluster.

---

## Test Suites Overview

| Test Suite | Location | Tests / Assertions | Scope & Coverage |
| :--- | :--- | :---: | :--- |
| **Faculty & Club Hierarchy** | [`tests/faculty_and_clubs.test.js`](./faculty_and_clubs.test.js) | 22 Assertions | Faculty login credentials, supervision bounds, organizer assignment, multi-club assignment, organizer revocation, safe demotion to student, and Admin faculty provisioning. |
| **Multi-Club Permissions** | [`tests/permissions.test.js`](./permissions.test.js) | 17 Assertions | Multi-club isolation, cross-club mutation prevention, student event creation blocks, scoped event finance ledger isolation, and 403 Forbidden enforcement. |
| **14-Module Integration** | [`tests/runServerTest.js`](./runServerTest.js) | 14 Modules | Full verification across all 14 campus modules (Auth, Events, Clubs, Memberships, Venues, Payments, Certificates, Feedback, Volunteers, Finances, Sponsors, Catering, Competitions). |
| **Server Healthcheck** | [`tests/healthcheck.js`](./healthcheck.js) | Smoke Test | Fast verification of server process, port listener, and database connectivity. |
| **Master Test Runner** | [`tests/run_all.js`](./run_all.js) | All Suites | Sequential automated runner executing all test suites with a consolidated execution summary. |

---

## How to Run Tests

Ensure `server/.env` is configured with a valid MongoDB Atlas connection string before running tests.

### 1. Run All Test Suites (Recommended)
From the repository root:
```bash
node tests/run_all.js
```

### 2. Run Individual Test Suites
```bash
# Faculty & Club Hierarchy Test Suite (22 Tests)
node tests/faculty_and_clubs.test.js

# Multi-Club Permissions Suite (17 Tests)
node tests/permissions.test.js

# 14-Module Comprehensive Backend Suite (14 Modules)
node tests/runServerTest.js

# Server Healthcheck Smoke Test
node tests/healthcheck.js
```

### 3. Run Frontend Production Build Test
Verify that the React + Vite frontend bundles with zero compilation errors:
```bash
npm run build --prefix client
```

---

## Test Isolation & Fixture Cleanup Strategy

Every test suite implements an isolated execution pattern:
1. **Dynamic Fixture Tagging**: Test clubs, venues, events, and temporary test users are instantiated with unique timestamps (e.g. `Alpha AI Society ${Date.now()}`).
2. **Dedicated Test Ports**: Tests run on dedicated local ports (e.g. `5002`, `5004`) to prevent port conflicts with active development servers.
3. **Guaranteed Atlas Cleanup**: All created ObjectIds are collected in memory arrays. A `finally` block runs bulk `deleteMany()` queries across `registrations`, `events`, `clubs`, `venues`, and `users` to leave the MongoDB Atlas cluster clean.
