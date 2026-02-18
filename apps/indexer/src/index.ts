import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { initializeIndexer, startListeningToEvents, stopListening } from './indexer';

dotenv.config();

async function main() {
  try {
    logger.info('Starting TrustInfra Blockchain Indexer...');

    await initializeIndexer();
    await startListeningToEvents();

    logger.info('Indexer running and listening to events');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down indexer...');
      stopListening();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down indexer (SIGTERM)...');
      stopListening();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
