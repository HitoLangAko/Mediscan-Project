import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type FilterChip = {
  id: string;
  label: string;
};

type FilterChipsProps = {
  chips: FilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function FilterChips({ chips, selectedId, onSelect }: FilterChipsProps) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
    >
      {chips.map((chip) => {
        const active = chip.id === selectedId;
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(chip.id)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.brand : colors.card,
              borderWidth: 1,
              borderColor: active ? colors.brand : colors.border,
              minHeight: 36,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: active ? fonts.bodySemibold : fonts.body,
                fontSize: fontSizes.sm,
                color: active ? colors.textInverse : colors.text,
              }}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
