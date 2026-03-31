import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_DEVICE_CONTROLS,
  DEFAULT_CLOUD_DEVICE_ID,
  DEFAULT_CLOUD_DEVICE_NAME,
  DEFAULT_RHYTHM_CONFIG,
  HUSH_ASSISTANT_RESPONSE_POLL_INTERVAL_MS,
  HUSH_DEVICE_STATUS_POLL_INTERVAL_MS,
  HUSH_STORAGE_KEYS,
  HUSH_TELEMETRY_PREVIEW_POLL_INTERVAL_MS,
  RHYTHM_PRESETS,
} from '@/constants/hush-ble';
import { backendClient } from '@/services/hush/backend-client';
import type {
  BackendSessionPayload,
  ConnectedDevice,
  ConnectionState,
  DeviceControls,
  RhythmConfig,
  SessionPauseReason,
  SessionPhase,
  SessionState,
  SessionStopReason,
  TelemetrySample,
} from '@/types/hush';

type DeviceSlice = {
  permissionGranted: boolean | null;
  connectionState: ConnectionState;
  connectedDevice: ConnectedDevice | null;
  scannedDevices: ConnectedDevice[];
  isDevicePickerVisible: boolean;
  batteryLevel: number | null;
  firmwareVersion: string | null;
  lastSeen: string | null;
  latestAssistantResponseText: string | null;
  isSpeakingAssistantResponse: boolean;
  telemetryPreview: TelemetrySample[];
  postureRemindersEnabled: boolean;
  hapticBreathLeadEnabled: boolean;
  error: string | null;
  isBluetoothReady: boolean;
  scanForDevices: () => Promise<void>;
  connect: (deviceId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setPostureRemindersEnabled: (enabled: boolean) => Promise<void>;
  setHapticBreathLeadEnabled: (enabled: boolean) => Promise<void>;
  dismissDevicePicker: () => void;
  clearError: () => void;
};

type RhythmSlice = {
  rhythmConfig: RhythmConfig;
  presets: typeof RHYTHM_PRESETS;
  saveRhythmConfig: (next: RhythmConfig) => Promise<{ ok: boolean; error?: string }>;
};

type SessionSlice = {
  session: SessionState;
  totalDurationMs: number;
  lastSessionDurationMs: number;
  start: () => Promise<void>;
  pause: (reason?: SessionPauseReason) => Promise<void>;
  resume: () => Promise<void>;
  stop: (reason?: SessionStopReason) => Promise<void>;
};

type HushContextValue = {
  device: DeviceSlice;
  rhythm: RhythmSlice;
  session: SessionSlice;
};

const INITIAL_SESSION: SessionState = {
  status: 'idle',
  phase: 'inhale',
  cycleIndex: 0,
  sessionId: null,
  startedAt: null,
  pauseReason: null,
};

const HushContext = createContext<HushContextValue | null>(null);

export function HushProvider({ children }: PropsWithChildren) {
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<SessionState>(INITIAL_SESSION);
  const rhythmRef = useRef<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const connectedDeviceRef = useRef<ConnectedDevice | null>(null);
  const connectionStateRef = useRef<ConnectionState>('idle');
  const isMountedRef = useRef(false);
  const isSpeakingAssistantResponseRef = useRef(false);

  const [permissionGranted] = useState<boolean | null>(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDevice | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [latestAssistantResponseText, setLatestAssistantResponseText] = useState<string | null>(null);
  const [isSpeakingAssistantResponse, setSpeakingAssistantResponse] = useState(false);
  const [telemetryPreview, setTelemetryPreview] = useState<TelemetrySample[]>([]);
  const [postureRemindersEnabled, setPostureRemindersState] = useState<boolean>(
    DEFAULT_DEVICE_CONTROLS.postureRemindersEnabled
  );
  const [hapticBreathLeadEnabled, setHapticBreathLeadState] = useState<boolean>(
    DEFAULT_DEVICE_CONTROLS.hapticBreathLeadEnabled
  );
  const [error, setError] = useState<string | null>(null);
  const [rhythmConfig, setRhythmConfig] = useState<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [lastSessionDurationMs, setLastSessionDurationMs] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    void loadPersistedState();
    void refreshDeviceStatus();

    const pollInterval = setInterval(() => {
      void refreshDeviceStatus(true);
    }, HUSH_DEVICE_STATUS_POLL_INTERVAL_MS);
    const assistantResponsePoll = setInterval(() => {
      void pollAssistantResponses();
    }, HUSH_ASSISTANT_RESPONSE_POLL_INTERVAL_MS);
    const telemetryPoll = setInterval(() => {
      void refreshTelemetryPreview();
    }, HUSH_TELEMETRY_PREVIEW_POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      clearInterval(assistantResponsePoll);
      clearInterval(telemetryPoll);
      clearPhaseTimer();
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    rhythmRef.current = rhythmConfig;
  }, [rhythmConfig]);

  useEffect(() => {
    connectedDeviceRef.current = connectedDevice;
  }, [connectedDevice]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    isSpeakingAssistantResponseRef.current = isSpeakingAssistantResponse;
  }, [isSpeakingAssistantResponse]);

  const totalDurationMs =
    rhythmConfig.inhaleMs + rhythmConfig.holdMs + rhythmConfig.exhaleMs;
  const totalSessionDurationMs = totalDurationMs * rhythmConfig.cycles;

  async function loadPersistedState() {
    try {
      const storedRhythm = await AsyncStorage.getItem(HUSH_STORAGE_KEYS.rhythmConfig);
      const storedLastSessionDuration = await AsyncStorage.getItem(
        HUSH_STORAGE_KEYS.lastSessionDurationMs
      );
      const storedDeviceControls = await AsyncStorage.getItem(
        HUSH_STORAGE_KEYS.deviceControls
      );
      if (storedRhythm) {
        const parsed = JSON.parse(storedRhythm) as RhythmConfig;
        setRhythmConfig(parsed);
      }
      if (storedLastSessionDuration) {
        setLastSessionDurationMs(Number(storedLastSessionDuration) || 0);
      }
      if (storedDeviceControls) {
        const parsed = JSON.parse(storedDeviceControls) as Partial<DeviceControls>;
        setPostureRemindersState(
          parsed.postureRemindersEnabled ?? DEFAULT_DEVICE_CONTROLS.postureRemindersEnabled
        );
        setHapticBreathLeadState(
          parsed.hapticBreathLeadEnabled ?? DEFAULT_DEVICE_CONTROLS.hapticBreathLeadEnabled
        );
      }
    } catch {
      // Ignore invalid persisted config and fall back to defaults.
    }
  }

  async function refreshDeviceStatus(silent = false) {
    if (!silent) {
      setConnectionState((current) =>
        current === 'connected' ? 'connecting' : 'scanning'
      );
    }

    try {
      const status = await backendClient.getDeviceStatus(DEFAULT_CLOUD_DEVICE_ID);

      if (!isMountedRef.current) {
        return;
      }

      setConnectedDevice({
        id: status.deviceId,
        name: status.deviceName || DEFAULT_CLOUD_DEVICE_NAME,
        rssi: null,
      });
      setBatteryLevel(status.batteryLevel);
      setFirmwareVersion(status.firmwareVersion);
      setLastSeen(status.lastSeenAt);
      setConnectionState(status.online ? 'connected' : 'disconnected');
      if (!status.online) {
        setTelemetryPreview([]);
      } else {
        void refreshTelemetryPreview();
      }
      setError(
        status.online
          ? null
          : 'Hardware heartbeat is offline. Make sure the Seeed XIAO ESP32S3 Sense is powered on and polling the cloud backend.'
      );
    } catch (statusError) {
      if (!isMountedRef.current) {
        return;
      }

      setConnectionState('error');
      setTelemetryPreview([]);
      setError(getErrorMessage(statusError, 'Unable to reach the cloud device gateway.'));
    }
  }

  async function refreshTelemetryPreview() {
    if (!connectedDeviceRef.current || connectionStateRef.current !== 'connected') {
      return;
    }

    try {
      const result = await backendClient.getRecentTelemetry(connectedDeviceRef.current.id);
      if (!isMountedRef.current) {
        return;
      }

      setTelemetryPreview(result.samples);
    } catch {
      if (isMountedRef.current) {
        setTelemetryPreview([]);
      }
    }
  }

  async function pollAssistantResponses() {
    if (
      connectionStateRef.current !== 'connected' ||
      !connectedDeviceRef.current ||
      isSpeakingAssistantResponseRef.current
    ) {
      return;
    }

    try {
      const response = await backendClient.getNextAssistantResponse(connectedDeviceRef.current.id);
      if (!response || !isMountedRef.current) {
        return;
      }

      setLatestAssistantResponseText(response.text);
      setSpeakingAssistantResponse(true);

      Speech.speak(response.text, {
        language: response.language ?? undefined,
        onDone: () => {
          void backendClient.ackAssistantResponse(response.deviceId, response.responseId, {
            status: 'played',
            playedAt: new Date().toISOString(),
          });
          if (isMountedRef.current) {
            setSpeakingAssistantResponse(false);
          }
        },
        onStopped: () => {
          if (isMountedRef.current) {
            setSpeakingAssistantResponse(false);
          }
        },
        onError: () => {
          void backendClient.ackAssistantResponse(response.deviceId, response.responseId, {
            status: 'failed',
            message: 'iPhone speech playback failed',
            playedAt: new Date().toISOString(),
          });
          if (isMountedRef.current) {
            setSpeakingAssistantResponse(false);
          }
        },
      });
    } catch {
      // Voice polling is best-effort and should not break the rest of the app.
    }
  }

  async function scanForDevices() {
    await refreshDeviceStatus();
  }

  async function connect(_deviceId?: string) {
    await refreshDeviceStatus();
  }

  async function disconnect() {
    setError('Device connectivity is managed by the cloud gateway. Power off the hardware to disconnect it.');
    await refreshDeviceStatus(true);
  }

  async function setDeviceControls(next: DeviceControls) {
    setPostureRemindersState(next.postureRemindersEnabled);
    setHapticBreathLeadState(next.hapticBreathLeadEnabled);
    await AsyncStorage.setItem(HUSH_STORAGE_KEYS.deviceControls, JSON.stringify(next));
  }

  async function setPostureRemindersEnabled(enabled: boolean) {
    await setDeviceControls({
      postureRemindersEnabled: enabled,
      hapticBreathLeadEnabled,
    });
  }

  async function setHapticBreathLeadEnabled(enabled: boolean) {
    await setDeviceControls({
      postureRemindersEnabled,
      hapticBreathLeadEnabled: enabled,
    });
  }

  async function saveRhythmConfig(next: RhythmConfig) {
    const validationError = validateRhythm(next);
    if (validationError) {
      return { ok: false as const, error: validationError };
    }

    setRhythmConfig(next);
    await AsyncStorage.setItem(HUSH_STORAGE_KEYS.rhythmConfig, JSON.stringify(next));

    if (connectedDeviceRef.current && sessionRef.current.status !== 'running') {
      try {
        await backendClient.sendRhythmPreview({
          deviceId: connectedDeviceRef.current.id,
          rhythm: next,
        });
      } catch {
        // Preview sync is best-effort and should not block saving.
      }
    }

    return { ok: true as const };
  }

  async function start() {
    if (!connectedDeviceRef.current || connectionState !== 'connected') {
      setError('Wait for the cloud hardware gateway to report connected before starting a session.');
      return;
    }

    clearPhaseTimer();

    const payload: BackendSessionPayload = {
      rhythm: rhythmRef.current,
      deviceId: connectedDeviceRef.current.id,
      deviceName: connectedDeviceRef.current.name,
      startedAt: new Date().toISOString(),
    };

    try {
      const { sessionId } = await backendClient.createSession(payload);
      const nextState: SessionState = {
        status: 'running',
        phase: 'inhale',
        cycleIndex: 1,
        sessionId,
        startedAt: payload.startedAt,
        pauseReason: null,
      };
      setSession(nextState);
      schedulePhase('inhale', 1);
    } catch (startError) {
      setError(getErrorMessage(startError, 'Unable to start the breathing session.'));
    }
  }

  async function pause(reason: SessionPauseReason = 'user_pause') {
    if (sessionRef.current.status !== 'running' || !sessionRef.current.sessionId) {
      return;
    }

    clearPhaseTimer();
    const currentSession = sessionRef.current;
    const sessionId = currentSession.sessionId!;

    setSession((state) => ({
      ...state,
      status: 'paused',
      pauseReason: reason,
    }));

    await backendClient.updateSessionStatus({
      sessionId,
      status: 'paused',
      reason,
    });
  }

  async function resume() {
    if (sessionRef.current.status !== 'paused' || !sessionRef.current.sessionId) {
      return;
    }

    const currentSession = sessionRef.current;
    const sessionId = currentSession.sessionId!;
    setSession((state) => ({
      ...state,
      status: 'running',
      pauseReason: null,
    }));

    await backendClient.updateSessionStatus({
      sessionId,
      status: 'running',
    });
    schedulePhase(currentSession.phase, Math.max(currentSession.cycleIndex, 1));
  }

  async function stop(reason: SessionStopReason = 'user_stop') {
    clearPhaseTimer();
    const currentSession = sessionRef.current;
    const completedDurationMs = getSessionDurationMs(currentSession, totalSessionDurationMs);

    if (currentSession.sessionId) {
      await backendClient.updateSessionStatus({
        sessionId: currentSession.sessionId,
        status: reason === 'completed' ? 'completed' : 'stopped',
        reason,
      });
    }

    if (completedDurationMs > 0) {
      setLastSessionDurationMs(completedDurationMs);
      await AsyncStorage.setItem(
        HUSH_STORAGE_KEYS.lastSessionDurationMs,
        `${completedDurationMs}`
      );
    }

    setSession({
      ...INITIAL_SESSION,
      status: reason === 'completed' ? 'completed' : 'idle',
    });
  }

  function schedulePhase(phase: SessionPhase, cycleIndex: number) {
    clearPhaseTimer();

    setSession((state) => ({
      ...state,
      status: 'running',
      phase,
      cycleIndex,
      pauseReason: null,
    }));

    const duration = getPhaseDuration(rhythmRef.current, phase);
    phaseTimerRef.current = setTimeout(() => {
      if (phase === 'inhale') {
        if (rhythmRef.current.holdMs > 0) {
          schedulePhase('hold', cycleIndex);
        } else {
          schedulePhase('exhale', cycleIndex);
        }
        return;
      }

      if (phase === 'hold') {
        schedulePhase('exhale', cycleIndex);
        return;
      }

      if (cycleIndex >= rhythmRef.current.cycles) {
        void stop('completed');
        return;
      }

      schedulePhase('inhale', cycleIndex + 1);
    }, Math.max(duration, 50));
  }

  function clearPhaseTimer() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  function dismissDevicePicker() {
    // Device selection is not needed in cloud mode.
  }

  function clearError() {
    setError(null);
  }

  const value = useMemo<HushContextValue>(
    () => ({
      device: {
        permissionGranted,
        connectionState,
        connectedDevice,
        scannedDevices: connectedDevice ? [connectedDevice] : [],
        isDevicePickerVisible: false,
        batteryLevel,
        firmwareVersion,
        lastSeen,
        latestAssistantResponseText,
        isSpeakingAssistantResponse,
        telemetryPreview,
        postureRemindersEnabled,
        hapticBreathLeadEnabled,
        error,
        isBluetoothReady: false,
        scanForDevices,
        connect,
        disconnect,
        setPostureRemindersEnabled,
        setHapticBreathLeadEnabled,
        dismissDevicePicker,
        clearError,
      },
      rhythm: {
        rhythmConfig,
        presets: RHYTHM_PRESETS,
        saveRhythmConfig,
      },
      session: {
        session,
        totalDurationMs: totalSessionDurationMs,
        lastSessionDurationMs,
        start,
        pause,
        resume,
        stop,
      },
    }),
    [
      batteryLevel,
      connectedDevice,
      connectionState,
      error,
      firmwareVersion,
      hapticBreathLeadEnabled,
      isSpeakingAssistantResponse,
      lastSessionDurationMs,
      lastSeen,
      latestAssistantResponseText,
      permissionGranted,
      postureRemindersEnabled,
      rhythmConfig,
      session,
      telemetryPreview,
      totalSessionDurationMs,
    ]
  );

  return <HushContext.Provider value={value}>{children}</HushContext.Provider>;
}

