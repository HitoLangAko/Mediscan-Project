import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'MEDISCAN_MED_META_V1';

export type MedicineMeta = {
  notes?: string;
  tags?: string[];
  assignedTo?: string;
};

type MetaStore = Record<string, MedicineMeta>;

async function readStore(): Promise<MetaStore> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MetaStore;
  } catch {
    return {};
  }
}

async function writeStore(store: MetaStore): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export async function getMedicineMeta(id: string): Promise<MedicineMeta> {
  const store = await readStore();
  return store[id] ?? {};
}

export async function setMedicineMeta(id: string, meta: MedicineMeta): Promise<void> {
  const store = await readStore();
  store[id] = { ...store[id], ...meta };
  await writeStore(store);
}
