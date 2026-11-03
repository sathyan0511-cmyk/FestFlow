const mongoose = require('mongoose');

/**
 * Connect to Local MongoDB Database (Local-Only Architecture)
 * Primary Connection: mongodb://127.0.0.1:27017/festflow
 */
const connectDB = async () => {
  const mongoUri =
    process.env.LOCAL_MONGODB_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/festflow';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ Primary Database Connected (Local MongoDB): ${conn.connection.host} [DB: ${conn.connection.name}]`);

    mongoose.connection.on('error', (err) => {
      console.error(`⚠️ Local MongoDB Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Local MongoDB disconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`❌ Local MongoDB Connection Failed: ${error.message}`);
    console.error('💡 Make sure your local MongoDB service is running (e.g. `mongod` on port 27017).');
    process.exit(1);
  }
};

/**
 * Gracefully close the local database connection
 */
const closeAll = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ Local MongoDB connection closed.');
  } catch (err) {
    console.warn('Warning disconnecting Local MongoDB:', err.message);
  }
};

/**
 * Returns health status of the local database connection
 */
const getDbStatus = () => {
  const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
  return {
    mode: 'local-only',
    local: {
      connected: isConnected,
      host: isConnected ? mongoose.connection.host : null,
      name: isConnected ? mongoose.connection.name : null,
      readyState: mongoose.connection ? mongoose.connection.readyState : 0
    }
  };
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.closeAll = closeAll;
module.exports.getDbStatus = getDbStatus;
module.exports.isOfflineMode = () => true;
module.exports.isAtlasConnected = () => false;
module.exports.getAtlasConnection = () => null;
