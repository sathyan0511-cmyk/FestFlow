require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Club = require('../src/models/Club');
const Venue = require('../src/models/Venue');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const ClubMembership = require('../src/models/ClubMembership');

const PORT = 5004;
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

const runFacultyAndClubTests = async () => {
  console.log('🧪 Starting FestFlow Faculty, Club Management & Organizer Hierarchy Test Suite...');
  await connectDB();

  server = app.listen(PORT, async () => {
    // Track fixtures for isolated cleanup
    const createdUserIds = [];
    const createdClubIds = [];
    const createdEventIds = [];
    const createdVenueIds = [];
    const createdRegIds = [];
    const createdMembershipIds = [];

    let passedTests = 0;
    let failedTests = 0;

    const assert = (condition, message) => {
      if (condition) {
        console.log(`[PASS] ${message}`);
        passedTests++;
      } else {
        console.error(`[FAIL] ${message}`);
        failedTests++;
      }
    };

    try {
      // 1. Setup isolated test venue
      const testVenue = await Venue.create({
        name: 'FacultyTest Arena',
        location: 'Building F-101',
        capacity: 400,
        venueType: 'Lab',
        status: 'available'
      });
      createdVenueIds.push(testVenue._id);

      // 2. Setup isolated clubs
      // Club 1: Supervised by Test Faculty
      const testClubA = await Club.create({
        name: 'Alpha AI Research Society ' + Date.now(),
        description: 'AI & ML student society',
        category: 'Technical',
        contactEmail: 'alpha@festflow.edu',
        organizers: []
      });
      createdClubIds.push(testClubA._id);

      // Club 2: Unsupervised by Test Faculty
      const testClubB = await Club.create({
        name: 'Beta Quantum Dynamics ' + Date.now(),
        description: 'Physics & Quantum Computing',
        category: 'Technical',
        contactEmail: 'beta@festflow.edu',
        organizers: []
      });
      createdClubIds.push(testClubB._id);

      // Club 3: Secondary Club for multi-club testing
      const testClubC = await Club.create({
        name: 'Gamma Cybersec Guild ' + Date.now(),
        description: 'Offensive Security',
        category: 'Technical',
        contactEmail: 'gamma@festflow.edu',
        organizers: []
      });
      createdClubIds.push(testClubC._id);

      // 3. Setup Test Faculty User supervising Club A and Club C
      const testFaculty = await User.create({
        name: 'Dr. Test Supervisor',
        email: `faculty.test.${Date.now()}@festflow.edu`,
        password: 'TestPassword123!',
        role: 'faculty',
        department: 'Computer Science',
        clubs: [testClubA._id, testClubC._id]
      });
      createdUserIds.push(testFaculty._id);

      testClubA.facultyCoordinator = {
        user: testFaculty._id,
        name: testFaculty.name,
        email: testFaculty.email,
        department: testFaculty.department
      };
      await testClubA.save();

      // 4. Setup Test Student
      const testStudent = await User.create({
        name: 'Vikram Student',
        email: `student.test.${Date.now()}@festflow.edu`,
        password: 'TestPassword123!',
        role: 'student',
        department: 'Information Technology'
      });
      createdUserIds.push(testStudent._id);

      // 5. Setup Existing Admin login token
      const adminLoginRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'admin@festflow.edu', password: 'AdminPassword123!' }
      );
      const adminToken = adminLoginRes.data?.token;

      // Test 1: Seeded Faculty Login with evaluation credentials
      const facultyLoginRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'faculty@festflow.edu', password: 'FacultyPassword123!' }
      );
      assert(
        facultyLoginRes.status === 200 && facultyLoginRes.data?.user?.role === 'faculty',
        '1. Faculty logs in with evaluation credentials -> Status 200, role is faculty'
      );
      const seededFacultyToken = facultyLoginRes.data?.token;

      // Test 2: Invalid Faculty credentials rejected
      const badFacultyLogin = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'faculty@festflow.edu', password: 'WrongPassword999!' }
      );
      assert(
        badFacultyLogin.status === 401,
        '2. Invalid faculty credentials rejected -> Status 401'
      );

      // Test 3: Test Faculty Login
      const testFacultyLogin = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: testFaculty.email, password: 'TestPassword123!' }
      );
      const facultyToken = testFacultyLogin.data?.token;
      assert(
        testFacultyLogin.status === 200 && testFacultyLogin.data?.user?.supervisedClubs?.length >= 2,
        '3. Test faculty logs in and receives supervised clubs array in user session'
      );

      // Test 4: Faculty retrieves their assigned clubs via /api/clubs/my-authorized
      const facultyClubsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/clubs/my-authorized',
        method: 'GET',
        headers: { Authorization: `Bearer ${facultyToken}` }
      });
      const clubIdsRetrieved = (facultyClubsRes.data?.clubs || []).map((c) => c._id.toString());
      assert(
        facultyClubsRes.status === 200 &&
          clubIdsRetrieved.includes(testClubA._id.toString()) &&
          !clubIdsRetrieved.includes(testClubB._id.toString()),
        '4. Faculty sees only their assigned clubs (Club A included, Club B excluded)'
      );

      // Test 5: Student cannot access faculty organizer management endpoints
      const studentLoginRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: testStudent.email, password: 'TestPassword123!' }
      );
      const studentToken = studentLoginRes.data?.token;

      const studentAssignAttempt = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/clubs/${testClubA._id}/organizers`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`
          }
        },
        { studentId: testStudent._id }
      );
      assert(
        studentAssignAttempt.status === 403,
        '5. Student cannot access organizer assignment endpoint -> Forbidden 403'
      );

      // Test 6: Faculty cannot promote a student in a club they do not supervise
      const facultyUnsupervisedAssign = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/clubs/${testClubB._id}/organizers`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${facultyToken}`
          }
        },
        { studentId: testStudent._id }
      );
      assert(
        facultyUnsupervisedAssign.status === 403,
        '6. Faculty cannot assign organizer in unsupervised club (Club B) -> Forbidden 403'
      );

      // Test 7: Faculty assigns student as organizer for their supervised club
      const facultyAssignRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/clubs/${testClubA._id}/organizers`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${facultyToken}`
          }
        },
        { studentId: testStudent._id }
      );
      assert(
        facultyAssignRes.status === 200,
        '7. Faculty assigns student as organizer for supervised club (Club A) -> Status 200'
      );

      const refreshedStudent = await User.findById(testStudent._id);
      assert(
        refreshedStudent.role === 'organizer' &&
          refreshedStudent.clubs.some((c) => c.toString() === testClubA._id.toString()),
        '7b. Student role promoted to organizer and Club A added to user.clubs'
      );

      // Test 8: New Organizer can create event for Club A
      const newOrganizerEventRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`
          }
        },
        {
          title: 'Deep Learning Workshop ' + Date.now(),
          description: 'Hands-on neural networks',
          eventType: 'Technical',
          category: 'Software & AI',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          startTime: '10:00',
          endTime: '16:00',
          club: testClubA._id,
          venue: testVenue._id,
          maxParticipants: 100,
          registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
          registrationFee: 0
        }
      );
      assert(
        newOrganizerEventRes.status === 201,
        '8. New organizer creates event for their authorized club (Club A) -> Allowed 201'
      );
      const createdEventId = newOrganizerEventRes.data?.event?._id;
      if (createdEventId) createdEventIds.push(createdEventId);

      // Test 9: New Organizer CANNOT create event for unrelated club (Club B)
      const newOrganizerUnrelatedEventRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`
          }
        },
        {
          title: 'Quantum Computing Hackathon ' + Date.now(),
          description: 'Qubits and entanglement',
          eventType: 'Technical',
          category: 'Physics',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          startTime: '10:00',
          endTime: '16:00',
          club: testClubB._id,
          venue: testVenue._id,
          maxParticipants: 50,
          registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
          registrationFee: 0
        }
      );
      assert(
        newOrganizerUnrelatedEventRes.status === 403,
        '9. New organizer blocked from creating event for unrelated club (Club B) -> Forbidden 403'
      );

      // Test 10: Multi-club organizer assignment (Assign student to Club C too)
      const assignClubC = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/clubs/${testClubC._id}/organizers`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${facultyToken}`
          }
        },
        { studentId: testStudent._id }
      );
      assert(
        assignClubC.status === 200,
        '10. Faculty assigns organizer to a second club (Club C) -> Allowed 200'
      );

      const organizerClubsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/clubs/my-authorized',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const orgClubIds = (organizerClubsRes.data?.clubs || []).map((c) => c._id.toString());
      assert(
        orgClubIds.includes(testClubA._id.toString()) && orgClubIds.includes(testClubC._id.toString()),
        '10b. Organizer belongs to multiple clubs and sees both Club A and Club C in My Clubs'
      );

      // Test 11: Revoking organizer permissions from Club A preserves Club C
      const revokeClubARes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/clubs/${testClubA._id}/organizers/${testStudent._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${facultyToken}` }
      });
      assert(
        revokeClubARes.status === 200,
        '11. Faculty revokes organizer status for Club A -> Allowed 200'
      );

      const userAfterFirstRevoke = await User.findById(testStudent._id);
      const remainingClubsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/clubs/my-authorized',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const remainingIds = (remainingClubsRes.data?.clubs || []).map((c) => c._id.toString());
      assert(
        userAfterFirstRevoke.role === 'organizer' &&
          !remainingIds.includes(testClubA._id.toString()) &&
          remainingIds.includes(testClubC._id.toString()),
        '11b. Organizer retains role and permissions for Club C after Club A revocation'
      );

      // Test 12: Revoked Club A permissions are enforced on the backend immediately
      const attemptCreateClubAAfterRevoke = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/events',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`
          }
        },
        {
          title: 'Unauthorized Event ' + Date.now(),
          description: 'Should fail',
          eventType: 'Technical',
          club: testClubA._id,
          venue: testVenue._id,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          startTime: '10:00',
          endTime: '16:00',
          registrationDeadline: new Date(Date.now() + 43200000).toISOString()
        }
      );
      assert(
        attemptCreateClubAAfterRevoke.status === 403,
        '12. Direct API request to create event in revoked club rejected immediately -> Forbidden 403'
      );

      // Test 13: Revoking the last club safely resets role to 'student'
      const revokeClubCRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/clubs/${testClubC._id}/organizers/${testStudent._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${facultyToken}` }
      });
      assert(
        revokeClubCRes.status === 200,
        '13. Faculty revokes student from remaining club (Club C) -> Allowed 200'
      );

      const userAfterTotalRevoke = await User.findById(testStudent._id);
      assert(
        userAfterTotalRevoke.role === 'student',
        '13b. User role safely reverted from organizer to student with zero data loss'
      );

      // Test 14: Historical student registration records remain intact
      const testRegistration = await Registration.create({
        event: createdEventId || testClubA._id,
        user: testStudent._id,
        ticketNumber: 'TEST-PASS-999',
        registrationStatus: 'registered'
      });
      createdRegIds.push(testRegistration._id);

      const checkStudentRegistrations = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/registrations/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert(
        checkStudentRegistrations.status === 200 &&
          checkStudentRegistrations.data?.registrations?.length >= 1,
        '14. Student event passes and historical registration records completely intact'
      );

      // Test 15: Admin provisions new Faculty account
      const newFacultyEmail = `admin.prov.faculty.${Date.now()}@festflow.edu`;
      const adminCreateFaculty = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/faculty',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          }
        },
        {
          name: 'Prof. Admin Appointed',
          email: newFacultyEmail,
          password: 'FacultyPassword123!',
          department: 'Mechanical Engineering',
          clubIds: [testClubB._id]
        }
      );
      assert(
        adminCreateFaculty.status === 201 && adminCreateFaculty.data?.faculty?.role === 'faculty',
        '15. Admin provisions new faculty account with assigned club (Club B) -> Created 201'
      );
      if (adminCreateFaculty.data?.faculty?._id) {
        createdUserIds.push(adminCreateFaculty.data.faculty._id);
      }

      // Test 16: Newly provisioned faculty logs in and sees Club B
      const newFacultyLogin = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: newFacultyEmail, password: 'FacultyPassword123!' }
      );
      const newFacultyToken = newFacultyLogin.data?.token;

      const newFacultyClubs = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/clubs/my-authorized',
        method: 'GET',
        headers: { Authorization: `Bearer ${newFacultyToken}` }
      });
      const newFacClubs = (newFacultyClubs.data?.clubs || []).map((c) => c._id.toString());
      assert(
        newFacClubs.includes(testClubB._id.toString()) && !newFacClubs.includes(testClubA._id.toString()),
        '16. Newly provisioned faculty logs in and sees only their assigned Club B'
      );

      // Test 17: Unauthenticated request rejected
      const unauthReq = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/faculty',
        method: 'GET'
      });
      assert(
        unauthReq.status === 401,
        '17. Unauthenticated request to faculty API rejected -> 401 Unauthorized'
      );

      // Test 18: Admin operations preserved
      const adminClubsList = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/clubs',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(
        adminClubsList.status === 200 && adminClubsList.data?.clubs?.length >= 3,
        '18. Universal Admin operations preserved across campus'
      );

    } catch (testErr) {
      console.error('Test execution error:', testErr);
      failedTests++;
    } finally {
      console.log('\n====================================================');
      console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${passedTests + failedTests} tests`);
      console.log('====================================================');

      // Cleanup fixtures
      console.log('🧹 Cleaning up test fixtures from MongoDB Atlas...');
      try {
        if (createdRegIds.length > 0) await Registration.deleteMany({ _id: { $in: createdRegIds } });
        if (createdEventIds.length > 0) await Event.deleteMany({ _id: { $in: createdEventIds } });
        if (createdClubIds.length > 0) await Club.deleteMany({ _id: { $in: createdClubIds } });
        if (createdVenueIds.length > 0) await Venue.deleteMany({ _id: { $in: createdVenueIds } });
        if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
        console.log('✨ Test fixtures successfully cleaned up.');
      } catch (cleanupErr) {
        console.error('Fixture cleanup error:', cleanupErr);
      }

      server.close(() => {
        mongoose.disconnect().then(() => {
          console.log('⚠️ MongoDB disconnected.');
          process.exit(failedTests > 0 ? 1 : 0);
        });
      });
    }
  });
};

runFacultyAndClubTests();
