# 1. Project Title: FestFlow — College Event Management System

FestFlow is an enterprise-grade, full-stack college event management web application designed to streamline campus fest planning, student registrations, venue reservations, club supervision, competition scoring, and financial ledger accounting across university departments.

---

## 2. Problem Statement

Universities organize dozens of technical symposiums, cultural fests, hackathons, and guest lectures concurrently. Managing these activities through paper forms, disjointed chat groups, or basic spreadsheets introduces critical operational vulnerabilities:
- **Permission Creep & Data Leakage**: Student organizers of one club inadvertently gain edit, delete, or financial inspection privileges over unrelated clubs across campus.
- **Venue Double-Booking & Capacity Overselling**: Without real-time seat availability checks, students register past physical venue occupancy limits.
- **Double Registrations & Fraud**: Students submit duplicate event bookings or pass falsified participation certificates.
- **Opaque Financial Accounting**: Manual spreadsheets store derived profit and expense totals, creating ledger desynchronization whenever itemized costs change.
- **Disjointed Faculty Governance**: Faculty coordinators lack a centralized console to oversee club dossiers and securely appoint or revoke student organizers.

FestFlow addresses these challenges through a centralized, cloud-backed architecture enforcing strict multi-club authorization boundaries, atomic 1NF subdocument structures, and dynamic 3NF derived calculations.

---

## 3. Abstract

FestFlow is a full-stack college event management platform built to streamline event coordination, club administration, attendee ticketing, and financial ledger tracking across university departments. Traditional collegiate event workflows face challenges with multi-club permission overlap, venue scheduling conflicts, double registrations, and unverified credentials. FestFlow solves this by implementing a structured four-tier role hierarchy (Admin, Faculty, Organizer, and Student) with strict server-side boundary enforcement. Students can discover fests, register for events with unique digital passes, and verify certificates. Faculty coordinators supervise clubs and appoint student organizers, while organizers manage club-scoped events and finances without cross-club data leakage. Built on React 18, Vite, Tailwind CSS, Node.js, and Express, FestFlow connects to a cloud-hosted MongoDB Atlas database modeled with Mongoose ODM under strict third normal form principles, deriving profits, seat availability, and catering costs dynamically without data redundancy.



---

## 4. Team Members' Names and Register Numbers

| S. No. | Team Member Name | Register Number | Role or Contribution |
| :---: | :--- | :--- | :--- |
| 1 | S.Sathyan | 25BCE1683 | Full-Stack Development, System Architecture & Database Design |
| 2 | S.Sarvesh | 25BCE1702 | Frontend UI/UX, Component Styling & Documentation |
| 3 | N.Sriram | 25BCE1619 | Backend API Development & Automated Test Suites |


---

## 5. Functional Features

### A. Authentication & Role-Based Access Control (RBAC)
- **4-Tier User Hierarchy**: Dedicated operational experiences for **Admin**, **Faculty**, **Organizer**, and **Student**.
- **Cryptographic Security**: Passwords hashed with `bcryptjs` (salt rounds: 10) via Mongoose pre-save middleware; JWT-based stateless session management with role guards.
- **1-Click Evaluation Quick-Fills**: Login page includes one-click credential buttons for rapid academic evaluation.

### B. Student Event Discovery & Ticketing Pass Wallet
- **Filterable Event Catalog**: Filter campus events by category, status, and upcoming date windows.
- **Real-Time Seat Capacity Tracking**: Dynamic seat balance calculation ensures registrations automatically close when venue capacity is reached.
- **Double-Registration Prevention**: Compound unique database index `{ user: 1, event: 1 }` prevents duplicate student bookings.
- **Digital E-Tickets**: Unique ticket pass generation (`FF-XXXXX`) with cancellation support.

### C. Club Management & Faculty Supervision
- **Chartered Club Directory**: Club dossiers displaying category, establishment year, active organizers, and member rosters.
- **Faculty-to-Club Supervision**: Dedicated console for faculty coordinators to supervise clubs and review dossiers.
- **Faculty-Driven Organizer Assignment**: Faculty can search student candidates and appoint them as club organizers.
- **Safe Demotion Safeguards**: Revoking a student's organizer status from their final club automatically reverts their role to `student` without data loss or disrupted registration history.

