const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    const hostLabel = conn.connection.host.includes('mongodb.net') ? 'MongoDB Atlas Cluster' : conn.connection.host;
    console.log(`✅ Database Connected successfully: ${hostLabel} [DB: ${conn.connection.name}]`);
    
    mongoose.connection.on('error', (err) => {
      console.error(`⚠️ MongoDB Connection Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
