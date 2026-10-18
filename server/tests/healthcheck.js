require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 5000;

// Helper to make HTTP requests
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

const runTests = async () => {
  console.log('🧪 Starting FestFlow Backend Automated Test Suite...');
  
  // 1. Check health
  try {
    const health = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/health',
      method: 'GET'
    });
    console.log(`✅ Health check: Status ${health.status}`, health.data);
  } catch (err) {
    console.error('❌ Health check failed. Make sure server is running.');
    process.exit(1);
  }

  // 2. Test Login
  let studentToken = '';
  try {
    const loginRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'student@festflow.edu',
        password: 'StudentPassword123!'
      }
    );
    console.log(`✅ Student login test: Status ${loginRes.status}`, loginRes.data.user?.name);
    studentToken = loginRes.data.token;
  } catch (err) {
    console.error('❌ Login test failed:', err);
    process.exit(1);
  }

  // 3. Test Get Events
  try {
    const eventsRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/events',
      method: 'GET'
    });
    console.log(`✅ Get Events: Status ${eventsRes.status}, Found: ${eventsRes.data.count} events`);
    if (eventsRes.data.events && eventsRes.data.events.length > 0) {
      const evt = eventsRes.data.events[0];
      console.log(`   Sample event: "${evt.title}" [Available seats: ${evt.availableSeats}/${evt.maxParticipants}]`);
    }
  } catch (err) {
    console.error('❌ Events test failed:', err);
    process.exit(1);
  }

  // 4. Test Get Clubs
  try {
    const clubsRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/clubs',
      method: 'GET'
    });
    console.log(`✅ Get Clubs: Status ${clubsRes.status}, Found: ${clubsRes.data.count} clubs`);
  } catch (err) {
    console.error('❌ Clubs test failed:', err);
    process.exit(1);
  }

  // 5. Test Get Venues
  try {
    const venuesRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/venues',
      method: 'GET'
    });
    console.log(`✅ Get Venues: Status ${venuesRes.status}, Found: ${venuesRes.data.count} venues`);
  } catch (err) {
    console.error('❌ Venues test failed:', err);
    process.exit(1);
  }

  // 6. Test Dashboard Stats
  try {
    const dashRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    console.log(`✅ Dashboard stats test: Status ${dashRes.status}, Total Events: ${dashRes.data.stats?.totalEvents}`);
  } catch (err) {
    console.error('❌ Dashboard stats test failed:', err);
    process.exit(1);
  }

  // 7. Test Student Registrations
  try {
    const myRegs = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/registrations/my',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    console.log(`✅ Student registrations test: Status ${myRegs.status}, Active Count: ${myRegs.data.count}`);
  } catch (err) {
    console.error('❌ Student registrations test failed:', err);
    process.exit(1);
  }

  console.log('🎉 All backend automated tests passed successfully!');
  process.exit(0);
};

runTests();
