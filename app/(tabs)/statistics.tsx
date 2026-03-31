import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { GlassCard, IconBubble, ListRow, ScreenShell, SectionLabel } from '@/components/hush/ui';
import { hushColors, hushFonts, hushMetrics } from '@/constants/hush-theme';
import { useDeviceState } from '@/hooks/use-hush';
import type { TelemetrySample } from '@/types/hush';

type InsightMode = 'week' | 'instant';

type ChartState = {
  path: string;
  labels: string[];
  metricValue: string;
  metricLabel: string;
  subtitle: string;
  emptyLabel: string;
};

const WEEK_CHART_PATH =
  'M 8 106 C 32 106, 42 100, 60 88 C 76 76, 92 66, 114 70 C 136 74, 148 96, 166 102 C 182 108, 198 96, 214 78 C 228 62, 246 46, 270 44 C 286 44, 298 58, 308 74';
const WEEK_PATH_LENGTH = 420;

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const AnimatedPath = Animated.createAnimatedComponent(Path);

const sessions = [
  {
    title: 'Mindful Morning',
    subtitle: 'Today • 08:30 AM',
    duration: '15 min',
    mode: 'Resonant',
    tone: 'green' as const,
    icon: 'weather-windy',
  },
  {
    title: 'Deep Sleep Prep',
    subtitle: 'Yesterday • 10:15 PM',
    duration: '20 min',
    mode: 'Delta',
    tone: 'sand' as const,
    icon: 'meditation',
  },
];

