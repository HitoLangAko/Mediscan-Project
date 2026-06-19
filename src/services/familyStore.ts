import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'MEDISCAN_FAMILY_V1';

export type FamilyMember = {
  id: string;
  name: string;
  relation?: string;
  createdAt: string;
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_MEMBERS: FamilyMember[] = [
  { id: 'me', name: 'Me', relation: 'You', createdAt: new Date().toISOString() },
];

async function readStore(): Promise<FamilyMember[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULT_MEMBERS));
    return [...DEFAULT_MEMBERS];
  }
  try {
    const members = JSON.parse(raw) as FamilyMember[];
    if (!members.some((m) => m.id === 'me')) {
      return [...DEFAULT_MEMBERS, ...members];
    }
    return members;
  } catch {
    return [...DEFAULT_MEMBERS];
  }
}

async function writeStore(members: FamilyMember[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(members));
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  return readStore();
}

export async function getFamilyMember(memberId: string): Promise<FamilyMember | undefined> {
  const members = await readStore();
  return members.find((m) => m.id === memberId);
}

export async function addFamilyMember(input: {
  name: string;
  relation?: string;
}): Promise<FamilyMember> {
  const members = await readStore();
  const member: FamilyMember = {
    id: id('family'),
    name: input.name.trim(),
    relation: input.relation?.trim(),
    createdAt: new Date().toISOString(),
  };
  await writeStore([...members, member]);
  return member;
}

export async function updateFamilyMember(
  memberId: string,
  patch: Partial<Pick<FamilyMember, 'name' | 'relation'>>,
): Promise<FamilyMember | undefined> {
  const members = await readStore();
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return undefined;
  const updated = {
    ...members[index],
    ...patch,
    name: patch.name?.trim() ?? members[index].name,
    relation: patch.relation?.trim() ?? members[index].relation,
  };
  members[index] = updated;
  await writeStore(members);
  return updated;
}

export async function deleteFamilyMember(memberId: string): Promise<boolean> {
  if (memberId === 'me') return false;
  const members = await readStore();
  const next = members.filter((m) => m.id !== memberId);
  if (next.length === members.length) return false;
  await writeStore(next);
  return true;
}
