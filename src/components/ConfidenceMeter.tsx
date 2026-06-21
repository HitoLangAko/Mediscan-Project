import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ConfidenceMeterProps = {
  score: number;
  label?: string;
};

export function ConfidenceMeter({ score, label = 'Confidence' }: ConfidenceMeterProps) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const clamped = Math.max(0, Math.min(100, score));

  const barColor =
    clamped >= 85 ? colors.success : clamped >= 40 ? colors.warning : colors.danger;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textMuted }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: barColor }}>
          {clamped}%
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}
