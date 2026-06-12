
import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }, style]}>
      {children}
    </View>
  );
}
