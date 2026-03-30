const fs = require('fs');
const path = require('path');

function createLogger({ logDir }) {
  fs.mkdirSync(logDir, { recursive: true });

  return {
    info(message, meta) {
      write('INFO', message, meta);
    },
    warn(message, meta) {
      write('WARN', message, meta);
    },
    error(message, meta) {
      write('ERROR', message, meta);
    },
  };

  function write(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const serializedMeta = Object.entries(meta)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join(' ');
    const line = `[${timestamp}] ${level} ${message}${serializedMeta ? ` ${serializedMeta}` : ''}`;
    const logFilePath = path.join(logDir, `backend-${timestamp.slice(0, 10)}.log`);

    console.log(line);
    fs.appendFileSync(logFilePath, `${line}\n`, 'utf8');
  }
}

function formatValue(value) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

module.exports = {
  createLogger,
};