export function useDeviceState() {
  const context = useRequiredContext();
  return context.device;
}

export function useRhythmConfig() {
  const context = useRequiredContext();
  return context.rhythm;
}

export function useBreathSession() {
  const context = useRequiredContext();
  return context.session;
}

function useRequiredContext() {
  const context = useContext(HushContext);
  if (!context) {
    throw new Error('Hush hooks must be used within HushProvider.');
  }
  return context;
}

function getPhaseDuration(rhythm: RhythmConfig, phase: SessionPhase) {
  if (phase === 'inhale') {
    return rhythm.inhaleMs;
  }
  if (phase === 'hold') {
    return rhythm.holdMs;
  }
  return rhythm.exhaleMs;
}

function validateRhythm(config: RhythmConfig) {
  if (config.inhaleMs < 1000 || config.exhaleMs < 1000) {
    return 'Inhale and exhale must be at least 1 second.';
  }

  if (config.holdMs < 0) {
    return 'Hold cannot be negative.';
  }

  if (config.cycles < 1) {
    return 'Cycles must be at least 1.';
  }

  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getSessionDurationMs(session: SessionState, totalSessionDurationMs: number) {
  if (!session.startedAt) {
    return 0;
  }

  const startedAtMs = Date.parse(session.startedAt);
  if (Number.isNaN(startedAtMs)) {
    return 0;
  }

  return Math.min(Math.max(0, Date.now() - startedAtMs), totalSessionDurationMs);
}
