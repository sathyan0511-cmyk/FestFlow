# FestFlow Project Presentation & Demonstration Guide

This directory contains presentation slides and live demonstration documentation for the **FestFlow College Event Management Platform**.

> **Submission Artifact Location**:
> Once created/exported, place your presentation slide deck file (`.pptx` or `.pdf`, e.g. `FestFlow_Project_Presentation.pptx`) directly in this `presentation/` folder. The complete slide-by-slide content, speaker notes, and presentation walkthrough script are documented below.

---

## Demonstration Video

> **Official Project Walkthrough Video**:
> `[INSERT DEMONSTRATION VIDEO URL HERE]`
> *(Paste your YouTube, Google Drive, or Loom demonstration video link above before submission)*

---

## Slide-by-Slide Presentation Deck Outline

### Slide 1: Title Slide
- **Title**: FestFlow: Full-Stack College Event Management Platform
- **Subtitle**: Enterprise-Grade Event Lifecycle, Club Supervision & Normalized Ledger Architecture
- **Presented by**: Sathyan
- **Tech Stack**: React 18, Vite, Tailwind CSS, Node.js, Express, MongoDB Atlas

### Slide 2: Problem Statement & Motivation
- **Campus Challenges**:
  - Fragmented event schedules, double-booked campus venues, and venue capacity violations.
  - Lack of multi-club boundaries: student organizers inadvertently altering events of unrelated clubs.
  - Opaque financial management and paper-based credential verification.
- **Solution**: A unified, cloud-backed event orchestration platform with role-based security.

### Slide 3: Architectural Overview
- **3-Tier Modern Web Architecture**:
  - **Frontend**: Vite + React 18 SPA with responsive Tailwind CSS design system.
  - **API Layer**: Express.js with JWT authentication and custom club authorization middleware.
  - **Data Tier**: MongoDB Atlas distributed cloud database with Mongoose ODM.

### Slide 4: 4-Tier Role Hierarchy
- **Student**: Campus event discovery, digital ticket wallet, club dossiers, feedback submissions.
- **Organizer**: Scoped event creation, club-specific financial ledger tracking, attendance check-in.
- **Faculty Coordinator**: Club supervision, appointment & revocation of student organizers.
- **System Admin**: Universal campus override, faculty account provisioning, venue management.

### Slide 5: Multi-Club Boundary Security
- **Strict Server-Side Isolation**:
  - Promoting a student to organizer in *CodeNexus Club* grants zero authority over *Fine Arts Club*.
  - Direct REST API requests to create or edit events outside authorized clubs are rejected with `403 Forbidden`.
  - Financial records for unrelated clubs are excluded at the database query level.

### Slide 6: Database Normalization (3NF & BCNF)
- **Relational Integrity on Document Storage**:
  - Derived values (**Net Profit**, **Available Seats**, **Total Catering Cost**) are calculated dynamically at query time using aggregation pipelines.
  - Zero stored derived redundancy prevents ledger desynchronization.
  - Atomic subdocument arrays (1NF) for catering menus and venue facilities.

### Slide 7: Core Modules: Event Scheduling & Ticketing
- **Live Seat Availability Engine**:
  - Real-time seat tally guarantees events cannot exceed venue capacity.
  - Unique compound index `{ user: 1, event: 1 }` prevents double registrations.
  - Automated digital pass generation with unique verification hashes.

### Slide 8: Core Modules: Hackathon & Competition Suite
- **Comprehensive Contest Operations**:
  - Team registrations with designated team leaders and member roles.
  - Evaluation panel management with weighted judging criteria.
  - Real-time leaderboard aggregation summing judge scores.
  - Podium prize allocation and winner declarations.

### Slide 9: Core Modules: Financial Ledger & Sponsorships
- **Transparent University Event Accounting**:
  - Itemized expense tracking (Catering, Marketing, Travel, Logistics).
  - Revenue stream tracking (Ticket sales, Sponsorship grants, University grants).
  - Corporate sponsor directory with tiered sponsorship packages.

### Slide 10: Tamper-Proof E-Certificates & Feedback
- **Public Credential Verification**:
  - Unique verification codes (e.g. `V-FEST26-8812`) verifiable without logging in.
  - 5-star attendee rating and qualitative feedback aggregation.

### Slide 11: Automated Testing & Verification
- **100% Automated Test Pass Rate**:
  - `tests/faculty_and_clubs.test.js`: 22 / 22 Passed.
  - `tests/permissions.test.js`: 17 / 17 Passed.
  - `tests/runServerTest.js`: 14 / 14 Modules Passed.
  - Frontend production build: Built cleanly in 5.35s with 0 errors.

### Slide 12: Live Demonstration
- **Demonstration Walkthrough Flow**:
  1. Login as Student → Explore events, register for HackFest, view digital ticket pass.
  2. Login as Faculty → View supervised club dossier, search student member, appoint as Organizer.
  3. Login as Organizer → Access My Clubs console, schedule new event, inspect financial ledger.
  4. Verify tamper-proof certificate code on public portal.

### Slide 13: Summary & Key Takeaways
- Clean, robust separation of concerns between campus roles.
- Cloud database resilience with MongoDB Atlas.
- Fully production-ready, accessible, and tested.

---

## Live Evaluation Credentials

| Role | Email | Password | Scope / Mandate |
| :--- | :--- | :--- | :--- |
| **🏛️ Faculty** | `faculty@festflow.edu` | `FacultyPassword123!` | Supervises CodeNexus Developers Club |
| **💼 Organizer** | `organizer@festflow.edu` | `OrganizerPassword123!` | Manages CodeNexus Developers Club |
| **🎓 Student** | `student@festflow.edu` | `StudentPassword123!` | Campus Participant / Registrant |
| **👑 Admin** | `admin@festflow.edu` | `AdminPassword123!` | Universal Campus Administrator |
