import { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import {
  relayTransaction,
  waitForReceipt,
  estimateGas,
  getRelayerAddress,
} from '../relayer/relayerService';

const router = Router();

interface TransactionRequest {
  to: string;
  data: string;
  value?: string;
}

/**
 * POST /api/transactions/relay
 * Relay a transaction through the relayer
 */
router.post('/relay', async (req: Request, res: Response) => {
  try {
    const { to, data, value } = req.body as TransactionRequest;

    if (!to || !data) {
      res.status(400).json({ error: 'Missing to or data' });
      return;
    }

    logger.info(`Relaying transaction to ${to}`);

    const valueInWei = value ? BigInt(value) : BigInt(0);

    const { txHash, receipt } = await relayTransaction({
      to,
      data,
      value: valueInWei,
    });

    res.status(202).json({
      txHash,
      relayerAddress: getRelayerAddress(),
      status: 'pending',
      message: 'Transaction submitted',
    });
  } catch (error) {
    logger.error('Transaction relay failed:', error);
    res.status(500).json({ error: 'Failed to relay transaction' });
  }
});

/**
 * GET /api/transactions/:txHash
 * Get transaction receipt
 */
router.get('/:txHash', async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;

    logger.info(`Fetching receipt for ${txHash}`);

    const receipt = await waitForReceipt(txHash, 1);

    res.json({
      txHash,
      receipt,
    });
  } catch (error) {
    logger.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

/**
 * POST /api/transactions/estimate
 * Estimate gas for a transaction
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { to, data, value } = req.body as TransactionRequest;

    if (!to || !data) {
      res.status(400).json({ error: 'Missing to or data' });
      return;
    }

    const valueInWei = value ? BigInt(value) : BigInt(0);

    const { gasEstimate, gasPrice } = await estimateGas(to, data, valueInWei);

    const estimatedFee = gasEstimate * (gasPrice.maxFeePerGas || BigInt(0));

    res.json({
      to,
      gasEstimate: gasEstimate.toString(),
      gasPrice: {
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString(),
        gasPrice: gasPrice.gasPrice?.toString(),
      },
      estimatedFee: estimatedFee.toString(),
    });
  } catch (error) {
    logger.error('Gas estimation failed:', error);
    res.status(500).json({ error: 'Failed to estimate gas' });
  }
});

/**
 * GET /api/transactions/stats
 * Get relayer statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const relayerAddress = getRelayerAddress();
    // Mock stats for development
    const stats = {
      relayerAddress,
      nonce: Math.floor(Math.random() * 100), // Mock nonce
      balance: '1000000000000000000', // 1 ETH mock
    };
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
