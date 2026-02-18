import postgres from 'postgres';
import logger from '../utils/logger';

let sql: postgres.Sql;

export async function initializeDatabase(): Promise<void> {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432');
    const database = process.env.DB_NAME || 'trustinfra';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'password';

    sql = postgres({
      host,
      port,
      database,
      username: user,
      password,
    });

    // Test connection
    await sql`SELECT 1`;

    logger.info(`Connected to PostgreSQL at ${host}:${port}/${database}`);

    // Create tables
    await createTables();
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  try {
    // Events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        event_name VARCHAR(100) NOT NULL,
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        log_index BIGINT NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_block (block_number),
        INDEX idx_event_name (event_name),
        INDEX idx_txhash (transaction_hash)
      )
    `;

    // Infrastructure events table
    await sql`
      CREATE TABLE IF NOT EXISTS infrastructure_events (
        id BIGSERIAL PRIMARY KEY,
        infra_id BIGINT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        health_score SMALLINT,
        sensor_data_hash VARCHAR(66),
        relayer_address VARCHAR(42),
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_infra_id (infra_id),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      )
    `;

    // Contractor events table
    await sql`
      CREATE TABLE IF NOT EXISTS contractor_events (
        id BIGSERIAL PRIMARY KEY,
        contractor_address VARCHAR(42) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        stake_amount NUMERIC,
        slashed_amount NUMERIC,
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contractor (contractor_address),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      )
    `;

    // Payment events table
    await sql`
      CREATE TABLE IF NOT EXISTS payment_events (
        id BIGSERIAL PRIMARY KEY,
        claim_id BIGINT NOT NULL,
        infra_id BIGINT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        amount NUMERIC,
        reason TEXT,
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_claim_id (claim_id),
        INDEX idx_infra_id (infra_id),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      )
    `;

    logger.info('Database tables created/verified');
  } catch (error) {
    logger.error('Failed to create tables:', error);
    throw error;
  }
}

export async function saveEvent(eventName: string, eventData: any): Promise<void> {
  try {
    const blockNumber = eventData.blockNumber || 0;
    const txHash = eventData.transactionHash || '';

    // Save to main events table
    await sql`
      INSERT INTO events (event_name, block_number, transaction_hash, log_index, event_data)
      VALUES (${eventName}, ${blockNumber}, ${txHash}, ${eventData.logIndex || 0}, ${JSON.stringify(eventData)})
    `;

    // Save to specialized tables based on event type
    if (eventName === 'HealthRecorded') {
      await sql`
        INSERT INTO infrastructure_events (infra_id, event_type, health_score, sensor_data_hash, relayer_address, block_number, transaction_hash)
        VALUES (${eventData.infraId}, ${eventName}, ${eventData.healthScore}, ${eventData.sensorDataHash}, ${eventData.relayer}, ${blockNumber}, ${txHash})
      `;
    } else if (eventName === 'MaintenanceClaimSubmitted') {
      // Save to payment and infrastructure events
      await sql`
        INSERT INTO payment_events (claim_id, infra_id, event_type, amount, block_number, transaction_hash)
        VALUES (${eventData.claimId}, ${eventData.infraId}, ${eventName}, ${eventData.claimAmount}, ${blockNumber}, ${txHash})
      `;
    } else if (eventName === 'ContractorRegistered' || eventName === 'ContractorSlashed') {
      await sql`
        INSERT INTO contractor_events (contractor_address, event_type, stake_amount, slashed_amount, block_number, transaction_hash)
        VALUES (${eventData.contractor}, ${eventName}, ${eventData.stakedAmount || eventData.slashedAmount}, ${eventData.slashedAmount}, ${blockNumber}, ${txHash})
      `;
    } else if (eventName === 'PaymentFrozen' || eventName === 'PaymentReleased') {
      await sql`
        INSERT INTO payment_events (claim_id, infra_id, event_type, amount, reason, block_number, transaction_hash)
        VALUES (${eventData.claimId}, ${eventData.infraId}, ${eventName}, ${eventData.amount}, ${eventData.reason}, ${blockNumber}, ${txHash})
      `;
    }

    logger.debug(`Event saved: ${eventName}`);
  } catch (error) {
    logger.error(`Failed to save event ${eventName}:`, error);
    throw error;
  }
}

export async function getEvents(query: any = {}): Promise<any[]> {
  try {
    const result = await sql`
      SELECT * FROM events
      ORDER BY block_number DESC
      LIMIT ${query.limit || 100}
    `;
    return result || [];
  } catch (error) {
    logger.error('Failed to fetch events:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    if (sql) {
      await sql.end();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database:', error);
  }
}
