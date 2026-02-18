import { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import { getProvider, getRelayerBalance, getRelayerAddress } from '../relayer/relayerService';
import { ethers } from 'ethers';

const router = Router();

/**
 * GET /api/gas/price
 * Get current gas price
 */
router.get('/price', async (req: Request, res: Response) => {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();

    res.json({
      maxFeePerGas: feeData?.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas?.toString(),
      gasPrice: feeData?.gasPrice?.toString(),
    });
  } catch (error) {
    logger.error('Error fetching gas price:', error);
    res.status(500).json({ error: 'Failed to fetch gas price' });
  }
});

/**
 * GET /api/gas/relayer-stats
 * Get relayer statistics
 */
router.get('/relayer-stats', async (req: Request, res: Response) => {
  try {
    const balance = await getRelayerBalance();
    const address = getRelayerAddress();
    const provider = getProvider();

    const nonce = await provider.getTransactionCount(address);
    const feeData = await provider.getFeeData();

    res.json({
      relayerAddress: address,
      balance: balance,
      nonce,
      gasPrice: {
        maxFeePerGas: feeData?.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas?.toString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching relayer stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
