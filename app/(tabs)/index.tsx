import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PrimaryButton, ScreenShell, SectionLabel, TextAction } from '@/components/hush/ui';
import { hushColors, hushFonts, hushShadow } from '@/constants/hush-theme';

const PHASES = [
  {
    title: 'Inhale',
    icon: 'weather-windy' as const,
    prompt: 'Follow the gentle expansion of the light',
  },
  {
    title: 'Hold',
    icon: 'pause' as const,
    prompt: 'Let the body stay soft while the breath settles',
  },
  {
    title: 'Exhale',
    icon: 'weather-windy-variant' as const,
    prompt: 'Release the shoulders and let the glow descend',
  },
];

const stats = [
  {
    label: 'BPM Change',
    value: '-12',
    icon: <Ionicons color={hushColors.primaryDark} name="heart" size={18} />,
    tone: 'soft' as const,
  },
  {
    label: 'Focus Score',
    value: '94%',
    icon: <Ionicons color={hushColors.amber} name="flash" size={18} />,
    tone: 'warm' as const,
  },
  {
    label: 'Today',
    value: '24m',
    icon: <MaterialCommunityIcons color={hushColors.textMuted} name="clock-outline" size={18} />,
    tone: 'light' as const,
  },
  {
    label: 'Streak',
    value: '8d',
    icon: <MaterialCommunityIcons color={hushColors.primarySoftStrong} name="forest" size={18} />,
    tone: 'soft' as const,
  },
];

export default function BreathScreen() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((current) => (current + 1) % PHASES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.06, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.98, { duration: 1900, easing: Easing.inOut(Easing.ease) })
    );
  }, [phaseIndex, scale]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 2600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const phase = PHASES[phaseIndex];
  const sphereSize = useMemo(() => Math.min(width - 80, 280), [width]);
  const animatedSphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.58,
  }));

  return (
    <ScreenShell contentContainerStyle={styles.screenContent}>
      <View style={styles.heroHeader}>
        <SectionLabel>Current Session</SectionLabel>
        <Text style={styles.heroTitle}>Deep Presence</Text>
      </View>

      <View style={[styles.sphereArea, { height: sphereSize + 84 }]}>
        <View style={[styles.outerRing, { width: sphereSize + 58, height: sphereSize + 58 }]} />
        <View style={[styles.outerRingSoft, { width: sphereSize + 100, height: sphereSize + 100 }]} />
        <Animated.View
          style={[
            styles.outerPulse,
            animatedHaloStyle,
            {
              width: sphereSize + 18,
              height: sphereSize + 18,
              borderRadius: (sphereSize + 18) / 2,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.sphereWrap,
            animatedSphereStyle,
            {
              width: sphereSize,
              height: sphereSize,
              borderRadius: sphereSize / 2,
            },
          ]}>
          <LinearGradient
            colors={[hushColors.primarySoft, '#E2EB99', hushColors.accent]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.sphereGradient}>
            <View style={styles.sphereHighlight} />
            <MaterialCommunityIcons color="rgba(75, 89, 34, 0.45)" name={phase.icon} size={32} />
            <Text style={styles.sphereTitle}>{phase.title}</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.metaLeft}>
          <Text style={styles.metaLabel}>Pace</Text>
          <Text style={styles.metaValue}>4-7-8</Text>
        </View>
        <View style={styles.metaRight}>
          <Text style={styles.metaLabel}>Duration</Text>
          <Text style={styles.metaValue}>10:00</Text>
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{phase.prompt}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          icon={<Ionicons color={hushColors.white} name="play" size={18} />}
          label="Start Session"
        />
        <TextAction
          icon={<Feather color={hushColors.primaryDark} name="settings" size={14} />}
          label="Adjust Rhythm"
        />
      </View>

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View
            key={item.label}
            style={[
              styles.statCard,
              item.tone === 'soft'
                ? styles.statCardSoft
                : item.tone === 'warm'
                  ? styles.statCardWarm
                  : styles.statCardLight,
            ]}>
            <View style={styles.statIcon}>{item.icon}</View>
            <View>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    alignItems: 'center',
  },
  heroHeader: {
    marginTop: 2,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    fontFamily: hushFonts.display,
    fontSize: 49,
    lineHeight: 54,
    color: hushColors.text,
  },
  sphereArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  outerRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(208, 196, 187, 0.32)',
  },
  outerRingSoft: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(208, 196, 187, 0.18)',
  },
  outerPulse: {
    position: 'absolute',
    backgroundColor: 'rgba(242, 212, 76, 0.14)',
  },
  sphereWrap: {
    overflow: 'hidden',
    ...hushShadow.ambient,
  },
  sphereGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sphereHighlight: {
    position: 'absolute',
    width: '50%',
    height: '18%',
    top: '14%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  sphereTitle: {
    fontFamily: hushFonts.display,
    fontSize: 31,
    color: '#4B5922',
  },
  metaLeft: {
    position: 'absolute',
    left: 0,
    bottom: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    ...hushShadow.soft,
  },
  metaRight: {
    position: 'absolute',
    right: 0,
    top: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    ...hushShadow.soft,
  },
  metaLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: hushColors.textSoft,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: hushFonts.headline,
    fontSize: 21,
    color: hushColors.text,
  },
  instructions: {
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 280,
  },
  instructionText: {
    fontFamily: hushFonts.body,
    fontSize: 20,
    lineHeight: 28,
    color: hushColors.textMuted,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 18,
    marginBottom: 34,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    width: '47%',
    minHeight: 126,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 28,
    justifyContent: 'space-between',
  },
  statCardSoft: {
    backgroundColor: 'rgba(245, 243, 239, 0.82)',
  },
  statCardWarm: {
    backgroundColor: 'rgba(239, 238, 234, 0.94)',
  },
  statCardLight: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  statIcon: {
    marginBottom: 20,
  },
  statLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: hushColors.textSoft,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: hushFonts.display,
    fontSize: 31,
    color: hushColors.text,
  },
});
