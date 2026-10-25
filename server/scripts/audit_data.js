require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../src/models/User');
    const Club = require('../src/models/Club');
    const ClubMembership = require('../src/models/ClubMembership');

    const users = await User.find({}, 'name email role clubs');
    console.log('=== USERS ===');
    console.log(JSON.stringify(users, null, 2));

    const clubs = await Club.find({}, 'name facultyCoordinator organizers');
    console.log('=== CLUBS ===');
    console.log(JSON.stringify(clubs, null, 2));

    const memberships = await ClubMembership.find({}).populate('user', 'name email').populate('club', 'name');
    console.log('=== MEMBERSHIPS ===');
    console.log(JSON.stringify(memberships, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Audit error:', err);
    process.exit(1);
  }
}
check();
