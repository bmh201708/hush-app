import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard, IconBubble, ListRow, ScreenShell, SectionLabel, ToggleSwitch } from '@/components/hush/ui';
import { hushColors, hushFonts } from '@/constants/hush-theme';

export default function DeviceScreen() {
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
          <View style={styles.connectionPill}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>Connected</Text>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.deviceTitle}>HUSH Core No. 1</Text>
          <View style={styles.batteryRow}>
            <MaterialCommunityIcons color={hushColors.textMuted} name="battery-80" size={18} />
            <Text style={styles.batteryText}>84% Charged</Text>
          </View>
        </View>
      </View>

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
            <ToggleSwitch enabled />
          </GlassCard>

          <GlassCard style={styles.toggleCard}>
            <View style={styles.toggleLead}>
              <IconBubble tone="green">
                <MaterialCommunityIcons color={hushColors.primaryDark} name="weather-windy" size={18} />
              </IconBubble>
              <View style={styles.toggleText}>
                <Text style={styles.rowTitle}>Haptic Breath Lead</Text>
                <Text style={styles.rowSubtitle}>Vibration-guided deep inhale patterns</Text>
              </View>
            </View>
            <ToggleSwitch enabled={false} />
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
            subtitle="v2.4.0 • Up to date"
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
            subtitle="Disconnect and wipe device data"
            title="Factory Reset"
            trailing={<Feather color={hushColors.textSoft} name="chevron-right" size={18} />}
          />
        </View>
      </View>

      <GlassCard style={styles.helpCard}>
        <IconBubble tone="green">
          <Feather color={hushColors.primaryDark} name="help-circle" size={18} />
        </IconBubble>
        <Text style={styles.helpTitle}>Need assistance?</Text>
        <Text style={styles.helpCopy}>
          Explore our minimalist guide on how to wear HUSH for optimal heart-rate tracking.
        </Text>
        <LinearGradient colors={[hushColors.primaryDark, hushColors.primary]} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>View Manual</Text>
        </LinearGradient>
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
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: hushColors.primarySoft,
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
  section: {
    marginTop: 14,
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
  },
  helpCopy: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  helpButton: {
    marginTop: 4,
    minWidth: 150,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: hushColors.white,
  },
});
