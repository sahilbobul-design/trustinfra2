import mongoose from 'mongoose';
import logger from '../utils/logger';

// Import dynamically to avoid issues in production build if dev dependency
let MongoMemoryServer: any;

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trust-infra';

  try {
    logger.info(`Attempting to connect to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    logger.info('Connected to Local MongoDB');
  } catch (error) {
    logger.warn('Local MongoDB connection failed. Starting In-Memory MongoDB...');

    try {
      if (!MongoMemoryServer) {
        MongoMemoryServer = (await import('mongodb-memory-server')).MongoMemoryServer;
      }

      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();

      logger.info(`In-Memory MongoDB started at ${uri}`);
      await mongoose.connect(uri);
      logger.info('Connected to In-Memory MongoDB');
    } catch (memError) {
      logger.error('Failed to start In-Memory MongoDB:', memError);
      throw memError; // Propagate error if both fail
    }
  }
}

export function disconnectDB(): Promise<void> {
  return mongoose.disconnect();
}
