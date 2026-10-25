const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');

/**
 * Resolves all club IDs that a given user is authorized to manage.
 * - Admins: All campus clubs
 * - Faculty: Clubs they supervise (via user.clubs, Club.facultyCoordinator, or ClubMembership)
 * - Organizers: Any club where they are listed in club.organizers,
 *   active officer in ClubMembership, or listed in user.clubs
 * - Students / Guests: Empty array []
 *
 * @param {Object} user - User document or req.user
 * @returns {Promise<string[]>} Array of authorized club ID strings
 */
const getAuthorizedClubIds = async (user) => {
  if (!user) return [];

  // Admins have full access across every campus club
  if (user.role === 'admin') {
    const allClubs = await Club.find({}).select('_id').lean();
    return allClubs.map((c) => c._id.toString());
  }

  // Faculty supervises their assigned clubs
  if (user.role === 'faculty') {
    return await getSupervisedClubIds(user);
  }

  // Non-organizers have no club management authorization
  if (user.role !== 'organizer') {
    return [];
  }

  const userId = user._id || user.id;
  const clubIdsSet = new Set();

  // 1. Check direct user.clubs array or user.club
  if (user.clubs && Array.isArray(user.clubs)) {
    user.clubs.forEach((c) => {
      if (c) clubIdsSet.add((c._id || c).toString());
    });
  }
  if (user.club) {
    clubIdsSet.add((user.club._id || user.club).toString());
  }

  // 2. Clubs where user is in club.organizers
  const clubsWithUser = await Club.find({ organizers: userId }).select('_id').lean();
  clubsWithUser.forEach((c) => clubIdsSet.add(c._id.toString()));

  // 3. Active officer memberships in ClubMembership
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

/**
 * Resolves all club IDs supervised by a faculty member.
 *
 * @param {Object} user - User document or req.user
 * @returns {Promise<string[]>}
 */
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

  // 1. Check direct user.clubs array
  if (user.clubs && Array.isArray(user.clubs)) {
    user.clubs.forEach((c) => {
      if (c) supervisedSet.add((c._id || c).toString());
    });
  }

  // 2. Check Club.facultyCoordinator.user or Club.facultyCoordinator.email
  const queryConditions = [{ 'facultyCoordinator.user': userId }];
  if (user.email) {
    queryConditions.push({ 'facultyCoordinator.email': user.email.toLowerCase() });
  }

  const clubsAsCoordinator = await Club.find({ $or: queryConditions }).select('_id').lean();
  clubsAsCoordinator.forEach((c) => supervisedSet.add(c._id.toString()));

  // 3. Check active faculty coordinator memberships
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

/**
 * Checks if a faculty member (or admin) supervises a specific club.
 *
 * @param {Object} user - User document or req.user
 * @param {string|mongoose.Types.ObjectId|Object} clubId - Target club ID or doc
 * @returns {Promise<boolean>}
 */
const isFacultyForClub = async (user, clubId) => {
  if (!user || !clubId) return false;

  if (user.role === 'admin') return true;
  if (user.role !== 'faculty') return false;

  const targetIdStr = (clubId._id || clubId).toString();
  const supervisedIds = await getSupervisedClubIds(user);
  return supervisedIds.includes(targetIdStr);
};

/**
 * Checks if a user is authorized to manage a specific club.
 *
 * @param {Object} user - User document or req.user
 * @param {string|mongoose.Types.ObjectId|Object} clubId - Target club ID or club doc
 * @returns {Promise<boolean>}
 */
const isAuthorizedForClub = async (user, clubId) => {
  if (!user || !clubId) return false;

  // Admins have universal management authority
  if (user.role === 'admin') return true;

  // Faculty supervising this club
  if (user.role === 'faculty') {
    return await isFacultyForClub(user, clubId);
  }

  // Only organizers can manage clubs
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

  // Check if user is in Club.organizers
  const clubExists = await Club.exists({ _id: targetIdStr, organizers: userId });
  if (clubExists) return true;

  // Check if user has active officer role in ClubMembership
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
