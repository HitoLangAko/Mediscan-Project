import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { FeatureTile } from '../../components/FeatureTile';
import { Screen } from '../../components/Screen';
import { RootStackParamList } from '../../navigation/types';
import { AppSettings, getSettings, updateSettings } from '../../services/settingsStore';
import { useTheme } from '../../theme/ThemeProvider';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const loadSettings = useCallback(async () => {
    const stored = await getSettings();
    setSettings(stored);
    setUserName(stored.userName);
    setUserEmail(stored.userEmail ?? '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const saveProfile = async () => {
    const next = await updateSettings({
      userName: userName.trim() || 'MediScan User',
      userEmail: userEmail.trim() || undefined,
    });
    setSettings(next);
    setEditingProfile(false);
  };

  const showComingSoon = (title: string) => {
    Alert.alert(title, 'This feature is coming soon in a future update.');
  };

  const showAbout = () => {
    Alert.alert('About MediScan Vault', 'Version 1.0.0\n\nOffline medicine organizer for families.');
  };

  return (
    <Screen>
      <AppBar title="Settings" subtitle="Profile and app preferences" />

      <View>
        <Pressable accessibilityRole="button" onPress={() => setEditingProfile((v) => !v)}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.pill,
                  backgroundColor: colors.brandLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person-outline" size={28} color={colors.brandDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
                  {settings?.userName ?? 'MediScan User'}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                  {settings?.userEmail ?? 'user@mediscan.app'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        </Pressable>

        {editingProfile ? (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
              Edit Profile
            </Text>
            <TextInput
              value={userName}
              onChangeText={setUserName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
                fontFamily: fonts.body,
                fontSize: fontSizes.base,
                color: colors.text,
              }}
            />
            <TextInput
              value={userEmail}
              onChangeText={setUserEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                fontFamily: fonts.body,
                fontSize: fontSizes.base,
                color: colors.text,
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={saveProfile}
              style={{
                backgroundColor: colors.brand,
                borderRadius: radius.md,
                padding: spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.textInverse }}>
                Save Profile
              </Text>
            </Pressable>
          </Card>
        ) : null}

        <FeatureTile
          title="Family Profiles"
          description="Manage family members"
          icon="people-outline"
          onPress={() => navigation.navigate('FamilyProfiles')}
        />
        <FeatureTile
          title="Medicine Helpdesk"
          description="Get help and contact support"
          icon="chatbubble-ellipses-outline"
          onPress={() => navigation.navigate('Helpdesk')}
        />
        <FeatureTile
          title="Offline Database"
          description="Update medicine database"
          icon="library-outline"
          onPress={() => navigation.navigate('Database')}
        />
        <FeatureTile
          title="Appearance"
          description="Customize theme, text size, accent color"
          icon="color-palette-outline"
          onPress={() => navigation.navigate('SettingsAppearance')}
        />
        <FeatureTile
          title="Language"
          description="Choose your preferred language"
          icon="language-outline"
          trailing={
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.textMuted }}>
              {settings?.language ?? 'English'} ›
            </Text>
          }
          onPress={() => navigation.navigate('SettingsLanguage')}
        />
        <FeatureTile
          title="Notifications"
          description="Manage reminder and alert settings"
          icon="notifications-outline"
          onPress={() => navigation.navigate('SettingsNotifications')}
        />
        <FeatureTile
          title="Backup & Restore"
          description="Back up or restore your data"
          icon="cloud-outline"
          onPress={() => navigation.navigate('SettingsBackup')}
        />
        <FeatureTile
          title="App Lock"
          description="Secure your app with PIN / biometrics"
          icon="lock-closed-outline"
          onPress={() => showComingSoon('App Lock')}
        />
        <FeatureTile
          title="Privacy"
          description="Manage your privacy settings"
          icon="shield-checkmark-outline"
          onPress={() => showComingSoon('Privacy')}
        />
        <FeatureTile
          title="About MediScan Vault"
          description="Version 1.0.0"
          icon="information-circle-outline"
          onPress={showAbout}
        />
      </View>
    </Screen>
  );
}
