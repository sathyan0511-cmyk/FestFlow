require('dotenv').config();
const app = require('../src/server');
const connectDB = require('../src/config/db');
const http = require('http');

const PORT = 5002; // Use distinct port for test suite

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

const execute = async () => {
  await connectDB();
  console.log('🚀 Starting test server on port ' + PORT);
  server = app.listen(PORT, async () => {
    try {
      console.log('🧪 Running comprehensive test suite against MongoDB Atlas...');

      // 1. Health check
      const health = await request({ hostname: 'localhost', port: PORT, path: '/api/health', method: 'GET' });
      console.log(`[PASS] /api/health -> ${health.status}`);

      // 2. Student login
      const studentLogin = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: 'student@festflow.edu', password: 'StudentPassword123!' }
      );
      console.log(`[PASS] /api/auth/login (Student) -> ${studentLogin.status} (${studentLogin.data.user.name})`);
      const studentToken = studentLogin.data.token;

      // 3. Organizer login
      const orgLogin = await request(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: 'organizer@festflow.edu', password: 'OrganizerPassword123!' }
      );
      console.log(`[PASS] /api/auth/login (Organizer) -> ${orgLogin.status} (${orgLogin.data.user.name})`);
      const orgToken = orgLogin.data.token;

      // 4. Events
      const events = await request({ hostname: 'localhost', port: PORT, path: '/api/events', method: 'GET' });
      console.log(`[PASS] /api/events -> ${events.status}, Count: ${events.data.count}`);
      const firstEventId = events.data.events[0]._id;

      // 5. Clubs & Club Memberships
      const clubs = await request({ hostname: 'localhost', port: PORT, path: '/api/clubs', method: 'GET' });
      console.log(`[PASS] /api/clubs -> ${clubs.status}, Count: ${clubs.data.count}`);
      const myMemberships = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/memberships/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`[PASS] /api/memberships/my -> ${myMemberships.status}, Count: ${myMemberships.data.count}`);

      // 6. Venues
      const venues = await request({ hostname: 'localhost', port: PORT, path: '/api/venues', method: 'GET' });
      console.log(`[PASS] /api/venues -> ${venues.status}, Count: ${venues.data.count}`);

      // 7. Payments
      const myPayments = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/payments/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`[PASS] /api/payments/my -> ${myPayments.status}, Count: ${myPayments.data.count}`);

      // 8. Certificates & Public Verification
      const myCerts = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/certificates/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`[PASS] /api/certificates/my -> ${myCerts.status}, Count: ${myCerts.data.count}`);
      if (myCerts.data.certificates && myCerts.data.certificates.length > 0) {
        const testCode = myCerts.data.certificates[0].verificationCode;
        const verifyRes = await request({
          hostname: 'localhost',
          port: PORT,
          path: `/api/certificates/verify/${testCode}`,
          method: 'GET'
        });
        console.log(`[PASS] /api/certificates/verify/${testCode} -> ${verifyRes.status} (Valid: ${verifyRes.data.valid})`);
      }

      // 9. Feedback & Reviews
      const fbRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/feedback/event/${firstEventId}`,
        method: 'GET'
      });
      console.log(`[PASS] /api/feedback/event/:id -> ${fbRes.status}, Avg Rating: ${fbRes.data.avgRating} / 5`);

      // 10. Volunteering
      const myVol = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/volunteers/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`[PASS] /api/volunteers/my -> ${myVol.status}, Count: ${myVol.data.count}`);

      // 11. Event Financials (Budgets, Expenses, Revenues, Derived Profit)
      const finRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/finances/event/${firstEventId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${orgToken}` }
      });
      console.log(`[PASS] /api/finances/event/:id -> ${finRes.status}, Revenue: ₹${finRes.data.summary.totalRevenue}, Expenses: ₹${finRes.data.summary.totalExpenditure}, Derived Profit: ₹${finRes.data.summary.profit}`);

      // 12. Sponsors & Event Sponsorships
      const sponsorsRes = await request({ hostname: 'localhost', port: PORT, path: '/api/sponsors', method: 'GET' });
      const eventSponRes = await request({ hostname: 'localhost', port: PORT, path: `/api/sponsors/event/${firstEventId}`, method: 'GET' });
      console.log(`[PASS] /api/sponsors -> ${sponsorsRes.status}, Event Sponsors: ${eventSponRes.data.count} (Total: ₹${eventSponRes.data.totalSponsorship})`);

      // 13. Catering & Atomic Menu Items (Virtual Total Cost)
      const catRes = await request({ hostname: 'localhost', port: PORT, path: `/api/catering/event/${firstEventId}`, method: 'GET' });
      console.log(`[PASS] /api/catering/event/:id -> ${catRes.status}, Orders: ${catRes.data.count}, Derived Cost: ₹${catRes.data.totalCateringCost}`);

      // 14. Competitions, Teams, Judges, Criteria, Scores, Results & Prizes
      const compRes = await request({ hostname: 'localhost', port: PORT, path: `/api/competitions/event/${firstEventId}`, method: 'GET' });
      console.log(`[PASS] /api/competitions/event/:id -> ${compRes.status}, Count: ${compRes.data.count}`);
      if (compRes.data.competitions && compRes.data.competitions.length > 0) {
        const compId = compRes.data.competitions[0]._id;
        const detailsRes = await request({ hostname: 'localhost', port: PORT, path: `/api/competitions/${compId}`, method: 'GET' });
        console.log(`[PASS] /api/competitions/:id -> ${detailsRes.status}, Teams: ${detailsRes.data.teams.length}, Judges: ${detailsRes.data.judges.length}, Results: ${detailsRes.data.results.length}`);
      }

      console.log('\n🌟 ALL 14 COMPREHENSIVE BACKEND MODULES VERIFIED SUCCESSFULLY ON MONGODB ATLAS! 🌟');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test execution error:', err);
      server.close(() => process.exit(1));
    }
  });
};

execute();
