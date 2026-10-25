require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function provisionFaculty() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../src/models/User');
    const Club = require('../src/models/Club');
    const ClubMembership = require('../src/models/ClubMembership');

    const facultyEmail = 'faculty@festflow.edu';
    let faculty = await User.findOne({ email: facultyEmail });

    const codeNexus = await Club.findOne({ name: { $regex: /CodeNexus/i } });
    if (!codeNexus) {
      console.error('CodeNexus club not found');
      process.exit(1);
    }

    if (!faculty) {
      console.log('Creating demo faculty user...');
      faculty = await User.create({
        name: 'Prof. K. Sundaram',
        email: facultyEmail,
        password: 'FacultyPassword123!',
        role: 'faculty',
        department: 'Computer Science',
        phone: '+91 94440 12345',
        clubs: [codeNexus._id]
      });
      console.log('✅ Demo faculty created:', faculty._id);
    } else {
      console.log('Faculty account already exists:', faculty._id);
      faculty.password = 'FacultyPassword123!';
      faculty.clubs = faculty.clubs || [];
      if (!faculty.clubs.some((c) => c.toString() === codeNexus._id.toString())) {
        faculty.clubs.push(codeNexus._id);
      }
      await faculty.save();
      console.log('✅ Faculty password reset to FacultyPassword123!');
    }

    // Associate with CodeNexus club
    codeNexus.facultyCoordinator = {
      user: faculty._id,
      name: 'Prof. K. Sundaram',
      email: facultyEmail,
      phone: '+91 94440 12345',
      department: 'Computer Science'
    };
    await codeNexus.save();
    console.log('✅ CodeNexus facultyCoordinator updated with faculty user reference');

    // Create or update membership
    await ClubMembership.findOneAndUpdate(
      { club: codeNexus._id, user: faculty._id },
      {
        club: codeNexus._id,
        user: faculty._id,
        memberType: 'faculty',
        role: 'coordinator',
        membershipStatus: 'active'
      },
      { upsert: true, new: true }
    );
    console.log('✅ ClubMembership recorded for faculty');

    await mongoose.disconnect();
    console.log('✨ Provisioning completed successfully.');
  } catch (err) {
    console.error('Provisioning error:', err);
    process.exit(1);
  }
}

provisionFaculty();
