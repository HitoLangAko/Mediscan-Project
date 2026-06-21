import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type StatCardProps = {
  label: string;
  value: number | string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: ReactNode;
  compact?: boolean;
};

export function StatCard({ label, value, tone = 'brand', icon, iconNode, compact = false }: StatCardProps) {
  const { colors, fonts, fontSizes, radius, spacing, elevation } = useTheme();

  const toneColors = {
    brand: colors.brand,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  };

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: compact ? spacing.xs : spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          minWidth: 72,
          alignItems: compact ? 'center' : undefined,
        },
        elevation.sm,
      ]}
    >
      {iconNode ? (
        <View style={{ marginBottom: spacing.xs }}>{iconNode}</View>
      ) : icon ? (
        <Ionicons
          name={icon}
          size={compact ? 16 : 18}
          color={toneColors[tone]}
          style={{ marginBottom: spacing.xs }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: compact ? fontSizes.lg : fontSizes.xl,
          color: toneColors[tone],
        }}
      >
        {value}
      </Text>
      <Text
        numberOfLines={compact ? 2 : undefined}
        style={{
          fontFamily: fonts.body,
          fontSize: fontSizes.xs,
          color: colors.textMuted,
          marginTop: 2,
          textAlign: compact ? 'center' : undefined,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
