import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { hushColors, hushFonts, hushMetrics, hushShadow } from '@/constants/hush-theme';

type ScreenShellProps = PropsWithChildren<{
  contentContainerStyle?: object;
}>;

type GlassCardProps = PropsWithChildren<{
  style?: object;
}>;

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

type TextActionProps = {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

type ToggleSwitchProps = {
  enabled: boolean;
  onToggle?: (enabled: boolean) => void;
  disabled?: boolean;
};

type ListRowProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  soft?: boolean;
};

const TAB_CONFIG: Record<
  string,
  { label: string; icon: (active: boolean) => ReactNode; route: '/' | '/statistics' | '/device' | '/profile' }
> = {
  index: {
    label: 'Breath',
    route: '/',
    icon: (active) => (
      <MaterialCommunityIcons
        name="weather-windy"
        size={20}
        color={active ? hushColors.primaryDark : hushColors.textMuted}
      />
    ),
  },
  statistics: {
    label: 'Trends',
    route: '/statistics',
    icon: (active) => (
      <Ionicons
        name={active ? 'bar-chart' : 'bar-chart-outline'}
        size={19}
        color={active ? hushColors.primaryDark : hushColors.textMuted}
      />
    ),
  },
  device: {
    label: 'Device',
    route: '/device',
    icon: (active) => (
      <Feather
        name="hexagon"
        size={18}
        color={active ? hushColors.primaryDark : hushColors.textMuted}
      />
    ),
  },
  profile: {
    label: 'Zen',
    route: '/profile',
    icon: (active) => (
      <MaterialCommunityIcons
        name="meditation"
        size={20}
        color={active ? hushColors.primaryDark : hushColors.textMuted}
      />
    ),
  },
};

