import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { GlassCard, IconBubble, ListRow, ScreenShell, SectionLabel } from '@/components/hush/ui';
import { hushColors, hushFonts, hushMetrics } from '@/constants/hush-theme';

const chartPath =
  'M 8 106 C 32 106, 42 100, 60 88 C 76 76, 92 66, 114 70 C 136 74, 148 96, 166 102 C 182 108, 198 96, 214 78 C 228 62, 246 46, 270 44 C 286 44, 298 58, 308 74';

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
  return (
    <ScreenShell>
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <SectionLabel>Weekly Insights</SectionLabel>
          <Text style={styles.heroTitle}>Your Rhythm.</Text>
        </View>
        <View style={styles.segment}>
          <View style={styles.segmentActive}>
            <Text style={styles.segmentActiveText}>Week</Text>
          </View>
          <Text style={styles.segmentText}>Month</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardTitle}>Breathing Consistency</Text>
              <Text style={styles.cardSubtitle}>Daily average breaths per minute</Text>
            </View>
            <View style={styles.chartMetric}>
              <Text style={styles.chartMetricValue}>6.4</Text>
              <Text style={styles.chartMetricLabel}>BPM AVG</Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <Svg height={124} width="100%" viewBox="0 0 320 124">
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="18" y2="18" />
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="62" y2="62" />
              <Line stroke={hushColors.surfaceVariant} strokeDasharray="4 5" x1="0" x2="320" y1="106" y2="106" />
              <Path
                d={chartPath}
                fill="none"
                stroke={hushColors.primaryDark}
                strokeLinecap="round"
                strokeWidth={4}
              />
            </Svg>
            <View style={styles.weekdays}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
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
  segmentActive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: hushMetrics.pillRadius,
    backgroundColor: hushColors.surface,
  },
  segmentActiveText: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.text,
  },
  segmentText: {
    paddingHorizontal: 16,
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
    gap: 18,
  },
  cardTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 25,
    color: hushColors.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textMuted,
  },
  chartMetric: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  chartMetricValue: {
    fontFamily: hushFonts.title,
    color: hushColors.primaryDark,
    fontSize: 28,
  },
  chartMetricLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    color: hushColors.textSoft,
    letterSpacing: 1.5,
  },
  chartWrap: {
    gap: 14,
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
    fontSize: 34,
    color: hushColors.white,
  },
  scoreLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.74)',
    textTransform: 'uppercase',
  },
  scoreCopy: {
    alignItems: 'center',
    gap: 8,
  },
  scoreTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 22,
    color: hushColors.white,
  },
  scoreDescription: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(217, 234, 163, 0.72)',
    textAlign: 'center',
  },
  metricCard: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricValue: {
    fontFamily: hushFonts.title,
    fontSize: 26,
    color: hushColors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  section: {
    marginTop: 18,
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
  linkText: {
    fontFamily: hushFonts.semibold,
    fontSize: 12,
    color: hushColors.textSoft,
  },
  list: {
    gap: 12,
  },
  sessionMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessionDuration: {
    fontFamily: hushFonts.medium,
    fontSize: 14,
    color: hushColors.text,
  },
  sessionMode: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: hushColors.amber,
    textTransform: 'uppercase',
  },
  quoteBlock: {
    marginTop: 12,
    paddingTop: 30,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(208, 196, 187, 0.65)',
  },
  quote: {
    fontFamily: hushFonts.display,
    fontSize: 30,
    lineHeight: 42,
    color: hushColors.textMuted,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: hushColors.primaryDark,
    textTransform: 'uppercase',
  },
});
