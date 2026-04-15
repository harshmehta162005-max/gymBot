import dotenv from 'dotenv';
dotenv.config();

import app from './server.js';
import connectDB from './config/db.js';
import { ENV } from './config/env.js';

const start = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on port ${ENV.PORT}`);
  });
};

start();
