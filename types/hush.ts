export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type SessionPhase = 'inhale' | 'hold' | 'exhale';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export type SessionPauseReason = 'user_pause' | 'device_disconnected' | 'system';

export type SessionStopReason = 'user_stop' | 'completed' | 'device_disconnected';

export type RhythmConfig = {
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
  cycles: number;
};

export type RhythmPreset = {
  id: '478' | 'box' | 'calm';
  label: string;
  description: string;
  config: RhythmConfig;
};

export type MotionAxis = {
  x: number;
  y: number;
  z: number;
};

export type TelemetrySample = {
  seq: number;
  deviceTimestampMs: number;
  accel: MotionAxis;
  gyro: MotionAxis;
  mag: MotionAxis;
  receivedAt: string;
  deviceId: string;
  sessionId?: string;
};

export type DeviceStatusPayload = {
  batteryLevel?: number;
  firmwareVersion?: string;
  name?: string;
  connected?: boolean;
  telemetryHz?: number;
  lastSeenAt?: string | null;
  pendingCommands?: number;
  hardwareModel?: string | null;
};

export type DeviceControls = {
  postureRemindersEnabled: boolean;
  hapticBreathLeadEnabled: boolean;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  rssi: number | null;
};

export type SessionState = {
  status: SessionStatus;
  phase: SessionPhase;
  cycleIndex: number;
  sessionId: string | null;
  startedAt: string | null;
  pauseReason: SessionPauseReason | null;
};

export type SessionStartCommand = {
  type: 'session_start';
  sessionId: string;
  rhythm: RhythmConfig;
  vibration: 'medium';
  sentAt: string;
};

export type SessionPauseCommand = {
  type: 'session_pause';
  sessionId: string;
  reason: SessionPauseReason;
  sentAt: string;
};

export type SessionResumeCommand = {
  type: 'session_resume';
  sessionId: string;
  sentAt: string;
};

export type SessionStopCommand = {
  type: 'session_stop';
  sessionId: string;
  reason: SessionStopReason;
  sentAt: string;
};

export type RhythmPreviewCommand = {
  type: 'rhythm_preview';
  rhythm: RhythmConfig;
  vibration: 'medium';
  sentAt: string;
};

export type PingCommand = {
  type: 'ping';
  sentAt: string;
};

export type HardwareCommand =
  | SessionStartCommand
  | SessionPauseCommand
  | SessionResumeCommand
  | SessionStopCommand
  | RhythmPreviewCommand
  | PingCommand;

export type HardwareCommandEnvelope = {
  commandId: string;
  deviceId: string;
  sessionId: string | null;
  type: HardwareCommand['type'];
  payload: HardwareCommand;
  queuedAt: string;
};

export type BackendSessionPayload = {
  rhythm: RhythmConfig;
  deviceId: string;
  deviceName: string;
  startedAt: string;
};

export type BackendSessionResult = {
  sessionId: string;
};

export type SessionStatusUpdate = {
  sessionId: string;
  status: SessionStatus | 'stopped';
  reason?: SessionPauseReason | SessionStopReason;
};

export type BackendDeviceStatus = {
  deviceId: string;
  deviceName: string;
  hardwareModel: string | null;
  firmwareVersion: string | null;
  batteryLevel: number | null;
  lastSeenAt: string | null;
  online: boolean;
  pendingCommands: number;
};

export type DeviceHeartbeatPayload = {
  deviceId: string;
  deviceName: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  wifiRssi?: number;
  ipAddress?: string;
  sentAt: string;
};

export type DeviceCommandAckPayload = {
  status: 'received' | 'completed' | 'failed';
  message?: string;
  acknowledgedAt?: string;
};

export type RhythmPreviewPayload = {
  deviceId: string;
  rhythm: RhythmConfig;
};

export type DeviceAssistantResponse = {
  responseId: string;
  deviceId: string;
  sessionId: string | null;
  text: string;
  language: string | null;
  source: string | null;
  createdAt: string;
};

export type DeviceAssistantResponsePayload = {
  deviceId: string;
  sessionId?: string | null;
  text: string;
  language?: string;
  source?: 'llm' | 'voice_agent';
  createdAt: string;
};

export type DeviceAssistantResponseAckPayload = {
  status: 'played' | 'failed';
  message?: string;
  playedAt?: string;
};

export type RecentTelemetryResult = {
  deviceId: string;
  samples: TelemetrySample[];
};
