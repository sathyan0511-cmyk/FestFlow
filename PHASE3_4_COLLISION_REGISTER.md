# FestFlow Phase 3.4 — Unique-Key Collision Register

**Document Version:** 1.0.0  
**Status:** DRAFT FOR HUMAN REVIEW & APPROVAL  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  

---

## 1. Overview of Unique-Key Collisions

The pre-sync dry run identified **14 unique-key collisions** between Local MongoDB (`festflow`) and MongoDB Atlas (`test`).  
These 14 collisions represent **13 distinct domain documents** across 5 collections:
- `users`: 4 collisions (email uniqueness)
- `venues`: 4 collisions (venue name uniqueness)
- `clubs`: 3 collisions (club name uniqueness)
- `certificates`: 2 unique index collisions on 1 document (`certificateNo` and `verificationCode`)
- `payments`: 1 collision (`transactionId` uniqueness)

All 14 collisions stem from the fact that identical seed fixtures were executed independently on Local MongoDB and MongoDB Atlas, generating divergent BSON ObjectIds for identical logical entities.

---

## 2. Collision Summary Matrix

| # | Collection | Unique Constraint Field | Value | Local `_id` | Atlas Canonical `_id` | Local Inbound Refs | Atlas Inbound Refs | Resolution Strategy |
| :- | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :--- |
| **1** | `certificates` | `certificateNo` | `CERT-2026-FEST-001` | `6ae7011740e5a2d1e84d5bb3` | `6ad4ac57c652f091549f64fa` | 0 | 0 | Remap local `_id` to Atlas canonical `_id` |
| **2** | `certificates` | `verificationCode` | `V-FEST26-8812` | `6ae7011740e5a2d1e84d5bb3` | `6ad4ac57c652f091549f64fa` | 0 | 0 | Remap local `_id` to Atlas canonical `_id` (Same Doc) |
| **3** | `clubs` | `name` | `CodeNexus Developers Club` | `6ae70116a2ab160fb98025db` | `6ad4a6126da4de724485d38e` | 3 (1 membership, 2 events) | 3 (2 memberships, 1 event) | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **4** | `clubs` | `name` | `Dhwani Cultural & Music Society` | `6ae70116a2ab160fb98025dc` | `6ad4a6126da4de724485d38f` | 1 (1 event) | 0 | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **5** | `clubs` | `name` | `RoboTech Innovation Club` | `6ae70116a2ab160fb98025dd` | `6ad4a6126da4de724485d390` | 0 | 0 | Remap local `_id` to Atlas canonical `_id` |
| **6** | `payments` | `transactionId` | `TXN-INIT-2026-UPI99` | `6ae7011740e5a2d1e84d5bb0` | `6ad4ac57c652f091549f64f7` | 0 | 0 | Remap local `_id` to Atlas canonical `_id` |
| **7** | `users` | `email` | `admin@festflow.edu` | `6ae70115a2ab160fb98025bf` | `6ad4a6116da4de724485d374` | 0 | 2 (1 event createdBy, 1 event organizer) | Remap local `_id` to Atlas canonical `_id` |
| **8** | `users` | `email` | `organizer@festflow.edu` | `6ae70115a2ab160fb98025c1` | `6ad4a6116da4de724485d376` | 10 (3 clubs, 1 team, 3 event organizers, 3 event createdBy) | 6 (3 clubs, 3 teams) | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **9** | `users` | `email` | `student@festflow.edu` | `6ae70115a2ab160fb98025c3` | `6ad4a6116da4de724485d378` | 8 (1 cert, 1 membership, 2 team refs, 1 feedback, 1 payment, 1 reg, 1 volunteer) | 9 (1 cert, 1 membership, 2 team refs, 1 feedback, 2 payments, 1 reg, 1 volunteer) | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **10**| `users` | `email` | `faculty@festflow.edu` | `6ae70115a2ab160fb98025c5` | `6ada6791bee088392214dfee` | 0 | 2 (1 club coordinator, 1 membership) | Remap local `_id` to Atlas canonical `_id` |
| **11**| `venues` | `name` | `Dr. APJ Abdul Kalam Auditorium` | `6ae70116a2ab160fb98025c7` | `6ad4a6116da4de724485d37a` | 0 | 0 | Remap local `_id` to Atlas canonical `_id` |
| **12**| `venues` | `name` | `Open Air Amphitheatre` | `6ae70116a2ab160fb98025d0` | `6ad4a6116da4de724485d383` | 1 (1 event) | 1 (1 event) | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **13**| `venues` | `name` | `Alan Turing Advanced Computing Lab`| `6ae70116a2ab160fb98025cc` | `6ad4a6116da4de724485d37f` | 1 (1 event) | 0 | Remap local `_id` to Atlas canonical `_id` & cascade refs |
| **14**| `venues` | `name` | `Aryabhata Seminar Hall` | `6ae70116a2ab160fb98025d4` | `6ad4a6116da4de724485d387` | 1 (1 event) | 0 | Remap local `_id` to Atlas canonical `_id` & cascade refs |

---

## 3. Record-Level Detailed Collision Profiles

