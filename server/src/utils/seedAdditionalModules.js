require('dotenv').config();
const mongoose = require('mongoose');

// Existing models
const User = require('../models/User');
const Club = require('../models/Club');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// New models
const ClubMembership = require('../models/ClubMembership');
const Payment = require('../models/Payment');
const Certificate = require('../models/Certificate');
const Feedback = require('../models/Feedback');
const Volunteer = require('../models/Volunteer');
const { Budget, Expense, Revenue } = require('../models/Finance');
const { Sponsor, EventSponsor } = require('../models/Sponsor');
const Catering = require('../models/Catering');
const {
  Competition,
  Team,
  Judge,
  JudgingCriteria,
  JudgeScore,
  Prize,
  Result
} = require('../models/Competition');

const seedAdditional = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('🌱 Connected to MongoDB Atlas to initialize advanced modules...');

    // Fetch existing entities
    const student = await User.findOne({ email: 'student@festflow.edu' });
    const organizer = await User.findOne({ email: 'organizer@festflow.edu' });
    const admin = await User.findOne({ email: 'admin@festflow.edu' });
    const event = await Event.findOne().sort({ startDate: 1 });
    const club = await Club.findOne();
    const registration = await Registration.findOne({ user: student?._id });

    if (!student || !event || !club) {
      console.error('Core entities missing. Please check existing database.');
      process.exit(1);
    }

    // 1. Club Membership
    const existingMembership = await ClubMembership.findOne({ club: club._id, user: student._id });
    if (!existingMembership) {
      await ClubMembership.create({
        club: club._id,
        user: student._id,
        memberType: 'student',
        membershipStatus: 'active',
        role: 'member'
      });
      console.log('✅ Seeded Club Membership');
    }

    // 2. Payment (for registration)
    if (registration) {
      const existingPayment = await Payment.findOne({ registration: registration._id });
      if (!existingPayment) {
        await Payment.create({
          registration: registration._id,
          event: event._id,
          user: student._id,
          amount: event.registrationFee || 0,
          paymentMethod: 'upi',
          transactionId: 'TXN-INIT-2026-UPI99',
          paymentStatus: 'completed'
        });
        console.log('✅ Seeded Payment record');
      }
    }

    // 3. Certificate
    const existingCert = await Certificate.findOne({ event: event._id, user: student._id });
    if (!existingCert) {
      await Certificate.create({
        certificateNo: 'CERT-2026-FEST-001',
        certificateType: 'participation',
        event: event._id,
        user: student._id,
        verificationCode: 'V-FEST26-8812',
        status: 'issued'
      });
      console.log('✅ Seeded Certificate');
    }

    // 4. Feedback
    const existingFeedback = await Feedback.findOne({ event: event._id, user: student._id });
    if (!existingFeedback) {
      await Feedback.create({
        event: event._id,
        user: student._id,
        rating: 5,
        comments: 'Outstanding organisation, brilliant venue facilities and seamless check-in experience!'
      });
      console.log('✅ Seeded Event Feedback');
    }

    // 5. Volunteer
    const existingVolunteer = await Volunteer.findOne({ event: event._id, user: student._id });
    if (!existingVolunteer) {
      await Volunteer.create({
        event: event._id,
        user: student._id,
        assignedTask: 'Participant Registration Desk & Badge Distribution',
        shiftStart: '08:30',
        shiftEnd: '14:00',
        volunteerStatus: 'assigned'
      });
      console.log('✅ Seeded Volunteer record');
    }

    // 6. Finances: Budget, Expense, Revenue
    const existingBudget = await Budget.findOne({ event: event._id });
    if (!existingBudget) {
      await Budget.create({
        event: event._id,
        allocatedAmount: 150000,
        approvedAmount: 140000,
        budgetStatus: 'approved',
        approvalDate: new Date()
      });

      await Expense.create([
        {
          event: event._id,
          amount: 25000,
          expenseCategory: 'equipment',
          description: 'Sound stage, audio monitors and wireless mic setup'
        },
        {
          event: event._id,
          amount: 35000,
          expenseCategory: 'catering',
          description: 'Refreshments, lunch buffet, and high tea for attendees'
        },
        {
          event: event._id,
          amount: 15000,
          expenseCategory: 'prizes',
          description: 'Trophies, medals, and gift vouchers for winners'
        }
      ]);

      await Revenue.create([
        {
          event: event._id,
          revenueType: 'sponsorship',
          amount: 80000,
          description: 'Title sponsorship grant from TechCorp Solutions'
        },
        {
          event: event._id,
          revenueType: 'registration_fees',
          amount: 25000,
          description: 'Ticket receipts from external participant registrations'
        }
      ]);
      console.log('✅ Seeded Event Financials (Budget, Expenses, Revenues)');
    }

    // 7. Sponsor & EventSponsor
    let sponsor = await Sponsor.findOne({ name: 'TechCorp Global Solutions' });
    if (!sponsor) {
      sponsor = await Sponsor.create({
        name: 'TechCorp Global Solutions',
        contactPerson: 'Vikram Sengupta',
        email: 'partnerships@techcorp.io',
        phone: '+91 98765 99999',
        organizationType: 'corporate',
        address: 'Cyber City, Phase 2, Gurugram'
      });
    }

    const existingEventSponsor = await EventSponsor.findOne({ event: event._id, sponsor: sponsor._id });
    if (!existingEventSponsor) {
      await EventSponsor.create({
        event: event._id,
        sponsor: sponsor._id,
        sponsorshipType: 'Title',
        sponsorshipAmount: 80000,
        sponsorshipStatus: 'received'
      });
      console.log('✅ Seeded Sponsor & Event Sponsorship');
    }

    // 8. Catering & Menu
    const existingCatering = await Catering.findOne({ event: event._id });
    if (!existingCatering) {
      await Catering.create({
        event: event._id,
        catererName: 'Annapoorna Campus Hospitality',
        contactPerson: 'Chef Raghavan',
        phone: '+91 94444 88888',
        email: 'catering@annapoorna.in',
        menu: [
          { menuItem: 'Executive South Indian Lunch Thali', quantity: 150, costPerUnit: 120 },
          { menuItem: 'Artisan Filter Coffee & Snack Box', quantity: 200, costPerUnit: 40 },
          { menuItem: 'Mineral Water (250ml Bottles)', quantity: 300, costPerUnit: 10 }
        ],
        status: 'confirmed'
      });
      console.log('✅ Seeded Catering and Catering Menu Items');
    }

    // 9. Competition, Team, Judge, Criteria, Scores, Prizes, Results
    let competition = await Competition.findOne({ event: event._id });
    if (!competition) {
      competition = await Competition.create({
        event: event._id,
        competitionName: 'National AI Agent Hack Challenge',
        description: 'Build an autonomous multi-agent fullstack application solving real-world campus problems within 24 hours.',
        competitionType: 'hackathon',
        maximumTeams: 30,
        teamSizeLimit: 4,
        registrationDeadline: event.registrationDeadline,
        rules: 'All code must be original and pushed to GitHub with open-source MIT license.',
        status: 'completed'
      });

      // Team
      const team = await Team.create({
        competition: competition._id,
        teamName: 'Team Algorhythm',
        teamLeader: student._id,
        members: [
          { user: student._id, memberRole: 'Leader' },
          { user: organizer._id, memberRole: 'Developer' }
        ],
        teamStatus: 'winner'
      });

      // Judging Criteria
      const crit1 = await JudgingCriteria.create({
        competition: competition._id,
        criteriaName: 'Innovation & Architecture',
        description: 'Technical ingenuity, agent orchestration, and code elegance',
        maximumScore: 10,
        weightage: 1.5
      });
      const crit2 = await JudgingCriteria.create({
        competition: competition._id,
        criteriaName: 'Execution & UI/UX',
        description: 'Completeness of feature set and design aesthetics',
        maximumScore: 10,
        weightage: 1.0
      });

      // Judge
      const judge = await Judge.create({
        name: 'Dr. Arvind Swaminathan',
        email: 'arvind.swaminathan@deeptech.org',
        phone: '+91 98111 22334',
        designation: 'Principal AI Scientist',
        organization: 'DeepTech Research Labs',
        expertise: 'LLM Systems & Distributed Computing',
        judgeRole: 'Head Evaluator',
        competitions: [competition._id]
      });

      // Judge Score
      await JudgeScore.create({
        competition: competition._id,
        team: team._id,
        judge: judge._id,
        criteria: crit1._id,
        score: 9.5,
        remarks: 'Exceptional autonomous agent architecture and clear state handling.'
      });

      // Prize
      const prize1 = await Prize.create({
        competition: competition._id,
        prizeName: 'Grand Champion Trophy + Cash Award',
        position: 1,
        amount: 25000
      });
      await Prize.create({
        competition: competition._id,
        prizeName: 'First Runner Up',
        position: 2,
        amount: 15000
      });

      // Result
      await Result.create({
        competition: competition._id,
        team: team._id,
        position: 1,
        finalScore: 95.5,
        resultStatus: 'announced',
        prize: prize1._id
      });

      console.log('✅ Seeded Competition, Team, Judge, Criteria, Score, Prize, and Result');
    }

    console.log('✨ All advanced modules initialized successfully in MongoDB Atlas without overwriting existing data!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Initialization error:', err);
    process.exit(1);
  }
};

seedAdditional();
