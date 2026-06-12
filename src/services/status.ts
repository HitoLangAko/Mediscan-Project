
import { ScanSource, ScanStatus } from '../types/Medicine';
import { isExpired } from '../utils/date';

export function determineMedicineStatus(params: {
  source: ScanSource;
  confidence: number;
  expirationDate?: string;
  hasDatabaseMatch: boolean;
}): ScanStatus {
  if (isExpired(params.expirationDate)) return 'Expired';
  if (params.source === 'pill') return 'Needs Verification';
  if (params.hasDatabaseMatch && params.confidence >= 70) return 'Verified';
  return 'Needs Verification';
}

export function safetyWarningFor(source: ScanSource, status: ScanStatus): string {
  if (status === 'Expired') {
    return 'This medicine appears to be past its expiration date. Do not use it unless a pharmacist or doctor confirms it is safe.';
  }
  if (source === 'pill') {
    return 'Needs Verification: this result is based only on pill appearance. Some pills may look similar but contain different ingredients or strengths. Confirm using the label, box, blister pack, barcode, pharmacist, or doctor.';
  }
  if (status === 'Verified') {
    return 'Verified means the scan matched the local reference database. Still follow the actual product label and pharmacist/doctor advice.';
  }
  return 'This scan needs manual verification because the extracted text was incomplete or the match confidence was not high enough.';
}