### Collision #1 & #2: `certificates`
- **Field & Value:** `certificateNo: "CERT-2026-FEST-001"`, `verificationCode: "V-FEST26-8812"`
- **Local `_id`:** `6ae7011740e5a2d1e84d5bb3`
- **Atlas `_id`:** `6ad4ac57c652f091549f64fa`
- **Field Divergence:**
  - `_id`: Differs.
  - `user`: Local references local student `6ae70115a2ab160fb98025c3`; Atlas references Atlas student `6ad4a6116da4de724485d378`.
  - `event`: Local references local event `6ae70116a2ab160fb98025e1`; Atlas references Atlas event `6ad4ac56c652f091549f64eb`.
- **Inbound References:** 0 inbound references in both local and Atlas databases.
- **Impact & Recommendation:**  
  Because both documents represent the identical seed certificate awarded to the seed student for the seed hackathon event, remap local `_id` to `6ad4ac57c652f091549f64fa`. Update the local `user` reference to canonical student ID `6ad4a6116da4de724485d378`.

---

### Collision #3: `clubs` — CodeNexus Developers Club
- **Field & Value:** `name: "CodeNexus Developers Club"`
- **Local `_id`:** `6ae70116a2ab160fb98025db`
- **Atlas `_id`:** `6ad4a6126da4de724485d38e`
- **Field Divergence:**
  - `_id`: Differs.
  - `organizers`: Local array contains `[6ae70115a2ab160fb98025c1]`; Atlas array contains `[6ad4a6116da4de724485d376]`. Both represent `organizer@festflow.edu`.
  - `facultyCoordinator`: Atlas includes subdocument referencing `6ada6791bee088392214dfee` (`faculty@festflow.edu`).
- **Local Inbound References (Total: 3):**
  - `clubmemberships.club`: 1 document (`6ae7011740e5a2d1e84d5bad`)
  - `events.club`: 2 documents (`6ae70116a2ab160fb98025e1`, `6ae70116a2ab160fb98025e3`)
- **Atlas Inbound References (Total: 3):**
  - `clubmemberships.club`: 2 documents
  - `events.club`: 1 document
- **Recommendation:**  
  Remap local `_id` to `6ad4a6126da4de724485d38e`. Cascade the new ID to `clubmemberships` and `events`. Update `organizers` array to reference canonical organizer ID `6ad4a6116da4de724485d376`.

---

### Collision #4: `clubs` — Dhwani Cultural & Music Society
- **Field & Value:** `name: "Dhwani Cultural & Music Society"`
- **Local `_id`:** `6ae70116a2ab160fb98025dc`
- **Atlas `_id`:** `6ad4a6126da4de724485d38f`
- **Field Divergence:**
  - `organizers`: Local has `[6ae70115a2ab160fb98025c1]`; Atlas has `[6ad4a6116da4de724485d376]`.
- **Local Inbound References (Total: 1):**
  - `events.club`: 1 document (`6ae70116a2ab160fb98025e2` — "Battle of the Bands")
- **Atlas Inbound References:** 0.
- **Recommendation:**  
  Remap local `_id` to `6ad4a6126da4de724485d38f`. Cascade update to event `6ae70116a2ab160fb98025e2`.

---

### Collision #5: `clubs` — RoboTech Innovation Club
- **Field & Value:** `name: "RoboTech Innovation Club"`
- **Local `_id`:** `6ae70116a2ab160fb98025dd`
- **Atlas `_id`:** `6ad4a6126da4de724485d390`
- **Field Divergence:** `organizers` ID alignment.
- **Local Inbound References:** 0.
- **Atlas Inbound References:** 0.
- **Recommendation:**  
  Remap local `_id` to `6ad4a6126da4de724485d390`. Update `organizers` array to canonical organizer ID.

---

### Collision #6: `payments` — Initial UPI Seed Payment
- **Field & Value:** `transactionId: "TXN-INIT-2026-UPI99"`
- **Local `_id`:** `6ae7011740e5a2d1e84d5bb0`
- **Atlas `_id`:** `6ad4ac57c652f091549f64f7`
- **Field Divergence:**
  - `user`: Local has local student ID; Atlas has Atlas student ID.
  - `event`: Local has local event ID; Atlas has Atlas event ID.
- **Local Inbound References:** 0.
- **Atlas Inbound References:** 0.
- **Recommendation:**  
  Remap local `_id` to `6ad4ac57c652f091549f64f7`. Update foreign references to point to canonical student and event IDs.

---

### Collision #7: `users` — Administrator
- **Field & Value:** `email: "admin@festflow.edu"`
- **Local `_id`:** `6ae70115a2ab160fb98025bf`
- **Atlas `_id`:** `6ad4a6116da4de724485d374`
- **Field Divergence:** `_id`. Password hash is identical (bcrypt fixture).
- **Local Inbound References:** 0.
- **Atlas Inbound References (Total: 2):**
  - `events.createdBy`: 1 document (`6ad4c657d78d12b3fcc00317`)
  - `events.organizers`: 1 document
- **Recommendation:**  
  Remap local `_id` to `6ad4a6116da4de724485d374`.

