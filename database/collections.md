# FestFlow MongoDB Collections Directory

This directory details all MongoDB collections instantiated by Mongoose in the MongoDB Atlas database cluster for FestFlow.

---

## Collections Overview Table

| Collection Name | Model Name | Primary Key / Indexing | Cardinality / Relationship | Purpose in FestFlow |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `User` | `_id`, `email (unique)` | 1-to-N with Registrations, Events | User identity, password credentials, roles, and profiles |
| **`clubs`** | `Club` | `_id`, `name (unique)` | 1-to-N with Events, Memberships | Chartered campus societies, technical & cultural clubs |
| **`clubmemberships`** | `ClubMembership` | `_id`, `{ club: 1, user: 1 } (unique)` | N-to-N junction (User ↔ Club) | Roster of club members, officers, and faculty advisors |
| **`venues`** | `Venue` | `_id`, `name (unique)` | 1-to-N with Events | Campus facilities, halls, auditoriums, and seat capacities |
| **`events`** | `Event` | `_id`, `club`, `venue`, `startDate` | 1-to-N with Registrations, Finances | Scheduled campus events, symposiums, hackathons |
| **`registrations`** | `Registration` | `_id`, `ticketNumber (unique)`, `{ user: 1, event: 1 } (unique)` | N-to-N junction (User ↔ Event) | Student event registration passes and attendance tracking |
| **`payments`** | `Payment` | `_id`, `transactionId (unique)` | 1-to-1 with Registration | Payment receipts, fees collection, and transaction audit |
| **`certificates`** | `Certificate` | `_id`, `certificateNo (unique)`, `verificationCode (unique)` | Many-to-1 with Event, User | Digital credentials with public verification hash |
| **`feedbacks`** | `Feedback` | `_id`, `{ event: 1, user: 1 } (unique)` | Many-to-1 with Event, User | Attendee 5-star ratings and post-event feedback |
| **`volunteers`** | `Volunteer` | `_id`, `{ event: 1, user: 1 } (unique)` | Many-to-1 with Event, User | Student volunteer shift allocations and task assignments |
| **`budgets`** | `Budget` | `_id`, `event` | Many-to-1 with Event | Allocated and approved event financial budgets |
| **`expenses`** | `Expense` | `_id`, `event`, `expenseCategory` | Many-to-1 with Event | Itemized expense ledger records (marketing, travel, prizes) |
| **`revenues`** | `Revenue` | `_id`, `event`, `revenueType` | Many-to-1 with Event | Revenue inflows (sponsorships, registrations, grants) |
| **`sponsors`** | `Sponsor` | `_id`, `name` | 1-to-N with EventSponsors | Corporate partner profiles and contact directory |
| **`eventsponsors`** | `EventSponsor` | `_id`, `event`, `sponsor` | N-to-N junction (Event ↔ Sponsor) | Sponsorship packages, tier levels, and committed funds |
| **`caterings`** | `Catering` | `_id`, `event` | 1-to-N with Event | Meal bookings and embedded atomic food menu rows |
| **`competitions`** | `Competition` | `_id`, `event` | Many-to-1 with Event | Hackathons, coding contests, and creative competitions |
| **`teams`** | `Team` | `_id`, `competition`, `teamLeader` | Many-to-1 with Competition | Team rosters, member roles, and project submissions |
| **`judges`** | `Judge` | `_id`, `email`, `competitions` | Many-to-Many with Competition | Evaluation panel of industry experts and professors |
| **`judgingcriterias`**| `JudgingCriteria`| `_id`, `competition` | Many-to-1 with Competition | Evaluation rubric (e.g. Innovation, Technical Depth) |
| **`judgescores`** | `JudgeScore` | `_id`, `competition`, `team`, `judge` | Many-to-1 with Team & Judge | Discrete criteria scores submitted by judges |
| **`prizes`** | `Prize` | `_id`, `competition`, `position` | Many-to-1 with Competition | Winner awards and cash prize allocations |
| **`results`** | `Result` | `_id`, `competition`, `team` | 1-to-1 with Podium Position | Official competition outcomes and announced rankings |

---

## Indexing Strategy & Performance Rules

### 1. Integrity Enforcement (Unique Indexes)
- `users`: `{ email: 1 }` prevents credential collisions.
- `registrations`: `{ user: 1, event: 1 }` prevents duplicate student bookings for the same event.
- `registrations`: `{ ticketNumber: 1 }` enforces fast, unique digital pass lookups.
- `certificates`: `{ certificateNo: 1 }` and `{ verificationCode: 1 }` guarantee tamper-proof credential verification.
- `payments`: `{ transactionId: 1 }` prevents double charging and duplicate webhook ingestion.
- `feedbacks`: `{ event: 1, user: 1 }` ensures single feedback submission per attendee.
- `volunteers`: `{ event: 1, user: 1 }` guarantees one active duty shift per volunteer per event.
- `clubmemberships`: `{ club: 1, user: 1 }` guarantees distinct membership records.

### 2. High-Frequency Query Paths
- **Event Filtering**: Compound index on `{ club: 1, startDate: 1 }` and `{ status: 1, startDate: 1 }` accelerates upcoming event Discovery and Organizer club dashboards.
- **Role Permissions**: `{ organizers: 1 }` on `clubs` enables instant $O(1)$ evaluation of whether a student has organizer authority over a targeted club.
- **Financial Aggregation**: Index on `{ event: 1 }` across `expenses` and `revenues` optimizes real-time pipeline computation for dynamic net profit calculations.
