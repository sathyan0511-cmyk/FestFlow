# FestFlow Mongoose Schemas & Data Model Specification

This document details the exact Mongoose schemas, data types, validation constraints, references, and indexes implemented in FestFlow (`server/src/models/`).

---

## 1. User (`server/src/models/User.js`)
Represents all system actors across the 4-tier role hierarchy: **Admin**, **Faculty**, **Organizer**, and **Student**.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `String` | Required, trimmed, max 100 chars | — | Full name of the user |
| `email` | `String` | Required, unique, lowercase, regex email format | — | User university email address |
| `password` | `String` | Required, min 6 chars, `select: false` | — | Bcrypt-hashed password (cost factor 10) |
| `phone` | `String` | Trimmed | — | Contact telephone number |
| `role` | `String` | Enum: `['admin', 'organizer', 'student', 'faculty']` | `'student'` | System access authorization role |
| `clubs` | `[ObjectId]` | Ref: `'Club'` | `[]` | Clubs where user has organizer rights or faculty supervision |
| `participantType` | `String` | Enum: `['student', 'external']` | `'student'` | Internal vs external college participant |
| `registerNumber` | `String` | Trimmed | — | Student university roll / registration number |
| `department` | `String` | Trimmed | — | Academic department (e.g. Computer Science) |
| `programme` | `String` | Trimmed | — | Degree programme (e.g. B.Tech, MCA) |
| `yearOfStudy` | `Number` | Min: 1, Max: 5 | — | Current academic year |
| `section` | `String` | Trimmed | — | Academic class section |
| `collegeName` | `String` | Trimmed | — | Name of affiliated college (for external participants) |
| `collegeCity` | `String` | Trimmed | — | College city location |
| `collegeState` | `String` | Trimmed | — | College state location |
| `designation` | `String` | Trimmed | — | Professional designation (for faculty or guests) |
| `avatar` | `String` | Trimmed | `''` | Profile avatar URL |
| `isActive` | `Boolean` | — | `true` | Account active flag |

---

## 2. Club (`server/src/models/Club.js`)
Represents campus student societies, technical chapters, and cultural bodies.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `String` | Required, unique, trimmed, max 100 chars | — | Official club name |
| `description` | `String` | Required, trimmed | — | Charter purpose and scope |
| `category` | `String` | Enum: `['Technical', 'Cultural', 'Sports', 'Literary', 'Social', 'Arts', 'Academic']` | `'Technical'` | Club categorization |
| `contactEmail` | `String` | Trimmed, lowercase | — | Society contact email |
| `contactPhone` | `String` | Trimmed | — | Society helpline |
| `establishmentDate`| `Date` | — | `Date.now` | Foundation date |
| `organizers` | `[ObjectId]` | Ref: `'User'` | `[]` | Authorized student organizers for this club |
| `facultyCoordinator`| `Object` | Subdocument | — | Supervising faculty details |
| `facultyCoordinator.user` | `ObjectId` | Ref: `'User'` | — | Reference to faculty user account |
| `facultyCoordinator.name` | `String` | Trimmed | — | Faculty coordinator name |
| `facultyCoordinator.email` | `String` | Trimmed | — | Faculty official email |
| `facultyCoordinator.phone` | `String` | Trimmed | — | Faculty contact phone |
| `facultyCoordinator.department`| `String` | Trimmed | — | Faculty academic department |
| `status` | `String` | Enum: `['active', 'inactive']` | `'active'` | Operating status |

---

## 3. Club Membership (`server/src/models/ClubMembership.js`)
Tracks student and faculty membership and officer roles within clubs.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `club` | `ObjectId` | Required, Ref: `'Club'` | — | Associated club |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Enrolled user |
| `memberType` | `String` | Enum: `['student', 'faculty', 'external']` | `'student'` | Category of member |
| `membershipStatus`| `String` | Enum: `['active', 'pending', 'inactive']` | `'active'` | Enrollment status |
| `role` | `String` | Enum: `['member', 'coordinator', 'lead', 'treasurer', 'president', 'vice_president']` | `'member'` | Assigned leadership or committee role |
| `joinedDate` | `Date` | — | `Date.now` | Date joined |