export default function StatisticsScreen() {
  const [insightMode, setInsightMode] = useState<InsightMode>('week');
  const { telemetryPreview } = useDeviceState();
  const isFocused = useIsFocused();
  const weekStrokeOffset = useRef(new Animated.Value(WEEK_PATH_LENGTH)).current;

  const instantChart = useMemo(() => buildInstantChart(telemetryPreview), [telemetryPreview]);
  const chart = insightMode === 'week' ? getWeeklyChart() : instantChart;

  useEffect(() => {
    if (!isFocused || insightMode !== 'week') {
      return;
    }

    weekStrokeOffset.setValue(WEEK_PATH_LENGTH);
    Animated.timing(weekStrokeOffset, {
      toValue: 0,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [insightMode, isFocused, weekStrokeOffset]);

  return (
    <ScreenShell>
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <SectionLabel>{insightMode === 'week' ? 'Weekly Insights' : 'Live Insights'}</SectionLabel>
          <Text style={styles.heroTitle}>Your Rhythm.</Text>
        </View>
        <View style={styles.segment}>
          <SegmentButton
            active={insightMode === 'week'}
            label="Week"
            onPress={() => setInsightMode('week')}
          />
          <SegmentButton
            active={insightMode === 'instant'}
            label="Instant"
            onPress={() => setInsightMode('instant')}
          />
        </View>
      </View>

      <View style={styles.grid}>
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderCopy}>
              <Text style={styles.cardTitle}>Breathing Consistency</Text>
              <Text style={styles.cardSubtitle}>{chart.subtitle}</Text>
            </View>
            <View style={styles.chartMetric}>
              <Text style={styles.chartMetricValue}>{chart.metricValue}</Text>
              <Text style={styles.chartMetricLabel}>{chart.metricLabel}</Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <Svg height={124} width="100%" viewBox="0 0 320 124">
              <Defs>
                <LinearGradient id="weekCurveGradient" x1="8" x2="308" y1="0" y2="0">
                  <Stop offset="0%" stopColor={hushColors.primaryDark} stopOpacity="1" />
                  <Stop offset="55%" stopColor={hushColors.primaryDark} stopOpacity="0.7" />
                  <Stop offset="100%" stopColor={hushColors.primaryDark} stopOpacity="0.28" />
                </LinearGradient>
              </Defs>
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="18" y2="18" />
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="62" y2="62" />
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="106" y2="106" />
              {chart.path ? (
                insightMode === 'week' ? (
                  <AnimatedPath
                    d={chart.path}
                    fill="none"
                    stroke="url(#weekCurveGradient)"
                    strokeDasharray={WEEK_PATH_LENGTH}
                    strokeDashoffset={weekStrokeOffset}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                  />
                ) : (
                  <Path
                    d={chart.path}
                    fill="none"
                    stroke={hushColors.primaryDark}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                  />
                )
              ) : (
                <Line stroke={hushColors.surfaceVariant} strokeDasharray="6 8" x1="8" x2="308" y1="62" y2="62" />
              )}
            </Svg>
            {!chart.path ? <Text style={styles.chartEmpty}>{chart.emptyLabel}</Text> : null}
            <View style={styles.weekdays}>
              {chart.labels.map((label) => (
                <Text key={label} style={styles.weekday}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </GlassCard>

        <View style={styles.sideColumn}>
          <View style={styles.scoreCard}>
            <View style={styles.scoreRing}>
              <Svg height={150} width={150} viewBox="0 0 150 150">
                <Circle
                  cx="75"
                  cy="75"
                  fill="transparent"
                  r="58"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="8"
                />
                <Circle
                  cx="75"
                  cy="75"
                  fill="transparent"
                  r="58"
                  stroke={hushColors.primarySoft}
                  strokeDasharray="364"
                  strokeDashoffset="72"
                  strokeLinecap="round"
                  strokeWidth="8"
                  transform="rotate(-90 75 75)"
                />
              </Svg>
              <View style={styles.scoreCenter}>
                <Text style={styles.scoreValue}>82</Text>
                <Text style={styles.scoreLabel}>Zen Score</Text>
              </View>
            </View>

            <View style={styles.scoreCopy}>
              <Text style={styles.scoreTitle}>Deep Clarity</Text>
              <Text style={styles.scoreDescription}>
                Your focus is 12% higher than last week. Maintain the pace.
              </Text>
            </View>
          </View>

          <GlassCard style={styles.metricCard}>
            <IconBubble tone="sand">
              <MaterialCommunityIcons color={hushColors.primaryDark} name="timer-outline" size={20} />
            </IconBubble>
            <View>
              <Text style={styles.metricValue}>320m</Text>
              <Text style={styles.metricLabel}>Meditation Time</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <IconBubble tone="amber">
              <Ionicons color={hushColors.amber} name="flash" size={18} />
            </IconBubble>
            <View>
              <Text style={styles.metricValue}>14 Day</Text>
              <Text style={styles.metricLabel}>Active Streak</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <IconBubble tone="soft">
              <Ionicons color={hushColors.text} name="heart" size={18} />
            </IconBubble>
            <View>
              <Text style={styles.metricValue}>58 bpm</Text>
              <Text style={styles.metricLabel}>Resting Heart</Text>
            </View>
          </GlassCard>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          <Text style={styles.linkText}>View All</Text>
        </View>

        <View style={styles.list}>
          {sessions.map((session) => (
            <ListRow
              icon={
                <IconBubble tone={session.tone}>
                  <MaterialCommunityIcons
                    color={hushColors.primaryDark}
                    name={session.icon as 'weather-windy' | 'meditation'}
                    size={18}
                  />
                </IconBubble>
              }
              key={session.title}
              soft
              subtitle={session.subtitle}
              title={session.title}
              trailing={
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionDuration}>{session.duration}</Text>
                  <Text style={styles.sessionMode}>{session.mode}</Text>
                </View>
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.quoteBlock}>
        <Text style={styles.quote}>
          &ldquo;Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.&rdquo;
        </Text>
        <Text style={styles.quoteAuthor}>Thich Nhat Hanh</Text>
      </View>
    </ScreenShell>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentActive,
        pressed && styles.segmentPressed,
      ]}>
      <Text style={active ? styles.segmentActiveText : styles.segmentText}>{label}</Text>
    </Pressable>
  );
}

function getWeeklyChart(): ChartState {
  return {
    path: WEEK_CHART_PATH,
    labels: WEEK_LABELS,
    metricValue: '6.4',
    metricLabel: 'BPM AVG',
    subtitle: 'Daily average breaths per minute',
    emptyLabel: '',
  };
}

function buildInstantChart(samples: TelemetrySample[]): ChartState {
  const recentSamples = samples.slice(-72);
  if (recentSamples.length < 2) {
    return {
      path: '',
      labels: ['-18s', '-12s', '-6s', 'Now'],
      metricValue: `${recentSamples.length}`,
      metricLabel: 'LIVE SAMPLES',
      subtitle: 'Real-time chest motion inferred from the latest 9-axis telemetry',
      emptyLabel: 'Awaiting live telemetry from the hardware',
    };
  }

  const rawSignal = recentSamples.map((sample) => {
    const accelMagnitude = magnitude(sample.accel.x, sample.accel.y, sample.accel.z);
    const gyroMagnitude = magnitude(sample.gyro.x, sample.gyro.y, sample.gyro.z);
    const magMagnitude = magnitude(sample.mag.x, sample.mag.y, sample.mag.z);

    return accelMagnitude + gyroMagnitude * 0.025 + magMagnitude * 0.002;
  });

  const smoothed = rawSignal.map((_, index) => {
    const window = rawSignal.slice(Math.max(0, index - 2), index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });

  const minValue = Math.min(...smoothed);
  const maxValue = Math.max(...smoothed);
  const span = Math.max(maxValue - minValue, 0.0001);

  const points = smoothed.map((value, index) => {
    const normalized = (value - minValue) / span;
    const x = 8 + (index / Math.max(smoothed.length - 1, 1)) * 300;
    const y = 106 - normalized * 70;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  const firstTimestamp = recentSamples[0]?.deviceTimestampMs ?? 0;
  const lastTimestamp = recentSamples[recentSamples.length - 1]?.deviceTimestampMs ?? firstTimestamp;
  const windowSec = Math.max(1, Math.round((lastTimestamp - firstTimestamp) / 1000));

  return {
    path: points.join(' '),
    labels: buildInstantLabels(windowSec),
    metricValue: `${recentSamples.length}`,
    metricLabel: 'LIVE SAMPLES',
    subtitle: 'Real-time chest motion inferred from the latest 9-axis telemetry',
    emptyLabel: '',
  };
}

function buildInstantLabels(windowSec: number) {
  return [
    `-${windowSec}s`,
    `-${Math.max(1, Math.round(windowSec * 0.66))}s`,
    `-${Math.max(1, Math.round(windowSec * 0.33))}s`,
    'Now',
  ];
}

function magnitude(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

const styles = StyleSheet.create({
  heroRow: {
    marginTop: 6,
    marginBottom: 18,
    gap: 18,
  },
  heroText: {
    gap: 8,
  },
  heroTitle: {
    fontFamily: hushFonts.display,
    fontSize: 47,
    lineHeight: 52,
    color: hushColors.text,
  },
  segment: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: hushMetrics.pillRadius,
    backgroundColor: hushColors.surfaceLow,
    gap: 4,
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: hushMetrics.pillRadius,
  },
  segmentActive: {
    backgroundColor: hushColors.surface,
  },
  segmentPressed: {
    opacity: 0.72,
  },
  segmentActiveText: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.text,
  },
  segmentText: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.textMuted,
  },
  grid: {
    gap: 18,
  },
  chartCard: {
    padding: 24,
    gap: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
  },
  chartHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 25,
    color: hushColors.text,
    marginBottom: 6,
    flexShrink: 1,
  },
  cardSubtitle: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textMuted,
    flexShrink: 1,
  },
  chartMetric: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
    maxWidth: 94,
  },
  chartMetricValue: {
    fontFamily: hushFonts.title,
    color: hushColors.primaryDark,
    fontSize: 24,
    lineHeight: 28,
  },
  chartMetricLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 9,
    color: hushColors.textSoft,
    letterSpacing: 1.1,
    textAlign: 'right',
  },
  chartWrap: {
    gap: 14,
  },
  chartEmpty: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textSoft,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  sideColumn: {
    gap: 16,
  },
  scoreCard: {
    backgroundColor: hushColors.primaryDark,
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    gap: 18,
  },
  scoreRing: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontFamily: hushFonts.title,
    fontSize: 42,
    color: hushColors.white,
  },
  scoreLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  scoreCopy: {
    gap: 8,
    alignItems: 'center',
  },
  scoreTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 24,
    color: hushColors.white,
  },
  scoreDescription: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  metricCard: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metricValue: {
    fontFamily: hushFonts.title,
    fontSize: 26,
    color: hushColors.text,
  },
  metricLabel: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    color: hushColors.textMuted,
  },
  section: {
    marginTop: 8,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 24,
    color: hushColors.text,
  },
  linkText: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  list: {
    gap: 12,
  },
  sessionMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  sessionDuration: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    color: hushColors.text,
  },
  sessionMode: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textSoft,
  },
  quoteBlock: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 32,
    gap: 8,
  },
  quote: {
    fontFamily: hushFonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: hushColors.text,
  },
  quoteAuthor: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: hushColors.textSoft,
  },
});
