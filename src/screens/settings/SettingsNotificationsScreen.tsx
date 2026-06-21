import React, { useCallback, useState } from 'react';
import { Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { FeatureTile } from '../../components/FeatureTile';
import { Screen } from '../../components/Screen';
import { AppSettings, getSettings, updateSettings } from '../../services/settingsStore';
import { useTheme } from '../../theme/ThemeProvider';
import { StackProps } from '../_shared/ScreenStub';

type NotificationKey = keyof AppSettings['notifications'];

const NOTIFICATION_ROWS: {
  key: NotificationKey;
  title: string;
  description: string;
  icon: 'close-circle-outline' | 'time-outline' | 'notifications-outline';
}[] = [
  {
    key: 'expiryAlerts',
    title: 'Expiry Alerts',
    description: 'Notify when medicines have expired',
    icon: 'close-circle-outline',
  },
  {
    key: 'expiringSoon',
    title: 'Expiring Soon',
    description: 'Alert before medicines expire',
    icon: 'time-outline',
  },
  {
    key: 'medicationReminders',
    title: 'Medication Reminders',
    description: 'Daily dose and schedule reminders',
    icon: 'notifications-outline',
  },
];

export function SettingsNotificationsScreen({ navigation }: StackProps<'SettingsNotifications'>) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<AppSettings['notifications']>({
    expiryAlerts: true,
    expiringSoon: true,
    medicationReminders: true,
  });

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    setNotifications(settings.notifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const toggle = async (key: NotificationKey, value: boolean) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    await updateSettings({ notifications: next });
  };

  return (
    <Screen>
      <AppBar
        title="Notifications"
        subtitle="Manage reminder and alert settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View>
        {NOTIFICATION_ROWS.map((row) => (
          <FeatureTile
            key={row.key}
            title={row.title}
            description={row.description}
            icon={row.icon}
            trailing={
              <Switch
                value={notifications[row.key]}
                onValueChange={(value) => toggle(row.key, value)}
                trackColor={{ false: colors.border, true: colors.brandLight }}
                thumbColor={notifications[row.key] ? colors.brand : colors.card}
              />
            }
          />
        ))}
      </View>
    </Screen>
  );
}
