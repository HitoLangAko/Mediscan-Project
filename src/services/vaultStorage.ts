
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanResult, UserMedicine } from '../types/Medicine';

const KEY = 'MEDISCAN_VAULT_ITEMS_V1';

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getVaultItems(): Promise<UserMedicine[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserMedicine[]; } catch { return []; }
}

export async function saveVaultItems(items: UserMedicine[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function saveScanToVault(scan: ScanResult, notes = ''): Promise<UserMedicine> {
  const top = scan.candidates[0]?.reference;
  const item: UserMedicine = {
    userMedicineId: id('vault'),
    referenceId: top?.id,
    displayName: scan.parsed.brandName || top?.brandName || top?.sourceDrugName || scan.parsed.genericName || 'Unknown Medicine',
    genericName: scan.parsed.genericName || top?.genericName,
    strength: scan.parsed.strength || top?.strength,
    dosageForm: scan.parsed.dosageForm || top?.dosageForm,
    manufacturer: scan.parsed.manufacturer || top?.manufacturer,
    barcodeGtin: scan.parsed.barcodeGtin || top?.barcodeGtin,
    cprNumber: scan.parsed.cprNumber || top?.philippineFdaCprNumber,
    batchNumber: scan.parsed.batchNumber,
    lotNumber: scan.parsed.lotNumber,
    expirationDate: scan.parsed.expirationDate,
    scanSource: scan.source,
    scanStatus: scan.finalStatus,
    confidenceScore: scan.confidenceScore,
    imageUri: scan.imageUri,
    notes,
    savedAt: new Date().toISOString(),
  };
  const current = await getVaultItems();
  const next = [item, ...current];
  await saveVaultItems(next);
  return item;
}

export async function deleteVaultItem(id: string) {
  const current = await getVaultItems();
  await saveVaultItems(current.filter(item => item.userMedicineId !== id));
}

export async function clearVault() {
  await AsyncStorage.removeItem(KEY);
}
