import { getMedicineMeta, MedicineMeta } from '../services/medicineMetaStore';
import { UserMedicine } from '../types/Medicine';
import { isExpired, isExpiringSoon } from './date';

export type VaultItemWithMeta = {
  item: UserMedicine;
  meta: MedicineMeta;
};

export function assignedMemberName(meta: MedicineMeta): string {
  return meta.assignedTo?.trim() || 'Me';
}

export function assignedReminderMember(reminder: { assignedTo?: string }): string {
  return reminder.assignedTo?.trim() || 'Me';
}

export function filterRemindersByMember<T extends { assignedTo?: string }>(
  reminders: T[],
  memberName: string,
): T[] {
  return reminders.filter((r) => assignedReminderMember(r) === memberName);
}

export async function loadVaultWithMeta(items: UserMedicine[]): Promise<VaultItemWithMeta[]> {
  return Promise.all(
    items.map(async (item) => ({
      item,
      meta: await getMedicineMeta(item.userMedicineId),
    })),
  );
}

export function filterByMember(entries: VaultItemWithMeta[], memberName: string): VaultItemWithMeta[] {
  return entries.filter((entry) => assignedMemberName(entry.meta) === memberName);
}

export function deriveDisplayStatus(item: UserMedicine): UserMedicine['scanStatus'] | 'Expiring Soon' {
  if (isExpired(item.expirationDate)) return 'Expired';
  if (isExpiringSoon(item.expirationDate)) return 'Expiring Soon';
  return item.scanStatus;
}

export function memberStats(entries: VaultItemWithMeta[]) {
  const total = entries.length;
  const verified = entries.filter(
    (e) => e.item.scanStatus === 'Verified' && !isExpired(e.item.expirationDate),
  ).length;
  const needsVerification = entries.filter(
    (e) => e.item.scanStatus === 'Needs Verification' && !isExpired(e.item.expirationDate),
  ).length;
  const expiringSoon = entries.filter((e) => isExpiringSoon(e.item.expirationDate)).length;
  return { total, verified, needsVerification, expiringSoon };
}

export function todayIso(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

export function isReminderToday(reminder: { frequency: string; startDate?: string }): boolean {
  if (reminder.frequency === 'Daily') return true;
  if (!reminder.startDate) return false;
  return reminder.startDate.slice(0, 10) === todayIso();
}

export function formatGroupDate(dateStr?: string): string {
  if (!dateStr) return 'Upcoming';
  const date = dateStr.slice(0, 10);
  const today = todayIso();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  if (date === today) return `Today — ${formatDisplayDate(date)}`;
  if (date === tomorrowIso) return `Tomorrow — ${formatDisplayDate(date)}`;
  return formatDisplayDate(date);
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
