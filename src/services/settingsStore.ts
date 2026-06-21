import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETTINGS_KEY = 'MEDISCAN_SETTINGS_V1';
export const BACKUP_KEY = 'MEDISCAN_BACKUP_V1';

export type ThemeMode = 'light' | 'dark' | 'system';
export type TextSize = 'small' | 'medium' | 'large';

export type AppSettings = {
  userName: string;
  userEmail?: string;
  theme: ThemeMode;
  textSize: TextSize;
  accentColor: string;
  language: string;
  notifications: {
    expiryAlerts: boolean;
    expiringSoon: boolean;
    medicationReminders: boolean;
  };
  autoBackup: boolean;
  lastBackupAt?: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  userName: 'MediScan User',
  userEmail: 'user@mediscan.app',
  theme: 'light',
  textSize: 'medium',
  accentColor: '#118779',
  language: 'English',
  notifications: {
    expiryAlerts: true,
    expiringSoon: true,
    medicationReminders: true,
  },
  autoBackup: false,
};

type SettingsListener = (settings: AppSettings) => void;

const listeners = new Set<SettingsListener>();

function emitSettings(settings: AppSettings): void {
  listeners.forEach((listener) => listener(settings));
}

async function readStore(): Promise<Partial<AppSettings>> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    return {};
  }
}

async function writeStore(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await readStore();
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...stored.notifications,
    },
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    notifications: {
      ...current.notifications,
      ...patch.notifications,
    },
  };
  await writeStore(next);
  emitSettings(next);
  return next;
}

export function subscribeSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function saveBackupSnapshot(json: string): Promise<void> {
  await AsyncStorage.setItem(BACKUP_KEY, json);
}

export async function getBackupSnapshot(): Promise<string | null> {
  return AsyncStorage.getItem(BACKUP_KEY);
}