*Index*: Compound unique index `{ club: 1, user: 1 }` prevents duplicate membership records.

---

## 4. Venue (`server/src/models/Venue.js`)
Tracks physical halls, labs, auditoriums, and grounds with atomic facility subdocuments.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `String` | Required, unique, trimmed | — | Venue name |
| `location` | `String` | Required, trimmed | — | Campus block, floor, and building |
| `capacity` | `Number` | Required, Min: 1 | — | Seating / occupancy capacity |
| `venueType` | `String` | Enum: `['Auditorium', 'Seminar Hall', 'Open Ground', 'Lab', 'Classroom', 'Conference Room', 'Indoor Stadium']` | `'Auditorium'` | Classification |
| `facilities` | `[Subdocument]`| Array of `venueFacilitySchema` | `[]` | Embedded venue facilities |
| `facilities.name` | `String` | Required, trimmed | — | Facility item (e.g. Projector, AC) |
| `facilities.availabilityStatus`| `String` | Enum: `['available', 'maintenance', 'unavailable']` | `'available'` | Hardware health status |
| `status` | `String` | Enum: `['available', 'maintenance', 'booked']` | `'available'` | Venue availability status |

---

## 5. Event (`server/src/models/Event.js`)
The central entity for scheduled university events, hackathons, and symposiums.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `String` | Required, trimmed, max 150 chars | — | Event title |
| `description` | `String` | Required, trimmed | — | Detailed overview and itinerary |
| `eventType` | `String` | Enum: `['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Competition', 'Fest']` | `'Technical'` | Event classification |
| `startDate` | `Date` | Required | — | Schedule start date |
| `endDate` | `Date` | Required | — | Schedule conclusion date |
| `startTime` | `String` | Required (e.g. `'10:00'`) | — | Start time |
| `endTime` | `String` | Required (e.g. `'16:00'`) | — | End time |
| `status` | `String` | Enum: `['draft', 'published', 'ongoing', 'completed', 'cancelled']` | `'published'` | Publication lifecycle |
| `club` | `ObjectId` | Required, Ref: `'Club'` | — | Host club society |
| `venue` | `ObjectId` | Required, Ref: `'Venue'` | — | Reserved venue |
| `maxParticipants`| `Number` | Required, Min: 1 | — | Capacity ceiling |
| `registrationDeadline`| `Date` | Required | — | Registration cutoff timestamp |
| `registrationFee`| `Number` | Min: 0 | `0` | Fee in INR (₹0 indicates free entry) |
| `chiefGuest` | `String` | Trimmed | `''` | Guest speaker or dignitary |
| `organizers` | `[ObjectId]` | Ref: `'User'` | `[]` | Assigned event student coordinators |
| `createdBy` | `ObjectId` | Required, Ref: `'User'` | — | Event creator |

*Virtuals*: Virtual field `'registrations'` automatically links matching records from `Registration`.

---

## 6. Registration (`server/src/models/Registration.js`)
Enforces student event enrollment, ticketing, and seat constraints.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Registered participant |
| `event` | `ObjectId` | Required, Ref: `'Event'` | — | Targeted event |
| `registrationDate`| `Date` | — | `Date.now` | Enrollment timestamp |
| `registrationType`| `String` | Enum: `['solo', 'team']` | `'solo'` | Participation mode |
| `registrationStatus`| `String` | Enum: `['registered', 'attended', 'cancelled']` | `'registered'` | Pass validity status |
| `ticketNumber`| `String` | Required, unique | — | Formatted ticket pass number (e.g. `FF-XXXXX`) |
| `qrCode` | `String` | — | `''` | Digital ticket verification token |
| `fee` | `Number` | Min: 0 | `0` | Paid registration fee |
| `cancellationDate`| `Date` | Optional | — | Timestamp of cancellation |
| `cancellationReason`| `String`| Optional, trimmed | — | Reason for pass cancellation |

