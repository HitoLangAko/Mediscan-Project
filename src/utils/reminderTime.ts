export type ReminderTimeParts = {
  hour24: number;
  minute: number;
};

const DEFAULT: ReminderTimeParts = { hour24: 8, minute: 0 };

export function formatReminderTime(hour24: number, minute: number): string {
  const h = Math.max(0, Math.min(23, hour24));
  const m = Math.max(0, Math.min(59, minute));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function parseReminderTime(value?: string): ReminderTimeParts {
  if (!value?.trim()) return { ...DEFAULT };

  const normalized = value.trim().toUpperCase();

  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2]);
    const period = match12[3];
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return { ...DEFAULT };
    if (period === 'AM') {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
    return { hour24: hour, minute };
  }

  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { ...DEFAULT };
    return { hour24: hour, minute };
  }

  return { ...DEFAULT };
}

export function to12HourParts(hour24: number): { hour12: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

export function from12HourParts(hour12: number, minute: number, period: 'AM' | 'PM'): ReminderTimeParts {
  let hour24 = hour12;
  if (period === 'AM') {
    hour24 = hour12 === 12 ? 0 : hour12;
  } else {
    hour24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return { hour24, minute: Math.max(0, Math.min(59, minute)) };
}
