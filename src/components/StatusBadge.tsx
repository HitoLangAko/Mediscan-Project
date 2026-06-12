
import React from 'react';
import { Text, View } from 'react-native';
import { ScanStatus } from '../types/Medicine';
import { colors, radius, spacing } from '../theme';

export function StatusBadge({ status }: { status: ScanStatus }) {
  const bg = status === 'Verified' ? colors.greenSoft : status === 'Expired' ? colors.redSoft : colors.orangeSoft;
  const fg = status === 'Verified' ? colors.green : status === 'Expired' ? colors.red : colors.orange;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill }}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 12 }}>{status}</Text>
    </View>
  );
}
