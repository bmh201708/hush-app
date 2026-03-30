import type { RhythmPreset } from '@/types/hush';

export const HUSH_STORAGE_KEYS = {
  rhythmConfig: 'hush.rhythmConfig.v1',
  lastDeviceId: 'hush.lastDeviceId.v1',
} as const;

export const HUSH_BLE_UUIDS = {
  service: '9a1b0001-6d7f-4f5a-b8ea-4cf8f52f9a11',
  statusCharacteristic: '9a1b0002-6d7f-4f5a-b8ea-4cf8f52f9a11',
  telemetryCharacteristic: '9a1b0003-6d7f-4f5a-b8ea-4cf8f52f9a11',
  commandCharacteristic: '9a1b0004-6d7f-4f5a-b8ea-4cf8f52f9a11',
} as const;

export const HUSH_SCAN_WINDOW_MS = 3500;
export const HUSH_TELEMETRY_BATCH_SIZE = 20;
export const HUSH_TELEMETRY_FLUSH_INTERVAL_MS = 1000;
export const HUSH_TELEMETRY_RETRY_DELAY_MS = 2000;

export const DEFAULT_RHYTHM_CONFIG: RhythmPreset['config'] = {
  inhaleMs: 4000,
  holdMs: 7000,
  exhaleMs: 8000,
  cycles: 32,
};

export const RHYTHM_PRESETS: RhythmPreset[] = [
  {
    id: '478',
    label: '4-7-8',
    description: 'Classic calming rhythm',
    config: {
      inhaleMs: 4000,
      holdMs: 7000,
      exhaleMs: 8000,
      cycles: 32,
    },
  },
  {
    id: 'box',
    label: 'Box',
    description: 'Balanced 4-4-4',
    config: {
      inhaleMs: 4000,
      holdMs: 4000,
      exhaleMs: 4000,
      cycles: 40,
    },
  },
  {
    id: 'calm',
    label: 'Calm 5-0-5',
    description: 'Gentle symmetry for focus',
    config: {
      inhaleMs: 5000,
      holdMs: 0,
      exhaleMs: 5000,
      cycles: 30,
    },
  },
];
