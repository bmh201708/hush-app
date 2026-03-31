# Hush Cloud Hardware API

Base URL:

```text
http://111.229.204.242/hush-api
```

## Mobile App -> Backend

### 1. Query hardware status

```http
GET /devices/:deviceId
```

Response:

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "deviceName": "Seeed XIAO ESP32S3 Sense",
  "hardwareModel": "Seeed XIAO ESP32S3 Sense",
  "firmwareVersion": "1.0.0",
  "batteryLevel": 88,
  "lastSeenAt": "2026-03-30T14:35:00.000Z",
  "online": true,
  "pendingCommands": 0
}
```

Rule:
- `online = true` means the ESP32 heartbeat reached the backend within the last 45 seconds.
- The Breath page should allow `Start Session` only when `online = true`.

### 2. Start a breathing session

```http
POST /sessions
Content-Type: application/json
```

Request:

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "deviceName": "Seeed XIAO ESP32S3 Sense",
  "startedAt": "2026-03-30T14:40:00.000Z",
  "rhythm": {
    "inhaleMs": 4000,
    "holdMs": 7000,
    "exhaleMs": 8000,
    "cycles": 32
  }
}
```

Response:

```json
{
  "sessionId": "session-1774881600000-uuid"
}
```

Rule:
- This request both creates the session record and queues a `session_start` command for the hardware.
- The ESP32 must vibrate using the same `inhaleMs`, `holdMs`, `exhaleMs`, `cycles` values.
- After this request succeeds, the app switches the main button from `Start Session` to `Stop Session`.

### 3. Stop a breathing session

```http
POST /sessions/:sessionId/status
Content-Type: application/json
```

Request:

```json
{
  "status": "stopped",
  "reason": "user_stop"
}
```

Response:

```http
204 No Content
```

Rule:
- This request updates the session state and queues a `session_stop` command for the hardware.
- The ESP32 must stop the vibration motor immediately after receiving this command.

### 4. Preview the current rhythm

```http
POST /devices/:deviceId/rhythm-preview
Content-Type: application/json
```

Request:

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "rhythm": {
    "inhaleMs": 4000,
    "holdMs": 7000,
    "exhaleMs": 8000,
    "cycles": 32
  }
}
```

Rule:
- Used by `Adjust Rhythm`.
- Backend queues a `rhythm_preview` command without opening a full session.

## ESP32 -> Backend

### 5. Send heartbeat

```http
POST /devices/heartbeat
Content-Type: application/json
```

Request:

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "deviceName": "Seeed XIAO ESP32S3 Sense",
  "hardwareModel": "Seeed XIAO ESP32S3 Sense",
  "firmwareVersion": "1.0.0",
  "batteryLevel": 88,
  "wifiRssi": -56,
  "ipAddress": "192.168.1.6",
  "sentAt": "2026-03-30T14:40:00.000Z"
}
```

Response:

```http
204 No Content
```

Rule:
- Send every 5 to 10 seconds.
- If heartbeat stops for more than 45 seconds, the app shows `Disconnected`.

### 6. Poll the next command

```http
GET /devices/:deviceId/commands/next
```

Response when a command exists:

```json
{
  "commandId": "cmd-1774881605000-uuid",
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "sessionId": "session-1774881600000-uuid",
  "type": "session_start",
  "queuedAt": "2026-03-30T14:40:05.000Z",
  "payload": {
    "type": "session_start",
    "sessionId": "session-1774881600000-uuid",
    "rhythm": {
      "inhaleMs": 4000,
      "holdMs": 7000,
      "exhaleMs": 8000,
      "cycles": 32
    },
    "vibration": "medium",
    "sentAt": "2026-03-30T14:40:05.000Z"
  }
}
```

Response when there is no command:

```http
204 No Content
```

Rule:
- Poll every 1 second.
- If the same unacked command is returned more than once, treat it as idempotent and keep the motor state consistent.

### 7. Ack a command

```http
POST /devices/:deviceId/commands/:commandId/ack
Content-Type: application/json
```

Request:

```json
{
  "status": "completed",
  "message": "motor pattern started",
  "acknowledgedAt": "2026-03-30T14:40:06.000Z"
}
```

Response:

```http
204 No Content
```

Rule:
- Send `received` as soon as the ESP32 parses the command.
- Send `completed` when the motor state change has been applied.
- Send `failed` if the command cannot be executed.

### 8. Upload telemetry from hardware

```http
POST /devices/:deviceId/telemetry
Content-Type: application/json
```

Request:

```json
{
  "sessionId": "session-1774881600000-uuid",
  "samples": [
    {
      "seq": 1,
      "deviceTimestampMs": 1000,
      "accel": { "x": 1, "y": 2, "z": 3 },
      "gyro": { "x": 4, "y": 5, "z": 6 },
      "mag": { "x": 7, "y": 8, "z": 9 },
      "receivedAt": "2026-03-30T14:40:07.000Z",
      "deviceId": "seeed-xiao-esp32s3-sense-001",
      "sessionId": "session-1774881600000-uuid"
    }
  ]
}
```

Rule:
- Upload in batches.
- Backend stores the raw NDJSON files and session counters.

### 9. Upload assistant text response from hardware

```http
POST /devices/:deviceId/assistant-responses
Content-Type: application/json
```

Request:

```json
{
  "sessionId": "session-1774881600000-uuid",
  "text": "Take a slower breath and relax your shoulders.",
  "language": "en-US",
  "source": "llm",
  "createdAt": "2026-03-30T14:40:08.000Z"
}
```

Response:

```json
{
  "responseId": "voice-1774881608000-uuid"
}
```

Rule:
- ESP32 has already completed speech-to-text and LLM generation before calling this endpoint.
- Backend stores the text and makes it available to the mobile app as a queued voice response.

### 10. Mobile app fetches the next assistant response

```http
GET /devices/:deviceId/assistant-responses/next
```

Response when a response exists:

```json
{
  "responseId": "voice-1774881608000-uuid",
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "sessionId": "session-1774881600000-uuid",
  "text": "Take a slower breath and relax your shoulders.",
  "language": "en-US",
  "source": "llm",
  "createdAt": "2026-03-30T14:40:08.000Z"
}
```

Response when there is no response:

```http
204 No Content
```

Rule:
- The iPhone app polls this endpoint.
- Once fetched, the app plays the text through the iPhone speaker using TTS.

### 11. Mobile app acks assistant playback

```http
POST /devices/:deviceId/assistant-responses/:responseId/ack
Content-Type: application/json
```

Request:

```json
{
  "status": "played",
  "message": "spoken on iPhone",
  "playedAt": "2026-03-30T14:40:10.000Z"
}
```

Rule:
- `status` supports `played` and `failed`.
- Backend uses this ack to mark the text response as consumed by the app.

## Hardware command semantics

### `session_start`
- Start motor guidance using the exact `inhaleMs`, `holdMs`, `exhaleMs`, `cycles`.
- Recommended motor pattern:
  - `inhale`: ramp vibration intensity up
  - `hold`: keep a light steady vibration or no vibration
  - `exhale`: ramp vibration intensity down

### `session_stop`
- Stop all motor output immediately.
- Clear any active phase timers on the ESP32.

### `rhythm_preview`
- Play a single short preview cycle using the current rhythm.
- Do not create or mutate a session on the device.
