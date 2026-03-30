const express = require('express');
const crypto = require('crypto');

const { HOST, PORT, DATABASE_PATH, TELEMETRY_DIR, LOG_DIR } = require('./config');
const { createDatabase } = require('./database');
const { createLogger } = require('./logger');
const { createTelemetryStorage } = require('./storage');

const logger = createLogger({ logDir: LOG_DIR });
const database = createDatabase({ databasePath: DATABASE_PATH, logger });
const telemetryStorage = createTelemetryStorage({ telemetryDir: TELEMETRY_DIR, logger });

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      sessionId: req.params.sessionId,
      deviceId: req.body?.deviceId,
      sampleCount: Array.isArray(req.body?.samples) ? req.body.samples.length : undefined,
    });
  });

  next();
});

app.get('/healthz', (_req, res) => {
  const summary = database.getSummary();
  res.status(200).json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    ...summary,
  });
});

app.get('/debug/state', (_req, res) => {
  res.status(200).json(database.getDebugState());
});

app.post('/sessions', (req, res, next) => {
  try {
    const { rhythm, deviceId, deviceName, startedAt } = req.body ?? {};
    if (!rhythm || !deviceId || !deviceName || !startedAt) {
      return res.status(400).json({ error: 'Missing required session fields' });
    }

    const sessionId = `session-${Date.now()}-${crypto.randomUUID()}`;
    database.createSession({
      sessionId,
      deviceId,
      deviceName,
      rhythm,
      startedAt,
    });

    return res.status(200).json({ sessionId });
  } catch (error) {
    return next(error);
  }
});

app.post('/telemetry/batch', async (req, res, next) => {
  try {
    const { sessionId = null, deviceId, samples } = req.body ?? {};
    if (!deviceId || !Array.isArray(samples)) {
      return res.status(400).json({ error: 'Telemetry batch requires deviceId and samples[]' });
    }

    if (sessionId && !database.getSession(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const storedBatch = await telemetryStorage.persistBatch({ samples });
    database.storeTelemetryBatch({
      batchId: storedBatch.batchId,
      sessionId,
      deviceId,
      sampleCount: samples.length,
      filePath: storedBatch.relativePath,
      receivedAt: storedBatch.receivedAt,
    });

    return res.status(202).json({ accepted: samples.length });
  } catch (error) {
    return next(error);
  }
});

app.post('/sessions/:sessionId/status', (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status, reason } = req.body ?? {};
    if (!status) {
      return res.status(400).json({ error: 'Missing status' });
    }

    const session = database.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    database.appendStatus({ sessionId, status, reason });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, _req, res, _next) => {
  if (error && error.type === 'entity.too.large') {
    logger.warn('Request body too large', { message: error.message });
    return res.status(400).json({ error: 'Request body too large' });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn('Invalid JSON body', { message: error.message });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  logger.error('Unhandled backend error', { message });
  return res.status(500).json({ error: message });
});

const server = app.listen(PORT, HOST, () => {
  logger.info('Hush backend listening', {
    host: HOST,
    port: PORT,
    databasePath: DATABASE_PATH,
    telemetryDir: TELEMETRY_DIR,
    logDir: LOG_DIR,
  });
});

function shutdown(signal) {
  logger.info('Received shutdown signal', { signal });
  server.close(() => {
    database.close();
    logger.info('Backend shutdown complete');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
