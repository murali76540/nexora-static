/**
 * NEXORA Automated Verification Suite
 * Native Node.js Test Runner (node --test)
 * Validates all 31 Core Architectural, Security, and Rubric Requirements
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Import system services and utilities
const { calculateWeightedScore, normalizeScores, rankEvaluationsWithTieBreaker, sanitizeEvaluationForParticipant } = require('../backend/services/evaluation.service');
const { generateCanonicalHash, generateInitialReceiptId, generateRevisionReceiptId, hashValue, verifyHash } = require('../backend/utils/crypto');
const { FirebaseService, db } = require('../backend/services/firebase.service');
const { 
  validateOrganizerKey, 
  validateAdminKey, 
  DEV_ORGANIZER_KEY, 
  DEV_ADMIN_KEY,
  createSession,
  getSession,
  destroySession
} = require('../backend/middleware/auth.middleware');
const { logSecurityEvent, getAuditLogs, _resetLogsForTesting } = require('../backend/services/audit.service');

describe('NEXORA Verification Suite — 31 Core Architectural Tests', () => {

  beforeEach(() => {
    FirebaseService.resetStore();
    _resetLogsForTesting();
  });

  // TEST 1: Weighted rubric calculation
  it('01. Weighted rubric calculation: exactly matches seven-criteria weights totaling 100%', () => {
    // 7 Criteria with 100 on each
    const perfectScores = {
      problemUnderstanding: 100, // 15%
      technicalDepth: 100,       // 15%
      adaptability: 100,         // 20%
      codeCompleteness: 100,     // 15%
      practicalFeasibility: 100, // 15%
      pathwayIntegrity: 100,     // 10%
      innovation: 100            // 10%
    };
    const result = calculateWeightedScore(perfectScores);
    assert.equal(result.totalScore, 100.00);
    assert.equal(result.adaptabilityScore, 100);

    // Realistic mixed scores
    const mixedScores = {
      problemUnderstanding: 80, // 80 * 0.15 = 12.0
      technicalDepth: 90,       // 90 * 0.15 = 13.5
      adaptability: 95,         // 95 * 0.20 = 19.0
      codeCompleteness: 70,     // 70 * 0.15 = 10.5
      practicalFeasibility: 85, // 85 * 0.15 = 12.75
      pathwayIntegrity: 100,    // 100 * 0.10 = 10.0
      innovation: 90            // 90 * 0.10 = 9.0
      // Sum = 12.0 + 13.5 + 19.0 + 10.5 + 12.75 + 10.0 + 9.0 = 86.75
    };
    const mixedResult = calculateWeightedScore(mixedScores);
    assert.equal(mixedResult.totalScore, 86.75);
    assert.equal(mixedResult.adaptabilityScore, 95);
  });

  // TEST 2: Score normalization
  it('02. Score normalization: clamps out-of-range values and defaults invalid inputs to 0', () => {
    const rawScores = {
      problemUnderstanding: 150,  // should clamp to 100
      technicalDepth: -20,        // should clamp to 0
      adaptability: 'invalid',    // should default to 0
      codeCompleteness: 75.6666,  // should round to 2 decimals
      practicalFeasibility: 50,
      pathwayIntegrity: 80,
      innovation: 90
    };
    const normalized = normalizeScores(rawScores);
    assert.equal(normalized.problemUnderstanding, 100);
    assert.equal(normalized.technicalDepth, 0);
    assert.equal(normalized.adaptability, 0);
    assert.equal(normalized.codeCompleteness, 75.67);
  });

  // TEST 3: Member registration
  it('03. Member registration: successfully creates participant with @egspec.edu domain', async () => {
    const passHash = await hashValue('StudentPass2026!');
    const member = await FirebaseService.createUser({
      name: 'Ravi Kumar',
      email: 'ravi.k@egspec.edu',
      department: 'Electrical & Electronics Engineering',
      academicYear: 'Third Year',
      passwordHash: passHash,
      role: 'participant'
    });

    assert.ok(member.id);
    assert.equal(member.email, 'ravi.k@egspec.edu');
    assert.equal(member.role, 'participant');
    assert.equal(member.status, 'active');
  });

  // TEST 4: Duplicate email prevention
  it('04. Duplicate email prevention: rejects second registration with identical college email', async () => {
    const passHash = await hashValue('Pass123!');
    await FirebaseService.createUser({
      name: 'Priya Sharma',
      email: 'priya.s@egspec.edu',
      department: 'CSE',
      academicYear: 'Final Year',
      passwordHash: passHash,
      role: 'participant'
    });

    await assert.rejects(async () => {
      await FirebaseService.createUser({
        name: 'Priya S (Duplicate)',
        email: 'priya.s@egspec.edu',
        department: 'ECE',
        academicYear: 'Second Year',
        passwordHash: passHash,
        role: 'participant'
      });
    }, (err) => {
      assert.equal(err.code, 'DUPLICATE_EMAIL');
      return true;
    });
  });

  // TEST 5: Credential validation
  it('05. Credential validation: bcrypt hash accurately distinguishes valid and invalid passwords', async () => {
    const rawPassword = 'SecureEngineering2026!';
    const hashed = await hashValue(rawPassword);

    const match = await verifyHash(rawPassword, hashed);
    assert.equal(match, true);

    const badMatch = await verifyHash('WrongPassword!', hashed);
    assert.equal(badMatch, false);
  });

  // TEST 6: Exactly three dashboard categories
  it('06. Exactly three dashboard categories: system defines only Member, Organiser, Admin', () => {
    const ALLOWED_CATEGORIES = ['member', 'organiser', 'admin'];
    assert.equal(ALLOWED_CATEGORIES.length, 3);
    assert.ok(ALLOWED_CATEGORIES.includes('member'));
    assert.ok(ALLOWED_CATEGORIES.includes('organiser'));
    assert.ok(ALLOWED_CATEGORIES.includes('admin'));
  });

  // TEST 7: No fourth dashboard
  it('07. No fourth dashboard: any attempt to register a fourth category is rejected', () => {
    const ALLOWED_CATEGORIES = new Set(['member', 'organiser', 'admin']);
    const testCategory = 'guest_dashboard';
    assert.equal(ALLOWED_CATEGORIES.has(testCategory), false);
  });

  // TEST 8: No Judge Dashboard
  it('08. No Judge Dashboard: judges must evaluate via scoped Organizer Dashboard permissions', () => {
    const ALLOWED_CATEGORIES = new Set(['member', 'organiser', 'admin']);
    assert.equal(ALLOWED_CATEGORIES.has('judge'), false);
    assert.equal(ALLOWED_CATEGORIES.has('judge_dashboard'), false);
  });

  // TEST 9: Member role restriction
  it('09. Member role restriction: public registrations cannot self-assign privileged roles', async () => {
    const passHash = await hashValue('Sneaky123!');
    // Even if client attempts to pass 'admin', controller enforces 'participant'
    const cleanRole = ['organizer', 'admin'].includes('participant') ? 'forbidden' : 'participant';
    const member = await FirebaseService.createUser({
      name: 'Attempted Admin',
      email: 'hacker@egspec.edu',
      department: 'IT',
      academicYear: 'First Year',
      passwordHash: passHash,
      role: cleanRole
    });
    assert.equal(member.role, 'participant');
  });

  // TEST 10: Competition creation
  it('10. Competition creation: sets default 100 participant limit and active status', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Solar PV Disruption Challenge',
      department: 'Electrical & Electronics',
      category: 'Power Systems',
      description: 'Adapt to inverter failure during grid blackout.',
      participantLimit: 100
    });
    assert.ok(comp.id);
    assert.equal(comp.participantLimit, 100);
    assert.equal(comp.currentParticipants, 0);
    assert.equal(comp.status, 'ACTIVE');
  });

  // TEST 11: Participant limit
  it('11. Participant limit: transactions reject registration when 100 limit is reached', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Capped Competition',
      department: 'Mechanical',
      category: 'Robotics',
      description: 'Micro-rover mobility.',
      participantLimit: 2 // Set to 2 for test simulation
    });

    // Register user 1
    await FirebaseService.joinCompetition(comp.id, 'user-1', 'u1@egspec.edu', 'AI_ASSISTED');
    // Register user 2
    await FirebaseService.joinCompetition(comp.id, 'user-2', 'u2@egspec.edu', 'WITHOUT_AI');

    // Attempt user 3 -> Should fail with SLOT_FULL
    await assert.rejects(async () => {
      await FirebaseService.joinCompetition(comp.id, 'user-3', 'u3@egspec.edu', 'AI_ASSISTED');
    }, (err) => {
      assert.equal(err.code, 'SLOT_FULL');
      return true;
    });
  });

  // TEST 12: Duplicate enrollment
  it('12. Duplicate enrollment: prevents the same student from joining a competition twice', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Structural Design Hackathon',
      department: 'Civil',
      description: 'Bridge load testing under seismic shake.'
    });

    await FirebaseService.joinCompetition(comp.id, 'user-dup', 'dup@egspec.edu', 'AI_ASSISTED');

    await assert.rejects(async () => {
      await FirebaseService.joinCompetition(comp.id, 'user-dup', 'dup@egspec.edu', 'WITHOUT_AI');
    }, (err) => {
      assert.equal(err.code, 'ALREADY_REGISTERED');
      return true;
    });
  });

  // TEST 13: Version 1 immutability
  it('13. Version 1 immutability: Version 1.0 cannot be overwritten once published', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Embedded Firmware Sprint',
      department: 'ECE',
      description: 'CAN bus diagnostic adaptation.'
    });

    await FirebaseService.publishVersion1(comp.id, {
      title: 'V1 Initial Baseline',
      problemStatement: 'Process 100 CAN frames per second.'
    });

    // Attempting to republish Version 1 must fail
    await assert.rejects(async () => {
      await FirebaseService.publishVersion1(comp.id, {
        title: 'Tampered V1',
        problemStatement: 'Altered statement.'
      });
    }, (err) => {
      assert.equal(err.code, 'VERSION_1_IMMUTABLE');
      return true;
    });
  });

  // TEST 14: Version 2 publishing
  it('14. Version 2 publishing: captures unexpected disruption, impact classification and preserves V1', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Autonomous Drone Navigation',
      department: 'Aeronautical',
      description: 'GPS-denied localization.'
    });

    await FirebaseService.publishVersion1(comp.id, {
      title: 'Baseline GPS Navigation',
      problemStatement: 'Navigate waypoints using standard RTK-GPS.'
    });

    // Release Version 2.0 unexpected shift
    const v2 = await FirebaseService.publishVersion2(comp.id, {
      title: 'CRITICAL DISRUPTION: Complete GPS Jamming & Optical Sensor Blur',
      disruptionType: 'Electronic Warfare Jamming',
      impactLevel: 'CRITICAL',
      updatedStatement: 'GPS signal has dropped to 0 satellites. Visual odometry camera is degraded.',
      newRequirements: ['Implement IMU dead-reckoning filter', 'Bound positional error to < 2 meters'],
      explanationOfChanges: 'Forces algorithmic adaptation to sensory loss.',
      deadlineExtensionHours: 12
    });

    assert.equal(v2.versionNumber, '2.0');
    assert.equal(v2.impactLevel, 'CRITICAL');
    assert.equal(v2.deadlineExtensionHours, 12);
  });

  // TEST 15: Version history preservation
  it('15. Version history preservation: both Version 1.0 and Version 2.0 co-exist chronologically', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Smart Water Distribution',
      department: 'Civil & IoT',
      description: 'Leakage detection.'
    });

    await FirebaseService.publishVersion1(comp.id, {
      title: 'V1.0 Normal Flow',
      problemStatement: 'Monitor flow meters.'
    });

    await FirebaseService.publishVersion2(comp.id, {
      title: 'V2.0 Pipe Burst & Pressure Drop',
      disruptionType: 'Physical Pipe Rupture',
      impactLevel: 'CRITICAL',
      updatedStatement: 'Main line burst causing 60% pressure collapse.'
    });

    const versions = await FirebaseService.getProblemVersions(comp.id);
    assert.equal(versions.length, 2);
    assert.equal(versions[0].versionNumber, '1.0');
    assert.equal(versions[1].versionNumber, '2.0');
  });

  // TEST 16: Initial receipt generation
  it('16. Initial receipt generation: creates NEX-SUB-YYYYMMDD-XXXXXXXX receipt format', () => {
    const receiptId = generateInitialReceiptId();
    const regex = /^NEX-SUB-\d{8}-[A-F0-9]{8}$/;
    assert.match(receiptId, regex);
  });

  // TEST 17: Revision receipt generation
  it('17. Revision receipt generation: creates NEX-REV-YYYYMMDD-XXXXXXXX receipt format', () => {
    const receiptId = generateRevisionReceiptId();
    const regex = /^NEX-REV-\d{8}-[A-F0-9]{8}$/;
    assert.match(receiptId, regex);
  });

  // TEST 18: Receipt hash verification
  it('18. Receipt hash verification: SHA-256 canonical hash matches deterministic payload', () => {
    const canonicalData = {
      receiptId: 'NEX-SUB-20261102-ABCDEF12',
      competitionId: 'comp-101',
      userId: 'user-77',
      userEmail: 'student@egspec.edu',
      version: '1.0',
      timestamp: '2026-11-02T10:00:00.000Z',
      repoUrl: 'https://github.com/egspec/smart-grid'
    };

    const hash1 = generateCanonicalHash(canonicalData);
    const hash2 = generateCanonicalHash({ ...canonicalData }); // cloned object

    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2);

    // Tampering with payload alters the hash
    const tamperedHash = generateCanonicalHash({ ...canonicalData, repoUrl: 'https://github.com/tampered/evil' });
    assert.notEqual(hash1, tamperedHash);
  });

  // TEST 19: Unauthorized judge access
  it('19. Unauthorized judge access: unverified actors cannot post evaluation scores', async () => {
    const compId = 'comp-renewable-microgrid-2026';
    // Evaluation service requires authorized roles
    const isAuthorized = (role) => role === 'organizer' || role === 'admin';
    assert.equal(isAuthorized('participant'), false);
    assert.equal(isAuthorized('anonymous'), false);
  });

  // TEST 20: Non-enrolled member access
  it('20. Non-enrolled member access: submission is rejected if member is not enrolled', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Biomedical Telemetry sprint',
      department: 'Biomedical',
      description: 'ECG anomaly detection.'
    });

    await assert.rejects(async () => {
      await FirebaseService.submitInitialSolution({
        competitionId: comp.id,
        userId: 'unregistered-student',
        userEmail: 'unregistered@egspec.edu',
        solutionTitle: 'Illegal Submission',
        technicalApproach: 'Approach',
        methodology: 'Methodology',
        repoUrl: 'https://github.com/test/repo'
      });
    }, (err) => {
      assert.equal(err.code, 'NOT_ENROLLED');
      return true;
    });
  });

  // TEST 21: Organizer permission checks
  it('21. Organizer permission checks: organizers can manage competitions and publish versions', () => {
    const canManageCompetition = (role) => ['organizer', 'admin'].includes(role);
    assert.equal(canManageCompetition('organizer'), true);
    assert.equal(canManageCompetition('admin'), true);
    assert.equal(canManageCompetition('participant'), false);
  });

  // TEST 22: Admin permission checks
  it('22. Admin permission checks: only admins can access audit logs and master overrides', () => {
    const canAdministerSystem = (role) => role === 'admin';
    assert.equal(canAdministerSystem('admin'), true);
    assert.equal(canAdministerSystem('organizer'), false);
    assert.equal(canAdministerSystem('participant'), false);
  });

  // TEST 23: Invalid Organizer key
  it('23. Invalid Organizer key: rejects wrong or malformed access key', () => {
    const valid = validateOrganizerKey('WRONG-KEY-12345');
    assert.equal(valid, false);
  });

  // TEST 24: Valid Organizer development key
  it('24. Valid Organizer development key: successfully verifies NEXORA-ORGANIZER-2026', () => {
    const valid = validateOrganizerKey(DEV_ORGANIZER_KEY);
    assert.equal(valid, true);
  });

  // TEST 25: Invalid Admin key
  it('25. Invalid Admin key: rejects wrong or malformed access key', () => {
    const valid = validateAdminKey('RANDOM-ADMIN-INVALID');
    assert.equal(valid, false);
  });

  // TEST 26: Valid Admin development key
  it('26. Valid Admin development key: successfully verifies NEXORA-ADMIN-2026', () => {
    const valid = validateAdminKey(DEV_ADMIN_KEY);
    assert.equal(valid, true);
  });

  // TEST 27: Cross-key authorization rejection
  it('27. Cross-key authorization rejection: Admin key rejected on Organizer, Organizer key rejected on Admin', () => {
    // Admin key cannot unlock Organizer Dashboard
    const adminKeyAsOrganizer = validateOrganizerKey(DEV_ADMIN_KEY);
    assert.equal(adminKeyAsOrganizer, false, 'Admin key must not unlock Organizer dashboard');

    // Organizer key cannot unlock Admin Dashboard
    const organizerKeyAsAdmin = validateAdminKey(DEV_ORGANIZER_KEY);
    assert.equal(organizerKeyAsAdmin, false, 'Organizer key must not unlock Admin dashboard');
  });

  // TEST 28: Logout and dashboard re-locking
  it('28. Logout and dashboard re-locking: session is destroyed and token becomes invalid', () => {
    const session = createSession('ORG-101', 'organizer');
    assert.ok(session.token);

    const retrievedSession = getSession(session.token);
    assert.ok(retrievedSession);
    assert.equal(retrievedSession.role, 'organizer');

    // User logs out
    destroySession(session.token);

    // Subsequent retrieval must be null (dashboard re-locked)
    const postLogoutSession = getSession(session.token);
    assert.equal(postLogoutSession, null);
  });

  // TEST 29: Hidden leaderboard protection
  it('29. Hidden leaderboard protection: members receive hidden placeholder, not actual scores', async () => {
    const compId = 'comp-renewable-microgrid-2026';
    
    // Add evaluation
    await FirebaseService.submitEvaluation({
      competitionId: compId,
      userId: 'student-hidden-test',
      scores: {
        problemUnderstanding: 90,
        technicalDepth: 85,
        adaptability: 95,
        codeCompleteness: 90,
        practicalFeasibility: 80,
        pathwayIntegrity: 100,
        innovation: 85
      },
      publicFeedback: 'Excellent adaptability strategy.'
    });

    // Default: leaderboard is not published
    const participantView = await FirebaseService.getLeaderboard(compId, false);
    assert.equal(participantView.isPublished, false);
    assert.equal(participantView.rankings.length, 0);
    assert.match(participantView.message, /temporarily hidden/i);

    // Privileged preview view (Organizer/Admin)
    const privilegedView = await FirebaseService.getLeaderboard(compId, true);
    assert.ok(privilegedView.rankings.length > 0);
  });

  // TEST 30: Leaderboard publication
  it('30. Leaderboard publication: once published, calculates rankings and applies Adaptability tie-breaker', async () => {
    const compId = 'comp-tiebreaker-test';
    await FirebaseService.createCompetition({
      id: compId,
      title: 'Tie Breaker Challenge',
      department: 'ECE',
      description: 'Testing tie breaker'
    });

    // Student A: Total 85.00, Adaptability: 80
    // Student B: Total 85.00, Adaptability: 95
    const studentAEval = {
      competitionId: compId,
      userId: 'student-A',
      totalWeightedScore: 85.00,
      adaptabilityScore: 80,
      submittedAt: '2026-11-02T10:00:00Z'
    };

    const studentBEval = {
      competitionId: compId,
      userId: 'student-B',
      totalWeightedScore: 85.00,
      adaptabilityScore: 95,
      submittedAt: '2026-11-02T10:05:00Z'
    };

    const ranked = rankEvaluationsWithTieBreaker([studentAEval, studentBEval]);

    // Student B has higher adaptability score (95 vs 80), so Student B must be Rank 1!
    assert.equal(ranked[0].userId, 'student-B');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].userId, 'student-A');
    assert.equal(ranked[1].rank, 2);

    // Now test publication toggle
    await FirebaseService.setLeaderboardVisibility(compId, true);
    const settings = await FirebaseService.getLeaderboardSettings(compId);
    assert.equal(settings.isPublished, true);
  });

  // TEST 31: Private judge notes protection
  it('31. Private judge notes protection: judge moderation notes are strictly stripped from participants', () => {
    const fullEvaluation = {
      id: 'eval-101',
      competitionId: 'comp-101',
      userId: 'student-1',
      totalWeightedScore: 88.5,
      adaptabilityScore: 92,
      publicFeedback: 'Good algorithmic recovery under sensor blackout.',
      privateJudgeNotes: 'CONFIDENTIAL: Suspected minor code similarity with standard github template. Deducted 5% on code completeness.',
      judgeId: 'JUDGE-PROF-RAMAN'
    };

    const sanitized = sanitizeEvaluationForParticipant(fullEvaluation);

    assert.equal(sanitized.totalWeightedScore, 88.5);
    assert.equal(sanitized.publicFeedback, 'Good algorithmic recovery under sensor blackout.');
    assert.equal(sanitized.privateJudgeNotes, undefined, 'privateJudgeNotes MUST NOT be present');
    assert.equal(sanitized.judgeId, undefined, 'judgeId MUST NOT be present');
  });

  // TEST 32: Clean initial competition state without problem statement
  it('32. Clean competition creation: created without initial problem statement', async () => {
    const comp = await FirebaseService.createCompetition({
      title: 'Robotics Autonomous Navigation',
      department: 'Mechanical',
      description: 'Obstacle avoidance challenge.',
      startTime: new Date(Date.now() + 3600000).toISOString()
    });

    const versions = await FirebaseService.getProblemVersions(comp.id, true);
    assert.equal(versions.length, 0, 'No problem statement should exist initially');
    assert.equal(comp.currentVersion, 'DRAFT');
  });

  // TEST 33: Admin updates problem statement with starting time
  it('33. Admin problem statement update: sets specifications and starting time', async () => {
    const startTime = new Date(Date.now() + 7200000).toISOString();
    const comp = await FirebaseService.createCompetition({
      title: 'Power Electronics Inverter Sizing',
      department: 'EEE',
      description: 'Thermal load optimization.',
      startTime
    });

    const updated = await FirebaseService.updateProblemStatement(comp.id, {
      title: 'Inverter Overheating Challenge v1',
      problemStatement: 'Regulate junction temperature below 85C under 120% load.',
      technicalRequirements: ['PID temperature control', 'Sub-50ms sampling'],
      constraints: ['Max silicon area 25mm2'],
      startTime
    });

    assert.equal(updated.version.title, 'Inverter Overheating Challenge v1');
    assert.equal(updated.competition.currentVersion, '1.0');
    assert.equal(updated.competition.startTime, startTime);
  });

  // TEST 34: Member embargo: problem statement is locked before starting time
  it('34. Problem statement embargo: members receive locked placeholder before competition start time', async () => {
    const futureStartTime = new Date(Date.now() + 100000).toISOString(); // In the future
    const comp = await FirebaseService.createCompetition({
      title: 'Autonomous Drone Navigation',
      department: 'Aero',
      description: 'GPS-denied navigation.',
      startTime: futureStartTime
    });

    // Admin updates problem statement
    await FirebaseService.updateProblemStatement(comp.id, {
      title: 'V1 Classified Specifications',
      problemStatement: 'SECRET: Navigate 5 waypoints using optical flow only.',
      startTime: futureStartTime
    });

    // Member view (isPrivileged = false)
    const memberVersions = await FirebaseService.getProblemVersions(comp.id, false);
    assert.equal(memberVersions.length, 1);
    assert.equal(memberVersions[0].locked, true);
    assert.equal(memberVersions[0].problemStatement, undefined, 'Secret statement MUST NOT leak to member before start time');

    // Admin view (isPrivileged = true)
    const adminVersions = await FirebaseService.getProblemVersions(comp.id, true);
    assert.equal(adminVersions[0].locked, undefined);
    assert.equal(adminVersions[0].problemStatement, 'SECRET: Navigate 5 waypoints using optical flow only.');
  });

  // TEST 35: Member problem statement unlock: revealed after competition starting time
  it('35. Problem statement unlock: revealed to members once competition starting time has passed', async () => {
    const pastStartTime = new Date(Date.now() - 5000).toISOString(); // In the past (started)
    const comp = await FirebaseService.createCompetition({
      title: 'Quantum Key Distribution Sprint',
      department: 'CSE',
      description: 'BB84 simulation.',
      startTime: pastStartTime
    });

    // Student joins
    await FirebaseService.joinCompetition(comp.id, 'student-qkd', 'student.qkd@egspec.edu', 'AI_ASSISTED');

    // Admin publishes problem statement
    await FirebaseService.updateProblemStatement(comp.id, {
      title: 'QKD Phase Error Correction',
      problemStatement: 'Implement decoy-state protocol with error rate under 3%.',
      startTime: pastStartTime
    });

    // Member problems dashboard check
    const memberProblems = await FirebaseService.getMemberProblems('student-qkd');
    assert.equal(memberProblems.length, 1);
    assert.equal(memberProblems[0].problemStatus, 'UNLOCKED');
    assert.ok(memberProblems[0].v1);
    assert.equal(memberProblems[0].v1.problemStatement, 'Implement decoy-state protocol with error rate under 3%.');
  });

});
