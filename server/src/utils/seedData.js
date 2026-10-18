require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Club = require('../models/Club');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing collections
    await Registration.deleteMany();
    await Event.deleteMany();
    await Club.deleteMany();
    await Venue.deleteMany();
    await User.deleteMany();
    console.log('🧹 Cleared existing database records.');

    // 1. Create Users
    console.log('👤 Seeding users...');
    const admin = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'admin@festflow.edu',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '+91 98765 43210',
      department: 'Dean of Student Affairs'
    });

    const organizer = await User.create({
      name: 'Aarav Mehta',
      email: 'organizer@festflow.edu',
      password: 'OrganizerPassword123!',
      role: 'organizer',
      phone: '+91 98765 43211',
      participantType: 'student',
      registerNumber: '2023CS204',
      department: 'Computer Science and Engineering',
      programme: 'B.Tech',
      yearOfStudy: 3,
      section: 'A'
    });

    const student = await User.create({
      name: 'Ananya Iyer',
      email: 'student@festflow.edu',
      password: 'StudentPassword123!',
      role: 'student',
      phone: '+91 98765 43212',
      participantType: 'student',
      registerNumber: '2024EC105',
      department: 'Electronics & Communication',
      programme: 'B.Tech',
      yearOfStudy: 2,
      section: 'B'
    });

    // 2. Create Venues
    console.log('🏛️ Seeding venues...');
    const venues = await Venue.create([
      {
        name: 'Dr. APJ Abdul Kalam Auditorium',
        location: 'Central Academic Block, Ground Floor',
        capacity: 800,
        venueType: 'Auditorium',
        facilities: [
          { name: 'Dolby Surround Sound & Microphones', availabilityStatus: 'available' },
          { name: '4K Projection Screen', availabilityStatus: 'available' },
          { name: 'Central Air Conditioning', availabilityStatus: 'available' },
          { name: 'Stage Green Rooms', availabilityStatus: 'available' }
        ],
        status: 'available'
      },
      {
        name: 'Alan Turing Advanced Computing Lab',
        location: 'Tech Tower, 3rd Floor, Lab 304',
        capacity: 120,
        venueType: 'Lab',
        facilities: [
          { name: 'High-speed Gigabit Ethernet & Wi-Fi 6', availabilityStatus: 'available' },
          { name: 'Dual Monitor Workstations', availabilityStatus: 'available' },
          { name: 'Backup UPS Generator', availabilityStatus: 'available' }
        ],
        status: 'available'
      },
      {
        name: 'Open Air Amphitheatre',
        location: 'North Campus Greens',
        capacity: 1500,
        venueType: 'Open Ground',
        facilities: [
          { name: 'Stage Lighting Rig', availabilityStatus: 'available' },
          { name: 'Acoustic Sound Shell', availabilityStatus: 'available' },
          { name: 'Power Distribution Units', availabilityStatus: 'available' }
        ],
        status: 'available'
      },
      {
        name: 'Aryabhata Seminar Hall',
        location: 'Science Block, 1st Floor',
        capacity: 250,
        venueType: 'Seminar Hall',
        facilities: [
          { name: 'Smart Podium with Interactive Display', availabilityStatus: 'available' },
          { name: 'Video Conferencing Kit', availabilityStatus: 'available' }
        ],
        status: 'available'
      }
    ]);

    // 3. Create Clubs
    console.log('🛡️ Seeding clubs...');
    const clubs = await Club.create([
      {
        name: 'CodeNexus Developers Club',
        description: 'The premier technical club fostering software development, open-source contributions, hackathons, and algorithm design.',
        category: 'Technical',
        contactEmail: 'codenexus@festflow.edu',
        contactPhone: '+91 98765 00001',
        establishmentDate: new Date('2021-08-15'),
        organizers: [organizer._id],
        facultyCoordinator: {
          name: 'Prof. K. Sundaram',
          email: 'sundaram@festflow.edu',
          phone: '+91 94440 12345',
          department: 'Computer Science'
        },
        status: 'active'
      },
      {
        name: 'Dhwani Cultural & Music Society',
        description: 'Vibrant college society celebrating musical diversity, dance performances, acoustic sessions, and annual battle of the bands.',
        category: 'Cultural',
        contactEmail: 'dhwani@festflow.edu',
        contactPhone: '+91 98765 00002',
        establishmentDate: new Date('2019-01-26'),
        organizers: [organizer._id],
        facultyCoordinator: {
          name: 'Dr. Meenakshi Raman',
          email: 'meenakshi@festflow.edu',
          phone: '+91 94440 54321',
          department: 'Humanities'
        },
        status: 'active'
      },
      {
        name: 'RoboTech Innovation Club',
        description: 'Dedicated to robotics, embedded systems, IoT sensors, and autonomous drones.',
        category: 'Technical',
        contactEmail: 'robotech@festflow.edu',
        contactPhone: '+91 98765 00003',
        establishmentDate: new Date('2020-03-10'),
        organizers: [organizer._id],
        status: 'active'
      }
    ]);

    // 4. Create Events
    console.log('🎪 Seeding events...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 20);

    const events = await Event.create([
      {
        title: 'HackFlow 2026: 24-Hour National Hackathon',
        description: 'Join the premier 24-hour hackathon where brilliant minds gather to build AI agents, Web3 applications, and impactful civic tech solutions with mentorship from industry leaders.',
        eventType: 'Competition',
        category: 'Software & AI',
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '18:00',
        club: clubs[0]._id,
        venue: venues[1]._id,
        maxParticipants: 100,
        registrationDeadline: tomorrow,
        registrationFee: 0,
        chiefGuest: 'Mr. Nandan Nilekani (Virtual Keynote)',
        organizers: [organizer._id],
        createdBy: organizer._id,
        status: 'published'
      },
      {
        title: 'Symphony Under the Stars: Acoustic Night 2026',
        description: 'An unforgettable evening of soulful melodies, instrumental fusions, and live performances by our college bands and guest musical artists.',
        eventType: 'Cultural',
        category: 'Live Music',
        startDate: nextMonth,
        endDate: nextMonth,
        startTime: '17:30',
        endTime: '22:00',
        club: clubs[1]._id,
        venue: venues[2]._id,
        maxParticipants: 1200,
        registrationDeadline: new Date(nextMonth.getTime() - 2 * 24 * 60 * 60 * 1000),
        registrationFee: 50,
        chiefGuest: 'Ustad Zakir Hussain Youth Awardees',
        organizers: [organizer._id],
        createdBy: organizer._id,
        status: 'published'
      },
      {
        title: 'Generative AI & Agentic Workflows Workshop',
        description: 'Hands-on practical masterclass covering Large Language Models, tool calling, multi-agent frameworks, and building modern fullstack AI applications.',
        eventType: 'Workshop',
        category: 'Artificial Intelligence',
        startDate: tomorrow,
        endDate: tomorrow,
        startTime: '10:00',
        endTime: '16:00',
        club: clubs[0]._id,
        venue: venues[3]._id,
        maxParticipants: 150,
        registrationDeadline: new Date(tomorrow.getTime() - 12 * 60 * 60 * 1000),
        registrationFee: 0,
        chiefGuest: 'Senior AI Engineer, Google Cloud',
        organizers: [organizer._id],
        createdBy: organizer._id,
        status: 'published'
      }
    ]);

    // 5. Create a sample Registration
    console.log('🎟️ Seeding sample registration...');
    await Registration.create({
      user: student._id,
      event: events[0]._id,
      registrationType: 'solo',
      registrationStatus: 'registered',
      ticketNumber: 'FF-INIT-2026-001',
      fee: 0,
      qrCode: `FESTFLOW:TICKET:FF-INIT-2026-001:${events[0]._id}:${student._id}`
    });

    console.log('✨ Database successfully seeded!');
    console.log('----------------------------------------------------');
    console.log('Sample Accounts created for login:');
    console.log('1. Admin:     admin@festflow.edu     / AdminPassword123!');
    console.log('2. Organizer: organizer@festflow.edu / OrganizerPassword123!');
    console.log('3. Student:   student@festflow.edu   / StudentPassword123!');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedData();
