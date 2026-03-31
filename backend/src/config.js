const path = require('path');

const PORT = Number(process.env.HUSH_BACKEND_PORT || 3000);
const HOST = process.env.HUSH_BACKEND_HOST || '0.0.0.0';
const DATA_ROOT =
  process.env.HUSH_DATA_DIR || path.resolve(__dirname, '..', '..', 'backend-data');
const DATABASE_PATH = process.env.HUSH_DATABASE_PATH || path.join(DATA_ROOT, 'sqlite', 'hush.db');
const TELEMETRY_DIR = process.env.HUSH_TELEMETRY_DIR || path.join(DATA_ROOT, 'telemetry');
const LOG_DIR = process.env.HUSH_LOG_DIR || path.join(DATA_ROOT, 'logs');
const DEVICE_ONLINE_WINDOW_MS = Number(process.env.HUSH_DEVICE_ONLINE_WINDOW_MS || 45000);
const DEFAULT_DEVICE_ID =
  process.env.HUSH_DEFAULT_DEVICE_ID || 'seeed-xiao-esp32s3-sense-001';
const DEFAULT_DEVICE_NAME =
  process.env.HUSH_DEFAULT_DEVICE_NAME || 'Seeed XIAO ESP32S3 Sense';

module.exports = {
  PORT,
  HOST,
  DATA_ROOT,
  DATABASE_PATH,
  TELEMETRY_DIR,
  LOG_DIR,
  DEVICE_ONLINE_WINDOW_MS,
  DEFAULT_DEVICE_ID,
  DEFAULT_DEVICE_NAME,
};
