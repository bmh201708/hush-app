import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard, IconBubble, ListRow, ScreenShell, SectionLabel } from '@/components/hush/ui';
import { hushColors, hushFonts, hushMetrics } from '@/constants/hush-theme';

const history = [
  {
    title: 'Pranayama Deep',
    subtitle: 'Yesterday • 20 mins',
    icon: 'weather-windy',
    tone: 'sand' as const,
    dots: 2,
  },
  {
    title: 'Morning Flow',
    subtitle: '2 days ago • 10 mins',
    icon: 'water-outline',
    tone: 'green' as const,
    dots: 3,
  },
];

const settings = [
  {
    title: 'Personal Information',
    subtitle: 'Profile, Email, Subscription',
    icon: <Feather color={hushColors.textMuted} name="user" size={16} />,
  },
  {
    title: 'Reminders & Alerts',
    subtitle: 'Scheduled breathing, Session end',
    icon: <Ionicons color={hushColors.textMuted} name="notifications-outline" size={16} />,
  },
  {
    title: 'Device Sync',
    subtitle: 'HUSH Pod, Smart Watches',
    icon: <MaterialCommunityIcons color={hushColors.textMuted} name="devices" size={16} />,
  },
  {
    title: 'Privacy & Security',
    subtitle: 'Biometric lock, Data sharing',
    icon: <Ionicons color={hushColors.textMuted} name="shield-outline" size={16} />,
  },
];

export default function ProfileScreen() {
  return (
    <ScreenShell>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <SectionLabel>Zen Master</SectionLabel>
          <Text style={styles.heroTitle}>
            Breathe deep,{'\n'}
            <Text style={styles.heroStrong}>Evelyn.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Your sanctuary is ready. You have spent 1,420 minutes in deep silence this month.
          </Text>
        </View>

        <View style={styles.statPills}>
          <GlassCard style={styles.statPill}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </GlassCard>
          <GlassCard style={styles.statPill}>
            <Text style={[styles.statNumber, styles.statNumberAmber]}>48</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.mediaGrid}>
        <LinearGradient colors={['#2B1204', '#7B3410', '#FF9C1A']} style={styles.sessionCard}>
          <View style={styles.sessionGlow} />
          <MaterialCommunityIcons color="rgba(246, 209, 156, 0.82)" name="meditation" size={112} />
          <View style={styles.sessionOverlay}>
            <View>
              <View style={styles.lastSessionRow}>
                <MaterialCommunityIcons color="rgba(255,255,255,0.8)" name="meditation" size={13} />
                <Text style={styles.lastSessionLabel}>Last Session</Text>
              </View>
              <Text style={styles.sessionTitle}>Forest Whispers</Text>
              <Text style={styles.sessionMeta}>15 minutes • High Resonance</Text>
            </View>
            <View style={styles.playButton}>
              <Ionicons color={hushColors.white} name="play" size={18} />
            </View>
          </View>
        </LinearGradient>

        <GlassCard style={styles.focusCard}>
          <View>
            <SectionLabel>Focus Metric</SectionLabel>
            <Text style={styles.focusTitle}>Calmness</Text>
            <Text style={styles.focusCopy}>
              Your heart rate variability improved by 14% since Tuesday.
            </Text>
          </View>
          <View style={styles.barRow}>
            {[0.34, 0.3, 0.46, 0.42, 0.74, 0.24].map((height, index) => (
              <View
                key={`${height}-${index}`}
                style={[
                  styles.bar,
                  {
                    height: `${height * 100}%`,
                    backgroundColor: index === 4 ? hushColors.primaryDark : 'rgba(102, 121, 49, 0.28)',
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Journey History</Text>
          <Text style={styles.archive}>View Archive</Text>
        </View>
        <View style={styles.list}>
          {history.map((item) => (
            <ListRow
              icon={
                <IconBubble tone={item.tone}>
                  {item.icon === 'water-outline' ? (
                    <Ionicons color={hushColors.primaryDark} name="water-outline" size={17} />
                  ) : (
                    <MaterialCommunityIcons color={hushColors.primaryDark} name="weather-windy" size={17} />
                  )}
                </IconBubble>
              }
              key={item.title}
              soft
              subtitle={item.subtitle}
              title={item.title}
              trailing={
                <View style={styles.impactWrap}>
                  <Text style={styles.impactLabel}>Impact</Text>
                  <View style={styles.impactDots}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.impactDot,
                          index < item.dots ? styles.impactDotActive : styles.impactDotIdle,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.list}>
          {settings.map((item) => (
            <ListRow
              icon={<IconBubble tone="soft">{item.icon}</IconBubble>}
              key={item.title}
              soft={false}
              subtitle={item.subtitle}
              title={item.title}
              trailing={<Feather color={hushColors.textSoft} name="chevron-right" size={18} />}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <View style={styles.secondaryPill}>
            <Text style={styles.secondaryPillText}>Support</Text>
          </View>
          <View style={styles.secondaryPill}>
            <Text style={styles.secondaryPillText}>Privacy Policy</Text>
          </View>
        </View>
        <View style={styles.signOut}>
          <Ionicons color={hushColors.error} name="log-out-outline" size={14} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 22,
    marginTop: 4,
  },
  heroText: {
    gap: 10,
  },
  heroTitle: {
    fontFamily: hushFonts.display,
    fontSize: 48,
    lineHeight: 52,
    color: hushColors.text,
  },
  heroStrong: {
    fontFamily: hushFonts.title,
  },
  heroSubtitle: {
    maxWidth: 300,
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
  },
  statPills: {
    flexDirection: 'row',
    gap: 14,
  },
  statPill: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  statNumber: {
    fontFamily: hushFonts.title,
    fontSize: 29,
    color: hushColors.primaryDark,
    marginBottom: 3,
  },
  statNumberAmber: {
    color: hushColors.amber,
  },
  statLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  mediaGrid: {
    marginTop: 6,
    gap: 18,
  },
  sessionCard: {
    minHeight: 264,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sessionGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 179, 66, 0.18)',
  },
  sessionOverlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lastSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lastSessionLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.74)',
    textTransform: 'uppercase',
  },
  sessionTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 28,
    color: hushColors.white,
  },
  sessionMeta: {
    marginTop: 4,
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.76)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCard: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 22,
  },
  focusTitle: {
    marginTop: 8,
    fontFamily: hushFonts.headline,
    fontSize: 24,
    color: hushColors.text,
  },
  focusCopy: {
    marginTop: 6,
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: hushColors.textMuted,
  },
  barRow: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  section: {
    marginTop: 22,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 30,
    color: hushColors.text,
  },
  archive: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
  },
  impactWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  impactLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: hushColors.amber,
    textTransform: 'uppercase',
  },
  impactDots: {
    flexDirection: 'row',
    gap: 4,
  },
  impactDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  impactDotActive: {
    backgroundColor: hushColors.amber,
  },
  impactDotIdle: {
    backgroundColor: 'rgba(169, 123, 22, 0.2)',
  },
  footer: {
    marginTop: 28,
    gap: 18,
    paddingTop: 8,
    alignItems: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryPill: {
    borderRadius: hushMetrics.pillRadius,
    borderWidth: 1,
    borderColor: 'rgba(208, 196, 187, 0.6)',
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryPillText: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: hushColors.textMuted,
    textTransform: 'uppercase',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutText: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: hushColors.error,
  },
});
