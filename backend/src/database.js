const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function createDatabase({ databasePath, logger, deviceOnlineWindowMs }) {
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
      source TEXT NOT NULL DEFAULT 'mobile',
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS hardware_devices (
      device_id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      hardware_model TEXT,
      firmware_version TEXT,
      battery_level REAL,
      wifi_rssi REAL,
      ip_address TEXT,
      last_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hardware_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL,
      session_id TEXT,
      command_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      delivered_at TEXT,
      acked_at TEXT,
      ack_status TEXT,
      ack_message TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS device_assistant_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL,
      session_id TEXT,
      text_content TEXT NOT NULL,
      language TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      delivered_to_app_at TEXT,
      played_at TEXT,
      playback_status TEXT,
      playback_message TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
    );
  `);

  ensureColumn(db, 'telemetry_batches', 'source', "TEXT NOT NULL DEFAULT 'mobile'");

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
        received_at,
        source
      ) VALUES (
        @batch_id,
        @session_id,
        @device_id,
        @sample_count,
        @file_path,
        @received_at,
        @source
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
        received_at,
        source
      FROM telemetry_batches
      ORDER BY id DESC
      LIMIT ?
    `),
    getTelemetryBatchesByDevice: db.prepare(`
      SELECT
        batch_id,
        session_id,
        device_id,
        sample_count,
        file_path,
        received_at,
        source
      FROM telemetry_batches
      WHERE device_id = ?
      ORDER BY id DESC
      LIMIT ?
    `),
    getSessionCount: db.prepare(`SELECT COUNT(*) AS count FROM sessions`),
    getTelemetryBatchCount: db.prepare(`SELECT COUNT(*) AS count FROM telemetry_batches`),
    getHardwareDeviceCount: db.prepare(`SELECT COUNT(*) AS count FROM hardware_devices`),
    getPendingCommandCount: db.prepare(`
      SELECT COUNT(*) AS count
      FROM hardware_commands
      WHERE acked_at IS NULL
    `),
    getPendingAssistantResponseCount: db.prepare(`
      SELECT COUNT(*) AS count
      FROM device_assistant_responses
      WHERE played_at IS NULL
    `),
    upsertHardwareDevice: db.prepare(`
      INSERT INTO hardware_devices (
        device_id,
        device_name,
        hardware_model,
        firmware_version,
        battery_level,
        wifi_rssi,
        ip_address,
        last_seen_at,
        updated_at
      ) VALUES (
        @device_id,
        @device_name,
        @hardware_model,
        @firmware_version,
        @battery_level,
        @wifi_rssi,
        @ip_address,
        @last_seen_at,
        @updated_at
      )
      ON CONFLICT(device_id) DO UPDATE SET
        device_name = excluded.device_name,
        hardware_model = excluded.hardware_model,
        firmware_version = excluded.firmware_version,
        battery_level = excluded.battery_level,
        wifi_rssi = excluded.wifi_rssi,
        ip_address = excluded.ip_address,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `),
    getHardwareDevice: db.prepare(`
      SELECT
        device_id,
        device_name,
        hardware_model,
        firmware_version,
        battery_level,
        wifi_rssi,
        ip_address,
        last_seen_at,
        updated_at
      FROM hardware_devices
      WHERE device_id = ?
    `),
    getHardwareDevices: db.prepare(`
      SELECT
        device_id,
        device_name,
        hardware_model,
        firmware_version,
        battery_level,
        wifi_rssi,
        ip_address,
        last_seen_at,
        updated_at
      FROM hardware_devices
      ORDER BY updated_at DESC
      LIMIT ?
    `),
    getPendingCommandCountByDevice: db.prepare(`
      SELECT COUNT(*) AS count
      FROM hardware_commands
      WHERE device_id = ? AND acked_at IS NULL
    `),
    insertHardwareCommand: db.prepare(`
      INSERT INTO hardware_commands (
        command_id,
        device_id,
        session_id,
        command_type,
        payload_json,
        queued_at
      ) VALUES (
        @command_id,
        @device_id,
        @session_id,
        @command_type,
        @payload_json,
        @queued_at
      )
    `),
    getNextHardwareCommand: db.prepare(`
      SELECT
        command_id,
        device_id,
        session_id,
        command_type,
        payload_json,
        queued_at,
        delivered_at,
        acked_at,
        ack_status,
        ack_message
      FROM hardware_commands
      WHERE device_id = ? AND acked_at IS NULL
      ORDER BY id ASC
      LIMIT 1
    `),
    markCommandDelivered: db.prepare(`
      UPDATE hardware_commands
      SET delivered_at = COALESCE(delivered_at, @delivered_at)
      WHERE command_id = @command_id
    `),
    ackHardwareCommand: db.prepare(`
      UPDATE hardware_commands
      SET acked_at = @acked_at,
          ack_status = @ack_status,
          ack_message = @ack_message,
          delivered_at = COALESCE(delivered_at, @acked_at)
      WHERE command_id = @command_id
    `),
    getHardwareCommands: db.prepare(`
      SELECT
        command_id,
        device_id,
        session_id,
        command_type,
        payload_json,
        queued_at,
        delivered_at,
        acked_at,
        ack_status,
        ack_message
      FROM hardware_commands
      ORDER BY id DESC
      LIMIT ?
    `),
    insertAssistantResponse: db.prepare(`
      INSERT INTO device_assistant_responses (
        response_id,
        device_id,
        session_id,
        text_content,
        language,
        source,
        created_at
      ) VALUES (
        @response_id,
        @device_id,
        @session_id,
        @text_content,
        @language,
        @source,
        @created_at
      )
    `),
    getNextAssistantResponse: db.prepare(`
      SELECT
        response_id,
        device_id,
        session_id,
        text_content,
        language,
        source,
        created_at,
        delivered_to_app_at,
        played_at,
        playback_status,
        playback_message
      FROM device_assistant_responses
      WHERE device_id = ? AND played_at IS NULL
      ORDER BY id ASC
      LIMIT 1
    `),
    markAssistantResponseDelivered: db.prepare(`
      UPDATE device_assistant_responses
      SET delivered_to_app_at = COALESCE(delivered_to_app_at, @delivered_to_app_at)
      WHERE response_id = @response_id
    `),
    ackAssistantResponse: db.prepare(`
      UPDATE device_assistant_responses
      SET played_at = @played_at,
          playback_status = @playback_status,
          playback_message = @playback_message,
          delivered_to_app_at = COALESCE(delivered_to_app_at, @played_at)
      WHERE response_id = @response_id
    `),
    getAssistantResponses: db.prepare(`
      SELECT
        response_id,
        device_id,
        session_id,
        text_content,
        language,
        source,
        created_at,
        delivered_to_app_at,
        played_at,
        playback_status,
        playback_message
      FROM device_assistant_responses
      ORDER BY id DESC
      LIMIT ?
    `),
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

  function storeTelemetryBatch({
    batchId,
    sessionId,
    deviceId,
    sampleCount,
    filePath,
    receivedAt,
    source = 'mobile',
  }) {
    const transaction = db.transaction(() => {
      statements.insertTelemetryBatch.run({
        batch_id: batchId,
        session_id: sessionId,
        device_id: deviceId,
        sample_count: sampleCount,
        file_path: filePath,
        received_at: receivedAt,
        source,
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

  function upsertHardwareDevice(payload) {
    const updatedAt = new Date().toISOString();
    statements.upsertHardwareDevice.run({
      device_id: payload.deviceId,
      device_name: payload.deviceName,
      hardware_model: payload.hardwareModel ?? null,
      firmware_version: payload.firmwareVersion ?? null,
      battery_level: payload.batteryLevel ?? null,
      wifi_rssi: payload.wifiRssi ?? null,
      ip_address: payload.ipAddress ?? null,
      last_seen_at: payload.sentAt,
      updated_at: updatedAt,
    });
  }

  function queueHardwareCommand({ commandId, deviceId, sessionId = null, type, payload }) {
    const queuedAt = new Date().toISOString();
    statements.insertHardwareCommand.run({
      command_id: commandId,
      device_id: deviceId,
      session_id: sessionId,
      command_type: type,
      payload_json: JSON.stringify(payload),
      queued_at: queuedAt,
    });
    return queuedAt;
  }

  function getDeviceStatus(deviceId, fallbackName = 'Seeed XIAO ESP32S3 Sense') {
    const row = statements.getHardwareDevice.get(deviceId);
    const pendingCommands = statements.getPendingCommandCountByDevice.get(deviceId).count;

    if (!row) {
      return {
        deviceId,
        deviceName: fallbackName,
        hardwareModel: null,
        firmwareVersion: null,
        batteryLevel: null,
        lastSeenAt: null,
        online: false,
        pendingCommands,
      };
    }

    return {
      deviceId: row.device_id,
      deviceName: row.device_name,
      hardwareModel: row.hardware_model,
      firmwareVersion: row.firmware_version,
      batteryLevel: row.battery_level,
      lastSeenAt: row.last_seen_at,
      online: isOnline(row.last_seen_at, deviceOnlineWindowMs),
      pendingCommands,
    };
  }

  function getNextHardwareCommand(deviceId) {
    const row = statements.getNextHardwareCommand.get(deviceId);
    if (!row) {
      return null;
    }

    statements.markCommandDelivered.run({
      command_id: row.command_id,
      delivered_at: new Date().toISOString(),
    });

    return {
      commandId: row.command_id,
      deviceId: row.device_id,
      sessionId: row.session_id,
      type: row.command_type,
      payload: JSON.parse(row.payload_json),
      queuedAt: row.queued_at,
    };
  }

  function ackHardwareCommand({ commandId, status, message, acknowledgedAt }) {
    statements.ackHardwareCommand.run({
      command_id: commandId,
      acked_at: acknowledgedAt,
      ack_status: status,
      ack_message: message ?? null,
    });
  }

  function queueAssistantResponse({
    responseId,
    deviceId,
    sessionId = null,
    text,
    language = null,
    source = null,
    createdAt,
  }) {
    statements.insertAssistantResponse.run({
      response_id: responseId,
      device_id: deviceId,
      session_id: sessionId,
      text_content: text,
      language,
      source,
      created_at: createdAt,
    });
  }

  function getNextAssistantResponse(deviceId) {
    const row = statements.getNextAssistantResponse.get(deviceId);
    if (!row) {
      return null;
    }

    statements.markAssistantResponseDelivered.run({
      response_id: row.response_id,
      delivered_to_app_at: new Date().toISOString(),
    });

    return {
      responseId: row.response_id,
      deviceId: row.device_id,
      sessionId: row.session_id,
      text: row.text_content,
      language: row.language,
      source: row.source,
      createdAt: row.created_at,
    };
  }

  function ackAssistantResponse({ responseId, status, message, playedAt }) {
    statements.ackAssistantResponse.run({
      response_id: responseId,
      played_at: playedAt,
      playback_status: status,
      playback_message: message ?? null,
    });
  }

  function getDebugState() {
    const sessions = statements.getSessions.all(50).map((session) => ({
      ...session,
      rhythm: JSON.parse(session.rhythm_json),
      statuses: statements.getSessionEvents.all(session.session_id),
    }));

    const devices = statements.getHardwareDevices.all(50).map((device) => ({
      ...device,
      online: isOnline(device.last_seen_at, deviceOnlineWindowMs),
      pendingCommands: statements.getPendingCommandCountByDevice.get(device.device_id).count,
    }));

    const hardwareCommands = statements.getHardwareCommands.all(50).map((command) => ({
      ...command,
      payload: JSON.parse(command.payload_json),
    }));

    const assistantResponses = statements.getAssistantResponses.all(50).map((response) => ({
      ...response,
      text: response.text_content,
    }));

    return {
      sessions,
      telemetryBatches: statements.getTelemetryBatches.all(50),
      devices,
      hardwareCommands,
      assistantResponses,
    };
  }

  function getRecentTelemetryBatches(deviceId, limit) {
    return statements.getTelemetryBatchesByDevice.all(deviceId, limit);
  }

  function getSummary() {
    return {
      sessions: statements.getSessionCount.get().count,
      telemetryBatches: statements.getTelemetryBatchCount.get().count,
      hardwareDevices: statements.getHardwareDeviceCount.get().count,
      pendingCommands: statements.getPendingCommandCount.get().count,
      pendingAssistantResponses: statements.getPendingAssistantResponseCount.get().count,
    };
  }

  return {
    createSession,
    storeTelemetryBatch,
    appendStatus,
    upsertHardwareDevice,
    queueHardwareCommand,
    getNextHardwareCommand,
    ackHardwareCommand,
    queueAssistantResponse,
    getNextAssistantResponse,
    ackAssistantResponse,
    getDeviceStatus,
    getRecentTelemetryBatches,
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

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function isOnline(lastSeenAt, deviceOnlineWindowMs) {
  if (!lastSeenAt) {
    return false;
  }

  const lastSeenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(lastSeenMs)) {
    return false;
  }

  return Date.now() - lastSeenMs <= deviceOnlineWindowMs;
}

module.exports = {
  createDatabase,
};
