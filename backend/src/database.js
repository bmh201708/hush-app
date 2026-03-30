const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function createDatabase({ databasePath, logger }) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      rhythm_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      current_status TEXT NOT NULL,
      last_reason TEXT,
      telemetry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS session_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS telemetry_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL UNIQUE,
      session_id TEXT,
      device_id TEXT NOT NULL,
      sample_count INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      received_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
    );
  `);

  logger.info('SQLite initialized', { databasePath });

  const statements = {
    insertSession: db.prepare(`
      INSERT INTO sessions (
        session_id,
        device_id,
        device_name,
        rhythm_json,
        started_at,
        created_at,
        current_status,
        last_reason,
        telemetry_count
      ) VALUES (
        @session_id,
        @device_id,
        @device_name,
        @rhythm_json,
        @started_at,
        @created_at,
        @current_status,
        @last_reason,
        @telemetry_count
      )
    `),
    insertStatusEvent: db.prepare(`
      INSERT INTO session_status_events (
        session_id,
        status,
        reason,
        recorded_at
      ) VALUES (
        @session_id,
        @status,
        @reason,
        @recorded_at
      )
    `),
    updateSessionStatus: db.prepare(`
      UPDATE sessions
      SET current_status = @current_status,
          last_reason = @last_reason
      WHERE session_id = @session_id
    `),
    insertTelemetryBatch: db.prepare(`
      INSERT INTO telemetry_batches (
        batch_id,
        session_id,
        device_id,
        sample_count,
        file_path,
        received_at
      ) VALUES (
        @batch_id,
        @session_id,
        @device_id,
        @sample_count,
        @file_path,
        @received_at
      )
    `),
    incrementTelemetryCount: db.prepare(`
      UPDATE sessions
      SET telemetry_count = telemetry_count + @increment
      WHERE session_id = @session_id
    `),
    getSession: db.prepare(`
      SELECT
        session_id,
        device_id,
        device_name,
        rhythm_json,
        started_at,
        created_at,
        current_status,
        last_reason,
        telemetry_count
      FROM sessions
      WHERE session_id = ?
    `),
    getSessions: db.prepare(`
      SELECT
        session_id,
        device_id,
        device_name,
        rhythm_json,
        started_at,
        created_at,
        current_status,
        last_reason,
        telemetry_count
      FROM sessions
      ORDER BY created_at DESC
      LIMIT ?
    `),
    getSessionEvents: db.prepare(`
      SELECT
        session_id,
        status,
        reason,
        recorded_at
      FROM session_status_events
      WHERE session_id = ?
      ORDER BY id ASC
    `),
    getTelemetryBatches: db.prepare(`
      SELECT
        batch_id,
        session_id,
        device_id,
        sample_count,
        file_path,
        received_at
      FROM telemetry_batches
      ORDER BY id DESC
      LIMIT ?
    `),
    getSessionCount: db.prepare(`SELECT COUNT(*) AS count FROM sessions`),
    getTelemetryBatchCount: db.prepare(`SELECT COUNT(*) AS count FROM telemetry_batches`),
  };

  function createSession({ sessionId, deviceId, deviceName, rhythm, startedAt }) {
    const createdAt = new Date().toISOString();
    const transaction = db.transaction(() => {
      statements.insertSession.run({
        session_id: sessionId,
        device_id: deviceId,
        device_name: deviceName,
        rhythm_json: JSON.stringify(rhythm),
        started_at: startedAt,
        created_at: createdAt,
        current_status: 'running',
        last_reason: null,
        telemetry_count: 0,
      });

      statements.insertStatusEvent.run({
        session_id: sessionId,
        status: 'running',
        reason: null,
        recorded_at: createdAt,
      });
    });

    transaction();
  }

  function storeTelemetryBatch({ batchId, sessionId, deviceId, sampleCount, filePath, receivedAt }) {
    const transaction = db.transaction(() => {
      statements.insertTelemetryBatch.run({
        batch_id: batchId,
        session_id: sessionId,
        device_id: deviceId,
        sample_count: sampleCount,
        file_path: filePath,
        received_at: receivedAt,
      });

      if (sessionId) {
        statements.incrementTelemetryCount.run({
          session_id: sessionId,
          increment: sampleCount,
        });
      }
    });

    transaction();
  }

  function appendStatus({ sessionId, status, reason }) {
    const recordedAt = new Date().toISOString();
    const transaction = db.transaction(() => {
      statements.insertStatusEvent.run({
        session_id: sessionId,
        status,
        reason: reason ?? null,
        recorded_at: recordedAt,
      });

      statements.updateSessionStatus.run({
        session_id: sessionId,
        current_status: status,
        last_reason: reason ?? null,
      });
    });

    transaction();
  }

  function getDebugState() {
    const sessions = statements.getSessions.all(50).map((session) => ({
      ...session,
      rhythm: JSON.parse(session.rhythm_json),
      statuses: statements.getSessionEvents.all(session.session_id),
    }));

    return {
      sessions,
      telemetryBatches: statements.getTelemetryBatches.all(50),
    };
  }

  function getSummary() {
    return {
      sessions: statements.getSessionCount.get().count,
      telemetryBatches: statements.getTelemetryBatchCount.get().count,
    };
  }

  return {
    createSession,
    storeTelemetryBatch,
    appendStatus,
    getSession(sessionId) {
      return statements.getSession.get(sessionId);
    },
    getDebugState,
    getSummary,
    close() {
      db.close();
    },
  };
}

module.exports = {
  createDatabase,
};
