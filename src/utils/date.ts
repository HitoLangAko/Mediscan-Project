
export function parseExpirationDate(text?: string): string | undefined {
  if (!text) return undefined;
  const normalized = text.replace(/\b(EXP|EXPIRY|EXPIRES|EXPIRATION)\b[:\s]*/gi, ' ');
  const isoMonth = normalized.match(/(20\d{2})[-\/\.\s](0?[1-9]|1[0-2])/);
  if (isoMonth) {
    const year = Number(isoMonth[1]);
    const month = Number(isoMonth[2]);
    return `${year}-${String(month).padStart(2, '0')}-28`;
  }
  const monthYear = normalized.match(/(0?[1-9]|1[0-2])[-\/\.\s](20\d{2})/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    const year = Number(monthYear[2]);
    return `${year}-${String(month).padStart(2, '0')}-28`;
  }
  return undefined;
}

export function isExpired(expirationDate?: string): boolean {
  if (!expirationDate) return false;
  const exp = new Date(expirationDate);
  const today = new Date();
  exp.setHours(23, 59, 59, 999);
  return exp.getTime() < today.getTime();
}

export function formatDate(date?: string): string {
  if (!date) return 'Not detected';
  return date;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysUntilExpiry(expirationDate?: string): number | undefined {
  if (!expirationDate) return undefined;
  const exp = new Date(expirationDate);
  if (Number.isNaN(exp.getTime())) return undefined;
  exp.setHours(0, 0, 0, 0);
  const diffMs = exp.getTime() - startOfToday().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(expirationDate?: string, windowDays = 30): boolean {
  if (!expirationDate || isExpired(expirationDate)) return false;
  const days = daysUntilExpiry(expirationDate);
  if (days === undefined) return false;
  return days >= 0 && days <= windowDays;
}
