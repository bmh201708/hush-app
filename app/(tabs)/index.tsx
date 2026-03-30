import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlassCard, PrimaryButton, ScreenShell, SectionLabel, TextAction } from '@/components/hush/ui';
import { hushColors, hushFonts, hushMetrics, hushShadow } from '@/constants/hush-theme';
import { useBreathSession, useDeviceState, useRhythmConfig } from '@/hooks/use-hush';
import type { RhythmConfig, SessionPhase } from '@/types/hush';

type ActionIconName = 'play' | 'pause' | 'bluetooth';

type RhythmDraft = {
  inhale: string;
  hold: string;
  exhale: string;
  cycles: string;
};

export default function BreathScreen() {
  const { width } = useWindowDimensions();
  const { connectionState, connectedDevice, error: deviceError, clearError } = useDeviceState();
  const { session, start, pause, resume, stop, totalDurationMs } = useBreathSession();
  const { presets, rhythmConfig, saveRhythmConfig } = useRhythmConfig();

  const [isRhythmModalVisible, setRhythmModalVisible] = useState(false);
  const [draft, setDraft] = useState<RhythmDraft>(() => toDraft(rhythmConfig));
  const [draftError, setDraftError] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const haloPulse = useSharedValue(1);

  const isConnected = connectionState === 'connected';
  const sphereSize = useMemo(() => Math.min(width - 80, 280), [width]);

  const currentPhase = session.status === 'running' || session.status === 'paused' ? session.phase : 'inhale';
  const phaseMeta = getPhaseMeta(session.status, currentPhase, session.pauseReason, isConnected);
  const paceLabel = `${rhythmConfig.inhaleMs / 1000}-${rhythmConfig.holdMs / 1000}-${rhythmConfig.exhaleMs / 1000}`;
  const cycleLabel =
    session.status === 'running' || session.status === 'paused'
      ? `${session.cycleIndex}/${rhythmConfig.cycles}`
      : `${rhythmConfig.cycles} cycles`;
  const formattedDuration = formatDuration(totalDurationMs);

  useEffect(() => {
    haloPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [haloPulse]);

  useEffect(() => {
    if (session.status !== 'running') {
      scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
      return;
    }

    const nextScale =
      session.phase === 'inhale' ? 1.08 : session.phase === 'hold' ? 1.08 : 0.92;
    const duration =
      session.phase === 'inhale'
        ? rhythmConfig.inhaleMs
        : session.phase === 'hold'
          ? Math.max(rhythmConfig.holdMs, 600)
          : rhythmConfig.exhaleMs;

    scale.value = withTiming(nextScale, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
  }, [rhythmConfig.exhaleMs, rhythmConfig.holdMs, rhythmConfig.inhaleMs, scale, session.phase, session.status]);

  useEffect(() => {
    setDraft(toDraft(rhythmConfig));
  }, [rhythmConfig]);

  const animatedSphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloPulse.value }],
    opacity: 0.58,
  }));

  async function handlePrimaryAction() {
    clearError();

    if (session.status === 'running') {
      await pause('user_pause');
      return;
    }

    if (session.status === 'paused') {
      if (!isConnected) {
        router.navigate('/device');
        return;
      }

      await resume();
      return;
    }

    if (!isConnected) {
      router.navigate('/device');
      return;
    }

    await start();
  }

  function handleSecondaryAction() {
    clearError();

    if (session.status === 'idle' || session.status === 'completed') {
      setDraft(toDraft(rhythmConfig));
      setDraftError(null);
      setRhythmModalVisible(true);
      return;
    }

    void stop('user_stop');
  }

  async function handleSaveRhythm() {
    const parsed = parseDraft(draft);
    if (!parsed.ok) {
      setDraftError(parsed.error);
      return;
    }

    const result = await saveRhythmConfig(parsed.value);
    if (!result.ok) {
      setDraftError(result.error ?? 'Unable to save rhythm.');
      return;
    }

    setRhythmModalVisible(false);
    setDraftError(null);
  }

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
            <MaterialCommunityIcons
              color="rgba(75, 89, 34, 0.45)"
              name={phaseMeta.icon}
              size={32}
            />
            <Text style={styles.sphereTitle}>{phaseMeta.title}</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.metaLeft}>
          <Text style={styles.metaLabel}>Pace</Text>
          <Text style={styles.metaValue}>{paceLabel}</Text>
        </View>
        <View style={styles.metaRight}>
          <Text style={styles.metaLabel}>Duration</Text>
          <Text style={styles.metaValue}>{formattedDuration}</Text>
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{phaseMeta.prompt}</Text>
      </View>

      {deviceError ? (
        <GlassCard style={styles.noticeCard}>
          <Text style={styles.noticeText}>{deviceError}</Text>
        </GlassCard>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          icon={<Ionicons color={hushColors.white} name={phaseMeta.buttonIcon} size={18} />}
          label={phaseMeta.buttonLabel}
          onPress={() => {
            void handlePrimaryAction();
          }}
          disabled={connectionState === 'scanning' || connectionState === 'connecting'}
        />
        <TextAction
          icon={
            <Feather
              color={session.status === 'idle' || session.status === 'completed' ? hushColors.primaryDark : hushColors.error}
              name={session.status === 'idle' || session.status === 'completed' ? 'settings' : 'square'}
              size={14}
            />
          }
          label={session.status === 'idle' || session.status === 'completed' ? 'Adjust Rhythm' : 'End Session'}
          onPress={handleSecondaryAction}
        />
      </View>

      <View style={styles.statusStrip}>
        <Text style={styles.statusStripText}>
          Hardware {isConnected ? `linked to ${connectedDevice?.name ?? 'HUSH device'}` : 'not connected'}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardSoft]}>
          <View style={styles.statIcon}>
            <Feather color={hushColors.primaryDark} name={isConnected ? 'bluetooth' : 'slash'} size={18} />
          </View>
          <View>
            <Text style={styles.statLabel}>Device</Text>
            <Text style={styles.statValue}>{isConnected ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>
        <View style={[styles.statCard, styles.statCardWarm]}>
          <View style={styles.statIcon}>
            <Ionicons color={hushColors.amber} name="pulse" size={18} />
          </View>
          <View>
            <Text style={styles.statLabel}>Session</Text>
            <Text style={styles.statValue}>{phaseMeta.statusValue}</Text>
          </View>
        </View>
        <View style={[styles.statCard, styles.statCardLight]}>
          <View style={styles.statIcon}>
            <MaterialCommunityIcons color={hushColors.textMuted} name="clock-outline" size={18} />
          </View>
          <View>
            <Text style={styles.statLabel}>Program</Text>
            <Text style={styles.statValue}>{formattedDuration}</Text>
          </View>
        </View>
        <View style={[styles.statCard, styles.statCardSoft]}>
          <View style={styles.statIcon}>
            <MaterialCommunityIcons color={hushColors.primarySoftStrong} name="repeat" size={18} />
          </View>
          <View>
            <Text style={styles.statLabel}>Cycles</Text>
            <Text style={styles.statValue}>{cycleLabel}</Text>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isRhythmModalVisible}
        onRequestClose={() => setRhythmModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adjust rhythm</Text>
            <Text style={styles.modalCopy}>
              Set inhale, hold, exhale and total cycles. Saving also updates the hardware preview if a
              device is connected.
            </Text>

            <View style={styles.presetRow}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setDraft(toDraft(preset.config));
                    setDraftError(null);
                  }}
                  style={({ pressed }) => [styles.presetChip, pressed && styles.presetChipPressed]}>
                  <Text style={styles.presetChipLabel}>{preset.label}</Text>
                  <Text style={styles.presetChipMeta}>{preset.description}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formGrid}>
              <RhythmField
                label="Inhale"
                suffix="sec"
                value={draft.inhale}
                onChangeText={(value) => setDraft((current) => ({ ...current, inhale: value }))}
              />
              <RhythmField
                label="Hold"
                suffix="sec"
                value={draft.hold}
                onChangeText={(value) => setDraft((current) => ({ ...current, hold: value }))}
              />
              <RhythmField
                label="Exhale"
                suffix="sec"
                value={draft.exhale}
                onChangeText={(value) => setDraft((current) => ({ ...current, exhale: value }))}
              />
              <RhythmField
                label="Cycles"
                suffix="x"
                value={draft.cycles}
                onChangeText={(value) => setDraft((current) => ({ ...current, cycles: value }))}
              />
            </View>

            {draftError ? <Text style={styles.modalError}>{draftError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setRhythmModalVisible(false)} style={styles.secondaryModalButton}>
                <Text style={styles.secondaryModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void handleSaveRhythm()} style={styles.primaryModalButton}>
                <Text style={styles.primaryModalButtonText}>Save rhythm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function RhythmField({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix: string;
}) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          keyboardType="number-pad"
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={hushColors.textSoft}
          style={styles.fieldInput}
          value={value}
        />
        <Text style={styles.fieldSuffix}>{suffix}</Text>
      </View>
    </View>
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
    marginBottom: 16,
    maxWidth: 300,
  },
  instructionText: {
    fontFamily: hushFonts.body,
    fontSize: 18,
    lineHeight: 26,
    color: hushColors.textMuted,
    textAlign: 'center',
  },
  noticeCard: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 218, 214, 0.72)',
  },
  noticeText: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.error,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  statusStrip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.74)',
    marginBottom: 28,
  },
  statusStripText: {
    fontFamily: hushFonts.medium,
    fontSize: 12,
    color: hushColors.textMuted,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 28, 26, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: hushMetrics.screenPadding,
  },
  modalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 18,
  },
  modalTitle: {
    fontFamily: hushFonts.title,
    fontSize: 26,
    color: hushColors.text,
  },
  modalCopy: {
    fontFamily: hushFonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: hushColors.textMuted,
  },
  presetRow: {
    gap: 10,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: hushColors.surfaceLow,
  },
  presetChipPressed: {
    opacity: 0.82,
  },
  presetChipLabel: {
    fontFamily: hushFonts.headline,
    fontSize: 15,
    color: hushColors.text,
    marginBottom: 2,
  },
  presetChipMeta: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textMuted,
  },
  formGrid: {
    gap: 12,
  },
  fieldCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: hushColors.surfaceLow,
    gap: 10,
  },
  fieldLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInput: {
    flex: 1,
    fontFamily: hushFonts.title,
    fontSize: 28,
    color: hushColors.text,
    paddingVertical: 0,
  },
  fieldSuffix: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.textMuted,
  },
  modalError: {
    fontFamily: hushFonts.medium,
    fontSize: 13,
    color: hushColors.error,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryModalButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(208, 196, 187, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryModalButtonText: {
    fontFamily: hushFonts.semibold,
    fontSize: 13,
    color: hushColors.textMuted,
  },
  primaryModalButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: hushColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryModalButtonText: {
    fontFamily: hushFonts.semibold,
    fontSize: 13,
    color: hushColors.white,
  },
});

