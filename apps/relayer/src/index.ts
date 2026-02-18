import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger';
import { initializeRelayer } from './relayer/relayerService';
import transactionRoutes from './routes/transactions';
import gasRoutes from './routes/gas';

dotenv.config();

const app: Express = express();
const PORT = process.env.RELAYER_PORT || 5001;

// ============ Middleware ============
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============ Routes ============
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: 'relayer' });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/gas', gasRoutes);

// ============ Error Handling ============
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ Server Startup ============
async function startServer() {
  try {
    logger.info('Starting TrustInfra Relayer Service...');

    await initializeRelayer();
    logger.info('Relayer initialized');

    const server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      logger.info('Client connected to WebSocket');

      // Emit mock real-time data every 3 seconds
      const interval = setInterval(() => {
        const mockNodes = [
          {
            id: 'node-1',
            name: 'Agriculture Hub Alpha',
            healthScore: 85 + Math.random() * 10,
            riskScore: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
            stakedAmount: 50000 + Math.random() * 20000
          },
          {
            id: 'node-2',
            name: 'Infrastructure Beta',
            healthScore: 75 + Math.random() * 15,
            riskScore: Math.random() > 0.6 ? 'HIGH' : Math.random() > 0.3 ? 'MEDIUM' : 'LOW',
            stakedAmount: 45000 + Math.random() * 15000
          },
          {
            id: 'node-3',
            name: 'Risk Monitor Gamma',
            healthScore: 90 + Math.random() * 8,
            riskScore: Math.random() > 0.8 ? 'HIGH' : Math.random() > 0.5 ? 'MEDIUM' : 'LOW',
            stakedAmount: 60000 + Math.random() * 25000
          }
        ];

        socket.emit('health:update', mockNodes);
      }, 3000);

      socket.on('disconnect', () => {
        clearInterval(interval);
        logger.info('Client disconnected');
      });
    });

    server.listen(PORT, () => {
      logger.info(`Relayer running on port ${PORT}`);
      logger.info(`Network: ${process.env.NETWORK || 'hardhat'}`);
    });
  } catch (error) {
    logger.error('Failed to start relayer:', error);
    process.exit(1);
  }
}

startServer();

export default app;
