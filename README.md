# FestFlow 🎓🎪
> Full-Stack College Event Management Platform

FestFlow is an end-to-end web application built for college event coordination, club management, venue scheduling, student registrations, competition scoring, financial ledger tracking, and sponsorship management. It features role-based access control (Admin, Club Organizer, Student), live seat capacity tracking, e-ticket generation, tamper-proof certificate verification, and MongoDB schema design aligned strictly with **3NF / BCNF normalization**.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite, Tailwind CSS, Lucide React, Axios, React Router v6
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas Cluster (Cloud) using Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing and role-based route guards
- **Platform**: Tested and verified on Windows 11 with Node.js v24 & npm v11

---

## 🗄️ Normalized Database Architecture (UNF → 1NF → 2NF → 3NF → BCNF)

All 30 entities from the authoritative Normalisation Design are fully modeled and mapped:

| Model / Entity | Schema Reference | 3NF / Normalization Rules & Attributes |
| :--- | :--- | :--- |
| **`User`** | `PARTICIPANT`, `STUDENT`, `EXTERNAL_PARTICIPANT` | Role-based (`admin`, `organizer`, `student`), bcrypt hashing, `registerNumber`, `department`, `programme`, `yearOfStudy`. |
| **`Club`** | `CLUB`, `FACULTY_COORDINATOR` | Club info, categories, organizer references, embedded faculty coordinator details. |
| **`ClubMembership`** | `CLUB_MEMBERSHIP` | Member type (`student`, `faculty`), membership status, role (`member`, `coordinator`, `lead`). |
| **`Venue`** | `VENUE`, `VENUE_FACILITY` | Location, seating capacity, venue type, and facilities array (`name`, `availabilityStatus`). |
| **`Event`** | `EVENT` | **Strict 3NF Compliance**: Derived values (`Total_Revenue`, `Total_Expenditure`, `Profit`) are **calculated dynamically**, not stored redundantly. |
| **`Registration`** | `REGISTRATION` | Compound index `{ user: 1, event: 1 }` prevents double registration. Enforces capacity and deadline on backend. Generates unique ticket number (`FF-XXXXX`). |
| **`Payment`** | `PAYMENT` | Links Registration and Event. Transaction IDs, payment methods (`upi`, `card`, `cash`), auto-syncs with Event Revenue. |
| **`Certificate`** | `CERTIFICATE` | Certificate number, type (`participation`, `merit`, `winner`, `volunteer`), public verification code (`V-XXXXX`), status. |
| **`Feedback`** | `FEEDBACK` | 1-to-5 star ratings, comments, dynamic average rating calculation. |
| **`Volunteer`** | `EVENT_VOLUNTEER` | Assigned task, shift start/end timings, status (`applied`, `assigned`, `completed`). |
| **`Budget`, `Expense`, `Revenue`** | `EVENT_BUDGET`, `EXPENSE`, `EVENT_REVENUE` | Dynamic profit derivation: `Profit = Total_Revenue - Total_Expenditure`. Zero stored derived redundancy. |
| **`Sponsor`, `EventSponsor`** | `SPONSOR`, `EVENT_SPONSOR` | Partner organizations, sponsorship tiers (`Title`, `Platinum`, `Gold`), funds tracking. |
| **`Catering`** | `CATERING`, `CATERING_MENU` | **1NF Compliance**: Atomic menu rows (`menuItem`, `quantity`, `costPerUnit`). Dynamic derived total cost (`quantity * costPerUnit`). |
| **`Competition`, `Team`, `Judge`, `Result`, `Prize`** | `COMPETITION`, `TEAM`, `TEAM_MEMBER`, `JUDGE`, `JUDGING_CRITERIA`, `JUDGE_SCORE`, `PRIZE`, `RESULT` | Complete hackathon/contest suite: team registrations, evaluation criteria, judges panel, scores, podium prizes, and announced winners. |

---

## 📁 Directory Structure

```
FestFlow/
├── client/                          # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/client.js            # Axios client with JWT interceptor
│   │   ├── components/              # Badges, StatCards, EventCards, Modal, Navbar, Sidebar
│   │   ├── context/AuthContext.jsx  # Auth state, login/register, role authorization
│   │   ├── layouts/                 # DashboardLayout, AuthLayout
│   │   ├── pages/                   # All UI modules:
│   │   │   ├── Dashboard.jsx        # Real-time metrics & upcoming events
│   │   │   ├── Events.jsx           # Filterable event catalog
│   │   │   ├── EventDetail.jsx      # Event profile with modular tabs
│   │   │   ├── CreateEvent.jsx      # Event creation form
│   │   │   ├── Competitions.jsx     # Contests, team registration, leaderboard & prizes
│   │   │   ├── FinanceDashboard.jsx # Budgets, expenses, revenues & profit calculator
│   │   │   ├── Sponsors.jsx         # Sponsor directory & event sponsorship packages
│   │   │   ├── CateringManager.jsx  # Catering orders & atomic menu items
│   │   │   ├── Certificates.jsx     # Student e-credentials & public code verifier
│   │   │   ├── Volunteering.jsx     # Shift applications & task management
│   │   │   ├── Clubs.jsx            # Campus clubs directory
│   │   │   ├── Venues.jsx           # Venue capacities & facilities
│   │   │   ├── MyRegistrations.jsx  # E-ticket wallet with cancellation
│   │   │   ├── Login.jsx            # 1-click test credential fill
│   │   │   └── Register.jsx         # User registration form
│   │   ├── App.jsx                  # Protected routes & role authorization
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                          # Node.js + Express + Mongoose Backend
│   ├── src/
│   │   ├── config/db.js             # Mongoose connection with host sanitization
│   │   ├── controllers/             # All 14 module controllers
│   │   ├── middleware/              # JWT auth guard, role guard, error handler
│   │   ├── models/                  # All normalized Mongoose schemas
│   │   ├── routes/                  # Modular REST API endpoints
│   │   ├── utils/seedData.js        # Core seed script
│   │   ├── utils/seedAdditionalModules.js # Advanced modules non-destructive seed
│   │   └── server.js                # Express app entry & route mounting
│   ├── tests/
│   │   └── runServerTest.js         # Comprehensive 14-module integration test runner
│   ├── .env                         # Environment variables (Protected)
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Exact Windows CMD Commands to Run FestFlow

Open two Command Prompt (`cmd.exe`) windows:

### Terminal 1 — Start the Backend Server:
```cmd
cd c:\Users\sathy\FestFlow\server
npm run dev
```
> Connected to **MongoDB Atlas Cluster**. Server listening on `http://localhost:5000`.

### Terminal 2 — Start the Frontend Application:
```cmd
cd c:\Users\sathy\FestFlow\client
npm run dev
```
> Vite dev server running on `http://localhost:5173`. Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Integration Tests

To verify all 14 modules against your MongoDB Atlas cluster:
```cmd
cd c:\Users\sathy\FestFlow\server
node tests/runServerTest.js
```

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Available Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@festflow.edu` | `AdminPassword123!` | Full control: events, clubs, venues, finances, sponsors, certificates, judging |
| **Club Organizer** | `organizer@festflow.edu` | `OrganizerPassword123!` | Create/edit events, competitions, budgets, catering, manage attendees |
| **Student** | `student@festflow.edu` | `StudentPassword123!` | Browse fests, register, team formation, wallet passes, certificates, volunteering |