export function ScreenShell({ children, contentContainerStyle }: ScreenShellProps) {
  return (
    <View style={styles.screen}>
      <AmbientBackdrop />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <TopBar />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function GlassCard({ children, style }: GlassCardProps) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function PrimaryButton({
  icon,
  label,
  onPress,
  disabled,
  variant = 'default',
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        variant === 'danger' && styles.primaryButtonDanger,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.primaryButtonIcon}>{icon}</View>
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function TextAction({ icon, label, onPress, disabled }: TextActionProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textAction, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      {icon}
      <Text style={[styles.textActionLabel, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function ToggleSwitch({ enabled, onToggle, disabled }: ToggleSwitchProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onToggle?.(!enabled)}
      style={({ pressed }) => [
        styles.toggleTrack,
        enabled ? styles.toggleTrackActive : styles.toggleTrackIdle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={[styles.toggleThumb, enabled ? styles.toggleThumbActive : null]} />
    </Pressable>
  );
}

export function ListRow({ icon, title, subtitle, trailing, soft }: ListRowProps) {
  return (
    <View style={[styles.listRow, soft ? styles.listRowSoft : styles.listRowSolid]}>
      <View style={styles.listRowLead}>
        <View style={styles.listRowIcon}>{icon}</View>
        <View style={styles.listRowText}>
          <Text style={styles.listRowTitle}>{title}</Text>
          <Text style={styles.listRowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {trailing}
    </View>
  );
}

export function IconBubble({
  children,
  tone = 'soft',
}: PropsWithChildren<{ tone?: 'soft' | 'green' | 'amber' | 'sand' }>) {
  const bubbleStyle =
    tone === 'green'
      ? styles.iconBubbleGreen
      : tone === 'amber'
        ? styles.iconBubbleAmber
        : tone === 'sand'
          ? styles.iconBubbleSand
          : styles.iconBubbleSoft;

  return <View style={[styles.iconBubble, bubbleStyle]}>{children}</View>;
}

export function HushTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const outerWidth = Math.min(width - 28, 372);

  return (
    <View pointerEvents="box-none" style={styles.tabBarLayer}>
      <View style={[styles.tabBarWrap, { width: outerWidth, bottom: insets.bottom + hushMetrics.tabBarInset }]}>
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) {
            return null;
          }

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              router.navigate(config.route);
            }
          };

          const accessibilityLabel = descriptors[route.key].options.tabBarAccessibilityLabel;

          return (
            <Pressable
              accessibilityLabel={accessibilityLabel}
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && styles.tabItemActive,
                pressed && styles.pressed,
              ]}>
              {config.icon(isFocused)}
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{config.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TopBar() {
  return (
    <View style={styles.topBar}>
      <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <Feather color={hushColors.primaryDark} name="menu" size={18} />
      </Pressable>
      <Text style={styles.brand}>HUSH</Text>
      <AvatarBadge />
    </View>
  );
}

function AvatarBadge() {
  return (
    <LinearGradient
      colors={['#553726', '#D9B78A', '#FFF2DE']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.avatar}>
      <View style={styles.avatarInner}>
        <Text style={styles.avatarText}>E</Text>
      </View>
    </LinearGradient>
  );
}

function AmbientBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(217,234,163,0.34)', 'rgba(217,234,163,0.03)', 'rgba(217,234,163,0)']}
        end={{ x: 0.9, y: 0.8 }}
        start={{ x: 0.1, y: 0 }}
        style={styles.backdropGlowTop}
      />
      <LinearGradient
        colors={['rgba(245,188,0,0.2)', 'rgba(245,188,0,0.04)', 'rgba(245,188,0,0)']}
        end={{ x: 0.9, y: 0.9 }}
        start={{ x: 0.2, y: 0 }}
        style={styles.backdropGlowBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: hushColors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: hushMetrics.screenPadding,
    paddingTop: 10,
    paddingBottom: hushMetrics.bottomSpacing,
  },
  topBar: {
    height: hushMetrics.topBarHeight,
    paddingHorizontal: hushMetrics.screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(208, 196, 187, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251, 249, 245, 0.84)',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: hushFonts.title,
    letterSpacing: 4.6,
    color: hushColors.primaryDark,
    fontSize: 18,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    padding: 1.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  avatarText: {
    fontFamily: hushFonts.semibold,
    color: hushColors.white,
    fontSize: 13,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: hushMetrics.cardRadius,
    ...hushShadow.soft,
  },
  sectionLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 3,
    color: hushColors.textSoft,
    textTransform: 'uppercase',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 18,
    paddingHorizontal: 26,
    borderRadius: hushMetrics.pillRadius,
    backgroundColor: hushColors.primaryDark,
    minWidth: 172,
    ...hushShadow.ambient,
  },
  primaryButtonDanger: {
    backgroundColor: '#A64535',
  },
  primaryButtonIcon: {
    marginRight: 10,
  },
  primaryButtonLabel: {
    fontFamily: hushFonts.headline,
    color: hushColors.white,
    fontSize: 17,
  },
  primaryButtonDisabled: {
    backgroundColor: hushColors.secondary,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textActionLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 13,
    color: hushColors.primaryDark,
  },
  disabled: {
    opacity: 0.55,
  },
  disabledText: {
    color: hushColors.textSoft,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: hushColors.primaryDark,
  },
  toggleTrackIdle: {
    backgroundColor: hushColors.surfaceVariant,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: hushColors.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  listRow: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listRowSoft: {
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
  },
  listRowSolid: {
    backgroundColor: hushColors.surfaceLow,
  },
  listRowLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  listRowIcon: {
    marginRight: 14,
  },
  listRowText: {
    flex: 1,
  },
  listRowTitle: {
    fontFamily: hushFonts.headline,
    fontSize: 17,
    color: hushColors.text,
    marginBottom: 4,
  },
  listRowSubtitle: {
    fontFamily: hushFonts.body,
    fontSize: 12,
    color: hushColors.textMuted,
    lineHeight: 18,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleSoft: {
    backgroundColor: hushColors.surfaceMid,
  },
  iconBubbleGreen: {
    backgroundColor: 'rgba(191, 208, 139, 0.45)',
  },
  iconBubbleAmber: {
    backgroundColor: 'rgba(255, 223, 160, 0.8)',
  },
  iconBubbleSand: {
    backgroundColor: 'rgba(239, 224, 205, 0.88)',
  },
  tabBarLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabBarWrap: {
    position: 'absolute',
    minHeight: hushMetrics.tabBarHeight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...hushShadow.ambient,
  },
  tabItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: 'rgba(217, 234, 163, 0.9)',
  },
  tabLabel: {
    fontFamily: hushFonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: hushColors.textMuted,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: hushColors.primaryDark,
  },
  backdropGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: 90,
    left: -120,
  },
  backdropGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -90,
    bottom: 140,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
