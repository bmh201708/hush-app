import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  DEFAULT_RHYTHM_CONFIG,
  HUSH_SCAN_WINDOW_MS,
  HUSH_STORAGE_KEYS,
  HUSH_TELEMETRY_BATCH_SIZE,
  HUSH_TELEMETRY_FLUSH_INTERVAL_MS,
  HUSH_TELEMETRY_RETRY_DELAY_MS,
  RHYTHM_PRESETS,
} from '@/constants/hush-ble';
import { backendClient } from '@/services/hush/backend-client';
import { HushBleClient } from '@/services/hush/ble-client';
import type {
  BackendSessionPayload,
  ConnectedDevice,
  ConnectionState,
  DeviceStatusPayload,
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
  telemetryPreview: TelemetrySample[];
  error: string | null;
  isBluetoothReady: boolean;
  scanForDevices: () => Promise<void>;
  connect: (deviceId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
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
  const bleClientRef = useRef<HushBleClient | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const telemetryQueueRef = useRef<TelemetrySample[]>([]);
  const telemetryRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUploadingRef = useRef(false);
  const sessionRef = useRef<SessionState>(INITIAL_SESSION);
  const rhythmRef = useRef<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const connectedDeviceRef = useRef<ConnectedDevice | null>(null);
  const isMountedRef = useRef(false);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDevice | null>(null);
  const [scannedDevices, setScannedDevices] = useState<ConnectedDevice[]>([]);
  const [isDevicePickerVisible, setDevicePickerVisible] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [telemetryPreview, setTelemetryPreview] = useState<TelemetrySample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBluetoothReady, setBluetoothReady] = useState(false);
  const [rhythmConfig, setRhythmConfig] = useState<RhythmConfig>(DEFAULT_RHYTHM_CONFIG);
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);

  useEffect(() => {
    bleClientRef.current = new HushBleClient();
    isMountedRef.current = true;
    void loadPersistedState();
    void syncAdapterState();

    const flushInterval = setInterval(() => {
      void flushTelemetryQueue();
    }, HUSH_TELEMETRY_FLUSH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(flushInterval);
      clearPhaseTimer();
      if (scanWindowRef.current) {
        clearTimeout(scanWindowRef.current);
      }
      bleClientRef.current?.destroy();
      if (telemetryRetryRef.current) {
        clearTimeout(telemetryRetryRef.current);
      }
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

  const totalDurationMs =
    rhythmConfig.inhaleMs + rhythmConfig.holdMs + rhythmConfig.exhaleMs;
  const totalSessionDurationMs = totalDurationMs * rhythmConfig.cycles;

  async function loadPersistedState() {
    try {
      const storedRhythm = await AsyncStorage.getItem(HUSH_STORAGE_KEYS.rhythmConfig);
      if (storedRhythm) {
        const parsed = JSON.parse(storedRhythm) as RhythmConfig;
        setRhythmConfig(parsed);
      }
    } catch {
      // Ignore invalid persisted config and fall back to defaults.
    }
  }

  async function syncAdapterState() {
    if (!bleClientRef.current || Platform.OS === 'web') {
      return false;
    }

    try {
      const state = await bleClientRef.current.getAdapterState();
      const ready = state === 'PoweredOn';
      setBluetoothReady(ready);
      return ready;
    } catch {
      setBluetoothReady(false);
      return false;
    }
  }

  async function requestPermissions() {
    if (Platform.OS === 'web') {
      setPermissionGranted(false);
      setError('BLE is only available on iOS and Android development builds.');
      return false;
    }

    if (Platform.OS === 'ios') {
      setPermissionGranted(true);
      return true;
    }

    const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : 0;

    const permissions =
      androidVersion >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const result = await PermissionsAndroid.requestMultiple(permissions);
    const granted = permissions.every(
      (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED
    );
    setPermissionGranted(granted);

    if (!granted) {
      setError('Bluetooth permission is required to scan and connect to HUSH devices.');
    }

    return granted;
  }

  async function scanForDevices() {
    const canContinue = await requestPermissions();
    if (!canContinue || !bleClientRef.current) {
      return;
    }

    const adapterReady = await syncAdapterState();
    if (!adapterReady && Platform.OS !== 'ios') {
      setConnectionState('error');
      setError('Turn on Bluetooth before scanning for your HUSH device.');
      return;
    }

    setConnectionState('scanning');
    setError(null);
    setScannedDevices([]);
    setDevicePickerVisible(false);

    const seen = new Map<string, ConnectedDevice>();
    bleClientRef.current.startScan({
      onDevice: (device) => {
        seen.set(device.id, device);
        if (!isMountedRef.current) {
          return;
        }
        setScannedDevices(Array.from(seen.values()));
      },
      onError: (message) => {
        setConnectionState('error');
        setError(message);
      },
    });

    if (scanWindowRef.current) {
      clearTimeout(scanWindowRef.current);
    }

    scanWindowRef.current = setTimeout(async () => {
      bleClientRef.current?.stopScan();
      scanWindowRef.current = null;

      if (!isMountedRef.current) {
        return;
      }

      const devices = Array.from(seen.values());
      if (devices.length === 0) {
        setConnectionState('disconnected');
        setError('No HUSH devices were found nearby. Make sure the hardware is powered on.');
        return;
      }

      if (devices.length === 1) {
        await connect(devices[0].id);
        return;
      }

      setConnectionState('disconnected');
      setDevicePickerVisible(true);
    }, HUSH_SCAN_WINDOW_MS);
  }

  async function connect(deviceId?: string) {
    if (!bleClientRef.current) {
      return;
    }

    const targetId = deviceId ?? scannedDevices[0]?.id;
    if (!targetId) {
      setError('Select a device before connecting.');
      return;
    }

    setConnectionState('connecting');
    setError(null);
    setDevicePickerVisible(false);

    try {
      const device = await bleClientRef.current.connect(targetId, {
        onDisconnected: () => {
          setConnectionState('disconnected');
          setConnectedDevice(null);
          setLastSeen(new Date().toISOString());
          void pause('device_disconnected');
          setError('Device disconnected. Reconnect to continue the session.');
        },
        onStatus: (status) => {
          applyStatus(status);
        },
        onTelemetry: (sample) => {
          handleTelemetrySample(sample);
        },
      });

      setConnectedDevice(device);
      setConnectionState('connected');
      setLastSeen(new Date().toISOString());
      await AsyncStorage.setItem(HUSH_STORAGE_KEYS.lastDeviceId, device.id);
    } catch (connectError) {
      setConnectionState('error');
      setConnectedDevice(null);
      setError(getErrorMessage(connectError, 'Unable to connect to the selected device.'));
    }
  }

  async function disconnect() {
    try {
      clearPhaseTimer();
      if (sessionRef.current.status === 'running' || sessionRef.current.status === 'paused') {
        await stop('user_stop');
      }
      await bleClientRef.current?.disconnect();
    } catch {
      // Keep UI consistent even if the native disconnect reports an error.
    } finally {
      setConnectedDevice(null);
      setConnectionState('disconnected');
      setBatteryLevel(null);
    }
  }

  function applyStatus(status: DeviceStatusPayload) {
    if (typeof status.batteryLevel === 'number') {
      setBatteryLevel(status.batteryLevel);
    }

    if (status.firmwareVersion) {
      setFirmwareVersion(status.firmwareVersion);
    }

    if (status.name && connectedDeviceRef.current) {
      setConnectedDevice({
        ...connectedDeviceRef.current,
        name: status.name,
      });
    }

    setLastSeen(new Date().toISOString());
  }

  function handleTelemetrySample(sample: TelemetrySample) {
    const sessionId = sessionRef.current.sessionId ?? undefined;
    const nextSample = sessionId ? { ...sample, sessionId } : sample;

    telemetryQueueRef.current.push(nextSample);
    setLastSeen(nextSample.receivedAt);
    setTelemetryPreview((current) => [...current.slice(-7), nextSample]);

    if (telemetryQueueRef.current.length >= HUSH_TELEMETRY_BATCH_SIZE) {
      void flushTelemetryQueue();
    }
  }

  async function flushTelemetryQueue() {
    if (isUploadingRef.current || telemetryQueueRef.current.length === 0) {
      return;
    }

    const device = connectedDeviceRef.current;
    if (!device) {
      return;
    }

    isUploadingRef.current = true;
    const batch = telemetryQueueRef.current.splice(0, HUSH_TELEMETRY_BATCH_SIZE);

    try {
      await backendClient.uploadTelemetryBatch({
        sessionId: sessionRef.current.sessionId,
        deviceId: device.id,
        samples: batch,
      });
    } catch {
      telemetryQueueRef.current.unshift(...batch);
      if (!telemetryRetryRef.current) {
        telemetryRetryRef.current = setTimeout(() => {
          telemetryRetryRef.current = null;
          void flushTelemetryQueue();
        }, HUSH_TELEMETRY_RETRY_DELAY_MS);
      }
    } finally {
      isUploadingRef.current = false;
    }
  }

  async function saveRhythmConfig(next: RhythmConfig) {
    const validationError = validateRhythm(next);
    if (validationError) {
      return { ok: false as const, error: validationError };
    }

    setRhythmConfig(next);
    await AsyncStorage.setItem(HUSH_STORAGE_KEYS.rhythmConfig, JSON.stringify(next));

    if (connectionState === 'connected' && sessionRef.current.status === 'idle') {
      try {
        await bleClientRef.current?.sendCommand({
          type: 'rhythm_preview',
          rhythm: next,
          vibration: 'medium',
          sentAt: new Date().toISOString(),
        });
      } catch {
        // Preview sync is best-effort and should not block saving.
      }
    }

    return { ok: true as const };
  }

  async function start() {
    if (!connectedDeviceRef.current) {
      setError('Connect your HUSH device before starting a breathing session.');
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
      await bleClientRef.current?.sendCommand({
        type: 'session_start',
        sessionId,
        rhythm: rhythmRef.current,
        vibration: 'medium',
        sentAt: new Date().toISOString(),
      });
      schedulePhase('inhale', 1);
    } catch (startError) {
      setError(getErrorMessage(startError, 'Unable to start the breathing session.'));
    }
  }

  async function pause(reason: SessionPauseReason = 'user_pause') {
    if (sessionRef.current.status !== 'running') {
      return;
    }

    clearPhaseTimer();
    const currentSession = sessionRef.current;

    setSession((state) => ({
      ...state,
      status: 'paused',
      pauseReason: reason,
    }));

    if (reason !== 'device_disconnected') {
      try {
        await bleClientRef.current?.sendCommand({
          type: 'session_pause',
          sessionId: currentSession.sessionId ?? '',
          reason,
          sentAt: new Date().toISOString(),
        });
      } catch {
        // Transport failure is acceptable while pausing.
      }
    }

    if (currentSession.sessionId) {
      await backendClient.updateSessionStatus({
        sessionId: currentSession.sessionId,
        status: 'paused',
        reason,
      });
    }
  }

  async function resume() {
    if (sessionRef.current.status !== 'paused' || !connectedDeviceRef.current) {
      setError('Reconnect your HUSH device before resuming.');
      return;
    }

    const currentSession = sessionRef.current;
    setSession((state) => ({
      ...state,
      status: 'running',
      pauseReason: null,
    }));

    try {
      await bleClientRef.current?.sendCommand({
        type: 'session_resume',
        sessionId: currentSession.sessionId ?? '',
        sentAt: new Date().toISOString(),
      });
      schedulePhase(currentSession.phase, Math.max(currentSession.cycleIndex, 1));
    } catch (resumeError) {
      setError(getErrorMessage(resumeError, 'Unable to resume the breathing session.'));
      setSession((state) => ({
        ...state,
        status: 'paused',
        pauseReason: 'system',
      }));
      return;
    }

    if (currentSession.sessionId) {
      await backendClient.updateSessionStatus({
        sessionId: currentSession.sessionId,
        status: 'running',
      });
    }
  }

  async function stop(reason: SessionStopReason = 'user_stop') {
    clearPhaseTimer();
    const currentSession = sessionRef.current;

    if (currentSession.sessionId && reason !== 'device_disconnected') {
      try {
        await bleClientRef.current?.sendCommand({
          type: 'session_stop',
          sessionId: currentSession.sessionId,
          reason,
          sentAt: new Date().toISOString(),
        });
      } catch {
        // Stop should still complete locally.
      }
    }

    if (currentSession.sessionId) {
      await backendClient.updateSessionStatus({
        sessionId: currentSession.sessionId,
        status: reason === 'completed' ? 'completed' : 'stopped',
        reason,
      });
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
    setDevicePickerVisible(false);
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
        scannedDevices,
        isDevicePickerVisible,
        batteryLevel,
        firmwareVersion,
        lastSeen,
        telemetryPreview,
        error,
        isBluetoothReady,
        scanForDevices,
        connect,
        disconnect,
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
      isBluetoothReady,
      isDevicePickerVisible,
      lastSeen,
      permissionGranted,
      rhythmConfig,
      scannedDevices,
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