function getPhaseMeta(
  status: 'idle' | 'running' | 'paused' | 'completed',
  phase: SessionPhase,
  pauseReason: string | null,
  isConnected: boolean
) {
  if (status === 'running') {
    if (phase === 'inhale') {
      return {
        title: 'Inhale',
        prompt: 'Breathe in as the sphere expands and your device mirrors the rhythm.',
        icon: 'weather-windy' as const,
        buttonLabel: 'Pause Session',
        buttonIcon: 'pause' as ActionIconName,
        statusValue: 'Running',
      };
    }

    if (phase === 'hold') {
      return {
        title: 'Hold',
        prompt: 'Stay soft through the hold. The wearable keeps the same cadence on your chest.',
        icon: 'pause-circle-outline' as const,
        buttonLabel: 'Pause Session',
        buttonIcon: 'pause' as ActionIconName,
        statusValue: 'Running',
      };
    }

    return {
      title: 'Exhale',
      prompt: 'Exhale slowly and let the hardware fade with the ball.',
      icon: 'weather-windy-variant' as const,
      buttonLabel: 'Pause Session',
      buttonIcon: 'pause' as ActionIconName,
      statusValue: 'Running',
    };
  }

  if (status === 'paused') {
    return {
      title: 'Paused',
      prompt: pauseReason === 'device_disconnected'
        ? 'Session paused because the device disconnected. Reconnect on the Device tab to resume.'
        : 'Session paused. Resume whenever you are ready.',
      icon: 'pause-circle' as const,
      buttonLabel: isConnected ? 'Resume Session' : 'Connect Device',
      buttonIcon: (isConnected ? 'play' : 'bluetooth') as ActionIconName,
      statusValue: 'Paused',
    };
  }

  if (status === 'completed') {
    return {
      title: 'Complete',
      prompt: 'Your breathing cycle is complete. Notice the shift before beginning another round.',
      icon: 'check-circle-outline' as const,
      buttonLabel: isConnected ? 'Start Session' : 'Connect Device',
      buttonIcon: (isConnected ? 'play' : 'bluetooth') as ActionIconName,
      statusValue: 'Complete',
    };
  }

  return {
    title: 'Ready',
    prompt: isConnected
      ? 'Start a guided breathing session and the hardware will vibrate in the same rhythm.'
      : 'Connect your HUSH device first, then start the session to sync animation, telemetry and vibration.',
    icon: 'weather-windy' as const,
    buttonLabel: isConnected ? 'Start Session' : 'Connect Device',
    buttonIcon: (isConnected ? 'play' : 'bluetooth') as ActionIconName,
    statusValue: 'Ready',
  };
}

function toDraft(config: RhythmConfig): RhythmDraft {
  return {
    inhale: `${config.inhaleMs / 1000}`,
    hold: `${config.holdMs / 1000}`,
    exhale: `${config.exhaleMs / 1000}`,
    cycles: `${config.cycles}`,
  };
}

function parseDraft(draft: RhythmDraft) {
  const inhale = Number(draft.inhale);
  const hold = Number(draft.hold);
  const exhale = Number(draft.exhale);
  const cycles = Number(draft.cycles);

  if ([inhale, hold, exhale, cycles].some((value) => Number.isNaN(value))) {
    return { ok: false as const, error: 'Use whole numbers for all rhythm fields.' };
  }

  return {
    ok: true as const,
    value: {
      inhaleMs: inhale * 1000,
      holdMs: hold * 1000,
      exhaleMs: exhale * 1000,
      cycles,
    },
  };
}

function formatDuration(totalMs: number) {
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, '0');
  return `${minutes}:${seconds}`;
}
