import React, { useCallback, useState } from 'react';
import { Alert, Share, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import {
  AppSettings,
  getBackupSnapshot,
  getSettings,
  saveBackupSnapshot,
  updateSettings,
} from '../../services/settingsStore';
import { getVaultItems, saveVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { StackProps } from '../_shared/ScreenStub';

function formatBackupDate(iso?: string): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SettingsBackupScreen({ navigation }: StackProps<'SettingsBackup'>) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettings(await getSettings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const handleCreateBackup = async () => {
    setBackingUp(true);
    try {
      const items = await getVaultItems();
      const json = JSON.stringify(items, null, 2);
      await saveBackupSnapshot(json);
      const now = new Date().toISOString();
      const next = await updateSettings({ lastBackupAt: now });
      setSettings(next);
      await Share.share({
        message: json,
        title: 'MediScan Vault Backup',
      });
      Alert.alert('Backup created', 'Your vault data has been saved and shared.');
    } catch (error) {
      Alert.alert('Backup failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from backup?',
      'This will replace your current vault with the last saved backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            try {
              const snapshot = await getBackupSnapshot();
              if (!snapshot) {
                Alert.alert('No backup found', 'Create a backup first.');
                return;
              }
              const items = JSON.parse(snapshot);
              await saveVaultItems(items);
              Alert.alert('Restore complete', 'Your vault has been restored from the last backup.');
            } catch (error) {
              Alert.alert('Restore failed', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setRestoring(false);
            }
          },
        },
      ],
    );
  };

  const toggleAutoBackup = async (value: boolean) => {
    const next = await updateSettings({ autoBackup: value });
    setSettings(next);
  };

  return (
    <Screen>
      <AppBar title="Backup & Restore" subtitle="Keep your vault data safe" showBack onBack={() => navigation.goBack()} />

      <View style={{ gap: spacing.md }}>
        <Card style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
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
              <Ionicons name="cloud-upload-outline" size={24} color={colors.brandDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
                Backup Your Data
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                Export your vault as JSON and keep a local copy safe.
              </Text>
            </View>
          </View>
          <Button
            title="Create Backup Now"
            onPress={handleCreateBackup}
            loading={backingUp}
            icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.textInverse} />}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: colors.infoSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cloud-download-outline" size={24} color={colors.brandDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
                Restore Data
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                Replace your vault with the last saved backup.
              </Text>
            </View>
          </View>
          <Button
            title="Restore from Backup"
            variant="secondary"
            onPress={handleRestore}
            loading={restoring}
            icon={<Ionicons name="cloud-download-outline" size={18} color={colors.brand} />}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                Auto Backup
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                Automatically save vault data locally when enabled.
              </Text>
            </View>
            <Switch
              value={settings?.autoBackup ?? false}
              onValueChange={toggleAutoBackup}
              trackColor={{ false: colors.border, true: colors.brandLight }}
              thumbColor={settings?.autoBackup ? colors.brand : colors.card}
            />
          </View>
        </Card>

        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' }}>
          Last Backup: {formatBackupDate(settings?.lastBackupAt)}
        </Text>
      </View>
    </Screen>
  );
}
