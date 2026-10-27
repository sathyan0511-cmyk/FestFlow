# FestFlow Environment Setup & Execution Guide

This document provides complete instructions for configuring, launching, and testing FestFlow across local development and evaluation environments.

---

## 1. System Prerequisites

- **Node.js**: Version `v18.0.0` or higher (Tested and verified on Node.js `v24.22.0`)
- **Package Manager**: npm `v9.0.0` or higher (Tested on npm `v11.4.2`)
- **Operating System**: Windows 10/11, macOS, or Linux
- **Cloud Database**: Active **MongoDB Atlas** Cluster (M0 Free or Dedicated Tier)

---

## 2. Environment Variables Configuration

FestFlow reads environment configuration from `server/.env` (which is excluded from Git tracking for security).

### Setting up `server/.env`:
A template file is provided at [`server/.env.example`](file:///c:/Users/sathy/FestFlow/server/.env.example). Create or verify your local `server/.env` with the following keys:

```ini
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection URI
# Replace <username>, <password>, and <cluster-url> with your credentials:
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>.mongodb.net/festflow?retryWrites=true&w=majority

# JWT Authentication Secrets
JWT_SECRET=festflow_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d

# Client Application URL
CLIENT_URL=http://localhost:5173
```

> **Security Note**: Never commit `server/.env` with real database passwords to version control.

---

## 3. Dependency Installation

Install all required client and server dependencies:

```bash
# Install root, backend, and frontend packages
npm install
npm install --prefix server
npm install --prefix client
```

---

## 4. Running the Application

Open two separate terminal windows:

### Terminal 1 — Start the Backend Server:
```bash
cd server
npm run dev
# Or start directly with Node:
# node src/server.js
```
*Backend API will run at `http://localhost:5000` connected to MongoDB Atlas.*

### Terminal 2 — Start the Frontend Development Client:
```bash
cd client
npm run dev
```
*Frontend web application will run at `http://localhost:5173`.*

---

## 5. Evaluation Credentials

The login page at `http://localhost:5173/login` includes **1-Click Quick-Fill** buttons for all four roles:

| Role | Quick-Fill Button | Email Address | Password | Mandate |
| :--- | :--- | :--- | :--- | :--- |
| **🏛️ Faculty** | `🏛️ Faculty` | `faculty@festflow.edu` | `FacultyPassword123!` | Supervises CodeNexus Developers Club |
| **💼 Organizer** | `💼 Organizer` | `organizer@festflow.edu` | `OrganizerPassword123!` | Manages CodeNexus Developers Club |
| **🎓 Student** | `🎓 Student` | `student@festflow.edu` | `StudentPassword123!` | Campus Participant & Registrant |
| **👑 Admin** | `👑 Admin` | `admin@festflow.edu` | `AdminPassword123!` | Universal Campus Administrator |

---

## 6. Running Automated Test Suites

FestFlow includes automated test suites that run directly against MongoDB Atlas:

```bash
# Run all test suites
node tests/run_all.js

# Or run individual test suites:
node tests/faculty_and_clubs.test.js     # 22 Tests: Faculty supervision & organizer hierarchy
node tests/permissions.test.js           # 17 Tests: Multi-club boundary & isolation
node tests/runServerTest.js              # 14 Tests: Comprehensive backend modules

# Verify frontend production build
npm run build --prefix client
```
