import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type FeatureTileProps = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: ReactNode;
  onPress?: () => void;
  trailing?: ReactNode;
};

export function FeatureTile({ title, description, icon, iconNode, onPress, trailing }: FeatureTileProps) {
  const { colors, fonts, fontSizes, radius, spacing, elevation } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.92 : 1,
        },
        elevation.sm,
      ]}
    >
      {iconNode || icon ? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconNode ?? <Ionicons name={icon!} size={24} color={colors.brandDeep} />}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.md, color: colors.text }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
          {description}
        </Text>
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}