*Index*: Compound unique index `{ user: 1, event: 1 }` strictly guarantees a student can register for an event at most once.

---

## 7. Payment (`server/src/models/Payment.js`)
Financial audit trail for paid registrations and receipts.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `registration` | `ObjectId` | Required, Ref: `'Registration'` | — | Linked registration |
| `event` | `ObjectId` | Required, Ref: `'Event'` | — | Associated event |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Payer user account |
| `amount` | `Number` | Required, Min: 0 | — | Transaction amount in INR |
| `paymentDate` | `Date` | — | `Date.now` | Payment timestamp |
| `paymentMethod`| `String` | Enum: `['upi', 'card', 'netbanking', 'cash', 'free_waiver']` | `'upi'` | Payment channel |
| `transactionId`| `String` | Required, unique | — | Unique bank / gateway reference |
| `paymentStatus`| `String` | Enum: `['pending', 'completed', 'failed', 'refunded']` | `'completed'` | Transaction status |

---

## 8. Certificate (`server/src/models/Certificate.js`)
Tamper-proof verifiable credential issued to participants, winners, and volunteers.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `certificateNo` | `String` | Required, unique | — | Unique serial number (e.g. `CERT-2026-001`) |
| `certificateType`| `String` | Enum: `['participation', 'merit', 'winner', 'volunteer', 'organizer']` | `'participation'` | Credential category |
| `event` | `ObjectId` | Required, Ref: `'Event'` | — | Event where credential was earned |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Conferred recipient |
| `issueDate` | `Date` | — | `Date.now` | Issuance timestamp |
| `verificationCode`| `String` | Required, unique | — | Public verification hash (e.g. `V-FEST26-8812`) |
| `status` | `String` | Enum: `['issued', 'revoked']` | `'issued'` | Validity state |

---

## 9. Feedback (`server/src/models/Feedback.js`)
Event evaluation and 5-star ratings submitted by attendees.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `ObjectId` | Required, Ref: `'Event'` | — | Evaluated event |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Feedback author |
| `rating` | `Number` | Required, Min: 1, Max: 5 | — | Rating on a 5-star scale |
| `comments` | `String` | Trimmed | `''` | Qualitative remarks |
| `submittedDate` | `Date` | — | `Date.now` | Submission timestamp |

*Index*: Compound unique index `{ event: 1, user: 1 }` allows one review per attendee.

---

## 10. Volunteer (`server/src/models/Volunteer.js`)
Manages volunteer duty rosters and task assignments.

| Field | Type | Validation / Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `ObjectId` | Required, Ref: `'Event'` | — | Target event |
| `user` | `ObjectId` | Required, Ref: `'User'` | — | Volunteer user account |
| `assignedTask` | `String` | Required, trimmed | — | Assigned operational duty (e.g. Stage Management) |
| `shiftStart` | `String` | Default: `'09:00'` | `'09:00'` | Shift start time |
| `shiftEnd` | `String` | Default: `'17:00'` | `'17:00'` | Shift conclusion time |
| `volunteerStatus`| `String` | Enum: `['applied', 'assigned', 'active', 'completed', 'cancelled']` | `'applied'` | Shift assignment status |

*Index*: Compound unique index `{ event: 1, user: 1 }`.

---

## 11. Event Finances (`server/src/models/Finance.js`)
Comprises three schemas: `Budget`, `Expense`, and `Revenue`.

### Budget Schema (`Budget`)
- `event`: `ObjectId` (Ref: `'Event'`, Required)
- `allocatedAmount`: `Number` (Required, Min: 0)
- `approvedAmount`: `Number` (Default: 0, Min: 0)
- `budgetStatus`: `Enum: ['draft', 'pending', 'approved', 'rejected']` (Default: `'draft'`)
- `approvalDate`: `Date`