### D. Multi-Club Scoped Organizer Boundaries
- **Strict Isolation**: Organizers can only create, edit, delete, or inspect finances for events belonging to clubs they are assigned to.
- **Server-Side Enforcement**: Backend rejects unauthorized cross-club actions with `403 Forbidden` regardless of client tampering.

### E. Financial Ledger & Revenue Tracking
- **3NF Derived Profit Engine**: Real-time aggregation pipeline calculates $\text{Net Profit} = \text{Revenue} - \text{Expenses}$ without storing derived redundancy.
- **Categorized Expenses**: Itemized records for equipment, catering, marketing, prizes, logistics, and travel.
- **Multi-Stream Revenue**: Track ticket sales, grants, and corporate sponsorships.

### F. Competitions, Judging Panel & Leaderboard
- **Hackathon & Contest Suite**: Team registrations with designated leaders, member roles, and team size limits.
- **Judging Rubric**: Weighted evaluation criteria (Innovation, Technical Execution, Presentation).
- **Live Leaderboard**: Aggregation pipeline sums judge scores and announces podium positions.

### G. Catering, Sponsors, Certificates & Volunteering
- **Atomic Catering Menus (1NF)**: Menu lines with individual quantity and unit cost fields, deriving total catering costs dynamically.
- **Sponsorship Tiers**: Track Title, Platinum, Gold, and Silver partner funding.
- **Tamper-Proof Certificates**: Unique verification codes (`V-XXXXX`) verifiable on a public portal.
- **Volunteer Rosters**: Task assignments and duty shift schedules.

---

## 6. Technology Stack

### Frontend Client
- **Framework**: React `18.3.1` with Vite `6.0.3`
- **Styling**: Tailwind CSS `3.4.16`, PostCSS `8.4.49`, Autoprefixer `10.4.20`
- **Routing**: React Router DOM `6.28.0`
- **HTTP Client**: Axios `1.7.9` (configured with request/response JWT interceptors)
- **Icons**: Lucide React `0.468.0`

### Backend API
- **Runtime Environment**: Node.js (Verified on `v24.22.0` / compatible with `v18.0.0+`)
- **Server Framework**: Express `4.21.2`
- **Database ODM**: Mongoose `8.9.5`
- **Authentication**: JSON Web Tokens (`jsonwebtoken 9.0.2`), `bcryptjs 2.4.3`
- **Middleware**: CORS `2.8.5`, Morgan `1.10.0`, Dotenv `16.4.7`
- **Dev Engine**: Nodemon `3.1.9`

---

## 7. Database Software/Version and Setup Requirements

- **Database Platform**: **MongoDB Atlas Cluster** (Cloud-hosted distributed replica set)
- **Object Document Mapper (ODM)**: **Mongoose v8.9.5**
- **Data Model Paradigm**: Hybrid Document Model combining normalized references (`ref: '...'`) for relational integrity and embedded subdocuments for atomic items (1NF).
- **Connection Strategy**: Managed via TLS 1.3 with sanitized credential masking in application logs.

---

## 8. Installation and Environment Setup

Execute the following copy-paste-ready commands in **Windows PowerShell**:

### Step 1: Clone Repository
```powershell
git clone https://github.com/sathyan0511-cmyk/FestFlow.git
Set-Location -Path FestFlow
```

### Step 2: Install Dependencies
```powershell
# Install root, backend, and frontend packages
npm install
npm install --prefix server
npm install --prefix client
```

### Step 3: Configure Environment Variables
Create the private local `server/.env` configuration file from the provided template:

```powershell
Copy-Item -Path server/.env.example -Destination server/.env
```

Open `server/.env` in your text editor and ensure the required variables are set:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>.mongodb.net/festflow?retryWrites=true&w=majority
JWT_SECRET=festflow_development_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
> *Do not commit `server/.env` to version control. It is protected by `.gitignore`.*

### Step 4: Launch Application (Open Two Terminals)

#### Terminal 1 — Start Express Backend API:
```powershell
Set-Location -Path C:\Users\sathy\FestFlow\server
npm run dev
```
*Backend server starts at `http://localhost:5000` connected to MongoDB Atlas.*

#### Terminal 2 — Start Vite React Frontend:
```powershell
Set-Location -Path C:\Users\sathy\FestFlow\client
npm run dev
```
*Frontend dev server starts at `http://localhost:5173`.*

