/**
 * NEXORA Database & Persistent Ledger Engine
 * Institutional Data Persistence for E.G.S. Pillay Engineering College
 * Supports: Local High-Performance Atomic Persistence & Cloud MongoDB Atlas
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_DIR = process.env.DATA_DIR 
  ? path.resolve(process.cwd(), process.env.DATA_DIR)
  : path.join(__dirname, '../../data');

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const COLLECTION_NAMES = [
  'users',
  'competitions',
  'competitionMembers',
  'problemVersions',
  'submissions',
  'submissionReceipts',
  'evaluations',
  'notifications',
  'leaderboardSettings',
  'sessions',
  'auditLogs'
];

class PersistentCollection extends Map {
  constructor(name, dataDir, isPersistent = true) {
    super();
    this.name = name;
    this.filePath = path.join(dataDir, `${name}.json`);
    this.isPersistent = isPersistent;
    this.mongoCol = null;
  }

  set(key, value) {
    super.set(key, value);

    // Save to local atomic file if persistent and not in test mode
    if (this.isPersistent && process.env.NODE_ENV !== 'test') {
      this.scheduleSave();
    }

    // Persist to MongoDB Atlas cloud if connected
    if (this.mongoCol && process.env.NODE_ENV !== 'test') {
      this.mongoCol.updateOne(
        { _id: key },
        { $set: { _id: key, data: value, updatedAt: new Date().toISOString() } },
        { upsert: true }
      ).catch(err => {
        console.error(`[MongoDB Atlas] Write error in ${this.name}.${key}:`, err.message);
      });
    }

    return this;
  }

  setInMemory(key, value) {
    super.set(key, value);
    return this;
  }

  delete(key) {
    const res = super.delete(key);
    if (this.isPersistent && res && process.env.NODE_ENV !== 'test') {
      this.scheduleSave();
    }

    if (this.mongoCol && process.env.NODE_ENV !== 'test') {
      this.mongoCol.deleteOne({ _id: key }).catch(err => {
        console.error(`[MongoDB Atlas] Delete error in ${this.name}.${key}:`, err.message);
      });
    }

    return res;
  }

  clear() {
    super.clear();
    if (this.isPersistent && process.env.NODE_ENV !== 'test') {
      this.scheduleSave();
    }

    if (this.mongoCol && process.env.NODE_ENV !== 'test') {
      this.mongoCol.deleteMany({}).catch(err => {
        console.error(`[MongoDB Atlas] Clear error in ${this.name}:`, err.message);
      });
    }
  }

  scheduleSave() {
    this.saveSync();
  }

  saveSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataArray = Array.from(this.entries());
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataArray, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error(`[DB Error] Failed to write collection ${this.name}:`, err.message);
    }
  }

  loadSync() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const dataArray = JSON.parse(raw);
        super.clear();
        for (const [key, val] of dataArray) {
          super.set(key, val);
        }
      }
    } catch (err) {
      console.error(`[DB Error] Failed to load collection ${this.name}:`, err.message);
    }
  }
}

class DatabaseManager {
  constructor() {
    this.collections = {};
    this.isInitialized = false;
    this.lastSync = new Date().toISOString();

    // MongoDB Atlas properties
    this.mongoClient = null;
    this.mongoDb = null;
    this.mongoConnected = false;
    this.mongoConnecting = false;
    this.mongoError = null;

    for (const name of COLLECTION_NAMES) {
      this.collections[name] = new PersistentCollection(name, DATA_DIR, true);
    }
  }

  init() {
    if (this.isInitialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {}
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      try {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      } catch (e) {}
    }

    // Load from local disk if available and not running in test mode
    if (process.env.NODE_ENV !== 'test') {
      for (const name of COLLECTION_NAMES) {
        this.collections[name].loadSync();
      }
      console.log(`💾 [NEXORA Database] Local persistent storage connected: ${DATA_DIR}`);

      // Auto-connect to MongoDB Atlas if connection URI is provided
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (mongoUri) {
        this.connectMongo(mongoUri);
      }
    }

    this.isInitialized = true;
    this.lastSync = new Date().toISOString();
  }

  async connectMongo(uri) {
    if (this.mongoConnected || this.mongoConnecting) return;
    this.mongoConnecting = true;
    this.mongoError = null;

    const sanitizedUri = this.getSanitizedHost(uri);
    console.log(`🍃 [MongoDB Atlas] Connecting to cluster: ${sanitizedUri}...`);

    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000
      });

      await client.connect();
      this.mongoClient = client;
      this.mongoDb = client.db(process.env.MONGODB_DB_NAME || 'nexora');
      this.mongoConnected = true;
      this.mongoConnecting = false;

      console.log(`🍃 [MongoDB Atlas] Successfully connected to database: ${this.mongoDb.databaseName}`);

      // Synchronize cloud collections
      await this.syncWithMongo();

      return {
        success: true,
        database: this.mongoDb.databaseName,
        cluster: sanitizedUri
      };
    } catch (err) {
      this.mongoConnected = false;
      this.mongoConnecting = false;
      this.mongoError = err.message;
      console.warn(`⚠️ [MongoDB Atlas] Connection failed (${err.message}). NEXORA is running with local persistent storage.`);
      return { success: false, error: err.message };
    }
  }

  async syncWithMongo() {
    if (!this.mongoConnected || !this.mongoDb) return;

    for (const name of COLLECTION_NAMES) {
      const col = this.collections[name];
      const mongoCol = this.mongoDb.collection(name);
      col.mongoCol = mongoCol;

      try {
        const cloudDocs = await mongoCol.find({}).toArray();
        if (cloudDocs.length > 0) {
          // Cloud has records: load them into in-memory store
          for (const doc of cloudDocs) {
            col.setInMemory(doc._id, doc.data);
          }
          // Also sync to local file for offline resilience
          if (process.env.NODE_ENV !== 'test') {
            col.saveSync();
          }
          console.log(`   ↳ Collection '${name}': Synced ${cloudDocs.length} records from MongoDB Atlas`);
        } else if (col.size > 0) {
          // Local has records but cloud is empty: push initial records to cloud
          let pushedCount = 0;
          for (const [key, val] of col.entries()) {
            await mongoCol.updateOne(
              { _id: key },
              { $set: { _id: key, data: val, updatedAt: new Date().toISOString() } },
              { upsert: true }
            );
            pushedCount++;
          }
          console.log(`   ↳ Collection '${name}': Pushed ${pushedCount} local records to MongoDB Atlas`);
        }
      } catch (syncErr) {
        console.error(`[MongoDB Atlas] Sync error on collection ${name}:`, syncErr.message);
      }
    }
    this.lastSync = new Date().toISOString();
  }

  getSanitizedHost(uri) {
    if (!uri) return null;
    try {
      // Mask password in mongodb:// or mongodb+srv://
      return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    } catch (e) {
      return 'mongodb+srv://[masked]';
    }
  }

  getCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new PersistentCollection(name, DATA_DIR, true);
    }
    return this.collections[name];
  }

  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUPS_DIR, `backup-${timestamp}`);
    try {
      fs.mkdirSync(backupDir, { recursive: true });
    } catch (e) {}

    let count = 0;
    for (const name of COLLECTION_NAMES) {
      const col = this.collections[name];
      col.saveSync();
      if (fs.existsSync(col.filePath)) {
        try {
          fs.copyFileSync(col.filePath, path.join(backupDir, `${name}.json`));
          count++;
        } catch (e) {}
      }
    }
    return { backupDir, filesCount: count, timestamp };
  }

  getStatus() {
    const stats = {};
    let totalRecords = 0;
    let totalBytes = 0;

    for (const name of COLLECTION_NAMES) {
      const col = this.collections[name];
      const count = col.size;
      stats[name] = count;
      totalRecords += count;

      if (fs.existsSync(col.filePath)) {
        try {
          totalBytes += fs.statSync(col.filePath).size;
        } catch (e) {}
      }
    }

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    return {
      connected: true,
      engine: this.mongoConnected 
        ? 'MongoDB Atlas Cloud + High-Speed In-Memory Ledger' 
        : 'NEXORA High-Performance Atomic Persistent Database',
      mongoAtlas: {
        configured: Boolean(mongoUri),
        connected: this.mongoConnected,
        connecting: this.mongoConnecting,
        database: this.mongoConnected && this.mongoDb ? this.mongoDb.databaseName : null,
        cluster: mongoUri ? this.getSanitizedHost(mongoUri) : null,
        error: this.mongoError
      },
      storageDirectory: DATA_DIR,
      isTestMode: process.env.NODE_ENV === 'test',
      collections: stats,
      totalRecords,
      diskSizeBytes: totalBytes,
      diskSizeKB: (totalBytes / 1024).toFixed(2),
      lastSync: this.lastSync,
      timestamp: new Date().toISOString()
    };
  }

  resetAll() {
    for (const name of COLLECTION_NAMES) {
      this.collections[name].clear();
    }
  }
}

const dbManager = new DatabaseManager();

module.exports = {
  dbManager,
  DATA_DIR,
  db: dbManager.collections
};
