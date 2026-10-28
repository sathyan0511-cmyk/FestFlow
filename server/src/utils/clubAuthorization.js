const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');

// Resolves all club IDs that a user has permission to manage.
const getAuthorizedClubIds = async (user) => {
  if (!user) return [];

  if (user.role === 'admin') {
    const allClubs = await Club.find({}).select('_id').lean();
    return allClubs.map((c) => c._id.toString());
  }

  if (user.role === 'faculty') {
    return await getSupervisedClubIds(user);
  }

  if (user.role !== 'organizer') {
    return [];
  }

  const userId = user._id || user.id;
  const clubIdsSet = new Set();

  // Direct user.clubs array or user.club
  if (user.clubs && Array.isArray(user.clubs)) {
    user.clubs.forEach((c) => {
      if (c) clubIdsSet.add((c._id || c).toString());
    });
  }
  if (user.club) {
    clubIdsSet.add((user.club._id || user.club).toString());
  }

  // Clubs where user is listed in club.organizers
  const clubsWithUser = await Club.find({ organizers: userId }).select('_id').lean();
  clubsWithUser.forEach((c) => clubIdsSet.add(c._id.toString()));

  // Active officer memberships in ClubMembership
  const officerMemberships = await ClubMembership.find({
    user: userId,
    membershipStatus: 'active',
    role: { $in: ['coordinator', 'lead', 'treasurer', 'president', 'vice_president', 'organizer', 'admin'] }
  })
    .select('club')
    .lean();

  officerMemberships.forEach((m) => {
    if (m.club) clubIdsSet.add((m.club._id || m.club).toString());
  });

  return Array.from(clubIdsSet);
};

// Resolves all club IDs supervised by a faculty coordinator.
const getSupervisedClubIds = async (user) => {
  if (!user) return [];

  if (user.role === 'admin') {
    const allClubs = await Club.find({}).select('_id').lean();
    return allClubs.map((c) => c._id.toString());
  }

  if (user.role !== 'faculty') {
    return [];
  }

  const userId = user._id || user.id;
  const supervisedSet = new Set();

  if (user.clubs && Array.isArray(user.clubs)) {
    user.clubs.forEach((c) => {
      if (c) supervisedSet.add((c._id || c).toString());
    });
  }

  // Check coordinator field by user ID or email
  const queryConditions = [{ 'facultyCoordinator.user': userId }];
  if (user.email) {
    queryConditions.push({ 'facultyCoordinator.email': user.email.toLowerCase() });
  }

  const clubsAsCoordinator = await Club.find({ $or: queryConditions }).select('_id').lean();
  clubsAsCoordinator.forEach((c) => supervisedSet.add(c._id.toString()));

  const facultyMemberships = await ClubMembership.find({
    user: userId,
    memberType: 'faculty',
    membershipStatus: 'active'
  })
    .select('club')
    .lean();

  facultyMemberships.forEach((m) => {
    if (m.club) supervisedSet.add((m.club._id || m.club).toString());
  });

  return Array.from(supervisedSet);
};

// Returns true if the user is a faculty supervisor (or admin) for the club.
const isFacultyForClub = async (user, clubId) => {
  if (!user || !clubId) return false;

  if (user.role === 'admin') return true;
  if (user.role !== 'faculty') return false;

  const targetIdStr = (clubId._id || clubId).toString();
  const supervisedIds = await getSupervisedClubIds(user);
  return supervisedIds.includes(targetIdStr);
};

// Returns true if user can manage the club (admin, supervising faculty, or assigned organizer).
const isAuthorizedForClub = async (user, clubId) => {
  if (!user || !clubId) return false;

  if (user.role === 'admin') return true;

  if (user.role === 'faculty') {
    return await isFacultyForClub(user, clubId);
  }

  if (user.role !== 'organizer') return false;

  const targetIdStr = (clubId._id || clubId).toString();
  const userId = user._id || user.id;

  // Fast check on user object if populated
  if (user.clubs && Array.isArray(user.clubs)) {
    if (user.clubs.some((c) => (c._id || c).toString() === targetIdStr)) {
      return true;
    }
  }
  if (user.club && (user.club._id || user.club).toString() === targetIdStr) {
    return true;
  }

  const clubExists = await Club.exists({ _id: targetIdStr, organizers: userId });
  if (clubExists) return true;

  const membershipExists = await ClubMembership.exists({
    club: targetIdStr,
    user: userId,
    membershipStatus: 'active',
    role: { $in: ['coordinator', 'lead', 'treasurer', 'president', 'vice_president', 'organizer', 'admin'] }
  });
  if (membershipExists) return true;

  return false;
};

module.exports = {
  getAuthorizedClubIds,
  isAuthorizedForClub,
  getSupervisedClubIds,
  isFacultyForClub
};
