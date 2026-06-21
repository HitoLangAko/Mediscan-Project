import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { colors, fonts, fontSizes, spacing, radius } = useTheme();

  return (
    <View
      style={{
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' }}>
        {message}
      </Text>
      {action}
    </View>
  );
}