### Expense Schema (`Expense`)
- `event`: `ObjectId` (Ref: `'Event'`, Required)
- `amount`: `Number` (Required, Min: 0)
- `expenseCategory`: `Enum: ['equipment', 'catering', 'marketing', 'prizes', 'logistics', 'travel', 'miscellaneous']` (Default: `'equipment'`)
- `expenseDate`: `Date` (Default: `Date.now`)
- `description`: `String` (Trimmed)

### Revenue Schema (`Revenue`)
- `event`: `ObjectId` (Ref: `'Event'`, Required)
- `revenueType`: `Enum: ['sponsorship', 'registration_fees', 'merchandise', 'grant', 'ticket_sales', 'other']`
- `amount`: `Number` (Required, Min: 0)
- `revenueDate`: `Date` (Default: `Date.now`)
- `description`: `String` (Trimmed)

---

## 12. Sponsors (`server/src/models/Sponsor.js`)
Comprises two schemas: `Sponsor` and `EventSponsor`.

### Sponsor Schema (`Sponsor`)
- `name`: `String` (Required, trimmed)
- `contactPerson`: `String` (Required, trimmed)
- `email`: `String` (Trimmed, lowercase)
- `phone`: `String` (Trimmed)
- `organizationType`: `Enum: ['corporate', 'startup', 'tech', 'ngo', 'education', 'media', 'other']` (Default: `'corporate'`)
- `address`: `String` (Trimmed)

### EventSponsor Schema (`EventSponsor`)
- `event`: `ObjectId` (Ref: `'Event'`, Required)
- `sponsor`: `ObjectId` (Ref: `'Sponsor'`, Required)
- `sponsorshipType`: `Enum: ['Title', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Associate']` (Default: `'Gold'`)
- `sponsorshipAmount`: `Number` (Required, Min: 0)
- `agreementDate`: `Date` (Default: `Date.now`)
- `sponsorshipStatus`: `Enum: ['proposed', 'confirmed', 'received', 'cancelled']` (Default: `'confirmed'`)

---

## 13. Catering (`server/src/models/Catering.js`)
Comprises atomic menu lines in `cateringMenuItemSchema` embedded inside `cateringSchema`.

- `event`: `ObjectId` (Ref: `'Event'`, Required)
- `catererName`: `String` (Required, trimmed)
- `contactPerson`: `String` (Trimmed)
- `phone`: `String` (Trimmed)
- `email`: `String` (Trimmed)
- `menu`: Array of subdocuments:
  - `menuItem`: `String` (Required, trimmed)
  - `quantity`: `Number` (Required, Min: 1)
  - `costPerUnit`: `Number` (Required, Min: 0)
- `serviceDate`: `Date` (Default: `Date.now`)
- `status`: `Enum: ['planned', 'confirmed', 'completed', 'cancelled']` (Default: `'confirmed'`)

---

## 14. Competitions & Hackathons (`server/src/models/Competition.js`)
Models technical hackathons, coding contests, judges, criteria, scores, and podium prizes:

1. **`Competition`**: `event` (ref), `competitionName`, `description`, `competitionType` (hackathon/coding/etc.), `maximumTeams`, `teamSizeLimit`, `registrationDeadline`, `status`.
2. **`Team`**: `competition` (ref), `teamName`, `teamLeader` (ref `User`), `members` (array of subdocuments with `user` ref and `memberRole`), `teamStatus`.
3. **`Judge`**: `name`, `email`, `phone`, `designation`, `organization`, `expertise`, `competitions` (array of refs).
4. **`JudgingCriteria`**: `competition` (ref), `criteriaName`, `maximumScore`, `weightage`.
5. **`JudgeScore`**: `competition` (ref), `team` (ref), `judge` (ref), `criteria` (ref), `score`, `remarks`, `scoredAt`.
6. **`Prize`**: `competition` (ref), `prizeName`, `position`, `amount`.
7. **`Result`**: `competition` (ref), `team` (ref), `position`, `finalScore`, `resultStatus`, `prize` (ref).
