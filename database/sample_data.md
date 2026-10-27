# FestFlow Sample Documents & Data Fixtures

This document contains representative, sanitized sample documents matching the actual Mongoose schemas used across the FestFlow platform.

---

## 1. User Document (`users`)

```json
{
  "_id": "6ad4a6126da4de724485d381",
  "name": "Ananya Iyer",
  "email": "student@festflow.edu",
  "role": "student",
  "participantType": "student",
  "registerNumber": "2024EC105",
  "department": "Electronics & Communication",
  "programme": "B.Tech",
  "yearOfStudy": 2,
  "section": "B",
  "phone": "+91 98765 43212",
  "isActive": true,
  "createdAt": "2026-10-18T10:00:00.000Z",
  "updatedAt": "2026-10-18T10:00:00.000Z"
}
```

---

## 2. Club Document with Faculty Coordinator (`clubs`)

```json
{
  "_id": "6ad4a6126da4de724485d38e",
  "name": "CodeNexus Developers Club",
  "description": "Premier open-source, competitive programming, and developer community.",
  "category": "Technical",
  "contactEmail": "codenexus@festflow.edu",
  "contactPhone": "+91 98765 11111",
  "establishmentDate": "2022-08-15T00:00:00.000Z",
  "organizers": [
    "6ad4a6126da4de724485d382"
  ],
  "facultyCoordinator": {
    "user": "6ada6791bee088392214dfee",
    "name": "Prof. K. Sundaram",
    "email": "faculty@festflow.edu",
    "phone": "+91 94440 12345",
    "department": "Computer Science"
  },
  "status": "active",
  "createdAt": "2026-10-18T10:00:00.000Z",
  "updatedAt": "2026-10-23T01:30:00.000Z"
}
```

---

## 3. Venue Document with Atomic Facilities (`venues`)

```json
{
  "_id": "6ad4a6126da4de724485d392",
  "name": "Dr. APJ Abdul Kalam Auditorium",
  "location": "Central Academic Block, Ground Floor",
  "capacity": 800,
  "venueType": "Auditorium",
  "facilities": [
    {
      "_id": "6ad4a6126da4de724485d393",
      "name": "Dolby Surround Sound & Microphones",
      "availabilityStatus": "available"
    },
    {
      "_id": "6ad4a6126da4de724485d394",
      "name": "4K Projection Screen",
      "availabilityStatus": "available"
    },
    {
      "_id": "6ad4a6126da4de724485d395",
      "name": "Central Air Conditioning",
      "availabilityStatus": "available"
    }
  ],
  "status": "available",
  "createdAt": "2026-10-18T10:00:00.000Z",
  "updatedAt": "2026-10-18T10:00:00.000Z"
}
```

---

## 4. Event Document (`events`)

```json
{
  "_id": "6ad4a6126da4de724485d396",
  "title": "National HackFest & AI Summit 2026",
  "description": "36-hour flagship national level collegiate hackathon with AI, Web3, and IoT tracks.",
  "eventType": "Technical",
  "category": "Artificial Intelligence",
  "startDate": "2026-11-15T09:00:00.000Z",
  "endDate": "2026-11-16T21:00:00.000Z",
  "startTime": "09:00",
  "endTime": "21:00",
  "status": "published",
  "club": "6ad4a6126da4de724485d38e",
  "venue": "6ad4a6126da4de724485d392",
  "maxParticipants": 350,
  "registrationDeadline": "2026-11-10T23:59:59.000Z",
  "registrationFee": 250,
  "chiefGuest": "Dr. V. Kamakoti, Director, IIT Madras",
  "organizers": [
    "6ad4a6126da4de724485d382"
  ],
  "createdBy": "6ad4a6126da4de724485d380",
  "createdAt": "2026-10-18T10:00:00.000Z",
  "updatedAt": "2026-10-18T10:00:00.000Z"
}
```

---

## 5. Registration Document (`registrations`)

```json
{
  "_id": "6ad4a6126da4de724485d3a1",
  "user": "6ad4a6126da4de724485d381",
  "event": "6ad4a6126da4de724485d396",
  "registrationDate": "2026-10-18T12:30:00.000Z",
  "registrationType": "team",
  "registrationStatus": "registered",
  "ticketNumber": "FF-2026-9812",
  "qrCode": "QR-FF-2026-9812-VERIFIED",
  "fee": 250,
  "createdAt": "2026-10-18T12:30:00.000Z",
  "updatedAt": "2026-10-18T12:30:00.000Z"
}
```

