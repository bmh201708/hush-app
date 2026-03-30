import Constants from 'expo-constants';

import type {
  BackendSessionPayload,
  BackendSessionResult,
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
