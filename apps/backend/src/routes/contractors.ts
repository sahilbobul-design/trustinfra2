import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// Register contractor
router.post('/register', (req: Request, res: Response) => {
  try {
    const { address, name } = req.body;
    
    if (!address || !name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        address,
        name,
        registered: true,
        createdAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error registering contractor:', error);
    res.status(500).json({ error: 'Failed to register contractor' });
  }
});

// Get contractor profile
router.get('/:address', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        address: req.params.address,
        completedJobs: 0,
        rating: 0,
        stake: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching contractor:', error);
    res.status(500).json({ error: 'Failed to fetch contractor' });
  }
});

// Add stake
router.post('/:address/stake', (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount) {
      res.status(400).json({ error: 'Missing stake amount' });
      return;
    }

    res.json({
      success: true,
      message: 'Stake added successfully'
    });
  } catch (error) {
    logger.error('Error adding stake:', error);
    res.status(500).json({ error: 'Failed to add stake' });
  }
});

export default router;
