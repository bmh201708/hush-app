const express = require('express');
const crypto = require('crypto');

const {
  HOST,
  PORT,
  DATABASE_PATH,
  TELEMETRY_DIR,
  LOG_DIR,
  DEVICE_ONLINE_WINDOW_MS,
  DEFAULT_DEVICE_ID,
  DEFAULT_DEVICE_NAME,
} = require('./config');
const { createDatabase } = require('./database');
const { createLogger } = require('./logger');
const { createTelemetryStorage } = require('./storage');

const logger = createLogger({ logDir: LOG_DIR });
const database = createDatabase({
  databasePath: DATABASE_PATH,
  logger,
  deviceOnlineWindowMs: DEVICE_ONLINE_WINDOW_MS,
});
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
      sessionId: req.params.sessionId ?? req.body?.sessionId,
      deviceId: req.params.deviceId ?? req.body?.deviceId,
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

app.get('/devices/:deviceId', (req, res) => {
  res.status(200).json(database.getDeviceStatus(req.params.deviceId, DEFAULT_DEVICE_NAME));
});

app.get('/devices/:deviceId/telemetry/recent', async (req, res, next) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 72);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(240, Math.trunc(requestedLimit)))
      : 72;
    const batches = database.getRecentTelemetryBatches(req.params.deviceId, Math.max(6, Math.ceil(limit / 10)));
    const samples = await telemetryStorage.readRecentSamples({
      relativePaths: batches.map((batch) => batch.file_path),
      limit,
      deviceId: req.params.deviceId,
    });

    return res.status(200).json({
      deviceId: req.params.deviceId,
      samples,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/heartbeat', (req, res, next) => {
  try {
    const { deviceId, deviceName, sentAt } = req.body ?? {};
    if (!deviceId || !deviceName || !sentAt) {
      return res.status(400).json({ error: 'Heartbeat requires deviceId, deviceName and sentAt' });
    }

    database.upsertHardwareDevice(req.body);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/devices/:deviceId/commands/next', (req, res, next) => {
  try {
    const command = database.getNextHardwareCommand(req.params.deviceId);
    if (!command) {
      return res.status(204).send();
    }

    return res.status(200).json(command);
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/:deviceId/commands/:commandId/ack', (req, res, next) => {
  try {
    const { status, message, acknowledgedAt } = req.body ?? {};
    if (!status) {
      return res.status(400).json({ error: 'Command ack requires status' });
    }

    database.ackHardwareCommand({
      commandId: req.params.commandId,
      status,
      message,
      acknowledgedAt: acknowledgedAt ?? new Date().toISOString(),
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/:deviceId/rhythm-preview', (req, res, next) => {
  try {
    const { rhythm } = req.body ?? {};
    if (!rhythm) {
      return res.status(400).json({ error: 'Rhythm preview requires rhythm' });
    }

    const commandId = enqueueHardwareCommand({
      deviceId: req.params.deviceId,
      sessionId: null,
      type: 'rhythm_preview',
      payload: {
        type: 'rhythm_preview',
        rhythm,
        vibration: 'medium',
        sentAt: new Date().toISOString(),
      },
    });

    return res.status(202).json({ commandId });
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/:deviceId/telemetry', async (req, res, next) => {
  try {
    const { sessionId = null, samples } = req.body ?? {};
    const { deviceId } = req.params;

    if (!Array.isArray(samples)) {
      return res.status(400).json({ error: 'Telemetry upload requires samples[]' });
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
      source: 'hardware',
    });

    return res.status(202).json({ accepted: samples.length });
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/:deviceId/assistant-responses', (req, res, next) => {
  try {
    const { sessionId = null, text, language = null, source = 'llm', createdAt } = req.body ?? {};
    const { deviceId } = req.params;

    if (!text || !createdAt) {
      return res.status(400).json({ error: 'Assistant response requires text and createdAt' });
    }

    if (sessionId && !database.getSession(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const responseId = `voice-${Date.now()}-${crypto.randomUUID()}`;
    database.queueAssistantResponse({
      responseId,
      deviceId,
      sessionId,
      text,
      language,
      source,
      createdAt,
    });

    logger.info('Assistant response queued', {
      responseId,
      deviceId,
      sessionId,
      source,
    });

    return res.status(202).json({ responseId });
  } catch (error) {
    return next(error);
  }
});

app.get('/devices/:deviceId/assistant-responses/next', (req, res, next) => {
  try {
    const response = database.getNextAssistantResponse(req.params.deviceId);
    if (!response) {
      return res.status(204).send();
    }

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
});

app.post('/devices/:deviceId/assistant-responses/:responseId/ack', (req, res, next) => {
  try {
    const { status, message, playedAt } = req.body ?? {};
    if (!status) {
      return res.status(400).json({ error: 'Assistant response ack requires status' });
    }

    database.ackAssistantResponse({
      responseId: req.params.responseId,
      status,
      message,
      playedAt: playedAt ?? new Date().toISOString(),
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
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

    enqueueHardwareCommand({
      deviceId,
      sessionId,
      type: 'session_start',
      payload: {
        type: 'session_start',
        sessionId,
        rhythm,
        vibration: 'medium',
        sentAt: new Date().toISOString(),
      },
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
      source: 'mobile',
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

    const command = toHardwareCommand({ sessionId, status, reason });
    if (command) {
      enqueueHardwareCommand({
        deviceId: session.device_id,
        sessionId,
        type: command.type,
        payload: command,
      });
    }

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
    defaultDeviceId: DEFAULT_DEVICE_ID,
  });
});

function enqueueHardwareCommand({ deviceId, sessionId, type, payload }) {
  const commandId = `cmd-${Date.now()}-${crypto.randomUUID()}`;
  database.queueHardwareCommand({
    commandId,
    deviceId,
    sessionId,
    type,
    payload,
  });
  logger.info('Hardware command queued', {
    commandId,
    deviceId,
    sessionId,
    commandType: type,
  });
  return commandId;
}

function toHardwareCommand({ sessionId, status, reason }) {
  const sentAt = new Date().toISOString();

  if (status === 'paused') {
    return {
      type: 'session_pause',
      sessionId,
      reason: reason ?? 'user_pause',
      sentAt,
    };
  }

  if (status === 'running') {
    return {
      type: 'session_resume',
      sessionId,
      sentAt,
    };
  }

  if (status === 'stopped' || status === 'completed') {
    return {
      type: 'session_stop',
      sessionId,
      reason: reason ?? (status === 'completed' ? 'completed' : 'user_stop'),
      sentAt,
    };
  }

  return null;
}

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
