require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const clubRoutes = require('./routes/clubRoutes');
const venueRoutes = require('./routes/venueRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const financeRoutes = require('./routes/financeRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const cateringRoutes = require('./routes/cateringRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', async (req, res) => {
  const dbStatus = typeof connectDB.getDbStatus === 'function' ? connectDB.getDbStatus() : null;
  let syncQueueStats = null;
  let syncWorkerStats = null;
  try {
    const syncQueueService = require('./services/syncQueueService');
    syncQueueStats = await syncQueueService.getQueueStats();
  } catch (_) {}

  try {
    const syncWorker = require('./services/syncWorkerService');
    syncWorkerStats = await syncWorker.getWorkerStatus();
  } catch (_) {}

  res.status(200).json({
    status: 'online',
    appName: 'FestFlow API',
    version: '1.0.0',
    mode: dbStatus?.cloud?.connected ? 'cloud-synced' : 'offline-local',
    database: dbStatus,
    syncQueue: syncQueueStats,
    syncWorker: syncWorkerStats,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sync/status', async (req, res) => {
  try {
    const dbStatus = typeof connectDB.getDbStatus === 'function' ? connectDB.getDbStatus() : null;
    const syncQueueService = require('./services/syncQueueService');
    const syncWorker = require('./services/syncWorkerService');

    const [queueStats, workerStatus] = await Promise.all([
      syncQueueService.getQueueStats().catch(() => ({ pending: 0, processing: 0, synced: 0, failed: 0, conflict: 0, unresolvedConflicts: 0 })),
      syncWorker.getWorkerStatus().catch(() => ({ running: false, atlasConnected: false }))
    ]);

    const localDbReady = dbStatus?.local?.connected || false;
    const cloudAtlasReady = dbStatus?.cloud?.connected || workerStatus?.atlasConnected || false;

    let overallStatus = 'OFFLINE';
    if (!localDbReady) {
      overallStatus = 'SERVER_ERROR';
    } else if (queueStats.unresolvedConflicts > 0 || queueStats.conflict > 0) {
      overallStatus = 'CONFLICT';
    } else if (queueStats.failed > 0) {
      overallStatus = 'SYNC ERROR';
    } else if (queueStats.processing > 0) {
      overallStatus = 'SYNCING';
    } else if (cloudAtlasReady && queueStats.pending > 0) {
      overallStatus = 'SYNCING';
    } else if (!cloudAtlasReady && queueStats.pending > 0) {
      overallStatus = 'PENDING CHANGES';
    } else if (cloudAtlasReady && queueStats.pending === 0) {
      overallStatus = 'SYNCED';
    } else if (!cloudAtlasReady && queueStats.pending === 0) {
      overallStatus = 'OFFLINE';
    }

    res.status(200).json({
      success: true,
      overallStatus,
      localDbReady,
      cloudAtlasReady,
      syncWorkerRunning: workerStatus?.running || false,
      queueStats,
      workerStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/catering', cateringRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/faculty', facultyRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found.`
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;
if (require.main === module) {
  connectDB().then(() => {
    // Start background sync worker (runs only in offline-first mode when enabled)
    const syncWorker = require('./services/syncWorkerService');
    syncWorker.start().catch((err) => {
      console.warn('⚠️ SyncWorker startup warning:', err.message);
    });

    server = app.listen(PORT, () => {
      console.log(`🚀 FestFlow Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  });

  const handleShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    try {
      const syncWorker = require('./services/syncWorkerService');
      await syncWorker.stop();
    } catch (_) {}

    if (server) {
      server.close(async () => {
        console.log('HTTP server closed.');
        if (typeof connectDB.closeAll === 'function') {
          await connectDB.closeAll();
        }
        process.exit(0);
      });
    } else {
      if (typeof connectDB.closeAll === 'function') {
        await connectDB.closeAll();
      }
      process.exit(0);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('unhandledRejection', (err) => {
    console.error(`💥 Unhandled Rejection: ${err.message}`);
    if (server) {
      server.close(async () => {
        if (typeof connectDB.closeAll === 'function') {
          await connectDB.closeAll();
        }
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

module.exports = app;
