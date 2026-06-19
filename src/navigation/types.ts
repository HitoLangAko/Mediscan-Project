import { NavigatorScreenParams } from '@react-navigation/native';
import { ScanResult, ScanSource, UserMedicine } from '../types/Medicine';

export type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Vault: undefined;
  Reminders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  ChooseScanType: undefined;
  CameraCapture: { scanType: ScanSource };
  ScanResult: { scanResult: ScanResult };
  MedicineDetails: { userMedicineId?: string; scanResult?: ScanResult };
  AddReminder: { reminderId?: string } | undefined;
  ReminderDetails: { reminderId: string };
  FamilyProfiles: undefined;
  FamilyMember: { memberId: string };
  FamilyMemberMedicines: { memberId: string };
  SettingsAppearance: undefined;
  SettingsBackup: undefined;
  SettingsLanguage: undefined;
  SettingsNotifications: undefined;
  Helpdesk: undefined;
  Database: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type VaultListItem = UserMedicine;
