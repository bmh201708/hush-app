import { Buffer } from 'buffer';

import type { DeviceStatusPayload, HardwareCommand, TelemetrySample } from '@/types/hush';

const TELEMETRY_PACKET_BYTES = 26;

export function encodeCommand(command: HardwareCommand): string {
  return Buffer.from(JSON.stringify(command), 'utf8').toString('base64');
}

export function decodeStatus(payload: string | null): DeviceStatusPayload | null {
  if (!payload) {
    return null;
  }

  try {
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json) as DeviceStatusPayload;
  } catch {
    return null;
  }
}

export function decodeTelemetry(
  payload: string | null,
  deviceId: string,
  sessionId?: string | null
): TelemetrySample | null {
  if (!payload) {
    return null;
  }

  const bytes = Buffer.from(payload, 'base64');
  if (bytes.byteLength < TELEMETRY_PACKET_BYTES) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const seq = view.getUint16(2, true);
  const deviceTimestampMs = view.getUint32(4, true);
  const accel = readMotionVector(view, 8);
  const gyro = readMotionVector(view, 14);
  const mag = readMotionVector(view, 20);

  return {
    seq,
    deviceTimestampMs,
    accel,
    gyro,
    mag,
    receivedAt: new Date().toISOString(),
    deviceId,
    sessionId: sessionId ?? undefined,
  };
}

function readMotionVector(view: DataView, byteOffset: number) {
  return {
    x: view.getInt16(byteOffset, true),
    y: view.getInt16(byteOffset + 2, true),
    z: view.getInt16(byteOffset + 4, true),
  };
}
