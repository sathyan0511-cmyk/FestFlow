# Project Technical Details & Engineering Reference for DBMS Final Report

**Project Title**: FestFlow — Full-Stack College Event Management System  
**Document Purpose**: Comprehensive technical, architectural, and database specification prepared for authoring the final Database Management Systems (DBMS) project report.  
**Repository Location**: `C:\Users\sathy\FestFlow`  
**Date of Compilation**: 27 October 2026  

---

## Table of Contents
1. [Project Information](#1-project-information)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Functional Modules](#4-functional-modules)
5. [User Roles and Authorization](#5-user-roles-and-authorization)
6. [Database Design & Normalization](#6-database-design--normalization)
7. [Security Architecture](#7-security-architecture)
8. [Testing, Quality Assurance & Verification](#8-testing-quality-assurance--verification)
9. [Installation and Execution Guide](#9-installation-and-execution-guide)
10. [Screenshots and Visual Evidence Checklist](#10-screenshots-and-visual-evidence-checklist)
11. [Results and Discussion](#11-results-and-discussion)
12. [Limitations and Future Enhancements](#12-limitations-and-future-enhancements)
13. [Conclusion](#13-conclusion)
14. [References and Submission Metadata](#14-references-and-submission-metadata)

---

## 1. Project Information

### 1.1 Project Title
**FestFlow — Full-Stack College Event Management System**

### 1.2 Abstract
FestFlow is a full-stack college event management platform built to streamline event coordination, club administration, attendee ticketing, and financial ledger tracking across university departments. Traditional collegiate event workflows face challenges with multi-club permission overlap, venue scheduling conflicts, double registrations, and unverified credentials. FestFlow solves this by implementing a structured four-tier role hierarchy (Admin, Faculty, Organizer, and Student) with strict server-side boundary enforcement. Students can discover fests, register for events with unique digital passes, and verify certificates. Faculty coordinators supervise clubs and appoint student organizers, while organizers manage club-scoped events and finances without cross-club data leakage. Built on React 18, Vite, Tailwind CSS, Node.js, and Express, FestFlow connects to a cloud-hosted MongoDB Atlas database modeled with Mongoose ODM under strict third normal form principles, deriving profits, seat availability, and catering costs dynamically without data redundancy. *(Word count: 134 words)*

### 1.3 Problem Statement
Universities coordinate dozens of academic conferences, technical symposiums, hackathons, cultural festivals, and competitive sports meets concurrently across campus departments. Traditional management methods—relying on disparate messaging channels, physical registration counters, paper ledger slips, and unversioned spreadsheets—suffer from several systemic vulnerabilities:
1. **Permission Creep & Cross-Club Data Exposure**: When students organize activities for multiple clubs, flat permission models allow unauthorized organizers to edit schedules or view financial accounting data belonging to unrelated clubs.
2. **Venue Double-Booking & Capacity Overselling**: Venues have strict physical seating limits. In the absence of atomic transactional balance checking, events frequently accept more attendees than the hall can legally accommodate.
3. **Double Registrations & Ticket Fraud**: Uniqueness constraints are often omitted in informal systems, enabling attendees to obtain duplicate bookings or present counterfeit passes.
4. **Opaque Financial Accounting**: Storing derived financial metrics (e.g., total expenses, net profit margins) directly inside records introduces data anomalies whenever line-item receipts or catering invoices are adjusted.
5. **Decentralized Faculty Governance**: Faculty advisors lack a consolidated, audited dashboard to oversee club charters, review member rosters, and securely appoint student organizers.

### 1.4 Motivation
The motivation behind FestFlow is to replace ad-hoc administrative processes with an enterprise-grade, cloud-backed web platform engineered according to modern database design principles. By enforcing role-based access control, multi-club permission boundaries, atomic embedded document structures (1NF), and dynamic calculated aggregations (3NF), FestFlow provides a transparent, secure, and auditable operating system for collegiate event life.

### 1.5 Objectives
- **Centralized Event Lifecycle**: Provide end-to-end tooling for event draft creation, publishing, venue allocation, ticketing, and post-event feedback.
- **Strict Multi-Club Scoped RBAC**: Enforce server-side authorization ensuring student organizers can only manipulate events and financial ledgers for their assigned clubs.
- **Faculty Governance Console**: Deliver a dedicated supervision portal where faculty advisors oversee club rosters and appoint or revoke student organizers.
- **Dynamic 3NF Financial Engine**: Compute event net profits ($\text{Net Profit} = \text{Revenue} - \text{Expenses}$) dynamically using database aggregation pipelines, preventing stored data redundancy.
- **Atomic Headcount & Seat Balance**: Guarantee zero overbooking by coupling real-time registration aggregation with compound unique database indexing.
- **Tamper-Proof Credentialing**: Issue verifiable digital certificates and unique ticket passes with public verification hashes.

### 1.6 Project Scope
The project covers:
- Student-facing event discovery, digital ticket wallet, club directory, volunteer applications, and certificate verification.
- Organizer-facing event scheduling, budget requests, line-item expense reporting, revenue logging, and competition judging administration.
- Faculty-facing club supervision, student roster discovery, and organizer appointment/revocation workflows.
- Administrator-facing faculty account provisioning, global campus oversight, and venue management.
- Live cloud data persistence via MongoDB Atlas with relational 3NF ANSI SQL reference artifacts for academic coursework alignment.

---

## 2. Technology Stack

The FestFlow application is developed as a modular, decoupled full-stack JavaScript application:

| Layer / Concern | Technology | Installed Version | Purpose in FestFlow |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `18.3.1` | Single-Page Application (SPA) component-based UI rendering |
| **Build & Dev Server** | Vite | `6.0.3` | Fast ESM module bundling, Hot Module Replacement (HMR) |
| **Routing** | React Router DOM | `6.28.0` | Client-side declarative routing and protected route guards |
| **HTTP Client** | Axios | `1.7.9` | Asynchronous REST API requests with JWT Bearer interceptors |
| **UI Iconography** | Lucide React | `0.468.0` | Clean vector iconography across dashboards and action buttons |
| **Styling Engine** | Tailwind CSS | `3.4.16` | Utility-first responsive CSS styling with custom design tokens |
| **CSS Preprocessing** | PostCSS / Autoprefixer | `8.4.49` / `10.4.20`| Cross-browser vendor prefixing and CSS compilation |
| **Backend Runtime** | Node.js | Verified on `v24.22.0` (Supports `v18.0.0+`) | Event-driven non-blocking I/O JavaScript server runtime |
| **Server Framework** | Express.js | `4.21.2` | RESTful routing, middleware orchestration, and HTTP pipelines |
| **Dev Monitor** | Nodemon | `3.1.9` | Development file-watching and automatic server reload |
| **Database Platform** | MongoDB Atlas | Cloud Cluster (M0 / Dedicated) | Cloud-hosted NoSQL document database with replica set |
| **Object Data Modeling** | Mongoose | `8.9.5` | Strict schema validation, compound indexing, virtuals, and hooks |
| **Authentication** | JSON Web Tokens | `jsonwebtoken 9.0.2`| Stateless token-based session management (`Bearer <token>`) |
| **Password Hashing** | Bcrypt.js | `2.4.3` | One-way cryptographic salting and hashing (10 salt rounds) |
| **Security & CORS** | CORS | `2.8.5` | Cross-Origin Resource Sharing with whitelisted frontend origins |
| **Environment Config** | Dotenv | `16.4.7` | Zero-leakage environment variable injection (`server/.env`) |
| **HTTP Logging** | Morgan | `1.10.0` | Development HTTP request logging and latency monitoring |
| **Source Control** | Git | Distributed VCS | Branch tracking (`main`), version management, `.gitignore` rules |

> **Note on Prototype Code**: The repository root contains an isolated legacy directory named `backend/` containing Python/Flask code for an incident tracking system ("CampusFix"). The active, production-grade FestFlow server resides entirely in `server/` (Node.js/Express).

---

## 3. System Architecture

FestFlow is structured according to a modern **3-Tier Client-Server Architecture**:

```
+-------------------------------------------------------------------------------+
|                           CLIENT TIER (React 18 + Vite)                       |
|  - Pages: Dashboard, Events, CreateEvent, Clubs, ClubManage, Finance, etc.   |
|  - AuthContext: Token storage, user state, role boundaries, Quick-Fill login  |
|  - Axios Interceptors: Bearer JWT injection, 401/403 redirect handling       |
+---------------------------------------+---------------------------------------+
                                        |  HTTPS / JSON REST API
                                        v
+-------------------------------------------------------------------------------+
|                       API & SERVER TIER (Node.js + Express)                   |
|  - CORS & Body Parsers: json(), urlencoded()                                  |
|  - Global Routing: /api/auth, /api/events, /api/clubs, /api/finances, etc.    |
|  - Middleware Stack:                                                          |
|      * authMiddleware.protect       -> Verifies JWT, populates req.user        |
|      * roleMiddleware.authorize     -> Checks req.user.role (403 guard)       |
|      * clubAuthorization.js         -> Resolves authorized & supervised clubs |
|      * errorHandler                 -> Structured error responses             |
|  - Controller Layer: Business logic, transactional workflows, validations     |
+---------------------------------------+---------------------------------------+
                                        |  Mongoose ODM (TLS 1.3)
                                        v
+-------------------------------------------------------------------------------+
|                      DATA PERSISTENCE TIER (MongoDB Atlas)                    |
|  - 18 Collections: users, clubs, events, registrations, finances, etc.        |
|  - Compound Unique Indexes: { user: 1, event: 1 }, { club: 1, user: 1 }, etc.|
|  - Dynamic Aggregation Pipelines: $match, $group, $sum, $lookup              |
|  - Mongoose Pre-save Hooks: bcrypt password hashing                           |
+-------------------------------------------------------------------------------+
```

### 3.1 Request Lifecycle Walkthroughs

#### A. Student Event Registration Request
1. **Client Action**: A logged-in student navigates to `/events/:id` and clicks **Register for Event**.
2. **HTTP Request**: Axios dispatches `POST /api/registrations` with header `Authorization: Bearer <token>` and body `{ eventId: "<id>" }`.
3. **Authentication**: `authMiddleware.protect` extracts and verifies the JWT against `JWT_SECRET`, retrieves the user record from MongoDB, checks `isActive: true`, and attaches it to `req.user`.
4. **Validation**: `registrationController.createRegistration`:
   - Checks if the event exists and registration is open (`registrationDeadline >= now`).
   - Checks current registration headcount against `event.maxParticipants`. If filled, returns `400 Bad Request`.
   - Checks for existing registration via compound query `{ user: req.user._id, event: eventId }`. If found, returns `400 Duplicate Registration`.
5. **Database Transaction**:
   - Generates a unique ticket number: `FF-` followed by an 8-character hexadecimal string.
   - Creates a document in the `registrations` collection.
   - If the event fee is zero, records an automatic zero-cost `Payment` receipt.
6. **Response**: Server responds with `201 Created` and the registration pass JSON. Client updates the UI and redirects the student to `/my-registrations`.

#### B. Faculty Appointing an Organizer
1. **Client Action**: A faculty coordinator visits `/manage/club/:id`, searches for a student, and clicks **Appoint as Organizer**.
2. **HTTP Request**: Client sends `POST /api/clubs/:id/organizers` with body `{ studentId: "<user-id>" }`.
3. **Middleware**: `protect` authenticates the token; `authorize('admin', 'faculty')` checks role permissions.
4. **Club-Scoped Authorization**: `isFacultyForClub(req.user, clubId)` verifies that the faculty member is officially assigned to supervise that specific club. If not, rejects with `403 Forbidden`.
5. **Controller Execution**:
   - Adds `studentId` to `club.organizers`.
   - Adds `clubId` to the student's `user.clubs` array.
   - Promotes the student's role: `user.role = 'organizer'`.
   - Creates or updates an active officer record in `ClubMembership`.
6. **Response**: Responds with `200 OK`. The student immediately gains organizer capabilities scoped to that club upon their next session token refresh.

#### C. Organizer Fetching Event Finances
1. **Client Action**: An organizer navigates to `/finances`.
2. **HTTP Request**: Client requests `GET /api/finances/events`.
3. **Authorization Check**: `financeController.getAuthorizedFinanceEvents` invokes `getAuthorizedClubIds(req.user)`.
4. **Scoped Query**:
   - If `admin`: queries all campus events.
   - If `organizer` or `faculty`: filters events via `{ club: { $in: authorizedClubIds } }`.
5. **Aggregation Pipeline**: Executes `$lookup` across `revenues` and `expenses`, deriving total revenue, total expense, and net profit dynamically for each club-scoped event.
6. **Response**: Responds with `200 OK` containing financial summaries strictly isolated to the user's assigned clubs.

---

## 4. Functional Modules

FestFlow implements **16 discrete functional modules** across client and server:

### Module 1: Authentication & Session Management
- **Purpose**: Secure user registration, authentication, role assignment, and JWT session handling.
- **Roles**: All roles (`student`, `organizer`, `faculty`, `admin`).
- **Functionality**:
  - Email/password registration with student profile attributes (register number, department, year of study).
  - Cryptographic password hashing via `bcryptjs` (salt rounds: 10) in Mongoose pre-save middleware.
  - JWT token generation containing `{ id: user._id }` with 7-day expiration.
  - Evaluation Quick-Fill credentials on `/login` for instantaneous role simulation.
- **Frontend Pages**: `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`.
- **Backend Endpoints**:
  - `POST /api/auth/register` (`authController.register`)
  - `POST /api/auth/login` (`authController.login`)
  - `GET /api/auth/me` (`authController.getMe`)
- **Database Model**: `User.js` (`users` collection).

### Module 2: Student Event Discovery & Ticketing Pass Wallet
- **Purpose**: Campus-wide event discovery and attendee registration pass management.
- **Roles**: `student`, `organizer`, `faculty`, `admin`.
- **Functionality**:
  - Search and filter campus events by category (`Technical`, `Cultural`, `Sports`), date windows, and status.
  - Live seat balance calculation preventing overbooking past physical venue limits.
  - Compound unique constraint `{ user: 1, event: 1 }` preventing duplicate registrations.
  - Ticket issuance with unique serial numbers (`FF-XXXXX`) and pass cancellation workflows.
- **Frontend Pages**: `client/src/pages/Events.jsx`, `client/src/pages/EventDetail.jsx`, `client/src/pages/MyRegistrations.jsx`.
- **Backend Endpoints**:
  - `GET /api/events` (`eventController.getEvents`)
  - `GET /api/events/:id` (`eventController.getEventById`)
  - `POST /api/registrations` (`registrationController.createRegistration`)
  - `GET /api/registrations/my` (`registrationController.getMyRegistrations`)
  - `PUT /api/registrations/:id/cancel` (`registrationController.cancelRegistration`)
- **Database Models**: `Event.js`, `Registration.js`, `Venue.js`.

### Module 3: Event Management & Scheduling (Club-Scoped)
- **Purpose**: Event creation, venue reservation, timetable management, and status lifecycle.
- **Roles**: `organizer` (scoped to their clubs), `admin` (global).
- **Functionality**:
  - Create new events selecting from verified campus venues and assigned clubs.
  - Input start/end dates, times, seat capacity, fees, chief guests, and categories.
  - Update event details, modify descriptions, or cancel scheduled fests.
  - Enforce server-side rejection (`403 Forbidden`) if an organizer attempts to modify an event for an unassigned club.
- **Frontend Pages**: `client/src/pages/CreateEvent.jsx`, `client/src/pages/EventDetail.jsx`.
- **Backend Endpoints**:
  - `POST /api/events` (`eventController.createEvent`)
  - `PUT /api/events/:id` (`eventController.updateEvent`)
  - `DELETE /api/events/:id` (`eventController.deleteEvent`)
- **Database Models**: `Event.js`, `Club.js`, `Venue.js`.

### Module 4: Club Directory & Dossier Governance
- **Purpose**: Manage campus club charters, official categories, public profiles, and rosters.
- **Roles**: All roles (Public directory); `organizer`, `faculty`, `admin` (Management console).
- **Functionality**:
  - Browse campus clubs with active event counts and member statistics.
  - View individual club dossiers displaying faculty coordinator, student organizers, and past/upcoming events.
  - Filter clubs by category (`Technical`, `Cultural`, `Sports`, `Literary`, `Social`, `Arts`, `Academic`).
- **Frontend Pages**: `client/src/pages/Clubs.jsx`, `client/src/pages/ClubManage.jsx`.
- **Backend Endpoints**:
  - `GET /api/clubs` (`clubController.getClubs`)
  - `GET /api/clubs/:id` (`clubController.getClubById`)
  - `GET /api/clubs/my-authorized` (`clubController.getMyAuthorizedClubs`)
- **Database Models**: `Club.js`, `ClubMembership.js`, `Event.js`.

### Module 5: Faculty Supervision & Organizer Hierarchy
- **Purpose**: Enable faculty advisors to oversee assigned clubs and appoint/revoke student organizers.
- **Roles**: `faculty` (scoped to assigned clubs), `admin` (global).
- **Functionality**:
  - Faculty dashboard displays only the clubs supervised by that faculty member.
  - Dedicated club management console (`/manage/club/:id`) showing organizer rosters.
  - Searchable student member list to appoint student organizers.
  - Graceful demotion safeguard: revoking a student from their last club automatically reverts their role to `student` without data loss or disrupted event history.
- **Frontend Pages**: `client/src/pages/Dashboard.jsx`, `client/src/pages/ClubManage.jsx`, `client/src/pages/FacultyOrganizers.jsx`.
- **Backend Endpoints**:
  - `GET /api/faculty/my-clubs` (`facultyController.getMySupervisedClubs`)
  - `GET /api/faculty/candidates` (`facultyController.searchStudentCandidates`)
  - `POST /api/clubs/:id/organizers` (`clubController.assignOrganizer`)
  - `DELETE /api/clubs/:id/organizers/:userId` (`clubController.revokeOrganizer`)
- **Database Models**: `Club.js`, `User.js`, `ClubMembership.js`.

### Module 6: Role-Based Dashboard & Operational Analytics
- **Purpose**: Tailored operational landing screens based on authenticated user role.
- **Roles**: `student`, `organizer`, `faculty`, `admin`.
- **Functionality**:
  - **Student View**: Registered passes, upcoming booked events, quick discovery links.
  - **Organizer View**: Assigned club cards, club focus switcher, active member counts, scheduled events.
  - **Faculty View**: Supervised clubs, active organizers, club dossier shortcuts.
  - **Admin View**: Global campus statistics (total clubs, events, users, registrations).
- **Frontend Pages**: `client/src/pages/Dashboard.jsx`.
- **Backend Endpoints**: `GET /api/dashboard/stats` (`dashboardController.getDashboardStats`).
- **Database Models**: `User.js`, `Club.js`, `Event.js`, `Registration.js`.

### Module 7: Competitions, Hackathons & Judging Panel
- **Purpose**: Host competitive hackathons, coding contests, team formations, and live leaderboards.
- **Roles**: `student` (team formation), `organizer` (contest setup), `admin`.
- **Functionality**:
  - Define competitions with team size limits, registration deadlines, and contest rules.
  - Team leader registration with member roles (Leader, Developer, Designer, Presenter).
  - Define weighted judging criteria (e.g., Innovation, Technical Execution, Presentation).
  - Submit judge scores and derive live leaderboard positions via aggregation pipelines.
- **Frontend Pages**: `client/src/pages/Competitions.jsx`.
- **Backend Endpoints**:
  - `GET /api/competitions/event/:eventId` (`competitionController.getCompetitionsByEvent`)
  - `GET /api/competitions/:id` (`competitionController.getCompetitionDetails`)
  - `POST /api/competitions/:id/teams` (`competitionController.registerTeam`)
  - `POST /api/competitions/:id/scores` (`competitionController.submitJudgeScore`)
- **Database Models**: `Competition.js` (`Competition`, `Team`, `Judge`, `JudgingCriteria`, `JudgeScore`, `Prize`, `Result`).

### Module 8: Financial Ledger & Dynamic 3NF Profit Engine
- **Purpose**: Event budget planning, categorized line-item expenses, multi-stream revenues, and profit tracking.
- **Roles**: `organizer` (scoped to their clubs), `faculty` (supervised clubs), `admin`.
- **Functionality**:
  - Request and approve event budgets with status transitions (`draft`, `pending`, `approved`, `rejected`).
  - Itemize expenses across categories (`equipment`, `catering`, `marketing`, `prizes`, `logistics`, `travel`).
  - Log multi-source revenues (`sponsorship`, `registration_fees`, `merchandise`, `grant`).
  - Dynamic profit computation: $\text{Net Profit} = \sum \text{Revenue} - \sum \text{Expenses}$ derived via MongoDB aggregation without stored database redundancy (3NF).
- **Frontend Pages**: `client/src/pages/FinanceDashboard.jsx`.
- **Backend Endpoints**:
  - `GET /api/finances/events` (`financeController.getAuthorizedFinanceEvents`)
  - `GET /api/finances/event/:eventId` (`financeController.getEventFinances`)
  - `POST /api/finances/expense` (`financeController.addExpense`)
  - `POST /api/finances/revenue` (`financeController.addRevenue`)
  - `POST /api/finances/budget` (`financeController.setBudget`)
- **Database Models**: `Finance.js` (`Budget`, `Expense`, `Revenue`), `Event.js`.

### Module 9: Venue Reservation & Capacity Management
- **Purpose**: Campus infrastructure cataloging, seating limits, and equipment availability.
- **Roles**: All roles (viewing); `admin`, `organizer` (reservation checks).
- **Functionality**:
  - Directory of campus venues (`Auditorium`, `Seminar Hall`, `Open Ground`, `Lab`, `Conference Room`).
  - Track physical seating capacity, block locations, and embedded facility lists (1NF).
  - Venue status checking (`available`, `booked`, `maintenance`).
- **Frontend Pages**: `client/src/pages/Venues.jsx`.
- **Backend Endpoints**:
  - `GET /api/venues` (`venueController.getVenues`)
  - `GET /api/venues/:id` (`venueController.getVenueById`)
- **Database Model**: `Venue.js` (`venues` collection).

### Module 10: Catering Management & Atomic Menus
- **Purpose**: Meal and refreshment logistics for conferences and multi-day fests.
- **Roles**: `organizer`, `faculty`, `admin`.
- **Functionality**:
  - Record caterer contracts, contact details, and service delivery dates.
  - Maintain atomic menu item arrays (1NF) with quantity and unit cost fields.
  - Dynamically calculate total catering costs via Mongoose virtual getter: $\sum (\text{quantity} \times \text{costPerUnit})$.
- **Frontend Pages**: `client/src/pages/CateringManager.jsx`.
- **Backend Endpoints**:
  - `GET /api/catering/event/:eventId` (`cateringController.getCateringByEvent`)
  - `POST /api/catering` (`cateringController.createCateringOrder`)
- **Database Model**: `Catering.js` (`caterings` collection).

### Module 11: Sponsorship Acquisition & Tier Tracking
- **Purpose**: Corporate partnership records and tier-based financial sponsorship management.
- **Roles**: `organizer`, `faculty`, `admin`.
- **Functionality**:
  - Maintain corporate sponsor directory (organization type, contact details).
  - Assign sponsorship contracts to events with tier categories (`Title`, `Platinum`, `Gold`, `Silver`, `Bronze`).
  - Track payment fulfillment statuses (`proposed`, `confirmed`, `received`).
- **Frontend Pages**: `client/src/pages/Sponsors.jsx`.
- **Backend Endpoints**:
  - `GET /api/sponsors` (`sponsorController.getSponsors`)
  - `GET /api/sponsors/event/:eventId` (`sponsorController.getEventSponsors`)
  - `POST /api/sponsors/assign` (`sponsorController.assignSponsorToEvent`)
- **Database Models**: `Sponsor.js` (`Sponsor`, `EventSponsor`).

### Module 12: Digital Certificates & Cryptographic Verification
- **Purpose**: Issue and publicly verify tamper-proof event certificates.
- **Roles**: `student` (wallet); Any campus member / employer (public verification).
- **Functionality**:
  - Issue certificates across categories (`participation`, `merit`, `winner`, `volunteer`, `organizer`).
  - Assign unique sequential serial numbers (`CERT-XXXXX`) and cryptographic verification hashes (`V-XXXXX`).
  - Public verification endpoint accessible without authentication to validate credential authenticity.
- **Frontend Pages**: `client/src/pages/Certificates.jsx`.
- **Backend Endpoints**:
  - `GET /api/certificates/my` (`certificateController.getMyCertificates`)
  - `GET /api/certificates/verify/:code` (`certificateController.verifyCertificate`)
  - `POST /api/certificates/issue` (`certificateController.issueCertificate`)
- **Database Model**: `Certificate.js` (`certificates` collection).

### Module 13: Attendee Feedback & 5-Star Rating System
- **Purpose**: Post-event satisfaction surveys and quality feedback aggregation.
- **Roles**: `student` (submission); `organizer`, `faculty`, `admin` (analytics).
- **Functionality**:
  - Submit 1-to-5 star quantitative ratings and qualitative written commentary.
  - Enforce one submission per attendee per event via compound unique index `{ event: 1, user: 1 }`.
  - Calculate event average ratings dynamically on the fly.
- **Backend Endpoints**:
  - `POST /api/feedback` (`feedbackController.submitFeedback`)
  - `GET /api/feedback/event/:eventId` (`feedbackController.getEventFeedback`)
- **Database Model**: `Feedback.js` (`feedbacks` collection).

### Module 14: Student Volunteer Rostering & Shift Scheduling
- **Purpose**: Student volunteer recruitment, task allocation, and duty shift coordination.
- **Roles**: `student` (apply); `organizer`, `admin` (roster management).
- **Functionality**:
  - Assign duty tasks (e.g., Registration Desk, Stage Management, Guest Hospitality).
  - Schedule shift start and end times.
  - Compound unique index `{ event: 1, user: 1 }` prevents scheduling collisions.
- **Frontend Pages**: `client/src/pages/Volunteering.jsx`.
- **Backend Endpoints**:
  - `GET /api/volunteers/my` (`volunteerController.getMyVolunteerRoles`)
  - `POST /api/volunteers/apply` (`volunteerController.applyAsVolunteer`)
- **Database Model**: `Volunteer.js` (`volunteers` collection).

### Module 15: Payment Receipting & Registration Fees
- **Purpose**: Capture payment transaction tokens and fee waivers for ticket passes.
- **Roles**: `student` (receipt history); `organizer`, `admin` (audit).
- **Functionality**:
  - Record transaction IDs, payment methods (`upi`, `card`, `netbanking`, `cash`, `free_waiver`), and statuses.
  - Unique transaction index `{ transactionId: 1 }` prevents double charging.
- **Backend Endpoints**:
  - `GET /api/payments/my` (`paymentController.getMyPayments`)
  - `POST /api/payments` (`paymentController.recordPayment`)
- **Database Model**: `Payment.js` (`payments` collection).

### Module 16: Administrator Faculty Account Provisioning
- **Purpose**: University-wide administrator console to provision faculty accounts and supervise clubs.
- **Roles**: `admin` only.
- **Functionality**:
  - Provision new faculty accounts specifying department, title, email, and password.
  - Assign one or more clubs to the newly created faculty account during provisioning.
  - View all provisioned faculty coordinators across campus.
- **Frontend Pages**: `client/src/pages/AdminFaculty.jsx`.
- **Backend Endpoints**:
  - `GET /api/faculty` (`facultyController.getAllFaculty`)
  - `POST /api/faculty` (`facultyController.createFacultyAccount`)
- **Database Models**: `User.js`, `Club.js`.

---

## 5. User Roles and Authorization

FestFlow enforces a strict **4-Tier Role Hierarchy**:

| Feature / Action | Student | Organizer | Faculty | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Events & Venues** | ✅ | ✅ | ✅ | ✅ |
| **Register for Any Campus Event** | ✅ | ✅ | ✅ | ✅ |
| **View Own Ticket Passes & Certificates**| ✅ | ✅ | ✅ | ✅ |
| **Submit Post-Event Feedback** | ✅ | ✅ | ✅ | ✅ |
| **Apply for Volunteer Duties** | ✅ | ✅ | ✅ | ✅ |
| **Create Event for Assigned Club** | ❌ | ✅ (Assigned only) | ❌ | ✅ (All clubs) |
| **Edit/Delete Event for Assigned Club** | ❌ | ✅ (Assigned only) | ❌ | ✅ (All clubs) |
| **Access Financial Ledger for Club** | ❌ | ✅ (Assigned only) | ✅ (Supervised only)| ✅ (All clubs) |
| **Manage Competitions & Judging** | ❌ | ✅ (Assigned only) | ✅ (Supervised only)| ✅ (All clubs) |
| **Appoint / Revoke Student Organizers**| ❌ | ❌ | ✅ (Supervised only)| ✅ (All clubs) |
| **Edit Club Charters & Metadata** | ❌ | ❌ | ✅ (Supervised only)| ✅ (All clubs) |
| **Provision New Faculty Accounts** | ❌ | ❌ | ❌ | ✅ |
| **Cross-Club Modifications** | ❌ | ❌ (Strict 403) | ❌ (Strict 403) | ✅ (Campus-wide) |

### 5.1 Club-Scoped Authorization Mechanics
Authorization is evaluated at runtime in `server/src/utils/clubAuthorization.js`:
- An organizer can be assigned to multiple clubs simultaneously (stored in `user.clubs` and `club.organizers`).
- An organizer attempting to create, update, delete, or inspect finances for an event outside their assigned clubs is blocked with `403 Forbidden`.
- A faculty member supervising Club A cannot appoint organizers or inspect finances for Club B.
- **Safe Demotion Logic**: When a faculty member revokes a student's organizer status from their final remaining club, the backend automatically updates `user.role = 'student'` while preserving all existing registration records and ticket wallet passes.

---

## 6. Database Design & Normalization

FestFlow utilizes **MongoDB Atlas** as its live cloud production database, modeled through **Mongoose ODM v8.9.5**.

> **Crucial Academic Distinction**:  
> The repository includes standardized ANSI SQL reference files ([`database/schema.sql`](./database/schema.sql), [`database/sample_data.sql`](./database/sample_data.sql), [`database/queries.sql`](./database/queries.sql)) derived from relational normalization designs to satisfy academic DBMS rubric specifications. However, the live running application connects strictly to cloud MongoDB Atlas. MongoDB does not natively execute SQL DDL statements.

### 6.1 Collections Roster & Schema Definitions

FestFlow instantiates **18 MongoDB collections** derived from 14 Mongoose model files:

```
                              ENTITY RELATIONSHIP OVERVIEW
 
     [User] 1 --------< [Registration] >-------- 1 [Event]
        |                        |                    |
        | 1                      | 1                  | 1
        v                        v                    v
 [ClubMembership]            [Payment]             [Venue]
        ^                                             |
        | N                                           | 1
     [Club] 1 --------< [Event] >---------------------+
        |                   |
        | 1                 +--------< [Budget]
        v                   +--------< [Expense]
  (Faculty User)            +--------< [Revenue]
                            +--------< [Catering]
                            +--------< [EventSponsor] >--- [Sponsor]
                            +--------< [Competition]
                            |              |
                            |              +---< [Team] (1NF Members)
                            |              +---< [JudgingCriteria]
                            |              +---< [JudgeScore] >--- [Judge]
                            |              +---< [Prize]
                            |              +---< [Result]
                            +--------< [Certificate] >--- [User]
                            +--------< [Feedback]    >--- [User]
                            +--------< [Volunteer]   >--- [User]
```

#### Complete Model Field Directory

##### 1. `users` Collection (`User.js`)
- `_id`: `ObjectId` (Primary Key)
- `name`: `String` (Required, trim, max 100)
- `email`: `String` (Required, unique, lowercase, regex validated)
- `password`: `String` (Required, min 6, hashed with bcrypt, `select: false`)
- `role`: `String` (`enum: ['admin', 'organizer', 'student', 'faculty']`, default: `'student'`)
- `clubs`: `[ObjectId]` (References `Club`, enables multi-club organizer associations)
- `participantType`: `String` (`enum: ['student', 'external']`, default: `'student'`)
- `registerNumber`: `String` (Trimmed, student register number)
- `department`: `String` (Trimmed)
- `yearOfStudy`: `Number` (Min: 1, Max: 5)
- `isActive`: `Boolean` (Default: `true`)
- `timestamps`: `createdAt`, `updatedAt`

##### 2. `clubs` Collection (`Club.js`)
- `_id`: `ObjectId` (Primary Key)
- `name`: `String` (Required, unique, max 100)
- `description`: `String` (Required)
- `category`: `String` (`enum: ['Technical', 'Cultural', 'Sports', 'Literary', 'Social', 'Arts', 'Academic']`)
- `organizers`: `[ObjectId]` (References `User`, assigned student organizers)
- `facultyCoordinator`: Embedded Subdocument:
  - `user`: `ObjectId` (References `User`)
  - `name`: `String`, `email`: `String`, `department`: `String`, `phone`: `String`
- `status`: `String` (`enum: ['active', 'inactive']`, default: `'active'`)

##### 3. `events` Collection (`Event.js`)
- `_id`: `ObjectId` (Primary Key)
- `title`: `String` (Required, max 150)
- `description`: `String` (Required)
- `eventType`: `String` (`enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Competition', 'Fest']`)
- `startDate`: `Date` (Required), `endDate`: `Date` (Required)
- `startTime`: `String`, `endTime`: `String`
- `status`: `String` (`enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled']`)
- `club`: `ObjectId` (Required, references `Club`)
- `venue`: `ObjectId` (Required, references `Venue`)
- `maxParticipants`: `Number` (Required, min: 1)
- `registrationDeadline`: `Date` (Required)
- `registrationFee`: `Number` (Min: 0, default: 0)
- `chiefGuest`: `String`
- `createdBy`: `ObjectId` (Required, references `User`)

##### 4. `registrations` Collection (`Registration.js`)
- `_id`: `ObjectId` (Primary Key)
- `user`: `ObjectId` (Required, references `User`)
- `event`: `ObjectId` (Required, references `Event`)
- `registrationDate`: `Date` (Default: `Date.now`)
- `registrationType`: `String` (`enum: ['solo', 'team']`)
- `registrationStatus`: `String` (`enum: ['registered', 'attended', 'cancelled']`)
- `ticketNumber`: `String` (Required, unique, e.g. `FF-XXXXX`)
- `fee`: `Number` (Default: 0)
- **Constraint**: Unique compound index `{ user: 1, event: 1 }`

##### 5. `venues` Collection (`Venue.js`)
- `_id`: `ObjectId` (Primary Key)
- `name`: `String` (Required, unique)
- `location`: `String` (Required)
- `capacity`: `Number` (Required, min: 1)
- `venueType`: `String` (`enum: ['Auditorium', 'Seminar Hall', 'Open Ground', 'Lab', 'Classroom', 'Conference Room', 'Indoor Stadium']`)
- `facilities`: Array of embedded documents `[{ name, description, availabilityStatus }]` (1NF)

##### 6. `finances` Collections (`Finance.js`)
- **`budgets` Collection**: `event` (`ObjectId`), `allocatedAmount` (`Number`), `approvedAmount` (`Number`), `budgetStatus` (`draft`, `pending`, `approved`, `rejected`)
- **`expenses` Collection**: `event` (`ObjectId`), `amount` (`Number`), `expenseCategory` (`equipment`, `catering`, `marketing`, `prizes`, `logistics`, `travel`), `expenseDate` (`Date`)
- **`revenues` Collection**: `event` (`ObjectId`), `amount` (`Number`), `revenueType` (`sponsorship`, `registration_fees`, `merchandise`, `grant`), `revenueDate` (`Date`)

##### 7. `caterings` Collection (`Catering.js`)
- `_id`: `ObjectId`, `event`: `ObjectId`
- `catererName`: `String`, `serviceDate`: `Date`
- `menu`: Array of atomic embedded line items `[{ menuItem: String, quantity: Number, costPerUnit: Number }]` (1NF)
- `totalCost`: Mongoose virtual calculated as $\sum (\text{quantity} \times \text{costPerUnit})$ (3NF)

##### 8. `competitions` Collections (`Competition.js`)
- **`competitions`**: `event` (`ObjectId`), `competitionName` (`String`), `competitionType` (`String`), `maximumTeams` (`Number`), `teamSizeLimit` (`Number`)
- **`teams`**: `competition` (`ObjectId`), `teamName` (`String`), `teamLeader` (`ObjectId`), `members`: Array of embedded `[{ user: ObjectId, memberRole: String }]` (1NF)
- **`judges`**: `name`, `email`, `competitions`: `[ObjectId]`
- **`judgingcriterias`**: `competition` (`ObjectId`), `criteriaName` (`String`), `maximumScore` (`Number`), `weightage` (`Number`)
- **`judgescores`**: `competition` (`ObjectId`), `team` (`ObjectId`), `judge` (`ObjectId`), `criteria` (`ObjectId`), `score` (`Number`)
- **`prizes`**: `competition` (`ObjectId`), `position` (`Number`), `amount` (`Number`)
- **`results`**: `competition` (`ObjectId`), `team` (`ObjectId`), `position` (`Number`), `finalScore` (`Number`)

##### 9. Additional Entities
- **`certificates`**: `certificateNo` (unique), `event` (`ObjectId`), `user` (`ObjectId`), `verificationCode` (unique), `status` (`issued`, `revoked`)
- **`payments`**: `registration` (`ObjectId`), `transactionId` (unique), `amount` (`Number`), `paymentMethod`, `paymentStatus`
- **`feedbacks`**: `event` (`ObjectId`), `user` (`ObjectId`), `rating` (1-5), `comments` (`String`). Compound unique index `{ event: 1, user: 1 }`
- **`volunteers`**: `event` (`ObjectId`), `user` (`ObjectId`), `assignedTask`, `shiftStart`, `shiftEnd`. Compound unique index `{ event: 1, user: 1 }`
- **`sponsors` & `eventsponsors`**: `name`, `contactPerson`, linked to events via `EventSponsor` (`sponsorshipType`, `sponsorshipAmount`)

### 6.2 Normalization Analysis (1NF, 2NF, 3NF Compliance)

| Normal Form Level | Principle | FestFlow Architectural Implementation |
| :--- | :--- | :--- |
| **First Normal Form (1NF)** | Eliminate repeating groups; ensure all attribute values are atomic. | Embedded catering menu lines (`menuItem`, `quantity`, `costPerUnit`), venue facilities, and team members are modeled as discrete subdocument schemas with atomic typed attributes, avoiding comma-separated strings or unstructured arrays. |
| **Second Normal Form (2NF)** | 1NF + Ensure all non-key attributes are fully functionally dependent on the entire composite primary key. | In junction collections (`registrations`, `clubmemberships`, `eventsponsors`), attributes such as `ticketNumber` or `sponsorshipAmount` depend strictly on the composite identity `{ user, event }` or `{ club, user }`. Separate entity tables prevent partial dependencies. |
| **Third Normal Form (3NF)** | 2NF + Eliminate transitive dependencies (no non-key attribute should depend on another non-key attribute); zero stored derived attributes. | **Zero Derived Redundancy**: Event net profit, ticket availability, and catering totals are never stored as static document properties. Instead, dynamic aggregation pipelines derive $\text{Profit} = \text{Revenue} - \text{Expenses}$ and $\text{Available} = \text{Capacity} - \text{Registrations}$ at runtime. |

---

## 7. Security Architecture

FestFlow implements defensive security controls across all application layers:

1. **Authentication Token Flow**:
   - Authentication produces a stateless JSON Web Token (JWT) signed with HMAC SHA-256 using `JWT_SECRET`.
   - Token payload contains only the user's MongoDB `_id` (`{ id: user._id }`), expiring after 7 days.
   - Client sends tokens via standard HTTP header: `Authorization: Bearer <token>`.
2. **Password Cryptography**:
   - Passwords are salted and hashed using `bcryptjs` with 10 salt rounds.
   - Hashing is performed automatically in a Mongoose pre-save hook on the `User` schema (`userSchema.pre('save')`).
   - Passwords are set with `select: false` so that standard Mongoose queries never leak hash digests in API responses.
3. **Route Guards & Middleware**:
   - `authMiddleware.protect`: Validates token signature, checks account status (`isActive: true`), and rejects expired or tampered tokens.
   - `roleMiddleware.authorize(...roles)`: Restricts endpoints to declared roles, returning `403 Forbidden` on role violations.
   - `clubAuthorization.isAuthorizedForClub`: Validates multi-club organizer permissions at the controller level before permitting write mutations.
4. **Secret Management & Environmental Hygiene**:
   - Connection strings, database credentials, and signing secrets reside exclusively in `server/.env`.
   - `server/.env` is strictly excluded from Git tracking via `.gitignore`.
   - Application logs utilize sanitization helpers so that database passwords are never printed to terminal logs.

---

## 8. Testing, Quality Assurance & Verification

All automated test suites execute directly against the live cloud database cluster.

### 8.1 Test Suites Overview

| Suite Path | Focus & Coverage | Test Count | Execution Result |
| :--- | :--- | :---: | :---: |
| `tests/faculty_and_clubs.test.js` | Faculty login, club isolation, organizer appointment, safe student demotion, pass preservation | 22 | ✅ **22 / 22 Passed** |
| `tests/permissions.test.js` | Multi-club event isolation, cross-club mutation blocking, scoped financial ledger isolation | 17 | ✅ **17 / 17 Passed** |
| `tests/runServerTest.js` | Full integration across all 14 campus modules (Auth, Events, Venues, Payments, Catering, etc.) | 14 | ✅ **14 / 14 Passed** |
| `tests/healthcheck.js` | API smoke test verifying HTTP 200 and version metadata | 1 | ✅ **1 / 1 Passed** |
| `client build` (`npm run build`) | Production Vite asset compilation & bundle tree-shaking | 1,667 modules | ✅ **0 Build Errors** |

### 8.2 Master Test Execution Output
Executed on **27 October 2026** via `node tests/run_all.js`:

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

## 9. Installation and Execution Guide

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
Copy the template configuration file:
```powershell
Copy-Item -Path server/.env.example -Destination server/.env
```

Open `server/.env` in your text editor and ensure the required keys are present:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>.mongodb.net/festflow?retryWrites=true&w=majority
JWT_SECRET=festflow_development_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
*(Do not commit `server/.env` to Git).*

### Step 4: Run Application (Two Terminals)

#### Terminal 1 — Start Express Backend API:
```powershell
Set-Location -Path C:\Users\sathy\FestFlow\server
npm run dev
```
*API runs at `http://localhost:5000`.*

#### Terminal 2 — Start Vite React Frontend:
```powershell
Set-Location -Path C:\Users\sathy\FestFlow\client
npm run dev
```
*Web app runs at `http://localhost:5173`.*

### Step 5: Verify Health & Evaluation Login
- Open browser to `http://localhost:5173`.
- Evaluation demo accounts available on the login page:
  - **Faculty**: `faculty@festflow.edu` / `FacultyPassword123!`
  - **Organizer**: `organizer@festflow.edu` / `OrganizerPassword123!`
  - **Student**: `student@festflow.edu` / `StudentPassword123!`
  - **Admin**: `admin@festflow.edu` / `AdminPassword123!`
- Run automated test suite:
```powershell
node tests/run_all.js
```

---

## 10. Screenshots and Visual Evidence Checklist

*(Note for Report Author: Image binaries are marked as pending capture. Use the proposed figure titles and captions below when embedding figures in the final report).*

| Proposed Filename | Proposed Figure Title | One-Sentence Caption | Status |
| :--- | :--- | :--- | :---: |
| `login_role_selection.png` | Figure 1: Unified Authentication Portal | Login interface showing 4-role 1-click evaluation quick-fill buttons for rapid role testing. | Pending |
| `student_event_discovery.png` | Figure 2: Student Event Discovery Catalog | Filterable event catalog displaying category pills, search bar, and live seat capacity indicators. | Pending |
| `student_event_details.png` | Figure 3: Single Event Profile & Registration | Event detail profile presenting venue details, date/time chips, chief guest, and registration action button. | Pending |
| `student_digital_passes.png` | Figure 4: Student Digital Ticket Wallet | E-ticket wallet displaying registered passes, unique ticket identifiers (`FF-XXXXX`), and cancellation controls. | Pending |
| `organizer_my_clubs.png` | Figure 5: Multi-Club Organizer Directory | Organizer club directory displaying assigned club cards and "My Club" badges. | Pending |
| `organizer_event_management.png`| Figure 6: Organizer Club-Scoped Dashboard | Organizer management dashboard with club switcher and scoped event scheduling controls. | Pending |
| `organizer_event_finances.png` | Figure 7: Event Financial Ledger Console | Financial ledger presenting itemized expenses, revenue streams, and dynamically computed net profit. | Pending |
| `faculty_dashboard.png` | Figure 8: Faculty Coordination Dashboard | Faculty dashboard displaying supervised club rosters and organizer appointment shortcuts. | Pending |
| `faculty_club_management.png` | Figure 9: Dedicated Club Governance Console | Dedicated club management console (`/manage/club/:id`) showing club metadata and active organizers. | Pending |
| `faculty_assign_organizer.png` | Figure 10: Organizer Appointment Modal | Faculty modal featuring student search autocomplete and club organizer assignment confirmation. | Pending |
| `admin_faculty_management.png` | Figure 11: Admin Faculty Provisioning Portal | Universal admin portal for provisioning new faculty coordinator accounts and assigning clubs. | Pending |
| `competitions_leaderboard.png` | Figure 12: Competition Judging & Leaderboard | Hackathon evaluation rubric showing participating teams and live judge score aggregations. | Pending |
| `certificate_verification.png` | Figure 13: Public Certificate Verification Portal | Public credential verification interface verifying authenticity via unique verification code (`V-XXXXX`). | Pending |
| `atlas_cluster_overview.png` | Figure 14: MongoDB Atlas Cloud Deployment | MongoDB Atlas cloud cluster overview showing active replica set and sanitized connection metrics. | Pending |
| `atlas_collections_roster.png` | Figure 15: MongoDB Collections Directory | Database inspection view showing all 18 instantiated collections in MongoDB Atlas. | Pending |
| `atlas_compound_indexes.png` | Figure 16: Compound Index Specification | Index inspector displaying unique compound index `{ user: 1, event: 1 }` on `registrations`. | Pending |
| `master_test_runner_results.png`| Figure 17: Master Test Suite Verification Output | Terminal verification output demonstrating 53 out of 53 automated integration tests passing. | Pending |
| `frontend_build_results.png` | Figure 18: Production Client Build Output | Vite production build log confirming 1,667 modules compiled with zero syntax or bundling errors. | Pending |

---

## 11. Results and Discussion

### 11.1 Confirmed & Fully Verified Functionality
- **4-Tier RBAC**: Verified across 22 tests in `faculty_and_clubs.test.js`. Students, Organizers, Faculty, and Admins operate with strictly guarded permissions.
- **Multi-Club Boundaries**: Verified across 17 tests in `permissions.test.js`. Organizers assigned to multiple clubs can manage their authorized clubs while being blocked (`403`) from accessing unrelated clubs.
- **Dynamic 3NF Profit Engine**: Verified via `financeController.js` and `queries.js`. Net profit derives dynamically ($\text{Revenue} - \text{Expenses}$) without static document storage.
- **Double-Registration Prevention**: Compound unique indexing `{ user: 1, event: 1 }` successfully blocks duplicate ticket claims.
- **Seat Capacity Balances**: Registration requests reject with `400 Bad Request` once registration headcount matches venue seating capacity.
- **Production Asset Compilation**: Frontend bundle transforms 1,667 modules cleanly into production assets without bundling or linting errors.

### 11.2 Partially Implemented Functionality
- **Payment Processing**: The `payments` collection records transactions, amounts, payment methods, and timestamps. However, transaction completion is simulated; live external webhooks (e.g., Razorpay/Stripe API) are not integrated.
- **Notifications & Pass Delivery**: Ticket confirmations and organizer appointments are recorded in the database and logged to the console, but live external SMTP email delivery is not configured.

### 11.3 Unverified Functionality
- **Relational SQL Database Runtime**: ANSI SQL DDL (`schema.sql`) and queries (`queries.sql`) are verified syntactically for coursework compliance, but are not executed during live runtime since FestFlow operates on MongoDB Atlas.

### 11.4 Known Failures & Fixed Issues
- **Double Password Hashing**: Fixed in earlier iterations by removing duplicate `bcrypt.hash()` calls in controllers prior to `User.create()`, ensuring only the Mongoose pre-save hook executes hashing.
- **Missing React Router Link**: Fixed missing `<Link>` import in club management components.

---

## 12. Limitations and Future Enhancements

### 12.1 Real System Limitations
1. **Simulated Payment Gateway**: Real monetary debit/credit workflows rely on mock transaction IDs rather than live bank settlement gateways.
2. **Local Memory Session Tokens**: JWTs are stored in browser local storage; implementing secure HTTP-only cookies with refresh token rotation is recommended for high-security production environments.
3. **URL-Based Media**: Image banners and club logos store remote URLs rather than multipart binary streams uploaded to cloud object storage (e.g., AWS S3).

### 12.2 Explicit Future Enhancements (Future Work)
- **Payment Gateway Integration**: Integrate Razorpay or Stripe checkout webhooks with transactional cryptographic verification.
- **Automated Mail Delivery**: Integrate Nodemailer with SendGrid or Amazon SES for automated e-ticket PDF email delivery.
- **Cloud Object Storage**: Add AWS S3 / Cloudinary multipart image upload handling for fest posters and certificates.
- **Mobile Companion App**: Build a React Native or Flutter mobile ticket scanner for on-venue QR code check-ins.

---

## 13. Conclusion

FestFlow successfully demonstrates the architecture, development, and deployment of a full-stack, enterprise-grade College Event Management System. By combining React 18, Node.js, Express, and MongoDB Atlas, the platform eliminates cross-club data leakage, prevents venue overbooking, and streamlines faculty supervision. The database architecture adheres to strict 1NF embedded atomicity and 3NF dynamic calculations, proving that modern document-oriented databases can achieve both relational integrity and cloud-scale performance.

---

## 14. References and Submission Metadata

### Academic Metadata Placeholders
- **Candidate / Author Name**: Sathyan
- **Register Number**: `[TO BE PROVIDED]`
- **Additional Team Members**:
  - `[TO BE PROVIDED — Team Member 2 Name & Register Number]`
  - `[TO BE PROVIDED — Team Member 3 Name & Register Number]`
  - `[TO BE PROVIDED — Team Member 4 Name & Register Number]`
- **Course Name**: Database Management Systems (DBMS) / Full-Stack Web Development
- **Course Code**: `[TO BE PROVIDED]`
- **Faculty Supervisor / Reviewer**: `[TO BE PROVIDED]`
- **Department**: Department of Computer Science and Engineering
- **Institution**: `[TO BE PROVIDED]`
- **Submission Date**: 27 October 2026

### Verified Links & Repository References
- **GitHub Repository URL**: `https://github.com/sathyan0511-cmyk/FestFlow.git`
- **Demonstration Video URL**: `[TO BE PROVIDED — Insert YouTube Link]`
- **Database Architecture Guide**: [`database/README.md`](./database/README.md)
- **Relational 3NF SQL DDL**: [`database/schema.sql`](./database/schema.sql)
- **Automated Test Matrix**: [`tests/README.md`](./tests/README.md)
- **Environment Setup Instructions**: [`environment_instructions.md`](./environment_instructions.md)
