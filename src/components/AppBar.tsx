import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { BrandMark } from './BrandMark';

type AppBarProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  showMenu?: boolean;
  onMenuPress?: () => void;
  showLogo?: boolean;
};

export function isAppBarElement(child: ReactNode): child is React.ReactElement<AppBarProps> {
  if (!React.isValidElement(child)) return false;
  if (child.type === AppBar) return true;
  const type = child.type as { displayName?: string };
  return type.displayName === 'MediScanAppBar';
}

export function AppBar({
  title,
  subtitle,
  showBack,
  onBack,
  rightAction,
  showMenu,
  onMenuPress,
  showLogo,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, fonts, fontSizes, spacing, layout } = useTheme();

  return (
    <View
      style={{
        alignSelf: 'stretch',
        width: '100%',
        minHeight: layout.headerHeight + insets.top,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm }}>
        {showBack && onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={8}
            style={{ minWidth: layout.hitTargetMin, minHeight: layout.hitTargetMin, justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.brandDeep} />
          </Pressable>
        ) : showMenu && onMenuPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={onMenuPress}
            hitSlop={8}
            style={{ minWidth: layout.hitTargetMin, minHeight: layout.hitTargetMin, justifyContent: 'center' }}
          >
            <Ionicons name="menu" size={24} color={colors.brandDeep} />
          </Pressable>
        ) : null}

        {showLogo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <BrandMark size={40} accessibilityLabel="Mediscan logo" />
            <View>
              <Text style={{ fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.brandDeep }}>
                Mediscan
              </Text>
              {subtitle ? (
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : title ? (
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {rightAction ?? null}
    </View>
  );
}

AppBar.displayName = 'MediScanAppBar';
