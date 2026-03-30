const path = require('path');

const PORT = Number(process.env.HUSH_BACKEND_PORT || 3000);
const HOST = process.env.HUSH_BACKEND_HOST || '0.0.0.0';
const DATA_ROOT =
  process.env.HUSH_DATA_DIR || path.resolve(__dirname, '..', '..', 'backend-data');
const DATABASE_PATH = process.env.HUSH_DATABASE_PATH || path.join(DATA_ROOT, 'sqlite', 'hush.db');
const TELEMETRY_DIR = process.env.HUSH_TELEMETRY_DIR || path.join(DATA_ROOT, 'telemetry');
const LOG_DIR = process.env.HUSH_LOG_DIR || path.join(DATA_ROOT, 'logs');

module.exports = {
  PORT,
  HOST,
  DATA_ROOT,
  DATABASE_PATH,
  TELEMETRY_DIR,
  LOG_DIR,
};
