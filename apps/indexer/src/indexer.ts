import { ethers } from 'ethers';
import logger from './utils/logger';
import { initializeDatabase, saveEvent } from './database/postgres';
import { getContractABI } from './utils/contractABI';

let provider: ethers.WebSocketProvider;
let contract: ethers.Contract;
let isRunning = false;

export async function initializeIndexer(): Promise<void> {
  try {
    logger.info('Initializing blockchain indexer...');

    // Initialize database
    await initializeDatabase();

    // Setup WebSocket provider
    const wsRpcUrl = (process.env.WS_RPC_URL || 'ws://localhost:8545').replace(
      'http',
      'ws'
    );
    provider = new ethers.WebSocketProvider(wsRpcUrl);

    logger.info(`Connected to ${wsRpcUrl}`);

    // Setup contract
    const contractAddress = process.env.CONTRACT_ADDRESS || '';
    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS not set');
    }

    const abi = getContractABI();
    contract = new ethers.Contract(contractAddress, abi, provider);

    logger.info(`Contract initialized at ${contractAddress}`);

    isRunning = true;
  } catch (error) {
    logger.error('Failed to initialize indexer:', error);
    throw error;
  }
}

export async function startListeningToEvents(): Promise<void> {
  if (!isRunning) {
    throw new Error('Indexer not initialized');
  }

  try {
    logger.info('Starting event listeners...');

    // Listen to HealthRecorded events
    contract.on('HealthRecorded', async (infraId, healthScore, sensorDataHash, relayer, event) => {
      try {
        logger.info(
          `HealthRecorded event: Infra=${infraId}, Score=${healthScore}, Hash=${sensorDataHash}`
        );

        await saveEvent('HealthRecorded', {
          infraId: infraId.toString(),
          healthScore: healthScore.toString(),
          sensorDataHash,
          relayer,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing HealthRecorded event:', error);
      }
    });

    // Listen to MaintenanceClaimSubmitted events
    contract.on(
      'MaintenanceClaimSubmitted',
      async (claimId, infraId, contractor, amount, event) => {
        try {
          logger.info(
            `MaintenanceClaimSubmitted event: Claim=${claimId}, Infra=${infraId}, Contractor=${contractor}`
          );

          await saveEvent('MaintenanceClaimSubmitted', {
            claimId: claimId.toString(),
            infraId: infraId.toString(),
            contractor,
            claimAmount: amount.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
          });
        } catch (error) {
          logger.error('Error processing MaintenanceClaimSubmitted event:', error);
        }
      }
    );

    // Listen to PaymentFrozen events
    contract.on('PaymentFrozen', async (claimId, infraId, reason, event) => {
      try {
        logger.info(
          `PaymentFrozen event: Claim=${claimId}, Infra=${infraId}, Reason=${reason}`
        );

        await saveEvent('PaymentFrozen', {
          claimId: claimId.toString(),
          infraId: infraId.toString(),
          reason,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing PaymentFrozen event:', error);
      }
    });

    // Listen to PaymentReleased events
    contract.on('PaymentReleased', async (claimId, infraId, amount, event) => {
      try {
        logger.info(
          `PaymentReleased event: Claim=${claimId}, Infra=${infraId}, Amount=${amount}`
        );

        await saveEvent('PaymentReleased', {
          claimId: claimId.toString(),
          infraId: infraId.toString(),
          amount: amount.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing PaymentReleased event:', error);
      }
    });

    // Listen to ContractorRegistered events
    contract.on('ContractorRegistered', async (contractor, name, stakedAmount, event) => {
      try {
        logger.info(
          `ContractorRegistered event: Contractor=${contractor}, Name=${name}, Stake=${stakedAmount}`
        );

        await saveEvent('ContractorRegistered', {
          contractor,
          name,
          stakedAmount: stakedAmount.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing ContractorRegistered event:', error);
      }
    });

    // Listen to ContractorSlashed events
    contract.on('ContractorSlashed', async (contractor, slashedAmount, reason, event) => {
      try {
        logger.info(
          `ContractorSlashed event: Contractor=${contractor}, Amount=${slashedAmount}, Reason=${reason}`
        );

        await saveEvent('ContractorSlashed', {
          contractor,
          slashedAmount: slashedAmount.toString(),
          reason,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
      } catch (error) {
        logger.error('Error processing ContractorSlashed event:', error);
      }
    });

    logger.info('Event listeners started successfully');
  } catch (error) {
    logger.error('Failed to start event listeners:', error);
    throw error;
  }
}

export function stopListening(): void {
  if (contract) {
    contract.removeAllListeners();
    isRunning = false;
    logger.info('Event listeners stopped');
  }
}

export function isIndexerRunning(): boolean {
  return isRunning;
}
