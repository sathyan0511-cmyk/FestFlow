const {
  Competition,
  Team,
  Judge,
  JudgingCriteria,
  JudgeScore,
  Prize,
  Result
} = require('../models/Competition');
const Event = require('../models/Event');
const User = require('../models/User');
const { isAuthorizedForClub } = require('../utils/clubAuthorization');

// --- 1. COMPETITION ---
const createCompetition = async (req, res, next) => {
  try {
    const {
      eventId,
      competitionName,
      description,
      competitionType,
      maximumTeams,
      teamSizeLimit,
      registrationDeadline,
      rules
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to create competitions for this club.'
      });
    }

    const comp = await Competition.create({
      event: eventId,
      competitionName,
      description,
      competitionType: competitionType || 'hackathon',
      maximumTeams: Number(maximumTeams) || 20,
      teamSizeLimit: Number(teamSizeLimit) || 4,
      registrationDeadline: registrationDeadline || event.registrationDeadline,
      rules: rules || ''
    });

    res.status(201).json({
      success: true,
      message: 'Competition created successfully',
      competition: comp
    });
  } catch (error) {
    next(error);
  }
};

const getCompetitionsByEvent = async (req, res, next) => {
  try {
    const competitions = await Competition.find({ event: req.params.eventId })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: competitions.length,
      competitions
    });
  } catch (error) {
    next(error);
  }
};

const getCompetitionDetails = async (req, res, next) => {
  try {
    const comp = await Competition.findById(req.params.id).populate('event', 'title startDate venue');
    if (!comp) return res.status(404).json({ success: false, message: 'Competition not found' });

    const [teams, criteria, judges, prizes, results, scores] = await Promise.all([
      Team.find({ competition: comp._id }).populate('teamLeader', 'name email department').populate('members.user', 'name email'),
      JudgingCriteria.find({ competition: comp._id }),
      Judge.find({ competitions: comp._id }),
      Prize.find({ competition: comp._id }).sort({ position: 1 }),
      Result.find({ competition: comp._id }).populate('team', 'teamName').populate('prize').sort({ position: 1 }),
      JudgeScore.find({ competition: comp._id }).populate('team', 'teamName').populate('judge', 'name').populate('criteria', 'criteriaName')
    ]);

    res.status(200).json({
      success: true,
      competition: comp,
      teams,
      criteria,
      judges,
      prizes,
      results,
      scores
    });
  } catch (error) {
    next(error);
  }
};

// --- 2. TEAMS ---
const registerTeam = async (req, res, next) => {
  try {
    const { competitionId, teamName, memberUserIds = [] } = req.body;

    const comp = await Competition.findById(competitionId);
    if (!comp) return res.status(404).json({ success: false, message: 'Competition not found' });

    // Check maximum teams
    const currentTeamCount = await Team.countDocuments({ competition: competitionId });
    if (currentTeamCount >= comp.maximumTeams) {
      return res.status(400).json({ success: false, message: 'Competition team capacity reached' });
    }

    // Build members array with team leader
    const members = [{
      user: req.user.id,
      memberRole: 'Leader',
      joinedDate: new Date()
    }];

    for (const id of memberUserIds) {
      if (id !== req.user.id && members.length < comp.teamSizeLimit) {
        members.push({
          user: id,
          memberRole: 'Developer',
          joinedDate: new Date()
        });
      }
    }

    const team = await Team.create({
      competition: competitionId,
      teamName,
      teamLeader: req.user.id,
      members,
      teamStatus: 'registered'
    });

    const populated = await Team.findById(team._id)
      .populate('teamLeader', 'name email department')
      .populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Team registered successfully for competition!',
      team: populated
    });
  } catch (error) {
    next(error);
  }
};

// --- 3. JUDGING & SCORES ---
const addJudgingCriteria = async (req, res, next) => {
  try {
    const { competitionId, criteriaName, description, maximumScore, weightage } = req.body;

    const criteria = await JudgingCriteria.create({
      competition: competitionId,
      criteriaName,
      description: description || '',
      maximumScore: Number(maximumScore) || 10,
      weightage: Number(weightage) || 1
    });

    res.status(201).json({
      success: true,
      message: 'Judging criterion added',
      criteria
    });
  } catch (error) {
    next(error);
  }
};

const addJudge = async (req, res, next) => {
  try {
    const { competitionId, name, email, phone, designation, organization, expertise, judgeRole } = req.body;

    let judge = await Judge.findOne({ email: email.toLowerCase() });
    if (!judge) {
      judge = await Judge.create({
        name,
        email: email.toLowerCase(),
        phone,
        designation,
        organization,
        expertise,
        judgeRole: judgeRole || 'Technical Judge',
        competitions: [competitionId]
      });
    } else {
      if (!judge.competitions.includes(competitionId)) {
        judge.competitions.push(competitionId);
        await judge.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Judge assigned to competition',
      judge
    });
  } catch (error) {
    next(error);
  }
};

const submitScore = async (req, res, next) => {
  try {
    const { competitionId, teamId, judgeId, criteriaId, score, remarks } = req.body;

    const judgeScore = await JudgeScore.findOneAndUpdate(
      { competition: competitionId, team: teamId, judge: judgeId, criteria: criteriaId },
      {
        score: Number(score),
        remarks: remarks || '',
        scoredAt: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Score recorded successfully',
      judgeScore
    });
  } catch (error) {
    next(error);
  }
};

// --- 4. PRIZES & RESULTS ---
const addPrize = async (req, res, next) => {
  try {
    const { competitionId, prizeName, position, amount } = req.body;

    const prize = await Prize.create({
      competition: competitionId,
      prizeName,
      position: Number(position),
      amount: Number(amount) || 0
    });

    res.status(201).json({
      success: true,
      message: 'Prize added successfully',
      prize
    });
  } catch (error) {
    next(error);
  }
};

const declareResult = async (req, res, next) => {
  try {
    const { competitionId, teamId, position, finalScore, prizeId } = req.body;

    const result = await Result.findOneAndUpdate(
      { competition: competitionId, team: teamId },
      {
        position: Number(position),
        finalScore: Number(finalScore),
        resultStatus: 'announced',
        announcedDate: new Date(),
        prize: prizeId || null
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Update team status
    await Team.findByIdAndUpdate(teamId, { teamStatus: 'winner' });

    res.status(200).json({
      success: true,
      message: 'Competition result published successfully!',
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompetition,
  getCompetitionsByEvent,
  getCompetitionDetails,
  registerTeam,
  addJudgingCriteria,
  addJudge,
  submitScore,
  addPrize,
  declareResult
};
