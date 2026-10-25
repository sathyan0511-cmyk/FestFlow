require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/server');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Club = require('../src/models/Club');
const Venue = require('../src/models/Venue');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const { Budget, Expense, Revenue } = require('../src/models/Finance');

const PORT = 5003;
let server;

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const runPermissionTests = async () => {
  console.log('🧪 Starting FestFlow Comprehensive Multi-Club Permission Test Suite...');
  await connectDB();

  server = app.listen(PORT, async () => {
    // Track fixtures to clean up
    const createdUserIds = [];
    const createdClubIds = [];
    const createdEventIds = [];
    const createdVenueIds = [];
    const createdRegIds = [];

    try {
      // 1. Setup isolated test venue
      const testVenue = await Venue.create({
        name: 'PermTest Innovation Arena',
        location: 'PermBlock 101',
        capacity: 500,
        venueType: 'Lab',
        status: 'available'
      });
      createdVenueIds.push(testVenue._id);

      // 2. Setup test users
      // Test Student
      const studentUser = await User.create({
        name: 'PermTest Student',
        email: `perm-student-${Date.now()}@festflow.edu`,
        password: 'Password123!',
        role: 'student'
      });
      createdUserIds.push(studentUser._id);

      // Test Organizer A (Multi-Club: will belong to Alpha & Beta)
      const orgAUser = await User.create({
        name: 'PermTest Org Multi',
        email: `perm-org-multi-${Date.now()}@festflow.edu`,
        password: 'Password123!',
        role: 'organizer'
      });
      createdUserIds.push(orgAUser._id);

      // Test Organizer B (Single-Club: will belong to Alpha only)
      const orgBUser = await User.create({
        name: 'PermTest Org Single',
        email: `perm-org-single-${Date.now()}@festflow.edu`,
        password: 'Password123!',
        role: 'organizer'
      });
      createdUserIds.push(orgBUser._id);

      // Test Organizer Other (Same club Alpha as Org B)
      const orgOtherUser = await User.create({
        name: 'PermTest Org OtherAlpha',
        email: `perm-org-other-${Date.now()}@festflow.edu`,
        password: 'Password123!',
        role: 'organizer'
      });
      createdUserIds.push(orgOtherUser._id);

      // 3. Setup test clubs
      // Club Alpha (Organizers: Org A, Org B, Org Other)
      const clubAlpha = await Club.create({
        name: `PermTest Club Alpha ${Date.now()}`,
        description: 'Alpha Club for testing permissions',
        category: 'Technical',
        organizers: [orgAUser._id, orgBUser._id, orgOtherUser._id]
      });
      createdClubIds.push(clubAlpha._id);

      // Club Beta (Organizers: Org A only)
      const clubBeta = await Club.create({
        name: `PermTest Club Beta ${Date.now()}`,
        description: 'Beta Club for testing permissions',
        category: 'Cultural',
        organizers: [orgAUser._id]
      });
      createdClubIds.push(clubBeta._id);

      // 4. Setup test events
      const tomorrow = new Date(Date.now() + 86400000 * 2);
      const nextWeek = new Date(Date.now() + 86400000 * 7);

      // Event Alpha 1: Club Alpha, created by Org Other
      const eventAlpha1 = await Event.create({
        title: 'PermTest Event Alpha 1',
        description: 'Alpha event created by Org Other',
        eventType: 'Technical',
        startDate: tomorrow,
        endDate: nextWeek,
        startTime: '10:00',
        endTime: '16:00',
        club: clubAlpha._id,
        venue: testVenue._id,
        maxParticipants: 100,
        registrationDeadline: tomorrow,
        createdBy: orgOtherUser._id,
        organizers: [orgOtherUser._id],
        status: 'published'
      });
      createdEventIds.push(eventAlpha1._id);

      // Event Alpha 2 (to test deletion): Club Alpha, created by Org Other
      const eventAlpha2 = await Event.create({
        title: 'PermTest Event Alpha 2 to Delete',
        description: 'Alpha event created by Org Other for deletion test',
        eventType: 'Technical',
        startDate: tomorrow,
        endDate: nextWeek,
        startTime: '10:00',
        endTime: '16:00',
        club: clubAlpha._id,
        venue: testVenue._id,
        maxParticipants: 100,
        registrationDeadline: tomorrow,
        createdBy: orgOtherUser._id,
        organizers: [orgOtherUser._id],
        status: 'published'
      });
      createdEventIds.push(eventAlpha2._id);

      // Event Beta 1: Club Beta, created by Org A
      const eventBeta1 = await Event.create({
        title: 'PermTest Event Beta 1',
        description: 'Beta event created by Org A',
        eventType: 'Cultural',
        startDate: tomorrow,
        endDate: nextWeek,
        startTime: '10:00',
        endTime: '16:00',
        club: clubBeta._id,
        venue: testVenue._id,
        maxParticipants: 100,
        registrationDeadline: tomorrow,
        createdBy: orgAUser._id,
        organizers: [orgAUser._id],
        status: 'published'
      });
      createdEventIds.push(eventBeta1._id);

      // 5. Authenticate all test roles
      // Student Token
      const studentAuth = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: studentUser.email, password: 'Password123!' }
      );
      const studentToken = studentAuth.data.token;

      // Org A Token (Multi: Alpha + Beta)
      const orgAAuth = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: orgAUser.email, password: 'Password123!' }
      );
      const orgAToken = orgAAuth.data.token;

      // Org B Token (Single: Alpha only)
      const orgBAuth = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: orgBUser.email, password: 'Password123!' }
      );
      const orgBToken = orgBAuth.data.token;

      // Admin Token
      const adminAuth = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: 'admin@festflow.edu', password: 'AdminPassword123!' }
      );
      const adminToken = adminAuth.data.token;

      console.log('✅ Test fixtures initialized successfully.');

      let passedCount = 0;
      let failedCount = 0;

      const assertCheck = (desc, condition, details = '') => {
        if (condition) {
          console.log(`[PASS] ${desc}`);
          passedCount++;
        } else {
          console.error(`[FAIL] ${desc} - Details: ${details}`);
          failedCount++;
        }
      };

      // --- TEST 1: Student views events across clubs (Allowed 200) ---
      const t1 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/events',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assertCheck('1. Student views events across clubs', t1.status === 200 && t1.data.count >= 2);

      // --- TEST 2: Student registers for another club\'s event (Allowed 201) ---
      const t2 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/registrations',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }
        },
        { eventId: eventAlpha1._id }
      );
      if (t2.data.registration) createdRegIds.push(t2.data.registration._id);
      assertCheck('2. Student registers for another club\'s event', t2.status === 201 && t2.data.success);

      // --- TEST 3: Student creates an event (Forbidden 403) ---
      const t3 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }
        },
        {
          title: 'Illegal Student Event',
          description: 'Should be rejected',
          eventType: 'Technical',
          startDate: tomorrow,
          endDate: nextWeek,
          startTime: '10:00',
          endTime: '16:00',
          club: clubAlpha._id,
          venue: testVenue._id,
          maxParticipants: 50,
          registrationDeadline: tomorrow
        }
      );
      assertCheck('3. Student creates an event -> Forbidden 403', t3.status === 403);

      // --- TEST 4: Student edits or deletes an event (Forbidden 403) ---
      const t4a = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/events/${eventAlpha1._id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }
        },
        { title: 'Hacked Title' }
      );
      const t4b = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/events/${eventAlpha1._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assertCheck('4. Student edits or deletes an event -> Forbidden 403', t4a.status === 403 && t4b.status === 403);

      // --- TEST 5: Organizer creates an event for an associated club (Allowed 201) ---
      const t5 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        {
          title: 'PermTest Event Alpha Created by OrgB',
          description: 'Valid event under authorized Club Alpha',
          eventType: 'Technical',
          startDate: tomorrow,
          endDate: nextWeek,
          startTime: '10:00',
          endTime: '16:00',
          club: clubAlpha._id,
          venue: testVenue._id,
          maxParticipants: 50,
          registrationDeadline: tomorrow
        }
      );
      if (t5.data?.event) createdEventIds.push(t5.data.event._id);
      assertCheck('5. Organizer creates an event for an associated club -> Allowed 201', t5.status === 201 && t5.data.success);

      // --- TEST 6: Organizer creates an event for an unrelated club (Forbidden 403) ---
      const t6 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        {
          title: 'Illegal OrgB Event under Beta',
          description: 'OrgB does NOT belong to Club Beta',
          eventType: 'Cultural',
          startDate: tomorrow,
          endDate: nextWeek,
          startTime: '10:00',
          endTime: '16:00',
          club: clubBeta._id,
          venue: testVenue._id,
          maxParticipants: 50,
          registrationDeadline: tomorrow
        }
      );
      assertCheck('6. Organizer creates an event for an unrelated club -> Forbidden 403', t6.status === 403);

      // --- TEST 7: Organizer edits another organizer\'s event in the same club (Allowed 200) ---
      const t7 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/events/${eventAlpha1._id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        { title: 'PermTest Event Alpha 1 Updated by Peer OrgB' }
      );
      assertCheck(
        '7. Organizer edits another organizer\'s event in the same club -> Allowed 200',
        t7.status === 200 && t7.data.event?.title === 'PermTest Event Alpha 1 Updated by Peer OrgB'
      );

      // --- TEST 8: Organizer deletes another organizer\'s event in the same club (Allowed 200) ---
      const t8 = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/events/${eventAlpha2._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${orgBToken}` }
      });
      assertCheck('8. Organizer deletes another organizer\'s event in the same club -> Allowed 200', t8.status === 200);

      // --- TEST 9: Organizer edits an unrelated club\'s event (Forbidden 403) ---
      const t9 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/events/${eventBeta1._id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        { title: 'Hacked Beta Event by OrgB' }
      );
      assertCheck('9. Organizer edits an unrelated club\'s event -> Forbidden 403', t9.status === 403);

      // --- TEST 10: Organizer belongs to two clubs and manages both (Allowed 200) ---
      const t10a = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/events/${eventAlpha1._id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgAToken}` }
        },
        { title: 'Alpha Event Managed by Multi-Club OrgA' }
      );
      const t10b = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/events/${eventBeta1._id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgAToken}` }
        },
        { title: 'Beta Event Managed by Multi-Club OrgA' }
      );
      assertCheck(
        '10. Organizer belongs to two clubs and manages both -> Allowed 200',
        t10a.status === 200 && t10b.status === 200
      );

      // --- TEST 11: Organizer registers for an event outside their clubs (Allowed 201) ---
      const t11 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/registrations',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        { eventId: eventBeta1._id }
      );
      if (t11.data?.registration) createdRegIds.push(t11.data.registration._id);
      assertCheck('11. Organizer registers for an event outside their clubs -> Allowed 201', t11.status === 201 && t11.data.success);

      // --- TEST 12: Organizer reads finances for an associated club\'s event (Allowed 200) ---
      const t12 = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/finances/event/${eventAlpha1._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${orgBToken}` }
      });
      assertCheck('12. Organizer reads finances for an associated club\'s event -> Allowed 200', t12.status === 200 && t12.data.success);

      // --- TEST 13: Organizer reads finances for an unrelated club\'s event (Forbidden 403) ---
      const t13 = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/finances/event/${eventBeta1._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${orgBToken}` }
      });
      assertCheck('13. Organizer reads finances for an unrelated club\'s event -> Forbidden 403', t13.status === 403);

      // --- TEST 14: Organizer creates or modifies financial records for an unrelated club (Forbidden 403) ---
      const t14expense = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/finances/expense',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        { eventId: eventBeta1._id, amount: 5000, description: 'Illegal expense' }
      );
      const t14budget = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/finances/budget',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgBToken}` }
        },
        { eventId: eventBeta1._id, allocatedAmount: 20000, approvedAmount: 20000 }
      );
      assertCheck(
        '14. Organizer creates or modifies financial records for an unrelated club -> Forbidden 403',
        t14expense.status === 403 && t14budget.status === 403
      );

      // --- TEST 15: Organizer requests aggregate/event list -> Unauthorized records excluded ---
      const t15 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/finances/events',
        method: 'GET',
        headers: { Authorization: `Bearer ${orgBToken}` }
      });
      const returnedEventIds = (t15.data?.events || []).map((e) => e._id.toString());
      const hasAlpha = returnedEventIds.includes(eventAlpha1._id.toString());
      const hasBeta = returnedEventIds.includes(eventBeta1._id.toString());
      assertCheck(
        '15. Organizer requests finance events -> Unauthorized records excluded in DB query',
        t15.status === 200 && hasAlpha && !hasBeta
      );

      // --- TEST 16: Admin performs existing authorized operations (Allowed 200) ---
      const t16 = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/finances/event/${eventBeta1._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assertCheck('16. Admin performs existing authorized operations -> Preserved 200', t16.status === 200 && t16.data.success);

      // --- TEST 17: Unauthenticated user attempts protected operation (Unauthorized 401) ---
      const t17 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { title: 'Anonymous event' }
      );
      assertCheck('17. Unauthenticated user attempts protected operation -> Unauthorized 401', t17.status === 401);

      console.log('\n====================================================');
      console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 17 tests`);
      console.log('====================================================');

      if (failedCount > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Test suite fatal error:', err);
      process.exit(1);
    } finally {
      // Clean up isolated test fixtures
      console.log('🧹 Cleaning up test fixtures from MongoDB Atlas...');
      try {
        if (createdRegIds.length > 0) await Registration.deleteMany({ _id: { $in: createdRegIds } });
        if (createdEventIds.length > 0) {
          await Budget.deleteMany({ event: { $in: createdEventIds } });
          await Expense.deleteMany({ event: { $in: createdEventIds } });
          await Revenue.deleteMany({ event: { $in: createdEventIds } });
          await Event.deleteMany({ _id: { $in: createdEventIds } });
        }
        if (createdClubIds.length > 0) await Club.deleteMany({ _id: { $in: createdClubIds } });
        if (createdVenueIds.length > 0) await Venue.deleteMany({ _id: { $in: createdVenueIds } });
        if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
        console.log('✨ Test fixtures successfully cleaned up.');
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }

      await mongoose.disconnect();
      server.close();
      process.exit(0);
    }
  });
};

runPermissionTests();
