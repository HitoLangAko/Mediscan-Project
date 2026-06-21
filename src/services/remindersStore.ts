import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'MEDISCAN_REMINDERS_V1';

export type ReminderFrequency = 'Once' | 'Daily' | 'Weekly' | 'Monthly';
export type ReminderType = 'medication' | 'expiry';

export type Reminder = {
  id: string;
  medicineId?: string;
  medicineName: string;
  dosageForm?: string;
  type: ReminderType;
  time: string;
  frequency: ReminderFrequency;
  startDate?: string;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
};

export type ReminderInput = Omit<Reminder, 'id' | 'createdAt'>;

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readStore(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

async function writeStore(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(reminders));
}

export async function getReminders(): Promise<Reminder[]> {
  return readStore();
}

export async function getReminder(reminderId: string): Promise<Reminder | undefined> {
  const reminders = await readStore();
  return reminders.find((r) => r.id === reminderId);
}

export async function addReminder(input: ReminderInput): Promise<Reminder> {
  const reminders = await readStore();
  const reminder: Reminder = {
    ...input,
    id: id('reminder'),
    createdAt: new Date().toISOString(),
  };
  await writeStore([reminder, ...reminders]);
  return reminder;
}

export async function updateReminder(
  reminderId: string,
  patch: Partial<ReminderInput>,
): Promise<Reminder | undefined> {
  const reminders = await readStore();
  const index = reminders.findIndex((r) => r.id === reminderId);
  if (index === -1) return undefined;
  const updated = { ...reminders[index], ...patch };
  reminders[index] = updated;
  await writeStore(reminders);
  return updated;
}

export async function deleteReminder(reminderId: string): Promise<boolean> {
  const reminders = await readStore();
  const next = reminders.filter((r) => r.id !== reminderId);
  if (next.length === reminders.length) return false;
  await writeStore(next);
  return true;
}
