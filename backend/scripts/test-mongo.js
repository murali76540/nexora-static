/**
 * MongoDB Atlas Connection Diagnostic Tool
 * E.G.S. Pillay Engineering College — NEXORA Platform
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testMongoConnection() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  console.log('=======================================================');
  console.log('🍃 NEXORA MongoDB Atlas Cloud Diagnostic Tool');
  console.log('🏛️  E.G.S. Pillay Engineering College, Nagapattinam');
  console.log('=======================================================');

  if (!uri) {
    console.log('⚠️  No MONGODB_URI found in environment or .env file.');
    console.log('\nTo connect NEXORA to MongoDB Atlas:');
    console.log('1. Create a free cluster on MongoDB Atlas (https://www.mongodb.com/cloud/atlas)');
    console.log('2. In Security -> Network Access, allow IP 0.0.0.0/0 (allow access from anywhere)');
    console.log('3. In Security -> Database Access, create a database user and password');
    console.log('4. Copy the SRV connection string:');
    console.log('   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/nexora?retryWrites=true&w=majority"');
    console.log('5. Add MONGODB_URI to your .env file or hosting environment variables (Render/Vercel).');
    console.log('=======================================================');
    process.exit(0);
  }

  const sanitized = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`📡 Connecting to: ${sanitized}`);
  console.log('⏳ Testing network latency and authentication...');

  const startTime = Date.now();
  let client;

  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    await client.connect();
    const duration = Date.now() - startTime;

    const dbName = process.env.MONGODB_DB_NAME || 'nexora';
    const db = client.db(dbName);

    // Ping admin command
    const pingRes = await db.command({ ping: 1 });

    console.log(`\n✅ MongoDB Atlas Connection SUCCESSFUL!`);
    console.log(`⏱️  Latency: ${duration} ms`);
    console.log(`📁 Database Name: ${db.databaseName}`);
    console.log(`📊 Ping Response:`, pingRes);

    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Existing Collections (${collections.length}):`);
    if (collections.length === 0) {
      console.log('   (Empty database — NEXORA will automatically create collections on first run)');
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count} records`);
      }
    }

    console.log('\n🎉 Your MongoDB Atlas cluster is fully configured and ready for NEXORA!');
    console.log('=======================================================');
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Connection FAILED: ${err.message}`);
    console.log('\nTroubleshooting Checklist:');
    console.log('1. IP Access List: Go to Atlas -> Network Access -> Add IP -> Select "Allow Access from Anywhere" (0.0.0.0/0)');
    console.log('2. Password Characters: If your password contains special characters like @, #, $, URL-encode them (e.g. @ becomes %40)');
    console.log('3. Database User: Ensure the user has "Read and write to any database" role in Database Access');
    console.log('=======================================================');
    if (client) await client.close();
    process.exit(1);
  }
}

testMongoConnection();
