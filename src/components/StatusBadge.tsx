import React from 'react';
import { Text, View } from 'react-native';
import { ScanStatus } from '../types/Medicine';
import { useTheme } from '../theme/ThemeProvider';

type StatusVariant = ScanStatus | 'Expiring Soon' | 'Low Confidence';

function getStatusColors(status: StatusVariant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'Verified':
      return { bg: colors.successSoft, fg: colors.success, label: 'Verified' };
    case 'Needs Verification':
      return { bg: colors.warningSoft, fg: colors.warning, label: 'Needs Verification' };
    case 'Expired':
      return { bg: colors.dangerSoft, fg: colors.danger, label: 'Expired' };
    case 'Expiring Soon':
      return { bg: colors.warningSoft, fg: colors.warning, label: 'Expiring Soon' };
    case 'Low Confidence':
      return { bg: colors.dangerSoft, fg: colors.danger, label: 'Low Confidence' };
    default:
      return { bg: colors.warningSoft, fg: colors.warning, label: status };
  }
}

export function StatusBadge({ status }: { status: StatusVariant }) {
  const theme = useTheme();
  const { colors, fonts, fontSizes, radius, spacing } = theme;
  const config = getStatusColors(status, colors);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: config.bg,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.pill,
      }}
    >
      <Text
        style={{
          color: config.fg,
          fontFamily: fonts.bodySemibold,
          fontSize: fontSizes.xs,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