---

## 6. Payment Receipt Document (`payments`)

```json
{
  "_id": "6ad4a6126da4de724485d3b0",
  "registration": "6ad4a6126da4de724485d3a1",
  "event": "6ad4a6126da4de724485d396",
  "user": "6ad4a6126da4de724485d381",
  "amount": 250,
  "paymentDate": "2026-10-18T12:31:15.000Z",
  "paymentMethod": "upi",
  "transactionId": "TXN_UPI_9847291048",
  "paymentStatus": "completed",
  "createdAt": "2026-10-18T12:31:15.000Z",
  "updatedAt": "2026-10-18T12:31:15.000Z"
}
```

---

## 7. Tamper-Proof Certificate (`certificates`)

```json
{
  "_id": "6ad4a6126da4de724485d3c5",
  "certificateNo": "CERT-2026-8812",
  "certificateType": "participation",
  "event": "6ad4a6126da4de724485d396",
  "user": "6ad4a6126da4de724485d381",
  "issueDate": "2026-11-17T10:00:00.000Z",
  "verificationCode": "V-FEST26-8812",
  "status": "issued",
  "createdAt": "2026-11-17T10:00:00.000Z",
  "updatedAt": "2026-11-17T10:00:00.000Z"
}
```

---

## 8. Financial Ledger Entries (`budgets`, `expenses`, `revenues`)

### Event Budget
```json
{
  "_id": "6ad4a6126da4de724485d3d1",
  "event": "6ad4a6126da4de724485d396",
  "allocatedAmount": 100000,
  "approvedAmount": 95000,
  "budgetStatus": "approved",
  "approvalDate": "2026-10-15T00:00:00.000Z"
}
```

### Expense Entry
```json
{
  "_id": "6ad4a6126da4de724485d3e1",
  "event": "6ad4a6126da4de724485d396",
  "amount": 46250,
  "expenseCategory": "catering",
  "description": "Lunch & Refreshments for 350 Hackathon Participants",
  "expenseDate": "2026-11-15T13:00:00.000Z"
}
```

### Revenue Entry
```json
{
  "_id": "6ad4a6126da4de724485d3f1",
  "event": "6ad4a6126da4de724485d396",
  "revenueType": "sponsorship",
  "amount": 80000,
  "description": "Google Cloud Title Sponsorship Grant",
  "revenueDate": "2026-10-20T00:00:00.000Z"
}
```

---

## 9. Catering Order with Atomic Menu Items (`caterings`)

```json
{
  "_id": "6ad4a6126da4de724485d410",
  "event": "6ad4a6126da4de724485d396",
  "catererName": "Annapoorna Royal Campus Caterers",
  "contactPerson": "M. Sundaram",
  "phone": "+91 98401 23456",
  "email": "catering@annapoorna.edu",
  "serviceDate": "2026-11-15T12:30:00.000Z",
  "status": "confirmed",
  "menu": [
    {
      "_id": "6ad4a6126da4de724485d411",
      "menuItem": "South Indian Mini Tiffin Box",
      "quantity": 350,
      "costPerUnit": 85
    },
    {
      "_id": "6ad4a6126da4de724485d412",
      "menuItem": "Cold Pressed Juice & Fruit Salad",
      "quantity": 350,
      "costPerUnit": 45
    }
  ]
}
```

---

## 10. Competition & Team Scoring Document (`competitions`, `teams`, `judgescores`)

### Competition
```json
{
  "_id": "6ad4ac58c652f091549f651c",
  "event": "6ad4a6126da4de724485d396",
  "competitionName": "AI Innovation Challenge",
  "description": "Build edge AI models for smart campus sustainability.",
  "competitionType": "hackathon",
  "maximumTeams": 30,
  "teamSizeLimit": 4,
  "registrationDeadline": "2026-11-10T23:59:59.000Z",
  "status": "judging"
}
```

### Team
```json
{
  "_id": "6ad4ac58c652f091549f6520",
  "competition": "6ad4ac58c652f091549f651c",
  "teamName": "Neural Knights",
  "teamLeader": "6ad4a6126da4de724485d381",
  "teamStatus": "shortlisted",
  "members": [
    {
      "_id": "6ad4ac58c652f091549f6521",
      "user": "6ad4a6126da4de724485d381",
      "memberRole": "Leader",
      "joinedDate": "2026-10-18T14:00:00.000Z"
    }
  ]
}
```
