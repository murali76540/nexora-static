/**
 * NEXORA Standardized Seven-Criteria Weighted Evaluation System
 * E.G.S. Pillay Engineering College
 */

const EVALUATION_RUBRIC = {
  problemUnderstanding: { weight: 0.15, label: 'Problem Understanding' },
  technicalDepth: { weight: 0.15, label: 'Technical Depth' },
  adaptability: { weight: 0.20, label: 'Adaptability to Problem Shift' },
  codeCompleteness: { weight: 0.15, label: 'Code Completeness' },
  practicalFeasibility: { weight: 0.15, label: 'Practical Feasibility' },
  pathwayIntegrity: { weight: 0.10, label: 'Pathway Integrity' },
  innovation: { weight: 0.10, label: 'Innovation' }
};

/**
 * Validates and normalizes raw criteria scores (0-100)
 * @param {Object} scores
 * @returns {Object} normalized scores
 */
function normalizeScores(scores) {
  const normalized = {};
  for (const [key] of Object.entries(EVALUATION_RUBRIC)) {
    const rawVal = parseFloat(scores[key]);
    if (isNaN(rawVal)) {
      normalized[key] = 0;
    } else {
      normalized[key] = Math.min(100, Math.max(0, Math.round(rawVal * 100) / 100));
    }
  }
  return normalized;
}

/**
 * Calculates the total weighted score based on the standardized 7-criteria rubric
 * @param {Object} rawScores - Criteria scores (each 0-100)
 * @returns {Object} { totalScore, adaptabilityScore, breakdown }
 */
function calculateWeightedScore(rawScores) {
  const normalized = normalizeScores(rawScores);
  let totalScore = 0;
  const breakdown = {};

  for (const [key, meta] of Object.entries(EVALUATION_RUBRIC)) {
    const score = normalized[key];
    const weightedPoints = score * meta.weight;
    breakdown[key] = {
      rawScore: score,
      weight: meta.weight,
      weightedPoints: Math.round(weightedPoints * 100) / 100
    };
    totalScore += weightedPoints;
  }

  totalScore = Math.round(totalScore * 100) / 100;
  const adaptabilityScore = normalized.adaptability;

  return {
    totalScore,
    adaptabilityScore,
    breakdown
  };
}

/**
 * Rank participants applying the Adaptability score tie-breaker
 * @param {Array<Object>} evaluations
 * @returns {Array<Object>} ranked evaluations with ranks 1..N
 */
function rankEvaluationsWithTieBreaker(evaluations) {
  const sorted = [...evaluations].sort((a, b) => {
    // Primary: Total weighted score descending
    if (b.totalWeightedScore !== a.totalWeightedScore) {
      return b.totalWeightedScore - a.totalWeightedScore;
    }
    // Secondary Tie-breaker: Adaptability score descending
    if (b.adaptabilityScore !== a.adaptabilityScore) {
      return b.adaptabilityScore - a.adaptabilityScore;
    }
    // Tertiary: Earlier submission time
    return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

/**
 * Sanitize evaluation data for participant / public view
 * STRICT SECURITY: Completely strips privateJudgeNotes and internal moderation data
 * @param {Object} evaluation
 * @returns {Object} sanitized evaluation
 */
function sanitizeEvaluationForParticipant(evaluation) {
  if (!evaluation) return null;
  const { privateJudgeNotes, moderationAudit, judgeId, ...safeData } = evaluation;
  return safeData;
}

module.exports = {
  EVALUATION_RUBRIC,
  normalizeScores,
  calculateWeightedScore,
  rankEvaluationsWithTieBreaker,
  sanitizeEvaluationForParticipant
};
