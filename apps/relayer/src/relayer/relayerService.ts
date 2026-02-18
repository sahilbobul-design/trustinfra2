import { ethers } from 'ethers';
import logger from '../utils/logger';

interface RelayerConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  network: string;
}

let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;
let relayerConfig: RelayerConfig;

export async function initializeRelayer(): Promise<void> {
  try {
    relayerConfig = {
      rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
      privateKey: process.env.RELAYER_PRIVATE_KEY || '',
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      network: process.env.NETWORK || 'hardhat',
    };

    if (!relayerConfig.privateKey) {
      throw new Error('RELAYER_PRIVATE_KEY not set');
    }

    provider = new ethers.JsonRpcProvider(relayerConfig.rpcUrl);
    signer = new ethers.Wallet(relayerConfig.privateKey, provider);

    logger.info(`Relayer initialized for ${relayerConfig.network}`);
    logger.info(`Relayer address: ${signer.address}`);

    // Check balance
    const balance = await provider.getBalance(signer.address);
    logger.info(`Relayer balance: ${ethers.formatEther(balance)} ETH`);
  } catch (error) {
    logger.error('Failed to initialize relayer:', error);
    throw error;
  }
}

export function getSigner(): ethers.Wallet {
  if (!signer) {
    throw new Error('Relayer not initialized');
  }
  return signer;
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    throw new Error('Provider not initialized');
  }
  return provider;
}

export async function estimateGas(
  to: string,
  data: string,
  value: bigint = BigInt(0)
): Promise<{ gasEstimate: bigint; gasPrice: ethers.FeeData }> {
  try {
    const gasEstimate = await provider.estimateGas({
      to,
      data,
      value,
      from: signer.address,
    });

    const gasPrice = await provider.getFeeData();

    return { gasEstimate, gasPrice: gasPrice! };
  } catch (error) {
    logger.error('Gas estimation failed:', error);
    throw error;
  }
}

export interface RelayerTransactionParams {
  to: string;
  data: string;
  value?: bigint;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export async function relayTransaction(
  params: RelayerTransactionParams,
  retries: number = 3
): Promise<{ txHash: string; receipt: ethers.TransactionResponse }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      logger.info(`Sending transaction (attempt ${attempt + 1}/${retries})`);

      // Estimate gas if not provided
      let gasLimit = params.gasLimit;
      if (!gasLimit) {
        const estimated = await provider.estimateGas({
          to: params.to,
          data: params.data,
          value: params.value || BigInt(0),
          from: signer.address,
        });
        gasLimit = (estimated * BigInt(110)) / BigInt(100); // Add 10% buffer
      }

      // Get fee data if dynamic fees not provided
      let maxFeePerGas = params.maxFeePerGas;
      let maxPriorityFeePerGas = params.maxPriorityFeePerGas;

      if (!maxFeePerGas || !maxPriorityFeePerGas) {
        const feeData = await provider.getFeeData();
        maxFeePerGas = maxFeePerGas || feeData?.maxFeePerGas || BigInt(0);
        maxPriorityFeePerGas =
          maxPriorityFeePerGas || feeData?.maxPriorityFeePerGas || BigInt(0);
      }

      const tx = await signer.sendTransaction({
        to: params.to,
        data: params.data,
        value: params.value || BigInt(0),
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      logger.info(`Transaction sent: ${tx.hash}`);

      return {
        txHash: tx.hash,
        receipt: tx,
      };
    } catch (error) {
      lastError = error as Error;
      logger.error(`Transaction attempt ${attempt + 1} failed:`, error);

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Transaction failed after all retries');
}

export async function waitForReceipt(txHash: string, confirmations: number = 1) {
  try {
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    logger.info(`Transaction confirmed: ${txHash}`);
    logger.info(`Block number: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`);

    return {
      txHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice.toString(),
      effectiveGasPrice: receipt.gasPrice.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      transactionFee: (receipt.gasUsed * receipt.gasPrice).toString(),
    };
  } catch (error) {
    logger.error('Error waiting for receipt:', error);
    throw error;
  }
}

export async function getRelayerBalance(): Promise<string> {
  try {
    const balance = await provider.getBalance(signer.address);
    return ethers.formatEther(balance);
  } catch (error) {
    logger.error('Error getting relayer balance:', error);
    throw error;
  }
}

export function getRelayerAddress(): string {
  return signer.address;
}

export function getConfig(): RelayerConfig {
  return relayerConfig;
}
