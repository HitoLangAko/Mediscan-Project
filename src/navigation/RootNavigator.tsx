import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { ChooseScanTypeScreen } from '../screens/scan/ChooseScanTypeScreen';
import { CameraCaptureScreen } from '../screens/scan/CameraCaptureScreen';
import { ScanResultScreen } from '../screens/scan/ScanResultScreen';
import { MedicineDetailsScreen } from '../screens/medicine/MedicineDetailsScreen';
import { AddReminderScreen } from '../screens/reminders/AddReminderScreen';
import { ReminderDetailsScreen } from '../screens/reminders/ReminderDetailsScreen';
import { FamilyProfilesScreen } from '../screens/family/FamilyProfilesScreen';
import { FamilyMemberScreen } from '../screens/family/FamilyMemberScreen';
import { FamilyMemberMedicinesScreen } from '../screens/family/FamilyMemberMedicinesScreen';
import { SettingsAppearanceScreen } from '../screens/settings/SettingsAppearanceScreen';
import { SettingsBackupScreen } from '../screens/settings/SettingsBackupScreen';
import { SettingsLanguageScreen } from '../screens/settings/SettingsLanguageScreen';
import { SettingsNotificationsScreen } from '../screens/settings/SettingsNotificationsScreen';
import { HelpdeskScreen } from '../screens/helpdesk/HelpdeskScreen';
import { DatabaseScreen } from '../screens/database/DatabaseScreen';
import { useTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ChooseScanType" component={ChooseScanTypeScreen} />
      <Stack.Screen name="CameraCapture" component={CameraCaptureScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="MedicineDetails" component={MedicineDetailsScreen} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} />
      <Stack.Screen name="ReminderDetails" component={ReminderDetailsScreen} />
      <Stack.Screen name="FamilyProfiles" component={FamilyProfilesScreen} />
      <Stack.Screen name="FamilyMember" component={FamilyMemberScreen} />
      <Stack.Screen name="FamilyMemberMedicines" component={FamilyMemberMedicinesScreen} />
      <Stack.Screen name="SettingsAppearance" component={SettingsAppearanceScreen} />
      <Stack.Screen name="SettingsBackup" component={SettingsBackupScreen} />
      <Stack.Screen name="SettingsLanguage" component={SettingsLanguageScreen} />
      <Stack.Screen name="SettingsNotifications" component={SettingsNotificationsScreen} />
      <Stack.Screen name="Helpdesk" component={HelpdeskScreen} />
      <Stack.Screen name="Database" component={DatabaseScreen} />
    </Stack.Navigator>
  );
}
