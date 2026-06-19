import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search…', onFilterPress }: SearchBarProps) {
  const { colors, fonts, fontSizes, radius, spacing, layout } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          minHeight: layout.hitTargetMin,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            fontFamily: fonts.body,
            fontSize: fontSizes.base,
            color: colors.text,
            paddingVertical: spacing.sm,
          }}
          accessibilityLabel={placeholder}
        />
      </View>
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter"
          onPress={onFilterPress}
          style={{
            width: layout.hitTargetMin,
            height: layout.hitTargetMin,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="options-outline" size={20} color={colors.brandDeep} />
        </Pressable>
      ) : null}
    </View>
  );
}