### Step 5: Access Local Website & Verify Health
- Open your browser to: `http://localhost:5173`
- Verify backend API health:
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/health -Method Get
```
*Expected response: `{"status":"online","appName":"FestFlow API","version":"1.0.0"}`.*

---

## 9. Steps to Create/Configure the Database and Run the Application

FestFlow connects directly to a cloud **MongoDB Atlas** cluster. Do not drop, reset, or wipe the production database collections.

### Pre-Seeded Evaluation Accounts
The database includes pre-configured demo accounts for academic evaluation:

| Role | Email Address | Password | Mandate / Scope |
| :--- | :--- | :--- | :--- |
| **🏛️ Faculty** | `faculty@festflow.edu` | `FacultyPassword123!` | Supervises CodeNexus Developers Club |
| **💼 Organizer** | `organizer@festflow.edu` | `OrganizerPassword123!` | Manages CodeNexus Developers Club |
| **🎓 Student** | `student@festflow.edu` | `StudentPassword123!` | Campus Participant & Registrant |
| **👑 Admin** | `admin@festflow.edu` | `AdminPassword123!` | Universal Campus Administrator |

*(These accounts can also be populated automatically using the 1-click evaluation buttons on the login page).*

---

## 10. Description of Database Tables/Collections, Relationships, and Sample Data

### Detailed Collection Specifications
Detailed schema definitions, constraints, and aggregation queries are documented in the [`database/`](./database/) directory:
- [`database/README.md`](./database/README.md) — Architecture & Mongoose conventions.
- [`database/schema.md`](./database/schema.md) — Full technical schema specification.
- [`database/collections.md`](./database/collections.md) — Complete 18-collection directory.
- [`database/sample_data.md`](./database/sample_data.md) — Sample document fixtures.
- [`database/queries.js`](./database/queries.js) — Mongoose aggregation pipelines.

---

## 11. Test Instructions and Known Limitations

FestFlow includes automated end-to-end integration and permission test suites that execute directly against the live MongoDB Atlas cluster.

### Run All Test Suites
From the repository root:
```powershell
node tests/run_all.js
```

### Actual Verified Test Results (Executed on 27 October 2026)
```
========================================================================================
Test Suite                                         Passed   Failed   Time    Status
========================================================================================
1. tests/faculty_and_clubs.test.js                 22       0        17.52s  ✅ PASSED
   - Evaluation login & auth tokens
   - Role boundaries & 403 Forbidden checks
   - Faculty organizer appointment & revocation
   - Multi-club organizer promotion & isolation
   - Automatic role demotion to student
   - Registration pass data preservation
   - Admin faculty account provisioning
2. tests/permissions.test.js                       17       0        11.89s  ✅ PASSED
   - Multi-club event isolation
   - Cross-club mutation blocking
   - Scoped financial ledger privacy & DB queries
3. tests/runServerTest.js                          14       0        6.74s   ✅ PASSED
   - Full 14 campus modules (Auth, Events, Clubs, Venues, Payments, Certificates, etc.)
4. npm run build --prefix client                   --       0        6.22s   ✅ PASSED
   - 1,667 modules transformed into production assets with 0 errors
========================================================================================
MASTER TEST SUMMARY: 53 / 53 TESTS PASSED (100% SUCCESS)
========================================================================================
```

---

### Known Limitations

In the spirit of academic transparency, the following items represent planned enhancements:
1. **Simulated Payment Gateway**: The current payment module captures transaction IDs, amounts, timestamps, and receipt statuses (`completed`, `pending`), but does not integrate live external merchant webhooks (e.g., Razorpay or Stripe).
2. **Email Delivery**: Notifications and registration passes are currently recorded in the database and logged to the console rather than delivered via an active external SMTP service.
3. **Media Storage**: Event banners and club logos currently store remote image URLs rather than multipart binary file uploads to an S3 or Cloudinary bucket.

---

## 12. YouTube Demonstration Video Link

---

## 13. Repository Documentation Index

- [`environment_instructions.md`](./environment_instructions.md) — Comprehensive execution and environment setup guide.
- [`database/`](./database/) — Schema specifications, collection directory, sample data, and aggregation queries.
- [`tests/`](./tests/) — Automated test suites, master runner, and test matrix.
- [`report/`](./report/) — Complete academic final project report.
- [`presentation/`](./presentation/) — Slide deck outline and presentation walkthrough guide.
- [`screenshots/`](./screenshots/) — Visual proof checklist and screenshot guidelines.