---

### Collision #8: `users` — Club Organizer
- **Field & Value:** `email: "organizer@festflow.edu"`
- **Local `_id`:** `6ae70115a2ab160fb98025c1`
- **Atlas `_id`:** `6ad4a6116da4de724485d376`
- **Field Divergence:**
  - `clubs`: Local contains `[6ae70116a2ab160fb98025db, 6ae70116a2ab160fb98025dc, 6ae70116a2ab160fb98025dd]`. Atlas contains the 3 corresponding Atlas club IDs.
- **Local Inbound References (Total: 10):**
  - `clubs.organizers`: 3 documents (CodeNexus, Dhwani, RoboTech)
  - `teams.members.user`: 1 document (`6ae7011740e5a2d1e84d5bd7`)
  - `events.organizers`: 3 documents (`6ae70116a2ab160fb98025e1`, `6ae70116a2ab160fb98025e2`, `6ae70116a2ab160fb98025e3`)
  - `events.createdBy`: 3 documents (same 3 events)
- **Atlas Inbound References (Total: 6):**
  - `clubs.organizers`: 3 documents
  - `teams.teamLeader`: 1 document
  - `teams.members.user`: 2 documents
- **Recommendation:**  
  Remap local `_id` to `6ad4a6116da4de724485d376`. Cascade the update across the 10 local inbound references (`clubs.organizers`, `teams.members`, `events.organizers`, `events.createdBy`). Update `clubs` array on user to canonical club IDs.

---

### Collision #9: `users` — Student User
- **Field & Value:** `email: "student@festflow.edu"`
- **Local `_id`:** `6ae70115a2ab160fb98025c3`
- **Atlas `_id`:** `6ad4a6116da4de724485d378`
- **Field Divergence:** `_id`. Role and status identical (`student`, `active`).
- **Local Inbound References (Total: 8):**
  - `certificates.user`: 1 doc (`6ae7011740e5a2d1e84d5bb3`)
  - `clubmemberships.user`: 1 doc (`6ae7011740e5a2d1e84d5bad`)
  - `teams.teamLeader`: 1 doc (`6ae7011740e5a2d1e84d5bd7`)
  - `teams.members.user`: 1 doc (`6ae7011740e5a2d1e84d5bd7`)
  - `feedbacks.user`: 1 doc (`6ae7011740e5a2d1e84d5bb6`)
  - `payments.user`: 1 doc (`6ae7011740e5a2d1e84d5bb0`)
  - `registrations.user`: 1 doc (`6ae70116a2ab160fb98025e7`)
  - `volunteers.user`: 1 doc (`6ae7011740e5a2d1e84d5bb9`)
- **Atlas Inbound References (Total: 9):**
  - Parallels local inbound references across 8 collections.
- **Recommendation:**  
  Remap local `_id` to `6ad4a6116da4de724485d378`. Cascade the new ID across all 8 local referencing collections.

---

### Collision #10: `users` — Faculty Coordinator
- **Field & Value:** `email: "faculty@festflow.edu"`
- **Local `_id`:** `6ae70115a2ab160fb98025c5`
- **Atlas `_id`:** `6ada6791bee088392214dfee`
- **Field Divergence:**
  - Atlas document contains enriched profile metadata (`name: "Dr. Faculty Coordinator"`, `department: "Computer Science"`, `designation: "Professor"`).
- **Local Inbound References:** 0.
- **Atlas Inbound References (Total: 2):**
  - `clubs.facultyCoordinator.user`: 1 document
  - `clubmemberships.user`: 1 document
- **Recommendation:**  
  Remap local `_id` to `6ada6791bee088392214dfee`. Merge enriched profile attributes from Atlas into local document.

---

### Collisions #11, #12, #13, #14: `venues`
All 4 campus venues exhibit identical names with divergent ObjectIds:

1. **Dr. APJ Abdul Kalam Auditorium:**  
   - Local: `6ae70116a2ab160fb98025c7` | Atlas: `6ad4a6116da4de724485d37a`  
   - Inbound refs: Local 0, Atlas 0. Remap local to Atlas ID.
2. **Open Air Amphitheatre:**  
   - Local: `6ae70116a2ab160fb98025d0` | Atlas: `6ad4a6116da4de724485d383`  
   - Inbound refs: Local 1 (`events.venue` in "Battle of the Bands"), Atlas 1 (`events.venue`). Remap local to Atlas ID & update local event venue reference.
3. **Alan Turing Advanced Computing Lab:**  
   - Local: `6ae70116a2ab160fb98025cc` | Atlas: `6ad4a6116da4de724485d37f`  
   - Inbound refs: Local 1 (`events.venue` in "HackFest 2026"), Atlas 0. Remap local to Atlas ID & update local event venue reference.
4. **Aryabhata Seminar Hall:**  
   - Local: `6ae70116a2ab160fb98025d4` | Atlas: `6ad4a6116da4de724485d387`  
   - Inbound refs: Local 1 (`events.venue` in "RoboWars Exhibition"), Atlas 0. Remap local to Atlas ID & update local event venue reference.
