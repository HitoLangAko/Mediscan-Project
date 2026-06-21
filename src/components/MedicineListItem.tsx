import React from 'react';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PillIcon } from './PillIcon';
import { StatusBadge } from './StatusBadge';
import { ScanStatus } from '../types/Medicine';
import { useTheme } from '../theme/ThemeProvider';

type MedicineListItemProps = {
  name: string;
  subtitle?: string;
  meta?: string;
  status: ScanStatus | 'Expiring Soon';
  imageUri?: string | number;
  onPress?: () => void;
  onMenuPress?: () => void;
};

export function MedicineListItem({
  name,
  subtitle,
  meta,
  status,
  imageUri,
  onPress,
  onMenuPress,
}: MedicineListItemProps) {
  const { colors, fonts, fontSizes, radius, spacing, elevation } = useTheme();

  const imageSource: ImageSourcePropType | undefined =
    imageUri !== undefined
      ? typeof imageUri === 'number'
        ? imageUri
        : { uri: imageUri }
      : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.sm,
          flexDirection: 'row',
          gap: spacing.md,
          opacity: pressed ? 0.95 : 1,
        },
        elevation.sm,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.md,
          backgroundColor: colors.brandLight,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imageSource ? (
          <Image source={imageSource} style={{ width: 56, height: 56 }} resizeMode="cover" />
        ) : (
          <PillIcon size={26} color={colors.brandDeep} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text
            style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}
            numberOfLines={2}
          >
            {name}
          </Text>
          <StatusBadge status={status} />
        </View>
        {subtitle ? (
          <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 4 }}>
            {meta}
          </Text>
        ) : null}
      </View>

      {onMenuPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={onMenuPress} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
