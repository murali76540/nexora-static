/**
 * NEXORA Database & Firestore Persistence Service
 * E.G.S. Pillay Engineering College
 */

const { generateCanonicalHash, generateInitialReceiptId, generateRevisionReceiptId } = require('../utils/crypto');
const { calculateWeightedScore, rankEvaluationsWithTieBreaker, sanitizeEvaluationForParticipant } = require('./evaluation.service');
const { db, dbManager } = require('../database/database');

// Initialize and connect persistent database engine
dbManager.init();

// Seed initial competitions and demo data
function seedInitialData() {
  // Database initialized clean without mock or sample data.
  // Competitions and problem statements are created dynamically by organizers/admins.
}

seedInitialData();

// Service functions
const FirebaseService = {
  // Reset for test suites
  resetStore: () => {
    dbManager.resetAll();
    seedInitialData();
  },

  // USERS
  createUser: async (userData) => {
    const existing = Array.from(db.users.values()).find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      const err = new Error('A user with this college email address already exists');
      err.code = 'DUPLICATE_EMAIL';
      throw err;
    }
    const id = userData.id || `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const user = {
      id,
      name: userData.name,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      department: userData.department,
      academicYear: userData.academicYear,
      role: userData.role || 'participant',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    db.users.set(id, user);
    return user;
  },

  getUserByEmail: async (email) => {
    return Array.from(db.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUserById: async (id) => {
    return db.users.get(id) || null;
  },

  getAllUsers: async () => {
    return Array.from(db.users.values()).map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
  },

  updateUserRole: async (userId, newRole) => {
    const user = db.users.get(userId);
    if (!user) throw new Error('User not found');
    user.role = newRole;
    db.users.set(userId, user);
    return user;
  },

  updateUserStatus: async (userId, status) => {
    const user = db.users.get(userId);
    if (!user) throw new Error('User not found');
    user.status = status;
    db.users.set(userId, user);
    return user;
  },

  // COMPETITIONS
  getCompetitions: async () => {
    return Array.from(db.competitions.values());
  },

  getCompetitionById: async (id) => {
    return db.competitions.get(id) || null;
  },

  createCompetition: async (compData) => {
    const id = compData.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const limit = Math.min(100, Math.max(1, parseInt(compData.participantLimit, 10) || 100));
    const competition = {
      id,
      title: compData.title,
      department: compData.department,
      category: compData.category || 'General Engineering',
      description: compData.description,
      participantLimit: limit,
      currentParticipants: 0,
      status: 'ACTIVE',
      currentVersion: 'DRAFT',
      startTime: compData.startTime || new Date().toISOString(),
      initialDeadline: compData.initialDeadline || new Date(Date.now() + 86400000 * 3).toISOString(),
      revisedDeadline: null,
      createdAt: new Date().toISOString()
    };
    db.competitions.set(id, competition);
    db.leaderboardSettings.set(id, {
      competitionId: id,
      isPublished: false,
      updatedAt: new Date().toISOString()
    });
    return competition;
  },

  updateCompetition: async (id, updateData) => {
    const comp = db.competitions.get(id);
    if (!comp) throw new Error('Competition not found');
    const updated = { ...comp, ...updateData };
    db.competitions.set(id, updated);
    return updated;
  },

  // TRANSACTIONAL COMPETITION JOINING
  joinCompetition: async (competitionId, userId, userEmail, pathway = 'AI_ASSISTED') => {
    const comp = db.competitions.get(competitionId);
    if (!comp) {
      const err = new Error('Competition not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // 1. Duplicate enrollment check
    const membershipKey = `${competitionId}_${userId}`;
    if (db.competitionMembers.has(membershipKey)) {
      const err = new Error('You are already registered for this competition');
      err.code = 'ALREADY_REGISTERED';
      throw err;
    }

    // 2. Participant limit check (Transactional 100 max)
    if (comp.currentParticipants >= comp.participantLimit) {
      const err = new Error(`Participant limit reached (${comp.participantLimit} max participants)`);
      err.code = 'SLOT_FULL';
      throw err;
    }

    // Atomically increment participant count and record enrollment
    comp.currentParticipants += 1;
    db.competitions.set(competitionId, comp);

    const enrollment = {
      id: membershipKey,
      competitionId,
      userId,
      userEmail,
      pathway, // 'AI_ASSISTED' or 'WITHOUT_AI'
      joinedAt: new Date().toISOString(),
      initialSubmitted: false,
      revisedSubmitted: false
    };
    db.competitionMembers.set(membershipKey, enrollment);
    return enrollment;
  },

  getCompetitionMembers: async (competitionId) => {
    return Array.from(db.competitionMembers.values()).filter(m => m.competitionId === competitionId);
  },

  getUserEnrollment: async (competitionId, userId) => {
    return db.competitionMembers.get(`${competitionId}_${userId}`) || null;
  },

  getUserJoinedCompetitions: async (userId) => {
    const enrollments = Array.from(db.competitionMembers.values()).filter(m => m.userId === userId);
    return enrollments.map(e => {
      const comp = db.competitions.get(e.competitionId);
      return {
        ...e,
        competition: comp
      };
    });
  },

  // PROBLEM VERSIONS
  publishVersion1: async (competitionId, versionData) => {
    const v1Id = `${competitionId}-v1.0`;
    if (db.problemVersions.has(v1Id)) {
      const err = new Error('Version 1.0 has already been published and is permanently immutable.');
      err.code = 'VERSION_1_IMMUTABLE';
      throw err;
    }

    const versionDoc = {
      id: v1Id,
      competitionId,
      versionNumber: '1.0',
      title: versionData.title,
      realWorldBackground: versionData.realWorldBackground,
      problemStatement: versionData.problemStatement,
      technicalRequirements: versionData.technicalRequirements || [],
      constraints: versionData.constraints || [],
      immutable: true,
      publishedAt: new Date().toISOString()
    };

    db.problemVersions.set(v1Id, versionDoc);
    const comp = db.competitions.get(competitionId);
    if (comp) {
      comp.currentVersion = '1.0';
      if (versionData.startTime) comp.startTime = versionData.startTime;
      if (versionData.initialDeadline) comp.initialDeadline = versionData.initialDeadline;
      db.competitions.set(competitionId, comp);
    }
    return versionDoc;
  },

  // Admin / Organizer problem statement update (allows updating problem specification & start time)
  updateProblemStatement: async (competitionId, versionData) => {
    const comp = db.competitions.get(competitionId);
    if (!comp) {
      const err = new Error('Competition not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (versionData.startTime) {
      comp.startTime = versionData.startTime;
    }
    if (versionData.initialDeadline) {
      comp.initialDeadline = versionData.initialDeadline;
    }

    const v1Id = `${competitionId}-v1.0`;
    const existing = db.problemVersions.get(v1Id);

    const versionDoc = {
      id: v1Id,
      competitionId,
      versionNumber: '1.0',
      title: versionData.title || (existing ? existing.title : comp.title),
      realWorldBackground: versionData.realWorldBackground || (existing ? existing.realWorldBackground : ''),
      problemStatement: versionData.problemStatement || (existing ? existing.problemStatement : ''),
      technicalRequirements: versionData.technicalRequirements || (existing ? existing.technicalRequirements : []),
      constraints: versionData.constraints || (existing ? existing.constraints : []),
      immutable: false,
      publishedAt: existing ? existing.publishedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.problemVersions.set(v1Id, versionDoc);
    comp.currentVersion = '1.0';
    db.competitions.set(competitionId, comp);

    return { competition: comp, version: versionDoc };
  },

  publishVersion2: async (competitionId, disruptionData) => {
    const v1Id = `${competitionId}-v1.0`;
    if (!db.problemVersions.has(v1Id)) {
      const err = new Error('Version 1.0 must be published before Version 2.0 can be released.');
      err.code = 'NO_V1_EXISTS';
      throw err;
    }

    const v2Id = `${competitionId}-v2.0`;
    const versionDoc = {
      id: v2Id,
      competitionId,
      versionNumber: '2.0',
      title: disruptionData.title || 'UNEXPECTED PROBLEM SHIFT (V2.0)',
      disruptionType: disruptionData.disruptionType || 'Operational Disruption',
      impactLevel: disruptionData.impactLevel || 'CRITICAL', // LOW, MEDIUM, CRITICAL
      updatedStatement: disruptionData.updatedStatement,
      newRequirements: disruptionData.newRequirements || [],
      explanationOfChanges: disruptionData.explanationOfChanges,
      deadlineExtensionHours: disruptionData.deadlineExtensionHours || 0,
      publishedAt: new Date().toISOString()
    };

    db.problemVersions.set(v2Id, versionDoc);

    const comp = db.competitions.get(competitionId);
    if (comp) {
      comp.currentVersion = '2.0';
      if (disruptionData.deadlineExtensionHours > 0) {
        const currentDeadline = new Date(comp.initialDeadline).getTime();
        comp.revisedDeadline = new Date(currentDeadline + disruptionData.deadlineExtensionHours * 3600000).toISOString();
      }
      db.competitions.set(competitionId, comp);
    }

    // Broadcast notification to all participants
    const notifId = `NOTIF-${Date.now()}`;
    db.notifications.set(notifId, {
      id: notifId,
      competitionId,
      title: `CRITICAL SHIFT: Version 2.0 Problem Disruption Released!`,
      message: disruptionData.updatedStatement.slice(0, 150) + '...',
      impactLevel: disruptionData.impactLevel,
      broadcast: true,
      timestamp: new Date().toISOString()
    });

    return versionDoc;
  },

  getProblemVersions: async (competitionId, isPrivileged = false) => {
    const comp = db.competitions.get(competitionId);
    const versions = Array.from(db.problemVersions.values())
      .filter(v => v.competitionId === competitionId)
      .sort((a, b) => a.versionNumber.localeCompare(b.versionNumber));

    if (!comp) return versions;

    const now = Date.now();
    const startTime = comp.startTime ? new Date(comp.startTime).getTime() : 0;
    const hasStarted = now >= startTime;

    if (!isPrivileged && !hasStarted) {
      // Problem statement locked until competition start time
      return versions.map(v => ({
        id: v.id,
        competitionId: v.competitionId,
        versionNumber: v.versionNumber,
        locked: true,
        startTime: comp.startTime,
        message: 'Problem statement is locked and will be unlocked when the competition starts.'
      }));
    }

    return versions;
  },

  getMemberProblems: async (userId) => {
    const enrollments = Array.from(db.competitionMembers.values()).filter(m => m.userId === userId);
    const now = Date.now();

    return enrollments.map(e => {
      const comp = db.competitions.get(e.competitionId);
      if (!comp) return null;

      const startTime = comp.startTime ? new Date(comp.startTime).getTime() : 0;
      const hasStarted = now >= startTime;
      const secondsUntilStart = Math.max(0, Math.floor((startTime - now) / 1000));

      const v1 = db.problemVersions.get(`${comp.id}-v1.0`);
      const v2 = db.problemVersions.get(`${comp.id}-v2.0`);

      let problemStatus = 'NO_PROBLEM';
      if (!v1) {
        problemStatus = 'PENDING_ADMIN';
      } else if (!hasStarted) {
        problemStatus = 'LOCKED';
      } else {
        problemStatus = 'UNLOCKED';
      }

      return {
        competitionId: comp.id,
        title: comp.title,
        department: comp.department,
        category: comp.category,
        description: comp.description,
        startTime: comp.startTime,
        initialDeadline: comp.initialDeadline,
        revisedDeadline: comp.revisedDeadline,
        currentVersion: comp.currentVersion,
        hasStarted,
        secondsUntilStart,
        problemStatus,
        pathway: e.pathway,
        initialSubmitted: e.initialSubmitted,
        revisedSubmitted: e.revisedSubmitted,
        v1: problemStatus === 'UNLOCKED' ? v1 : (problemStatus === 'LOCKED' ? { locked: true, startTime: comp.startTime } : null),
        v2: problemStatus === 'UNLOCKED' ? v2 : null
      };
    }).filter(Boolean);
  },

  // SUBMISSIONS & TAMPER-PROOF RECEIPTS
  submitInitialSolution: async (submissionData) => {
    const { competitionId, userId, userEmail, participantName, pathway, solutionTitle, technicalApproach, methodology, repoUrl, aiDeclaration, independentMethodology } = submissionData;

    // Check membership
    const membership = db.competitionMembers.get(`${competitionId}_${userId}`);
    if (!membership) {
      const err = new Error('You must be enrolled in this competition to submit');
      err.code = 'NOT_ENROLLED';
      throw err;
    }

    const timestamp = new Date().toISOString();
    const receiptId = generateInitialReceiptId();

    // Generate canonical SHA-256 hash
    const canonicalPayload = {
      receiptId,
      competitionId,
      userId,
      userEmail,
      version: '1.0',
      timestamp,
      repoUrl,
      solutionTitle,
      pathway
    };
    const receiptHash = generateCanonicalHash(canonicalPayload);

    const submissionDoc = {
      id: `${competitionId}_${userId}_v1`,
      competitionId,
      userId,
      userEmail,
      participantName: participantName || userEmail,
      version: '1.0',
      pathway, // 'AI_ASSISTED' or 'WITHOUT_AI'
      solutionTitle,
      technicalApproach,
      methodology,
      repoUrl,
      aiDeclaration: pathway === 'AI_ASSISTED' ? aiDeclaration : null,
      independentMethodology: pathway === 'WITHOUT_AI' ? independentMethodology : null,
      receiptId,
      receiptHash,
      submittedAt: timestamp,
      status: 'SUBMITTED'
    };

    db.submissions.set(submissionDoc.id, submissionDoc);

    // Save persistent receipt
    db.submissionReceipts.set(receiptId, {
      receiptId,
      submissionId: submissionDoc.id,
      competitionId,
      userId,
      userEmail,
      type: 'INITIAL_SUBMISSION',
      version: '1.0',
      receiptHash,
      submittedAt: timestamp,
      verified: true
    });

    membership.initialSubmitted = true;
    membership.initialReceiptId = receiptId;
    db.competitionMembers.set(`${competitionId}_${userId}`, membership);

    return submissionDoc;
  },

  submitRevisionSolution: async (revisionData) => {
    const { competitionId, userId, userEmail, participantName, pathway, solutionTitle, updatedSolution, revisedMethodology, explanationOfChanges, adaptationStrategy, repoUrl, testingEvidence } = revisionData;

    const membership = db.competitionMembers.get(`${competitionId}_${userId}`);
    if (!membership) {
      const err = new Error('You must be enrolled in this competition to submit');
      err.code = 'NOT_ENROLLED';
      throw err;
    }

    // Check if Version 2.0 has been released
    const v2 = db.problemVersions.get(`${competitionId}-v2.0`);
    if (!v2) {
      const err = new Error('Adaptive revision requires Version 2.0 problem disruption to be published.');
      err.code = 'NO_V2_RELEASED';
      throw err;
    }

    const timestamp = new Date().toISOString();
    const receiptId = generateRevisionReceiptId();

    const canonicalPayload = {
      receiptId,
      competitionId,
      userId,
      userEmail,
      version: '2.0',
      timestamp,
      repoUrl,
      adaptationStrategy
    };
    const receiptHash = generateCanonicalHash(canonicalPayload);

    const revisionDoc = {
      id: `${competitionId}_${userId}_v2`,
      competitionId,
      userId,
      userEmail,
      participantName: participantName || userEmail,
      version: '2.0',
      pathway,
      solutionTitle,
      updatedSolution,
      revisedMethodology,
      explanationOfChanges,
      adaptationStrategy,
      repoUrl,
      testingEvidence,
      receiptId,
      receiptHash,
      submittedAt: timestamp,
      status: 'REVISED'
    };

    db.submissions.set(revisionDoc.id, revisionDoc);

    // Save revision receipt
    db.submissionReceipts.set(receiptId, {
      receiptId,
      submissionId: revisionDoc.id,
      competitionId,
      userId,
      userEmail,
      type: 'ADAPTIVE_REVISION',
      version: '2.0',
      receiptHash,
      submittedAt: timestamp,
      verified: true
    });

    membership.revisedSubmitted = true;
    membership.revisionReceiptId = receiptId;
    db.competitionMembers.set(`${competitionId}_${userId}`, membership);

    return revisionDoc;
  },

  getSubmissionHistory: async (competitionId, userId) => {
    const v1 = db.submissions.get(`${competitionId}_${userId}_v1`) || null;
    const v2 = db.submissions.get(`${competitionId}_${userId}_v2`) || null;
    return { initial: v1, revision: v2 };
  },

  getAllSubmissionsForCompetition: async (competitionId) => {
    return Array.from(db.submissions.values()).filter(s => s.competitionId === competitionId);
  },

  getUserAllSubmissions: async (userId) => {
    return Array.from(db.submissions.values()).filter(s => s.userId === userId);
  },

  getReceiptById: async (receiptId) => {
    return db.submissionReceipts.get(receiptId) || null;
  },

  // EVALUATIONS & RUBRICS
  submitEvaluation: async (evalData) => {
    const { competitionId, userId, judgeId, judgeName, pathway, scores, publicFeedback, privateJudgeNotes } = evalData;

    const { totalScore, adaptabilityScore, breakdown } = calculateWeightedScore(scores);

    const evalId = `${competitionId}_${userId}`;
    const evaluationDoc = {
      id: evalId,
      competitionId,
      userId,
      judgeId,
      judgeName: judgeName || 'Authorized Evaluator',
      pathway,
      rawScores: scores,
      breakdown,
      totalWeightedScore: totalScore,
      adaptabilityScore,
      publicFeedback: publicFeedback || 'Evaluation completed based on seven criteria.',
      privateJudgeNotes: privateJudgeNotes || '', // NEVER exposed to participant
      evaluatedAt: new Date().toISOString()
    };

    db.evaluations.set(evalId, evaluationDoc);
    return evaluationDoc;
  },

  getCompetitionEvaluations: async (competitionId, isPrivileged = false) => {
    const evals = Array.from(db.evaluations.values()).filter(e => e.competitionId === competitionId);
    if (isPrivileged) {
      return evals;
    }
    // Mask private judge notes
    return evals.map(e => sanitizeEvaluationForParticipant(e));
  },

  // LEADERBOARD SETTINGS & PRIVACY
  getLeaderboardSettings: async (competitionId) => {
    return db.leaderboardSettings.get(competitionId) || { competitionId, isPublished: false };
  },

  setLeaderboardVisibility: async (competitionId, isPublished) => {
    const settings = {
      competitionId,
      isPublished: Boolean(isPublished),
      updatedAt: new Date().toISOString()
    };
    db.leaderboardSettings.set(competitionId, settings);
    return settings;
  },

  getLeaderboard: async (competitionId, isPrivileged = false) => {
    const settings = await FirebaseService.getLeaderboardSettings(competitionId);

    // If not published and not privileged, block leaderboard access!
    if (!settings.isPublished && !isPrivileged) {
      return {
        competitionId,
        isPublished: false,
        message: 'Leaderboard results are temporarily hidden to maintain competition integrity. Final rankings will be published after evaluation.',
        rankings: []
      };
    }

    const evals = Array.from(db.evaluations.values()).filter(e => e.competitionId === competitionId);
    
    // Enrich with participant names
    const enriched = evals.map(e => {
      const user = db.users.get(e.userId);
      const participantName = user ? user.name : e.userId;
      const base = isPrivileged ? e : sanitizeEvaluationForParticipant(e);
      return {
        ...base,
        participantName
      };
    });

    const ranked = rankEvaluationsWithTieBreaker(enriched);

    return {
      competitionId,
      isPublished: settings.isPublished,
      message: settings.isPublished ? 'Official Published Leaderboard' : 'Leaderboard Preview (Privileged View Only)',
      rankings: ranked
    };
  },

  // NOTIFICATIONS
  getNotificationsForUser: async (userId) => {
    return Array.from(db.notifications.values())
      .filter(n => n.broadcast || n.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
};

module.exports = {
  db,
  FirebaseService
};
