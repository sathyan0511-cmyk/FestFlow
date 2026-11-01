const mongoose = require('mongoose');
const syncPlugin = require('../plugins/syncPlugin');

// Register the universal offline mutation capture plugin across all schemas
mongoose.plugin(syncPlugin);

// State tracking for the secondary MongoDB Atlas connection
const cloudState = {
  connection: null,
  isConnected: false,
  isConnecting: false,
  lastAttempt: null,
  lastConnected: null,
  retryCount: 0,
  error: null,
  reconnectTimer: null
};

let activeConnectPromise = null;

/**
 * Determines whether the current deployment is running in Offline-First mode
 * or in Direct Cloud mode (e.g. deployed on Render / production).
 */
const isOfflineMode = () => {
  if (process.env.LOCAL_MONGODB_URI) return true;
  if (
    process.env.MONGODB_URI &&
    !process.env.MONGODB_URI.includes('mongodb.net') &&
    !process.env.MONGODB_URI.includes('mongodb+srv://')
  ) {
    return true;
  }
  return false;
};

/**
 * Resolves local and cloud MongoDB URIs with backward compatibility
 */
const getUris = () => {
  const offline = isOfflineMode();

  const localUri = offline
    ? process.env.LOCAL_MONGODB_URI ||
      (process.env.MONGODB_URI &&
      !process.env.MONGODB_URI.includes('mongodb.net') &&
      !process.env.MONGODB_URI.includes('mongodb+srv://')
        ? process.env.MONGODB_URI
        : 'mongodb://127.0.0.1:27017/festflow')
    : null;

  const cloudUri =
    process.env.CLOUD_MONGODB_URI ||
    (process.env.MONGODB_URI &&
    (process.env.MONGODB_URI.includes('mongodb.net') ||
      process.env.MONGODB_URI.includes('mongodb+srv://'))
      ? process.env.MONGODB_URI
      : null);

  return { localUri, cloudUri, isOffline: offline };
};

/**
 * Connect to secondary MongoDB Atlas instance (non-blocking)
 */
const connectAtlas = async (force = false) => {
  const { cloudUri, isOffline } = getUris();

  if (!isOffline) {
    // If running in direct cloud mode, primary Mongoose already connects to Atlas
    return null;
  }

  if (!cloudUri) {
    console.log('ℹ️ No CLOUD_MONGODB_URI configured. Running purely on Local MongoDB.');
    return null;
  }

  if (process.env.ENABLE_CLOUD_SYNC === 'false') {
    console.log('ℹ️ Cloud sync explicitly disabled via ENABLE_CLOUD_SYNC=false.');
    return null;
  }

  if (cloudState.isConnected && !force) {
    return cloudState.connection;
  }

  if (activeConnectPromise && !force) {
    return activeConnectPromise;
  }

  activeConnectPromise = (async () => {
    cloudState.isConnecting = true;
    cloudState.lastAttempt = new Date();

    if (cloudState.reconnectTimer) {
      clearTimeout(cloudState.reconnectTimer);
      cloudState.reconnectTimer = null;
    }

    try {
      if (cloudState.connection) {
        try {
          await cloudState.connection.close();
        } catch (_) {}
      }

      const targetDb = process.env.CLOUD_DB_NAME || 'festflow';
      const secondaryConn = mongoose.createConnection(cloudUri, {
        dbName: targetDb,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000
      });

      secondaryConn.on('connected', () => {
        cloudState.isConnected = true;
        cloudState.isConnecting = false;
        cloudState.lastConnected = new Date();
        cloudState.retryCount = 0;
        cloudState.error = null;
        console.log(`☁️ Secondary Database Connected (MongoDB Atlas): ${secondaryConn.host} [DB: ${secondaryConn.name}]`);
      });

      secondaryConn.on('disconnected', () => {
        cloudState.isConnected = false;
        cloudState.isConnecting = false;
        console.warn('⚠️ MongoDB Atlas disconnected. FestFlow continues operating in Offline-First mode.');
        scheduleAtlasReconnect();
      });

      secondaryConn.on('error', (err) => {
        cloudState.isConnected = false;
        cloudState.error = err.message;
        console.warn(`⚠️ MongoDB Atlas Connection Error: ${err.message}`);
      });

      await secondaryConn.asPromise();

      cloudState.connection = secondaryConn;
      cloudState.isConnected = secondaryConn.readyState === 1;
      cloudState.isConnecting = false;
      return secondaryConn;
    } catch (error) {
      cloudState.isConnected = false;
      cloudState.isConnecting = false;
      cloudState.error = error.message;
      cloudState.retryCount += 1;

      console.log(
        `ℹ️ MongoDB Atlas unreachable (${error.message}). FestFlow is operating in Offline-First mode on Local MongoDB.`
      );

      scheduleAtlasReconnect();
      return null;
    } finally {
      activeConnectPromise = null;
    }
  })();

  return activeConnectPromise;
};

/**
 * Schedules automatic reconnection to Atlas using exponential backoff
 */
