# FestFlow — Complete MongoDB Queries & Aggregation Reference

**Project:** FestFlow — Smart College Event Management System  
**Database Name:** `festflow`  
**Connection URI (Local):** `mongodb://127.0.0.1:27017/festflow`  
**ODM / Driver:** Mongoose 8.x & MongoDB Native Driver  

This document is the consolidated query reference containing all database queries across all 16 controllers, models, aggregations, and administrative maintenance scripts in FestFlow. Each query is provided in both **Mongoose Application Syntax** and **Native MongoDB Shell (`mongosh`) Syntax**.

---

## Table of Contents

1. [Schema Indexes & Unique Constraints](#1-schema-indexes--unique-constraints)
2. [Authentication & User Management](#2-authentication--user-management)
3. [Club Management & Multi-Club Hierarchy](#3-club-management--multi-club-hierarchy)
4. [Faculty Mentor Supervision](#4-faculty-mentor-supervision)
5. [Venue & Facility Allocation](#5-venue--facility-allocation)
6. [Event Lifecycle & Search Filtering](#6-event-lifecycle--search-filtering)
7. [Registration & Ticket Management](#7-registration--ticket-management)
8. [Payment Processing & Transactions](#8-payment-processing--transactions)
9. [Event Financials, Budgets & Expenses](#9-event-financials-budgets--expenses)
10. [Sponsor & Partner Relations](#10-sponsor--partner-relations)
11. [Catering & Hospitality Services](#11-catering--hospitality-services)
12. [Competitions, Teams, Judging & Prizes](#12-competitions-teams-judging--prizes)
13. [Certificates & Public Verification](#13-certificates--public-verification)
14. [Feedback & Rating Analytics](#14-feedback--rating-analytics)
15. [Volunteer Coordination](#15-volunteer-coordination)
16. [Dashboard Analytics & Executive Aggregations](#16-dashboard-analytics--executive-aggregations)
17. [Database Auditing & Compass Inspection Queries](#17-database-auditing--compass-inspection-queries)

---

## 1. Schema Indexes & Unique Constraints

```javascript
// users
db.users.createIndex({ email: 1 }, { unique: true });

// clubs
db.clubs.createIndex({ name: 1 }, { unique: true });
db.clubs.createIndex({ status: 1 });

// venues
db.venues.createIndex({ name: 1 }, { unique: true });

// events
db.events.createIndex({ club: 1 });
db.events.createIndex({ venue: 1 });
db.events.createIndex({ startDate: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ category: 1 });

// registrations
db.registrations.createIndex({ event: 1, user: 1 }, { unique: true });
db.registrations.createIndex({ user: 1 });
db.registrations.createIndex({ registrationStatus: 1 });

// clubmemberships
db.clubmemberships.createIndex({ club: 1, user: 1 }, { unique: true });
db.clubmemberships.createIndex({ user: 1 });

// certificates
db.certificates.createIndex({ verificationCode: 1 }, { unique: true });
db.certificates.createIndex({ user: 1 });
db.certificates.createIndex({ event: 1 });

// feedback
db.feedbacks.createIndex({ event: 1, user: 1 }, { unique: true });

// volunteers
db.volunteers.createIndex({ event: 1, user: 1 }, { unique: true });

// payments
db.payments.createIndex({ transactionId: 1 }, { unique: true });
db.payments.createIndex({ registration: 1 }, { unique: true });
db.payments.createIndex({ user: 1 });
```

---

## 2. Authentication & User Management

### 2.1 Check if Email Exists (Registration Pre-flight)
- **Controller:** `authController.register`
- **Mongoose:**
  ```javascript
  const userExists = await User.findOne({ email: email.toLowerCase() });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.findOne({ email: "student@festflow.edu" });
  ```

### 2.2 Create New User Account
- **Controller:** `authController.register`
- **Mongoose:**
  ```javascript
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password, // Automatically hashed via userSchema.pre('save')
    role: role || 'student',
    participantType,
    registerNumber,
    department,
    programme,
    yearOfStudy,
    section
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.insertOne({
    name: "Ananya Iyer",
    email: "student@festflow.edu",
    password: "$2a$10$e8w.gBq3k5...hashedPassword",
    role: "student",
    participantType: "student",
    registerNumber: "2024EC105",
    department: "Electronics & Communication",
    programme: "B.Tech",
    yearOfStudy: 2,
    section: "B",
    isActive: true,
    clubs: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 2.3 User Login Authentication (Include Password Hash)
- **Controller:** `authController.login`
- **Mongoose:**
  ```javascript
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.findOne(
    { email: "admin@festflow.edu" },
    { projection: { name: 1, email: 1, role: 1, password: 1, isActive: 1, clubs: 1 } }
  );
  ```

### 2.4 Fetch Authenticated User Profile (`/api/auth/me`)
- **Controller:** `authController.getMe`
- **Mongoose:**
  ```javascript
  const user = await User.findById(req.user.id);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.findOne(
    { _id: ObjectId("6ae70115a2ab160fb98025c1") },
    { projection: { password: 0 } }
  );
  ```

---

## 3. Club Management & Multi-Club Hierarchy

### 3.1 Fetch Clubs with Search, Category Filter, and Real-Time Event Counts
- **Controller:** `clubController.getClubs`
- **Mongoose:**
  ```javascript
  const query = {};
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  const clubs = await Club.find(query).sort({ name: 1 });
  
  // Real-time published event aggregation per club
  const eventCounts = await Event.aggregate([
    { $match: { status: { $in: ['published', 'ongoing'] } } },
    { $group: { _id: '$club', count: { $sum: 1 } } }
  ]);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  // 1. Fetch matching clubs
  db.clubs.find(
    { name: { $regex: "nexus", $options: "i" }, status: "active" }
  ).sort({ name: 1 });

  // 2. Aggregate active event counts across all clubs
  db.events.aggregate([
    { $match: { status: { $in: ["published", "ongoing"] } } },
    { $group: { _id: "$club", totalEvents: { $sum: 1 } } }
  ]);
  ```

### 3.2 Fetch Club Details with Active Events & Member Counts
- **Controller:** `clubController.getClubById`
- **Mongoose:**
  ```javascript
  const club = await Club.findById(req.params.id)
    .populate('leadOrganizer', 'name email department')
    .populate('facultyCoordinator', 'name email department designation');

  const events = await Event.find({ club: club._id })
    .populate('venue', 'name location')
    .sort({ startDate: -1 });

  const membersCount = await ClubMembership.countDocuments({
    club: club._id,
    membershipStatus: 'active'
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.clubs.findOne({ _id: ObjectId("6ae70116a2ab160fb98025db") });

  db.events.find({ club: ObjectId("6ae70116a2ab160fb98025db") }).sort({ startDate: -1 });

  db.clubmemberships.countDocuments({
    club: ObjectId("6ae70116a2ab160fb98025db"),
    membershipStatus: "active"
  });
  ```

### 3.3 Create New Club (Unique Name Check)
- **Controller:** `clubController.createClub`
- **Mongoose:**
  ```javascript
  const existing = await Club.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  const club = await Club.create({
    name,
    description,
    category,
    leadOrganizer: leadOrganizer || req.user.id,
    facultyCoordinator,
    budgetAllocated: budgetAllocated || 0,
    socialLinks
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.clubs.insertOne({
    name: "RoboTech Robotics Club",
    description: "Autonomous robotics and embedded systems club",
    category: "Technical",
    leadOrganizer: ObjectId("6ae70115a2ab160fb98025c2"),
    facultyCoordinator: ObjectId("6ae70115a2ab160fb98025c5"),
    budgetAllocated: 50000,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 3.4 Multi-Club Organizer Assignment
- **Controller:** `clubController.assignClubOrganizer`
- **Mongoose:**
  ```javascript
  // 1. Promote student to organizer and add club ID to user.clubs array
  await User.findByIdAndUpdate(studentId, {
    role: 'organizer',
    $addToSet: { clubs: clubId }
  });

  // 2. Set as leadOrganizer on club
  await Club.findByIdAndUpdate(clubId, { leadOrganizer: studentId });

  // 3. Upsert ClubMembership as officer
  await ClubMembership.findOneAndUpdate(
    { club: clubId, user: studentId },
    { role: 'officer', membershipStatus: 'active' },
    { upsert: true, new: true }
  );
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.updateOne(
    { _id: ObjectId("6ae70115a2ab160fb98025c3") },
    {
      $set: { role: "organizer" },
      $addToSet: { clubs: ObjectId("6ae70116a2ab160fb98025db") }
    }
  );

  db.clubs.updateOne(
    { _id: ObjectId("6ae70116a2ab160fb98025db") },
    { $set: { leadOrganizer: ObjectId("6ae70115a2ab160fb98025c3") } }
  );

  db.clubmemberships.updateOne(
    { club: ObjectId("6ae70116a2ab160fb98025db"), user: ObjectId("6ae70115a2ab160fb98025c3") },
    { $set: { role: "officer", membershipStatus: "active" } },
    { upsert: true }
  );
  ```

### 3.5 Revoke Club Organizer (Role Demotion Guard)
- **Controller:** `clubController.revokeClubOrganizer`
- **Mongoose:**
  ```javascript
  // 1. Remove club from user's authorized clubs array
  await User.findByIdAndUpdate(studentId, {
    $pull: { clubs: clubId }
  });

  // 2. Demote membership from officer to member
  await ClubMembership.findOneAndUpdate(
    { club: clubId, user: studentId },
    { role: 'member' }
  );

  // 3. Check remaining organized clubs to decide role reversion
  const remainingClubs = await Club.countDocuments({
    _id: { $ne: clubId },
    leadOrganizer: studentId
  });
  if (remainingClubs === 0) {
    await User.findByIdAndUpdate(studentId, { role: 'student' });
  }
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.updateOne(
    { _id: ObjectId("6ae70115a2ab160fb98025c3") },
    { $pull: { clubs: ObjectId("6ae70116a2ab160fb98025db") } }
  );

  db.clubs.countDocuments({
    _id: { $ne: ObjectId("6ae70116a2ab160fb98025db") },
    leadOrganizer: ObjectId("6ae70115a2ab160fb98025c3")
  });
  ```

---

## 4. Faculty Mentor Supervision

### 4.1 Fetch Supervised Clubs for Faculty
- **Controller:** `facultyController.getMySupervisedClubs`
- **Mongoose:**
  ```javascript
  const clubs = await Club.find({ facultyCoordinator: req.user.id })
    .populate('leadOrganizer', 'name email department phone');
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.clubs.find({ facultyCoordinator: ObjectId("6ae70115a2ab160fb98025c5") });
  ```

### 4.2 Fetch All Faculty Members (Admin View)
- **Controller:** `facultyController.getAllFaculty`
- **Mongoose:**
  ```javascript
  const facultyMembers = await User.find({ role: 'faculty' })
    .select('-password')
    .sort({ name: 1 });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.users.find(
    { role: "faculty" },
    { projection: { password: 0 } }
  ).sort({ name: 1 });
  ```

---

## 5. Venue & Facility Allocation

### 5.1 Fetch All Venues Sorted by Capacity
- **Controller:** `venueController.getVenues`
- **Mongoose:**
  ```javascript
  const venues = await Venue.find(query).sort({ capacity: -1 });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.venues.find({ status: "available" }).sort({ capacity: -1 });
  ```

### 5.2 Venue Collision / Upcoming Booking Lookup
- **Controller:** `venueController.getVenueById`
- **Mongoose:**
  ```javascript
  const upcomingEvents = await Event.find({
    venue: venue._id,
    endDate: { $gte: new Date() },
    status: { $in: ['published', 'ongoing'] }
  }).sort({ startDate: 1 });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.events.find({
    venue: ObjectId("6ae70116a2ab160fb98025c7"),
    endDate: { $gte: new Date() },
    status: { $in: ["published", "ongoing"] }
  }).sort({ startDate: 1 });
  ```

### 5.3 Safe Venue Deletion Guard (Check for Linked Events)
- **Controller:** `venueController.deleteVenue`
- **Mongoose:**
  ```javascript
  const activeEventsCount = await Event.countDocuments({ venue: venue._id });
  if (activeEventsCount === 0) {
    await venue.deleteOne();
  }
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.events.countDocuments({ venue: ObjectId("6ae70116a2ab160fb98025c7") });
  db.venues.deleteOne({ _id: ObjectId("6ae70116a2ab160fb98025c7") });
  ```

---

## 6. Event Lifecycle & Search Filtering

### 6.1 Multi-Faceted Event Search & Filtering
- **Controller:** `eventController.getEvents`
- **Mongoose:**
  ```javascript
  const query = {};
  if (category) query.category = category;
  if (club) query.club = club;
  if (venue) query.venue = venue;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  if (startDate) query.startDate = { $gte: new Date(startDate) };
  if (endDate) query.endDate = { $lte: new Date(endDate) };

  const events = await Event.find(query)
    .populate('club', 'name category')
    .populate('venue', 'name capacity location')
    .populate('organizer', 'name email')
    .sort({ startDate: 1 });

  // Parallel aggregation of registered counts per event
  const regCounts = await Registration.aggregate([
    { $match: { event: { $in: events.map(e => e._id) }, registrationStatus: { $ne: 'cancelled' } } },
    { $group: { _id: '$event', count: { $sum: 1 } } }
  ]);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.events.find({
    status: "published",
    category: "Technical",
    startDate: { $gte: ISODate("2026-11-01T00:00:00Z") },
    $or: [
      { title: { $regex: "hackathon", $options: "i" } },
      { description: { $regex: "hackathon", $options: "i" } }
    ]
  }).sort({ startDate: 1 });

  // Active registration counts aggregation
  db.registrations.aggregate([
    {
      $match: {
        event: { $in: [ObjectId("6ae70116a2ab160fb98025e1"), ObjectId("6ae70116a2ab160fb98025e2")] },
        registrationStatus: { $ne: "cancelled" }
      }
    },
    { $group: { _id: "$event", count: { $sum: 1 } } }
  ]);
  ```

### 6.2 Event Creation
- **Controller:** `eventController.createEvent`
- **Mongoose:**
  ```javascript
  const event = await Event.create({
    title,
    description,
    category,
    club,
    venue,
    startDate,
    endDate,
    registrationDeadline,
    registrationFee: registrationFee || 0,
    maxParticipants,
    tags,
    organizer: req.user.id,
    status: status || 'draft'
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.events.insertOne({
    title: "AI & Cloud Symposium 2026",
    description: "National flagship technical symposium",
    category: "Technical",
    club: ObjectId("6ae70116a2ab160fb98025db"),
    venue: ObjectId("6ae70116a2ab160fb98025c7"),
    startDate: ISODate("2026-11-15T09:30:00Z"),
    endDate: ISODate("2026-11-15T18:00:00Z"),
    registrationFee: 0,
    maxParticipants: 500,
    tags: ["AI", "Cloud", "Symposium"],
    organizer: ObjectId("6ae70115a2ab160fb98025c2"),
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 6.3 Cascading Event Deletion
- **Controller:** `eventController.deleteEvent`
- **Mongoose:**
  ```javascript
  // 1. Delete associated registrations
  await Registration.deleteMany({ event: event._id });

  // 2. Delete the event document
  await event.deleteOne();
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.registrations.deleteMany({ event: ObjectId("6ae70116a2ab160fb98025e1") });
  db.events.deleteOne({ _id: ObjectId("6ae70116a2ab160fb98025e1") });
  ```

---

## 7. Registration & Ticket Management

### 7.1 Duplicate Registration & Capacity Guard
- **Controller:** `registrationController.registerForEvent`
- **Mongoose:**
  ```javascript
  // 1. Check existing registration
  const existingRegistration = await Registration.findOne({
    event: eventId,
    user: req.user.id
  });

  // 2. Check current active registration count against venue/event capacity
  const currentActiveCount = await Registration.countDocuments({
    event: eventId,
    registrationStatus: { $ne: 'cancelled' }
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.registrations.findOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3")
  });

  db.registrations.countDocuments({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    registrationStatus: { $ne: "cancelled" }
  });
  ```

### 7.2 Create Event Registration
- **Controller:** `registrationController.registerForEvent`
- **Mongoose:**
  ```javascript
  const qrCodeData = `FESTFLOW-${eventId}-${req.user.id}-${Date.now()}`;
  const registration = await Registration.create({
    event: eventId,
    user: req.user.id,
    qrCode: qrCodeData,
    registrationStatus: 'registered',
    registeredAt: new Date()
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.registrations.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3"),
    qrCode: "FESTFLOW-6ae70116a2ab160fb98025e1-6ae70115a2ab160fb98025c3-1762000000000",
    registrationStatus: "registered",
    registeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 7.3 Fetch Student Registrations (`/api/registrations/my`)
- **Controller:** `registrationController.getMyRegistrations`
- **Mongoose:**
  ```javascript
  const registrations = await Registration.find({ user: req.user.id })
    .populate({
      path: 'event',
      populate: [
        { path: 'club', select: 'name' },
        { path: 'venue', select: 'name location' }
      ]
    })
    .sort({ registeredAt: -1 });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.registrations.find({ user: ObjectId("6ae70115a2ab160fb98025c3") }).sort({ registeredAt: -1 });
  ```

---

## 8. Payment Processing & Transactions

### 8.1 Process Payment & Generate Financial Revenue Record
- **Controller:** `paymentController.processPayment`
- **Mongoose:**
  ```javascript
  // 1. Guard against duplicate payments
  const existing = await Payment.findOne({
    registration: registrationId,
    paymentStatus: 'completed'
  });

  // 2. Create Payment record
  const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const payment = await Payment.create({
    registration: registration._id,
    event: event._id,
    user: req.user.id,
    amount,
    paymentMethod,
    transactionId,
    paymentStatus: 'completed',
    paymentDate: new Date()
  });

  // 3. Automatically record revenue in event financials
  if (amount > 0) {
    await Revenue.create({
      event: event._id,
      source: 'Registration Fee',
      amount,
      revenueDate: new Date(),
      recordedBy: req.user.id,
      notes: `Auto-recorded via Payment TXN: ${transactionId}`
    });
  }
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.payments.insertOne({
    registration: ObjectId("6ae70116a2ab160fb98025f1"),
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3"),
    amount: 150,
    paymentMethod: "upi",
    transactionId: "TXN-M7X9K2-4821",
    paymentStatus: "completed",
    paymentDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.revenues.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    source: "Registration Fee",
    amount: 150,
    revenueDate: new Date(),
    recordedBy: ObjectId("6ae70115a2ab160fb98025c3"),
    notes: "Auto-recorded via Payment TXN: TXN-M7X9K2-4821",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

---

## 9. Event Financials, Budgets & Expenses

### 9.1 Fetch Event Financial Summary (Revenues, Expenses & Derived Profit)
- **Controller:** `financeController.getEventFinancials`
- **Mongoose:**
  ```javascript
  const [budget, expenses, revenues] = await Promise.all([
    Budget.findOne({ event: eventId }),
    Expense.find({ event: eventId }).sort({ expenseDate: -1 }),
    Revenue.find({ event: eventId }).sort({ revenueDate: -1 })
  ]);

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalRevenue = revenues.reduce((sum, item) => sum + item.amount, 0);
  const profit = totalRevenue - totalExpense;
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.budgets.findOne({ event: ObjectId("6ae70116a2ab160fb98025e1") });
  db.expenses.find({ event: ObjectId("6ae70116a2ab160fb98025e1") }).sort({ expenseDate: -1 });
  db.revenues.find({ event: ObjectId("6ae70116a2ab160fb98025e1") }).sort({ revenueDate: -1 });

  // Direct aggregation of financial totals:
  db.expenses.aggregate([
    { $match: { event: ObjectId("6ae70116a2ab160fb98025e1") } },
    { $group: { _id: "$event", totalExpense: { $sum: "$amount" } } }
  ]);

  db.revenues.aggregate([
    { $match: { event: ObjectId("6ae70116a2ab160fb98025e1") } },
    { $group: { _id: "$event", totalRevenue: { $sum: "$amount" } } }
  ]);
  ```

### 9.2 Upsert Event Budget
- **Controller:** `financeController.setEventBudget`
- **Mongoose:**
  ```javascript
  const budget = await Budget.findOneAndUpdate(
    { event: eventId },
    { totalAllocatedBudget, breakdown, updatedBy: req.user.id },
    { new: true, upsert: true }
  );
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.budgets.updateOne(
    { event: ObjectId("6ae70116a2ab160fb98025e1") },
    {
      $set: {
        totalAllocatedBudget: 100000,
        breakdown: [
          { category: "Venue & Stage", allocatedAmount: 30000 },
          { category: "Catering", allocatedAmount: 40000 },
          { category: "Prizes & Medals", allocatedAmount: 30000 }
        ],
        updatedBy: ObjectId("6ae70115a2ab160fb98025c2"),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  ```

---

## 10. Sponsor & Partner Relations

### 10.1 Link Sponsor to Event and Auto-Credit Financial Revenue
- **Controller:** `sponsorController.linkEventSponsor`
- **Mongoose:**
  ```javascript
  const eventSponsor = await EventSponsor.create({
    event: eventId,
    sponsor: sponsorId,
    tier,
    contributionAmount,
    contractStatus: 'signed'
  });

  // Automatically record sponsor contribution as revenue
  await Revenue.create({
    event: eventId,
    source: `Sponsorship - ${sponsor.name} (${tier})`,
    amount: contributionAmount,
    revenueDate: new Date(),
    recordedBy: req.user.id,
    notes: `Sponsorship contract signed for tier: ${tier}`
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.eventsponsors.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    sponsor: ObjectId("6ae70116a2ab160fb98025a1"),
    tier: "Platinum",
    contributionAmount: 75000,
    contractStatus: "signed",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.revenues.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    source: "Sponsorship - TechCorp Global (Platinum)",
    amount: 75000,
    revenueDate: new Date(),
    recordedBy: ObjectId("6ae70115a2ab160fb98025c2"),
    notes: "Sponsorship contract signed for tier: Platinum",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

---

## 11. Catering & Hospitality Services

### 11.1 Create Catering Order with Embedded Menu and Auto-Record Expense
- **Controller:** `cateringController.saveCatering`
- **Mongoose:**
  ```javascript
  const catering = await Catering.create({
    event: eventId,
    mealType,
    menuItems, // Array of { name, quantity, unitPrice }
    vendorName,
    vendorContact,
    deliveryTime,
    specialInstructions
  });

  // Auto-record catering expenditure in event financials
  const totalCost = menuItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  if (totalCost > 0) {
    await Expense.create({
      event: eventId,
      category: 'Catering',
      description: `${mealType} catering via vendor ${vendorName}`,
      amount: totalCost,
      expenseDate: new Date(),
      recordedBy: req.user.id
    });
  }
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.caterings.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    mealType: "Lunch",
    menuItems: [
      { name: "Executive South Indian Buffet", quantity: 150, unitPrice: 180 },
      { name: "Mineral Water Cans (20L)", quantity: 10, unitPrice: 80 }
    ],
    vendorName: "Annapurna Grand Catering",
    vendorContact: "+91 98765 00112",
    deliveryTime: ISODate("2026-11-15T12:30:00Z"),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.expenses.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    category: "Catering",
    description: "Lunch catering via vendor Annapurna Grand Catering",
    amount: 27800,
    expenseDate: new Date(),
    recordedBy: ObjectId("6ae70115a2ab160fb98025c2"),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

---

## 12. Competitions, Teams, Judging & Prizes

### 12.1 Team Registration with Max Capacity Check
- **Controller:** `competitionController.registerTeam`
- **Mongoose:**
  ```javascript
  const comp = await Competition.findById(competitionId);
  const currentTeamCount = await Team.countDocuments({ competition: competitionId });

  if (comp.maxTeams && currentTeamCount >= comp.maxTeams) {
    throw new Error('Maximum teams capacity reached for this competition');
  }

  const team = await Team.create({
    competition: competitionId,
    teamName,
    teamLeader: req.user.id,
    members: members || []
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.teams.countDocuments({ competition: ObjectId("6ae70116a2ab160fb98025d1") });

  db.teams.insertOne({
    competition: ObjectId("6ae70116a2ab160fb98025d1"),
    teamName: "CodeInvaders",
    teamLeader: ObjectId("6ae70115a2ab160fb98025c3"),
    members: [
      { user: ObjectId("6ae70115a2ab160fb98025c4"), role: "Frontend Dev" }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 12.2 Submit Judge Evaluation Score
- **Controller:** `competitionController.submitScore`
- **Mongoose:**
  ```javascript
  const score = await JudgeScore.findOneAndUpdate(
    { competition: competitionId, team: teamId, judge: judgeId, criteria: criteriaId },
    { score: numericScore, remarks, submittedAt: new Date() },
    { upsert: true, new: true }
  );
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.judgescores.updateOne(
    {
      competition: ObjectId("6ae70116a2ab160fb98025d1"),
      team: ObjectId("6ae70116a2ab160fb98025e8"),
      judge: ObjectId("6ae70115a2ab160fb98025c5"),
      criteria: ObjectId("6ae70116a2ab160fb98025f5")
    },
    {
      $set: {
        score: 95,
        remarks: "Exceptional system design and offline resilience",
        submittedAt: new Date()
      }
    },
    { upsert: true }
  );
  ```

---

## 13. Certificates & Public Verification

### 13.1 Issue Event Certificate (Unique Verification Code)
- **Controller:** `certificateController.issueCertificate`
- **Mongoose:**
  ```javascript
  const verificationCode = `V-FEST26-${Math.floor(1000 + Math.random() * 9000)}`;
  const certificate = await Certificate.create({
    event: eventId,
    user: userId,
    certificateType: certificateType || 'Participation',
    issuedDate: new Date(),
    verificationCode
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.certificates.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3"),
    certificateType: "Participation",
    issuedDate: new Date(),
    verificationCode: "V-FEST26-8812",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 13.2 Public Certificate Verification Lookup
- **Controller:** `certificateController.verifyCertificate`
- **Mongoose:**
  ```javascript
  const certificate = await Certificate.findOne({ verificationCode })
    .populate('user', 'name email department')
    .populate('event', 'title startDate endDate venue');
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.certificates.findOne({ verificationCode: "V-FEST26-8812" });
  ```

---

## 14. Feedback & Rating Analytics

### 14.1 Submit Event Feedback
- **Controller:** `feedbackController.submitFeedback`
- **Mongoose:**
  ```javascript
  const feedback = await Feedback.create({
    event: eventId,
    user: req.user.id,
    rating,
    comments
  });
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.feedbacks.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3"),
    rating: 5,
    comments: "Seamless organization, brilliant keynote speakers!",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  ```

### 14.2 Aggregate Average Event Rating
- **Controller:** `feedbackController.getEventFeedback`
- **Mongoose:**
  ```javascript
  const feedbacks = await Feedback.find({ event: req.params.eventId });
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.feedbacks.aggregate([
    { $match: { event: ObjectId("6ae70116a2ab160fb98025e1") } },
    {
      $group: {
        _id: "$event",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  ```

---

## 15. Volunteer Coordination

### 15.1 Volunteer Application & Status Update
- **Controller:** `volunteerController.applyVolunteer` / `updateVolunteerStatus`
- **Mongoose:**
  ```javascript
  // 1. Submit volunteer application
  const volunteer = await Volunteer.create({
    event: eventId,
    user: req.user.id,
    assignedTask,
    hoursCommitted
  });

  // 2. Admin/Organizer approves application
  await Volunteer.findByIdAndUpdate(
    volunteerId,
    { status: 'approved', assignedTask: 'Stage Coordination' },
    { new: true }
  );
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.volunteers.insertOne({
    event: ObjectId("6ae70116a2ab160fb98025e1"),
    user: ObjectId("6ae70115a2ab160fb98025c3"),
    assignedTask: "Auditorium Logistics",
    hoursCommitted: 8,
    status: "applied",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.volunteers.updateOne(
    { _id: ObjectId("6ae70116a2ab160fb98025f8") },
    { $set: { status: "approved", assignedTask: "Stage Coordination" } }
  );
  ```

---

## 16. Dashboard Analytics & Executive Aggregations

### 16.1 System-Wide Platform KPI Aggregation
- **Controller:** `dashboardController.getDashboardStats`
- **Mongoose:**
  ```javascript
  const now = new Date();
  const [
    totalEvents,
    upcomingEvents,
    activeClubs,
    totalVenues,
    totalRegistrations,
    totalStudents
  ] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ endDate: { $gte: now }, status: { $in: ['published', 'ongoing'] } }),
    Club.countDocuments({ status: 'active' }),
    Venue.countDocuments(),
    Registration.countDocuments({ registrationStatus: { $ne: 'cancelled' } }),
    User.countDocuments({ role: 'student' })
  ]);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  const now = new Date();
  print("Total Events: " + db.events.countDocuments());
  print("Upcoming Events: " + db.events.countDocuments({ endDate: { $gte: now }, status: { $in: ["published", "ongoing"] } }));
  print("Active Clubs: " + db.clubs.countDocuments({ status: "active" }));
  print("Total Venues: " + db.venues.countDocuments());
  print("Active Registrations: " + db.registrations.countDocuments({ registrationStatus: { $ne: "cancelled" } }));
  print("Students Registered: " + db.users.countDocuments({ role: "student" }));
  ```

### 16.2 Event Category Distribution Breakdown
- **Controller:** `dashboardController.getDashboardStats`
- **Mongoose:**
  ```javascript
  const eventTypeBreakdown = await Event.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.events.aggregate([
    { $group: { _id: "$category", totalEvents: { $sum: 1 } } },
    { $sort: { totalEvents: -1 } }
  ]);
  ```

### 16.3 Active Memberships Count by Club
- **Controller:** `dashboardController.getDashboardStats`
- **Mongoose:**
  ```javascript
  const clubMembersCounts = await ClubMembership.aggregate([
    { $match: { membershipStatus: 'active' } },
    { $group: { _id: '$club', count: { $sum: 1 } } }
  ]);
  ```
- **Native MongoDB (`mongosh`):**
  ```javascript
  db.clubmemberships.aggregate([
    { $match: { membershipStatus: "active" } },
    { $group: { _id: "$club", totalMembers: { $sum: 1 } } }
  ]);
  ```

---

## 17. Database Auditing & Compass Inspection Queries

These native queries can be pasted directly into **MongoDB Compass** filter bars or executed in `mongosh`:

### 17.1 View All Available Free Events
- **Compass Filter:**
  ```json
  { "registrationFee": 0, "status": { "$in": ["published", "ongoing"] } }
  ```

### 17.2 Inspect User Roles & Associated Clubs
- **Compass Filter:**
  ```json
  { "role": { "$in": ["organizer", "faculty", "admin"] } }
  ```
- **Projection:**
  ```json
  { "name": 1, "email": 1, "role": 1, "clubs": 1, "department": 1 }
  ```

### 17.3 Find All Financial Transactions for a Specific Event
- **Compass Filter (Revenues Collection):**
  ```json
  { "event": { "$oid": "6ae70116a2ab160fb98025e1" } }
  ```
- **Compass Filter (Expenses Collection):**
  ```json
  { "event": { "$oid": "6ae70116a2ab160fb98025e1" } }
  ```

### 17.4 Find High-Capacity Venues (> 300 Capacity)
- **Compass Filter:**
  ```json
  { "capacity": { "$gte": 300 }, "status": "available" }
  ```

### 17.5 Check Certificate Authenticity by Verification Code
- **Compass Filter:**
  ```json
  { "verificationCode": "V-FEST26-8812" }
  ```

### 17.6 Verify Single Database State via Shell
```javascript
// Run in mongosh connected to mongodb://127.0.0.1:27017/festflow
use festflow;

const collections = db.getCollectionNames();
collections.forEach(col => {
  const count = db.getCollection(col).countDocuments();
  print(`${col.padEnd(25)} : ${count} documents`);
});
```
