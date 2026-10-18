const mongoose = require('mongoose');

// 1. COMPETITION
const competitionSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    competitionName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    competitionType: {
      type: String,
      enum: ['hackathon', 'coding', 'quiz', 'gaming', 'dance', 'music', 'drama', 'robotics', 'fine_arts', 'sports', 'other'],
      default: 'hackathon'
    },
    maximumTeams: {
      type: Number,
      required: true,
      min: 1
    },
    teamSizeLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 4
    },
    registrationDeadline: {
      type: Date,
      required: true
    },
    rules: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['upcoming', 'open', 'judging', 'completed'],
      default: 'open'
    }
  },
  { timestamps: true }
);

// 2. TEAM & TEAM_MEMBER
const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    memberRole: {
      type: String,
      enum: ['Leader', 'Developer', 'Designer', 'Presenter', 'Researcher', 'Member'],
      default: 'Member'
    },
    joinedDate: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true
    },
    teamName: {
      type: String,
      required: true,
      trim: true
    },
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [teamMemberSchema],
    registrationDate: {
      type: Date,
      default: Date.now
    },
    teamStatus: {
      type: String,
      enum: ['registered', 'shortlisted', 'disqualified', 'winner'],
      default: 'registered'
    }
  },
  { timestamps: true }
);

// 3. JUDGE
const judgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    organization: {
      type: String,
      trim: true
    },
    expertise: {
      type: String,
      trim: true
    },
    judgeRole: {
      type: String,
      default: 'Technical Evaluation'
    },
    competitions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition'
      }
    ]
  },
  { timestamps: true }
);

// 4. JUDGING_CRITERIA
const judgingCriteriaSchema = new mongoose.Schema(
  {
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true
    },
    criteriaName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    maximumScore: {
      type: Number,
      required: true,
      min: 1,
      default: 10
    },
    weightage: {
      type: Number,
      default: 1,
      min: 0.1
    }
  },
  { timestamps: true }
);

// 5. JUDGE_SCORE
const judgeScoreSchema = new mongoose.Schema(
  {
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    judge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Judge',
      required: true
    },
    criteria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JudgingCriteria',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    remarks: {
      type: String,
      default: ''
    },
    scoredAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// 6. PRIZE
const prizeSchema = new mongoose.Schema(
  {
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true
    },
    prizeName: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: Number,
      required: true,
      min: 1
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

// 7. RESULT
const resultSchema = new mongoose.Schema(
  {
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    position: {
      type: Number,
      required: true,
      min: 1
    },
    finalScore: {
      type: Number,
      required: true
    },
    resultStatus: {
      type: String,
      enum: ['draft', 'announced'],
      default: 'announced'
    },
    announcedDate: {
      type: Date,
      default: Date.now
    },
    prize: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prize'
    }
  },
  { timestamps: true }
);

const Competition = mongoose.model('Competition', competitionSchema);
const Team = mongoose.model('Team', teamSchema);
const Judge = mongoose.model('Judge', judgeSchema);
const JudgingCriteria = mongoose.model('JudgingCriteria', judgingCriteriaSchema);
const JudgeScore = mongoose.model('JudgeScore', judgeScoreSchema);
const Prize = mongoose.model('Prize', prizeSchema);
const Result = mongoose.model('Result', resultSchema);

module.exports = {
  Competition,
  Team,
  Judge,
  JudgingCriteria,
  JudgeScore,
  Prize,
  Result
};
