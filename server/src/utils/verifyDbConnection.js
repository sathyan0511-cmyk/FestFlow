require('dotenv').config();
const mongoose = require('mongoose');

const checkConnection = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log(JSON.stringify({ status: 'error', message: 'MONGODB_URI is not set in .env' }));
    process.exit(1);
  }

  const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('.mongodb.net');
  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const host = conn.connection.host;
    const dbName = conn.connection.name;

    console.log(JSON.stringify({
      status: 'success',
      target: isAtlas ? 'MongoDB Atlas' : (isLocal ? 'Local MongoDB' : 'Custom MongoDB'),
      databaseName: dbName,
      isAtlas: isAtlas,
      hostType: host.includes('mongodb.net') ? 'Atlas Cloud Host' : 'Local / On-premise Host'
    }));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.log(JSON.stringify({
      status: 'failed',
      target: isAtlas ? 'MongoDB Atlas' : (isLocal ? 'Local MongoDB' : 'Custom MongoDB'),
      isAtlas: isAtlas,
      errorMessage: error.message
    }));
    process.exit(1);
  }
};

checkConnection();
