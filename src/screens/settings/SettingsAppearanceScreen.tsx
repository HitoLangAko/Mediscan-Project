import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import {
  AppSettings,
  TextSize,
  ThemeMode,
  getSettings,
  updateSettings,
} from '../../services/settingsStore';
import { useTheme } from '../../theme/ThemeProvider';
import { StackProps } from '../_shared/ScreenStub';

const THEMES: { id: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

const ACCENT_COLORS = [
  { id: '#118779', label: 'Green' },
  { id: '#7B61FF', label: 'Purple' },
  { id: '#2563EB', label: 'Blue' },
  { id: '#CC3E3C', label: 'Red' },
  { id: '#DC8D11', label: 'Orange' },
  { id: '#17C964', label: 'Emerald' },
];

export function SettingsAppearanceScreen({ navigation }: StackProps<'SettingsAppearance'>) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = useCallback(async () => {
    setSettings(await getSettings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const patch = async (partial: Partial<AppSettings>) => {
    const next = await updateSettings(partial);
    setSettings(next);
  };

  const previewSize =
    settings?.textSize === 'small' ? fontSizes.sm : settings?.textSize === 'large' ? fontSizes.lg : fontSizes.base;

  return (
    <Screen>
      <AppBar title="Appearance" subtitle="Theme, text size, and accent" showBack onBack={() => navigation.goBack()} />

      <View style={{ gap: spacing.md }}>
        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Theme
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {THEMES.map((theme) => {
              const selected = settings?.theme === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => patch({ theme: theme.id })}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.brand : colors.border,
                    backgroundColor: selected ? colors.brandLight : colors.card,
                  }}
                >
                  <Ionicons name={theme.icon} size={24} color={colors.brandDeep} />
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.text, marginTop: spacing.xs }}>
                    {theme.label}
                  </Text>
                  {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.brand} style={{ marginTop: 4 }} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm }}>
            Theme, accent color, and text size apply across the app. Dark mode uses neutral surfaces with accent on active controls.
          </Text>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Text Size
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {TEXT_SIZES.map((size) => {
              const selected = settings?.textSize === size.id;
              return (
                <Pressable
                  key={size.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => patch({ textSize: size.id })}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.brand : colors.border,
                    backgroundColor: selected ? colors.brandLight : colors.card,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.text }}>
                    {size.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Accent Color
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {ACCENT_COLORS.map((accent) => {
              const selected = settings?.accentColor === accent.id;
              return (
                <Pressable
                  key={accent.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => patch({ accentColor: accent.id })}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    backgroundColor: accent.id,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selected ? 3 : 0,
                    borderColor: colors.text,
                  }}
                >
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.textInverse} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginBottom: 0, backgroundColor: colors.brandLight }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.brandDeep, marginBottom: spacing.sm }}>
            Preview
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: previewSize, color: colors.text }}>
            MediScan Vault: Your medicine reminder is set for 08:00 AM.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
