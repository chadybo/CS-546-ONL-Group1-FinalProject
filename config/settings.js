// MongoDB connection config pulled from environment variables
import dotenv from 'dotenv';
dotenv.config();

export const mongoConfig = {
  serverUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/',
  database: process.env.DB_NAME || 'street_noise'
};