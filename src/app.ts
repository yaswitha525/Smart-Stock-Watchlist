import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { errorHandler } from './middleware/error-handler.js';

export const createApp = (): Express => {
  const app: Express = express();

  // Basic security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTP Request Logging
  app.use(requestLogger);

  // Direct top-level health check endpoint required by spec: GET /api/health
  app.use('/api/health', healthRoutes);

  // Versioned API Router (/api/v1)
  app.use('/api/v1', routes);

  // Catch-all 404 Not Found Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
