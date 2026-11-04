/**
 * NEXORA Cryptographic & Hashing Utilities
 * E.G.S. Pillay Engineering College
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a canonical SHA-256 hash from submission data
 * @param {Object} data 
 * @returns {string} SHA-256 hex string
 */
function generateCanonicalHash(data) {
  // Sort keys alphabetically for canonical consistency
  const sortedKeys = Object.keys(data).sort();
  const canonicalString = sortedKeys.map(key => `${key}:${JSON.stringify(data[key])}`).join('|');
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Generate unique server-side submission receipt ID
 * Format: NEX-SUB-YYYYMMDD-XXXXXXXX
 */
function generateInitialReceiptId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NEX-SUB-${dateStr}-${randomHex}`;
}

/**
 * Generate unique server-side revision receipt ID
 * Format: NEX-REV-YYYYMMDD-XXXXXXXX
 */
function generateRevisionReceiptId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NEX-REV-${dateStr}-${randomHex}`;
}

/**
 * Hash a password or access key using bcrypt
 */
async function hashValue(plaintext) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Compare plaintext with hashed value
 */
async function verifyHash(plaintext, hashed) {
  if (!plaintext || !hashed) return false;
  return bcrypt.compare(plaintext, hashed);
}

module.exports = {
  generateCanonicalHash,
  generateInitialReceiptId,
  generateRevisionReceiptId,
  hashValue,
  verifyHash
};
