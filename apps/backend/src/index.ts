import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import routes
import infrastructureRoutes from './routes/infrastructure';
import healthRoutes from './routes/health';
import contractorRoutes from './routes/contractors';
import paymentRoutes from './routes/payments';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    /\.vercel\.app$/,
    /\.railway\.app$/,
    process.env.CORS_ORIGIN || 'https://trustinfra2.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'TrustInfra Backend is Running',
    endpoints: {
      health: '/health',
      docs: '/api-docs (Coming Soon)',
      socket: 'ws://localhost:5001'
    }
  });
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
// Initialize database and start server
import { createServer } from 'http';
import { SocketServer } from './websocket/socket';

async function startServer() {
  const httpServer = createServer(app);

  // Initialize WebSocket Server
  const socketServer = new SocketServer(httpServer);

  try {
    await connectDB();
    logger.info('Database connected successfully');

    httpServer.listen(port, () => {
      logger.info(`Backend server running on port ${port} (HTTP + WebSocket)`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // process.exit(1);
    logger.warn('STARTING IN MOCK MODE (No DB Connection)');

    httpServer.listen(port, () => {
      logger.info(`Backend server running on port ${port} (MOCK MODE - HTTP + WebSocket)`);
      logger.info(`WARNING: Database features will fail, but Simulation is ACTIVE.`);
    });
  }
}

startServer();

export default app;
