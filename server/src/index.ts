import dotenv from 'dotenv';
dotenv.config();

import app from './server.js';
import connectDB from './config/db.js';
import { ENV } from './config/env.js';
import { startCronJobs } from './services/cron.service.js';
import { logger } from './utils/logger.js';

const start = async () => {
  await connectDB();

  // Start cron ONLY after MongoDB is connected (per cron-scheduler skill spec)
  startCronJobs();

  app.listen(ENV.PORT, () => {
    logger.info(`Server is running on port ${ENV.PORT}`);
  });
};

start();
