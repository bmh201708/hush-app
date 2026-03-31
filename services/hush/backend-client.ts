import Constants from 'expo-constants';

import type {
  BackendDeviceStatus,
  BackendSessionPayload,
  BackendSessionResult,
  DeviceAssistantResponse,
  DeviceAssistantResponseAckPayload,
  RecentTelemetryResult,
  RhythmPreviewPayload,
  SessionStatusUpdate,
  TelemetrySample,
} from '@/types/hush';

type UploadTelemetryPayload = {
  sessionId: string | null;
  deviceId: string;
  samples: TelemetrySample[];
};

type MockStore = {
  sessions: Map<string, BackendSessionPayload>;
  telemetryBatches: UploadTelemetryPayload[];
};

const mockStore: MockStore = {
  sessions: new Map(),
  telemetryBatches: [],
};

const extra = (Constants.expoConfig?.extra ?? {}) as {
  hushApiBaseUrl?: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_HUSH_API_BASE_URL ?? extra.hushApiBaseUrl ?? '';

export const backendClient = {
  async createSession(payload: BackendSessionPayload): Promise<BackendSessionResult> {
    if (!apiBaseUrl) {
      const sessionId = `mock-session-${Date.now()}`;
      mockStore.sessions.set(sessionId, payload);
      await delay(120);
      return { sessionId };
    }

    return postJson<BackendSessionResult>('/sessions', payload);
  },

  async uploadTelemetryBatch(payload: UploadTelemetryPayload): Promise<void> {
    if (!apiBaseUrl) {
      mockStore.telemetryBatches.push(payload);
      await delay(80);
      return;
    }

    await postJson('/telemetry/batch', payload);
  },

  async updateSessionStatus(payload: SessionStatusUpdate): Promise<void> {
    if (!apiBaseUrl) {
      await delay(50);
      return;
    }

    await postJson(`/sessions/${payload.sessionId}/status`, payload);
  },

  async getDeviceStatus(deviceId: string): Promise<BackendDeviceStatus> {
    if (!apiBaseUrl) {
      await delay(50);
      return {
        deviceId,
        deviceName: 'Mock HUSH Device',
        hardwareModel: 'Mock Transport',
        firmwareVersion: 'mock',
        batteryLevel: 100,
        lastSeenAt: new Date().toISOString(),
        online: true,
        pendingCommands: 0,
      };
    }

    return getJson<BackendDeviceStatus>(`/devices/${deviceId}`);
  },

  async sendRhythmPreview(payload: RhythmPreviewPayload): Promise<void> {
    if (!apiBaseUrl) {
      await delay(50);
      return;
    }

    await postJson(`/devices/${payload.deviceId}/rhythm-preview`, payload);
  },

  async getNextAssistantResponse(deviceId: string): Promise<DeviceAssistantResponse | null> {
    if (!apiBaseUrl) {
      await delay(50);
      return null;
    }

    const response = await fetch(`${apiBaseUrl}/devices/${deviceId}/assistant-responses/next`);
    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return (await response.json()) as DeviceAssistantResponse;
  },

  async ackAssistantResponse(
    deviceId: string,
    responseId: string,
    payload: DeviceAssistantResponseAckPayload
  ): Promise<void> {
    if (!apiBaseUrl) {
      await delay(50);
      return;
    }

    await postJson(`/devices/${deviceId}/assistant-responses/${responseId}/ack`, payload);
  },

  async getRecentTelemetry(deviceId: string, limit = 72): Promise<RecentTelemetryResult> {
    if (!apiBaseUrl) {
      await delay(50);
      return {
        deviceId,
        samples: [],
      };
    }

    return getJson<RecentTelemetryResult>(
      `/devices/${deviceId}/telemetry/recent?limit=${encodeURIComponent(limit)}`
    );
  },
};

async function postJson<T = void>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
