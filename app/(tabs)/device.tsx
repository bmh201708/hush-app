import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard, IconBubble, ListRow, PrimaryButton, ScreenShell, SectionLabel, ToggleSwitch } from '@/components/hush/ui';
import { hushColors, hushFonts, hushMetrics } from '@/constants/hush-theme';
import { useDeviceState } from '@/hooks/use-hush';

export default function DeviceScreen() {
  const {
    batteryLevel,
    connectedDevice,
    connectionState,
    disconnect,
    error,
    firmwareVersion,
    connect,
    scannedDevices,
    scanForDevices,
    isDevicePickerVisible,
    dismissDevicePicker,
    lastSeen,
    telemetryPreview,
  } = useDeviceState();

  const isConnected = connectionState === 'connected';
  const connectionLabel = isConnected ? 'Connected' : connectionState === 'scanning' ? 'Scanning' : connectionState === 'connecting' ? 'Connecting' : 'Disconnected';
  const heroDescription = isConnected
    ? `${batteryLevel ?? 84}% Charged`
    : 'Waiting for your HUSH hardware';

  const statusCopy = useMemo(() => {
    if (isConnected && connectedDevice) {
      return `Streaming ${telemetryPreview.length} recent chest-motion samples`;
    }

    if (connectionState === 'scanning') {
      return 'Looking for nearby HUSH devices with the custom breathing service';
    }

    if (connectionState === 'connecting') {
      return 'Finalizing the BLE handshake and characteristic subscriptions';
    }

    return 'Connect your wearable to unlock haptic rhythm guidance and live breathing telemetry.';
  }, [connectedDevice, connectionState, isConnected, telemetryPreview.length]);

  const handlePrimaryAction = async () => {
    if (isConnected) {
      await disconnect();
      return;
    }

    await scanForDevices();
  };

  return (
    <ScreenShell>
      <View style={styles.hero}>
        <View style={styles.heroHalo} />
        <View style={styles.deviceAura}>
          <View style={styles.deviceRing} />
          <LinearGradient colors={['#F4C686', '#D79757']} style={styles.deviceSquare}>
            <Svg height="100%" style={StyleSheet.absoluteFillObject} viewBox="0 0 220 220" width="100%">
              <Path
                d="M70 8 C54 54, 54 90, 78 130"
                fill="none"
                stroke="#1B1C1A"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <Path
                d="M150 8 C166 54, 166 90, 142 130"
                fill="none"
                stroke="#1B1C1A"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <Circle cx="110" cy="150" fill="#F3F0EA" r="34" />
              <Circle cx="110" cy="150" fill="#D9C8B8" r="21" />
              <Circle cx="110" cy="150" fill="#1B1C1A" r="9" />
            </Svg>
          </LinearGradient>
          <View style={[styles.connectionPill, !isConnected && styles.connectionPillMuted]}>
            <View style={[styles.connectionDot, !isConnected && styles.connectionDotMuted]} />
            <Text style={styles.connectionText}>{connectionLabel}</Text>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.deviceTitle}>{connectedDevice?.name ?? 'HUSH Core No. 1'}</Text>
          <View style={styles.batteryRow}>
            <MaterialCommunityIcons color={hushColors.textMuted} name="battery-80" size={18} />
            <Text style={styles.batteryText}>{heroDescription}</Text>
          </View>
        </View>
      </View>

      <GlassCard style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusTitle}>
              {isConnected ? 'Hardware Linked' : 'Hardware Offline'}
            </Text>
            <Text style={styles.statusCopy}>{statusCopy}</Text>
          </View>
          {lastSeen ? <Text style={styles.statusMeta}>Last seen {formatTimestamp(lastSeen)}</Text> : null}
        </View>
        {error ? <Text style={styles.statusError}>{error}</Text> : null}
        <View style={styles.statusActions}>
          <PrimaryButton
            icon={
              <Feather
                color={hushColors.white}
                name={isConnected ? 'link-2' : connectionState === 'scanning' ? 'loader' : 'bluetooth'}
                size={17}
              />
            }
            label={isConnected ? 'Disconnect Device' : connectionState === 'scanning' ? 'Scanning...' : 'Connect Device'}
            onPress={() => {
              void handlePrimaryAction();
            }}
            disabled={connectionState === 'scanning' || connectionState === 'connecting'}
          />
          {!isConnected && scannedDevices.length > 1 ? (
            <Pressable onPress={dismissDevicePicker} style={styles.inlineLink}>
              <Text style={styles.inlineLinkText}>Hide device list</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>

      <View style={styles.section}>
        <SectionLabel>Device Controls</SectionLabel>
        <View style={styles.list}>
          <GlassCard style={styles.toggleCard}>
            <View style={styles.toggleLead}>
              <IconBubble tone="sand">
                <MaterialCommunityIcons
                  color={hushColors.primaryDark}
                  name="bell-ring-outline"
                  size={18}
                />
              </IconBubble>
              <View style={styles.toggleText}>
                <Text style={styles.rowTitle}>Posture Reminders</Text>
                <Text style={styles.rowSubtitle}>Gentle haptic pulses when slouching</Text>
              </View>
            </View>
            <ToggleSwitch enabled={isConnected} />
          </GlassCard>

          <GlassCard style={styles.toggleCard}>
            <View style={styles.toggleLead}>
              <IconBubble tone="green">
                <MaterialCommunityIcons color={hushColors.primaryDark} name="weather-windy" size={18} />
              </IconBubble>
              <View style={styles.toggleText}>
                <Text style={styles.rowTitle}>Haptic Breath Lead</Text>
                <Text style={styles.rowSubtitle}>Vibration-guided inhale, hold and exhale cues</Text>
              </View>
            </View>
            <ToggleSwitch enabled={isConnected} />
          </GlassCard>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>System</SectionLabel>
        <View style={styles.list}>
          <ListRow
            icon={
              <IconBubble tone="green">
                <MaterialCommunityIcons color={hushColors.primaryDark} name="cellphone-arrow-down" size={18} />
              </IconBubble>
            }
            soft={false}
            subtitle={firmwareVersion ? `${firmwareVersion} • Up to date` : 'Waiting for status characteristic'}
            title="Firmware Version"
            trailing={<Feather color={hushColors.textSoft} name="chevron-right" size={18} />}
          />
          <ListRow
            icon={
              <IconBubble tone="soft">
                <MaterialCommunityIcons color={hushColors.textMuted} name="bluetooth-audio" size={18} />
              </IconBubble>
            }
            soft={false}
            subtitle={isConnected ? `${connectedDevice?.id.slice(0, 8)} • BLE linked` : 'Disconnected and ready to pair'}
            title="Connection Link"
            trailing={<Feather color={hushColors.textSoft} name="chevron-right" size={18} />}
          />
        </View>
      </View>

      <GlassCard style={styles.helpCard}>
        <IconBubble tone="green">
          <Feather color={hushColors.primaryDark} name="activity" size={18} />
        </IconBubble>
        <Text style={styles.helpTitle}>Telemetry Pipeline Ready</Text>
        <Text style={styles.helpCopy}>
          Incoming 9-axis telemetry is buffered in the app and uploaded to the backend in batches
          without interrupting BLE reception.
        </Text>
        <Text style={styles.telemetryCount}>Recent samples buffered: {telemetryPreview.length}</Text>
      </GlassCard>

      <Modal
        animationType="fade"
        transparent
        visible={isDevicePickerVisible}
        onRequestClose={dismissDevicePicker}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose your HUSH device</Text>
            <Text style={styles.modalCopy}>
              More than one matching device was found nearby. Select the wearable you want to link.
            </Text>
            <View style={styles.modalList}>
              {scannedDevices.map((device) => (
                <Pressable
                  key={device.id}
                  onPress={() => {
                    void connect(device.id);
                  }}
                  style={({ pressed }) => [styles.deviceOption, pressed && styles.deviceOptionPressed]}>
                  <View>
                    <Text style={styles.deviceOptionTitle}>{device.name}</Text>
                    <Text style={styles.deviceOptionMeta}>
                      {device.id} • RSSI {device.rssi ?? '--'}
                    </Text>
                  </View>
                  <Feather color={hushColors.primaryDark} name="chevron-right" size={18} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={dismissDevicePicker} style={styles.modalDismiss}>
              <Text style={styles.modalDismissText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
    gap: 26,
  },
  heroHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(217, 234, 163, 0.28)',
    top: 40,
    opacity: 0.6,
  },
  deviceAura: {
    width: 268,
    height: 268,
    borderRadius: 134,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceRing: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(208, 196, 187, 0.4)',
  },
  deviceSquare: {
    width: 150,
    height: 150,
    borderRadius: 2,
  },
  connectionPill: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: hushColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionPillMuted: {
    backgroundColor: hushColors.secondary,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: hushColors.primarySoft,
  },
  connectionDotMuted: {
    backgroundColor: hushColors.surface,
  },
  connectionText: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    color: hushColors.white,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroCopy: {
    alignItems: 'center',
    gap: 8,
  },
  deviceTitle: {
    fontFamily: hushFonts.display,
    fontSize: 38,
    color: hushColors.text,
    textAlign: 'center',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batteryText: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.textMuted,
  },
  statusCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 18,
  },
  statusRow: {
    gap: 8,
  },
  statusTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 24,
    color: hushColors.text,
  },
  statusCopy: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
  },
  statusMeta: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  statusError: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.error,
    lineHeight: 20,
  },
  statusActions: {
    gap: 10,
    alignItems: 'flex-start',
  },
  inlineLink: {
    paddingVertical: 2,
  },
  inlineLinkText: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    color: hushColors.primaryDark,
  },
  section: {
    marginTop: 20,
    gap: 16,
  },
  list: {
    gap: 12,
  },
  toggleCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  toggleText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 17,
    color: hushColors.text,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: hushColors.textMuted,
  },
  helpCard: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 28,
    gap: 14,
    backgroundColor: 'rgba(245, 243, 239, 0.85)',
  },
  helpTitle: {
    fontFamily: hushFonts.title,
    fontSize: 23,
    color: hushColors.primaryDark,
    textAlign: 'center',
  },
  helpCopy: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  telemetryCount: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 28, 26, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: hushMetrics.screenPadding,
  },
  modalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 16,
  },
  modalTitle: {
    fontFamily: hushFonts.title,
    fontSize: 24,
    color: hushColors.text,
  },
  modalCopy: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
  },
  modalList: {
    gap: 10,
  },
  deviceOption: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: hushColors.surfaceLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  deviceOptionPressed: {
    opacity: 0.82,
  },
  deviceOptionTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 16,
    color: hushColors.text,
    marginBottom: 2,
  },
  deviceOptionMeta: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textMuted,
  },
  modalDismiss: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  modalDismissText: {
    fontFamily: hushFonts.semibold,
    fontSize: 13,
    color: hushColors.primaryDark,
  },
});

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}
