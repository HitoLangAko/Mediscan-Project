import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { getSettings, updateSettings } from '../../services/settingsStore';
import { useTheme } from '../../theme/ThemeProvider';
import { StackProps } from '../_shared/ScreenStub';

const LANGUAGES = ['English', 'Filipino', 'Spanish', 'Chinese (Simplified)', 'Japanese'];

export function SettingsLanguageScreen({ navigation }: StackProps<'SettingsLanguage'>) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [language, setLanguage] = useState('English');

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    setLanguage(settings.language);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const selectLanguage = async (value: string) => {
    setLanguage(value);
    await updateSettings({ language: value });
  };

  return (
    <Screen>
      <AppBar title="Language" subtitle="Choose your preferred language" showBack onBack={() => navigation.goBack()} />

      <Card style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
        {LANGUAGES.map((lang, index) => {
          const selected = language === lang;
          return (
            <Pressable
              key={lang}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => selectLanguage(lang)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.md,
                borderBottomWidth: index < LANGUAGES.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: selected ? colors.brandLight : colors.card,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                {lang}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
            </Pressable>
          );
        })}
      </Card>

      <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' }}>
        Language preference is saved locally. UI translation is not yet applied in MVP.
      </Text>
    </Screen>
  );
}
