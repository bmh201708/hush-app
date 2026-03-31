import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlassCard, IconBubble, ListRow, PrimaryButton, ScreenShell, SectionLabel, ToggleSwitch } from '@/components/hush/ui';
import { hushColors, hushFonts } from '@/constants/hush-theme';
import { useDeviceState } from '@/hooks/use-hush';

const hushDeviceImage = require('../../hush.png');

export default function DeviceScreen() {
  const {
    batteryLevel,
    connectedDevice,
    connectionState,
    error,
    firmwareVersion,
    isSpeakingAssistantResponse,
    scanForDevices,
    lastSeen,
    latestAssistantResponseText,
    postureRemindersEnabled,
    hapticBreathLeadEnabled,
    setPostureRemindersEnabled,
    setHapticBreathLeadEnabled,
    telemetryPreview,
  } = useDeviceState();

  const isConnected = connectionState === 'connected';
  const connectionLabel = isConnected
    ? 'Connected'
    : connectionState === 'scanning' || connectionState === 'connecting'
      ? 'Syncing'
      : 'Disconnected';
  const heroDescription = isConnected
    ? `${batteryLevel ?? '--'}% Battery`
    : 'Waiting for cloud heartbeat from your hardware';

  const statusCopy = useMemo(() => {
    if (isConnected && connectedDevice) {
      return `Seeed XIAO ESP32S3 Sense is online and can receive queued vibration commands from the cloud backend.`;
    }

    if (connectionState === 'scanning' || connectionState === 'connecting') {
      return 'Refreshing device status from the cloud gateway and checking the latest heartbeat.';
    }

    return 'Power on the hardware and let it poll the cloud backend. Once the heartbeat arrives, this page will show Connected.';
  }, [connectedDevice, connectionState, isConnected]);

  const handlePrimaryAction = async () => {
    await scanForDevices();
  };

  return (
    <ScreenShell>
      <View style={styles.hero}>
        <View style={styles.heroHalo} />
        <View style={styles.deviceAura}>
          <View style={styles.deviceRing} />
          <View style={styles.devicePortraitFrame}>
            <Image source={hushDeviceImage} style={styles.devicePortraitImage} />
          </View>
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
                name={isConnected ? 'refresh-cw' : connectionState === 'scanning' ? 'loader' : 'cloud'}
                size={17}
              />
            }
            label={isConnected ? 'Refresh Status' : connectionState === 'scanning' ? 'Checking...' : 'Check Device'}
            onPress={() => {
              void handlePrimaryAction();
            }}
            disabled={connectionState === 'scanning' || connectionState === 'connecting'}
          />
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
            <ToggleSwitch
              enabled={postureRemindersEnabled}
              onToggle={(enabled) => {
                void setPostureRemindersEnabled(enabled);
              }}
            />
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
            <ToggleSwitch
              enabled={hapticBreathLeadEnabled}
              onToggle={(enabled) => {
                void setHapticBreathLeadEnabled(enabled);
              }}
            />
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
            subtitle={firmwareVersion ? `${firmwareVersion} • Cloud managed` : 'Waiting for device heartbeat'}
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
            subtitle={isConnected ? `${connectedDevice?.id.slice(0, 12)} • Cloud gateway online` : 'Offline until the ESP32 checks in'}
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
          Incoming 9-axis telemetry should now flow from the ESP32 directly to the cloud backend,
          where session history and command queues stay in sync with the app.
        </Text>
        {latestAssistantResponseText ? (
          <Text style={styles.voiceResponseText}>
            {isSpeakingAssistantResponse ? 'Speaking' : 'Last reply'}: {latestAssistantResponseText}
          </Text>
        ) : null}
        <Text style={styles.telemetryCount}>Recent samples mirrored in app: {telemetryPreview.length}</Text>
      </GlassCard>
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
  devicePortraitFrame: {
    width: 164,
    height: 164,
    borderRadius: 82,
    padding: 6,
    backgroundColor: 'rgba(243, 240, 234, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(215, 151, 87, 0.28)',
    shadowColor: '#9C6A35',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  devicePortraitImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
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
  voiceResponseText: {
    fontFamily: hushFonts.medium,
    fontSize: 12,
    lineHeight: 18,
    color: hushColors.primaryDark,
    textAlign: 'center',
  },
  telemetryCount: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
});

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}
