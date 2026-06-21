import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { TabParamList } from '../navigation/types';

type TabIconName = keyof typeof Ionicons.glyphMap;

const tabConfig: Record<keyof TabParamList, { label: string; icon: TabIconName; activeIcon: TabIconName }> = {
  Home: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  Scan: { label: 'Scan', icon: 'camera-outline', activeIcon: 'camera' },
  Vault: { label: 'Vault', icon: 'shield-outline', activeIcon: 'shield' },
  Reminders: { label: 'Reminders', icon: 'alarm-outline', activeIcon: 'alarm' },
  Profile: { label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, fonts, fontSizes, spacing, layout } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.sm,
        minHeight: layout.tabBarHeight,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = tabConfig[route.name as keyof TabParamList];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const color = isFocused ? colors.brand : colors.textMuted;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: layout.hitTargetMin,
              gap: 2,
            }}
          >
            <Ionicons name={isFocused ? config.activeIcon : config.icon} size={22} color={color} />
            <Text
              style={{
                fontFamily: isFocused ? fonts.bodySemibold : fonts.body,
                fontSize: fontSizes.xs,
                color,
              }}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
