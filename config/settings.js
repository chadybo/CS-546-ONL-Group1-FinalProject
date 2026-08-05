// MongoDB connection config pulled from environment variables
import dotenv from 'dotenv';
import { normalizeSiteUrl } from '../seo.js';

dotenv.config();

export const mongoConfig = {
  serverUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/',
  database: process.env.DB_NAME || 'street_noise'
};

const parsedPort = Number.parseInt(process.env.PORT, 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

export const appConfig = {
  port,
  siteUrl: normalizeSiteUrl(process.env.SITE_URL, port)
};
