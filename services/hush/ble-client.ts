import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { HUSH_BLE_UUIDS } from '@/constants/hush-ble';
import { decodeStatus, decodeTelemetry, encodeCommand } from '@/services/hush/ble-protocol';
import type {
  ConnectedDevice,
  DeviceStatusPayload,
  HardwareCommand,
  TelemetrySample,
} from '@/types/hush';

type ScanHandlers = {
  onDevice: (device: ConnectedDevice) => void;
  onError: (message: string) => void;
};

type ConnectionHandlers = {
  onDisconnected: () => void;
  onStatus: (status: DeviceStatusPayload) => void;
  onTelemetry: (sample: TelemetrySample) => void;
};

export class HushBleClient {
  private manager = new BleManager();
  private scanSubscriptionActive = false;
  private statusSubscription: Subscription | null = null;
  private telemetrySubscription: Subscription | null = null;
  private disconnectionSubscription: Subscription | null = null;
  private connectedDevice: Device | null = null;

  destroy() {
    this.stopScan();
    this.cleanupSubscriptions();
    void this.manager.destroy();
  }

  async getAdapterState() {
    return this.manager.state();
  }

  startScan({ onDevice, onError }: ScanHandlers) {
    this.stopScan();
    this.scanSubscriptionActive = true;

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        onError(error.message);
        return;
      }

      if (!device || !matchesHushDevice(device)) {
        return;
      }

      onDevice({
        id: device.id,
        name: device.name ?? device.localName ?? 'HUSH Device',
        rssi: device.rssi ?? null,
      });
    });
  }

  stopScan() {
    if (!this.scanSubscriptionActive) {
      return;
    }

    this.manager.stopDeviceScan();
    this.scanSubscriptionActive = false;
  }

  async connect(deviceId: string, handlers: ConnectionHandlers): Promise<ConnectedDevice> {
    this.stopScan();
    this.cleanupSubscriptions();

    const device = await this.manager.connectToDevice(deviceId, {
      autoConnect: false,
      requestMTU: 185,
    });

    const discovered = await device.discoverAllServicesAndCharacteristics();
    this.connectedDevice = discovered;

    this.disconnectionSubscription = this.manager.onDeviceDisconnected(discovered.id, () => {
      this.connectedDevice = null;
      this.cleanupSubscriptions();
      handlers.onDisconnected();
    });

    this.statusSubscription = discovered.monitorCharacteristicForService(
      HUSH_BLE_UUIDS.service,
      HUSH_BLE_UUIDS.statusCharacteristic,
      (error, characteristic) => {
        if (error) {
          return;
        }

        const status = decodeStatus(characteristic?.value ?? null);
        if (status) {
          handlers.onStatus(status);
        }
      }
    );

    this.telemetrySubscription = discovered.monitorCharacteristicForService(
      HUSH_BLE_UUIDS.service,
      HUSH_BLE_UUIDS.telemetryCharacteristic,
      (error, characteristic) => {
        if (error || !this.connectedDevice) {
          return;
        }

        const sample = decodeTelemetry(characteristic?.value ?? null, this.connectedDevice.id);
        if (sample) {
          handlers.onTelemetry(sample);
        }
      }
    );

    try {
      const statusCharacteristic = await discovered.readCharacteristicForService(
        HUSH_BLE_UUIDS.service,
        HUSH_BLE_UUIDS.statusCharacteristic
      );
      const status = decodeStatus(statusCharacteristic.value ?? null);
      if (status) {
        handlers.onStatus(status);
      }
    } catch {
      // Status reads are optional. Notifications will still drive updates.
    }

    return {
      id: discovered.id,
      name: discovered.name ?? discovered.localName ?? 'HUSH Device',
      rssi: discovered.rssi ?? null,
    };
  }

  async disconnect() {
    if (!this.connectedDevice) {
      return;
    }

    const deviceId = this.connectedDevice.id;
    this.cleanupSubscriptions();
    this.connectedDevice = null;
    await this.manager.cancelDeviceConnection(deviceId);
  }

  async sendCommand(command: HardwareCommand) {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    await this.connectedDevice.writeCharacteristicWithResponseForService(
      HUSH_BLE_UUIDS.service,
      HUSH_BLE_UUIDS.commandCharacteristic,
      encodeCommand(command)
    );
  }

  private cleanupSubscriptions() {
    this.statusSubscription?.remove();
    this.telemetrySubscription?.remove();
    this.disconnectionSubscription?.remove();
    this.statusSubscription = null;
    this.telemetrySubscription = null;
    this.disconnectionSubscription = null;
  }
}

function matchesHushDevice(device: Device) {
  const advertisedUuids = device.serviceUUIDs?.map((uuid) => uuid.toLowerCase()) ?? [];

  const deviceName = `${device.name ?? ''} ${device.localName ?? ''}`.toLowerCase();
  const identifier = device.id.toLowerCase();

  return (
    advertisedUuids.includes(HUSH_BLE_UUIDS.service.toLowerCase()) ||
    deviceName.includes('hush') ||
    identifier.includes('hush')
  );
}