const scheduleAtlasReconnect = () => {
  if (cloudState.reconnectTimer) return;

  const delay = Math.min(5000 * Math.pow(1.5, Math.min(cloudState.retryCount, 6)), 60000);

  cloudState.reconnectTimer = setTimeout(async () => {
    cloudState.reconnectTimer = null;
    if (!cloudState.isConnected && !cloudState.isConnecting) {
      await connectAtlas();
    }
  }, delay);

  if (cloudState.reconnectTimer.unref) {
    cloudState.reconnectTimer.unref();
  }
};

/**
 * Connect to Primary Database.
 * In Offline Mode: Connects to Local MongoDB and starts secondary Atlas monitor + reconciliation.
 * In Direct Cloud Mode: Connects primary Mongoose directly to MongoDB Atlas.
 */
const connectDB = async () => {
  const { localUri, cloudUri, isOffline } = getUris();

  if (!isOffline) {
    // Direct Cloud Mode (Production deployment on Render, etc.)
    const targetUri = cloudUri || process.env.MONGODB_URI;
    if (!targetUri) {
      console.error('❌ MONGODB_URI is not defined for production cloud deployment.');
      process.exit(1);
    }
    try {
      const conn = await mongoose.connect(targetUri);
      console.log(`☁️ Primary Database Connected (Direct Cloud Mode): ${conn.connection.host} [DB: ${conn.connection.name}]`);
      return conn;
    } catch (error) {
      console.error(`❌ Cloud Database Connection Failed: ${error.message}`);
      process.exit(1);
    }
  }

  // Offline-First Mode
  try {
    const conn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ Primary Database Connected (Local MongoDB): ${conn.connection.host} [DB: ${conn.connection.name}]`);

    mongoose.connection.on('error', (err) => {
      console.error(`⚠️ Primary MongoDB Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Primary MongoDB disconnected.');
    });

    // Initiate non-blocking secondary Atlas connection
    connectAtlas().catch((err) => {
      console.warn(`⚠️ Background Atlas initialization warning: ${err.message}`);
    });

    // Run background outbox reconciliation to recover any missed mutations from a previous crash
    const syncReconciler = require('../services/syncReconciliationService');
    syncReconciler.reconcileAll().then((summary) => {
      if (summary.mutationsEnqueued > 0 || summary.tombstonesEnqueued > 0) {
        console.log(
          `🔄 [SyncReconciler] Crash recovery complete: Enqueued ${summary.mutationsEnqueued} missing mutations, ${summary.tombstonesEnqueued} tombstones.`
        );
      }
    }).catch((err) => {
      console.warn('[SyncReconciler] Startup reconciliation warning:', err.message);
    });

    return conn;
  } catch (error) {
    console.error(`❌ Primary Database (Local MongoDB) Connection Failed: ${error.message}`);
    console.error('💡 Make sure your local MongoDB service is running (e.g. `mongod` on port 27017).');
    process.exit(1);
  }
};

/**
 * Gracefully close both local and cloud database connections
 */
const closeAll = async () => {
  if (cloudState.reconnectTimer) {
    clearTimeout(cloudState.reconnectTimer);
    cloudState.reconnectTimer = null;
  }

  if (cloudState.connection) {
    try {
      await cloudState.connection.close();
      cloudState.isConnected = false;
      console.log('☁️ MongoDB Atlas connection closed.');
    } catch (err) {
      console.warn('Warning closing Atlas connection:', err.message);
    }
  }

  try {
    await mongoose.disconnect();
    console.log('✅ Local MongoDB connection closed.');
  } catch (err) {
    console.warn('Warning disconnecting Local MongoDB:', err.message);
  }

  console.log('✅ All database connections closed gracefully.');
};

/**
 * Returns current health status of both database connections
 */
const getDbStatus = () => {
  const offline = isOfflineMode();
  const localReady = mongoose.connection && mongoose.connection.readyState === 1;
  const cloudReady = cloudState.connection && cloudState.connection.readyState === 1;

  return {
    mode: offline ? 'offline-first' : 'direct-cloud',
    local: {
      connected: localReady,
      host: localReady ? mongoose.connection.host : null,
      name: localReady ? mongoose.connection.name : null,
      readyState: mongoose.connection ? mongoose.connection.readyState : 0
    },
    cloud: {
      configured: !!getUris().cloudUri,
      connected: offline ? cloudReady : localReady,
      host: offline ? (cloudReady ? cloudState.connection.host : null) : (localReady ? mongoose.connection.host : null),
      name: offline ? (cloudReady ? cloudState.connection.name : null) : (localReady ? mongoose.connection.name : null),
      readyState: offline ? (cloudState.connection ? cloudState.connection.readyState : 0) : (mongoose.connection ? mongoose.connection.readyState : 0),
      lastAttempt: cloudState.lastAttempt,
      lastConnected: cloudState.lastConnected,
      retryCount: cloudState.retryCount,
      error: cloudState.error
    }
  };
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.connectAtlas = connectAtlas;
module.exports.getAtlasConnection = () => cloudState.connection;
module.exports.isAtlasConnected = () =>
  cloudState.isConnected && cloudState.connection && cloudState.connection.readyState === 1;
module.exports.getDbStatus = getDbStatus;
module.exports.closeAll = closeAll;
module.exports.isOfflineMode = isOfflineMode;
