# FestFlow: Full-Stack College Event Management Platform
## Project Final Report & Engineering Documentation

**Author / Candidate**: Sathyan
**Project Name**: FestFlow
**Academic Module**: Full-Stack Web Application / Database Management Systems
**Database**: MongoDB Atlas Cluster (Cloud Document Database via Mongoose)
**Backend**: Node.js & Express.js
**Frontend**: React 18, Vite, Tailwind CSS
**Authentication**: JSON Web Tokens (JWT) & Bcrypt Password Hashing

> **Submission Artifact Location**:
> Once generated/exported, place the compiled PDF project report (e.g. `FestFlow_DBMS_Project_Report.pdf`) directly in this `report/` folder. The complete written content of the engineering project report is documented below.

---

## 1. Abstract

Campus event management in modern universities involves complex interdependencies between student bodies, faculty coordinators, physical campus venues, ticketing systems, competition judging panels, and financial ledger accounting. Conventional paper-based or basic spreadsheet-driven workflows suffer from double-booking conflicts, opaque budgeting, unauthorized cross-club modifications, and unverified credentials.

**FestFlow** is an enterprise-grade, full-stack college event management web platform designed to streamline the entire campus event lifecycle. Built on a modernized MERN architecture utilizing MongoDB Atlas, FestFlow delivers:
- A structured **4-tier role hierarchy** (**Admin**, **Faculty**, **Organizer**, **Student**) with strict server-side boundary enforcement.
- A **normalized database architecture** compliant with 3NF and BCNF principles, calculating derived metrics (profits, capacity balances, catering costs) on the fly without database redundancy.
- Comprehensive campus operational modules: venue scheduling, ticket issuance with fraud prevention, competitive hackathon judging panels, multi-tier sponsorship tracking, catering menu accounting, and tamper-proof e-certificate verification.

---

## 2. Problem Statement & Objectives

### 2.1 Problem Statement
Universities host dozens of fests, hackathons, and symposiums simultaneously. Common points of failure include:
1. **Permission Creep & Data Leaks**: Organizers assigned to Club A inadvertently modifying or viewing financial ledgers of Club B.
2. **Double Registrations & Seat Overselling**: Lack of atomic database constraints allowing students to claim multiple seats beyond venue capacity.
3. **Data Redundancy & Update Anomalies**: Storing derived totals (e.g. Total Revenue, Net Profit) leading to ledger desynchronization when expenses are updated.
4. **Credential Forgery**: Unverifiable paper certificates and event participation claims.

### 2.2 Project Objectives
1. Implement a 4-tier role-based access control (RBAC) architecture guaranteeing multi-club isolation.
2. Design and deploy a normalized MongoDB database schema supporting all 30 relational entities from authoritative normalization standards.
3. Eliminate stored derived fields by constructing dynamic Mongoose aggregation pipelines.
4. Deliver an accessible, high-performance user interface with zero-clutter dashboards tailored to each user role.
5. Provide comprehensive automated integration test suites proving system reliability.

---

## 3. System Architecture

FestFlow adheres to a clean 3-tier architectural model:

```
┌────────────────────────────────────────────────────────┐
│             Presentation Layer (Client)               │
│   React 18 + Vite + Tailwind CSS + Lucide React        │
│   Role-Scoped Route Guards & React ErrorBoundary      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JSON) + JWT
┌───────────────────────────▼────────────────────────────┐
│            Application Layer (Server API)              │
│   Node.js + Express.js API Gateway                     │
│   Auth Middleware, Role Validator, Error Handler       │
│   14 Domain Controllers & Club Authorization Engine    │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM / TLS 1.3
┌───────────────────────────▼────────────────────────────┐
│              Data Tier (Database Cloud)                │
│   MongoDB Atlas Distributed Cluster (Cloud Replica)   │
│   18 Normalized Collections with Unique Compound Indexes│
└────────────────────────────────────────────────────────┘
```

---

## 4. Normalized Database Design

FestFlow adapts relational normalization principles into MongoDB document modeling:

### 4.1 First Normal Form (1NF)
- All attribute values are atomic.
- Multi-valued items (such as catering menu lines and venue facilities) are structured as embedded document sub-schemas (`cateringMenuItemSchema`, `venueFacilitySchema`) containing distinct `quantity`, `costPerUnit`, and `availabilityStatus` fields.

### 4.2 Second Normal Form (2NF)
- Every non-key attribute is fully functionally dependent on the primary key (`_id`).
- Junction entities (`Registration`, `ClubMembership`, `EventSponsor`, `Feedback`, `Volunteer`) use compound unique indexes to guarantee functional dependency.

### 4.3 Third Normal Form (3NF) & Boyce-Codd Normal Form (BCNF)
- **Zero Derived Redundancy**: Redundant transitive dependencies are eliminated. Derived values are computed in memory or via MongoDB aggregation pipelines:
  - $\text{Net Profit} = \text{Total Revenue} - \text{Total Expenditure}$
  - $\text{Available Seats} = \text{Venue Capacity} - \text{Active Registrations}$
  - $\text{Catering Total} = \sum (\text{Quantity} \times \text{CostPerUnit})$

---

## 5. Security & Role-Based Authorization

### 5.1 Role Hierarchy Matrix

| Permission / Capability | Student | Organizer | Faculty | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Browse events & view clubs | ✅ | ✅ | ✅ | ✅ |
| Register for events & digital passes | ✅ | ✅ | ✅ | ✅ |
| View personal memberships & profile | ✅ | ✅ | ✅ | ✅ |
| Manage events for authorized club(s) | ❌ | ✅ *(Assigned only)* | ✅ *(Supervised only)* | ✅ *(All clubs)* |
| Access club financial ledgers | ❌ | ✅ *(Assigned only)* | ✅ *(Supervised only)* | ✅ *(All clubs)* |
| Appoint / Revoke student organizers | ❌ | ❌ | ✅ *(Supervised only)* | ✅ *(All clubs)* |
| Supervise club dossiers | ❌ | ❌ | ✅ *(Assigned clubs)* | ✅ *(All clubs)* |
| Universal override & faculty provisioning | ❌ | ❌ | ❌ | ✅ |

### 5.2 Server-Side Club Boundary Enforcement
The authorization engine in `server/src/utils/clubAuthorization.js` guarantees that client requests cannot bypass club boundaries. If an organizer belonging to Club A sends a `POST /api/events` targeting Club B, the backend rejects the transaction with `403 Forbidden` prior to controller invocation.

---

## 6. Verification & Quality Assurance

All features were subjected to automated testing directly against the MongoDB Atlas cluster:

1. **`faculty_and_clubs.test.js`**: 22 / 22 Passed (Evaluated role promotion, multi-club assignment, organizer revocation, and automatic demotion back to student).
2. **`permissions.test.js`**: 17 / 17 Passed (Evaluated cross-club mutation prevention and ledger privacy).
3. **`runServerTest.js`**: 14 / 14 Modules Passed (Evaluated health, auth, events, venues, payments, certificates, feedback, volunteering, finances, sponsors, catering, competitions).
4. **Frontend Production Build**: Built in 5.35 seconds with 0 errors via Vite.

---

## 7. Conclusion

FestFlow successfully satisfies all functional, architectural, and database requirements for an enterprise-ready College Event Management Platform. By combining MongoDB Atlas scalability with strict relational normalization rules and clean role-based boundaries, FestFlow ensures reliable, audit-compliant campus operations.
