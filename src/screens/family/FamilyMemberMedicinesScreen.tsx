import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { FilterChip, FilterChips } from '../../components/FilterChips';
import { MedicineListItem } from '../../components/MedicineListItem';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { getFamilyMember } from '../../services/familyStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { UserMedicine } from '../../types/Medicine';
import { formatDate } from '../../utils/date';
import {
  VaultItemWithMeta,
  deriveDisplayStatus,
  filterByMember,
  loadVaultWithMeta,
} from '../../utils/familyMedicines';
import { StackProps } from '../_shared/ScreenStub';

type MemberFilterId = 'all' | 'verified' | 'needs' | 'expired' | 'expiring';
type MemberSortId = 'newest' | 'name-az' | 'expiry-nearest';

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'needs', label: 'Needs Verification' },
  { id: 'expired', label: 'Expired' },
  { id: 'expiring', label: 'Expiring Soon' },
];

const SORT_LABELS: Record<MemberSortId, string> = {
  newest: 'Newest',
  'name-az': 'Name A–Z',
  'expiry-nearest': 'Expiry Nearest',
};

const SORT_CYCLE: MemberSortId[] = ['newest', 'name-az', 'expiry-nearest'];

function matchesFilter(item: UserMedicine, filterId: MemberFilterId): boolean {
  if (filterId === 'all') return true;
  const status = deriveDisplayStatus(item);
  switch (filterId) {
    case 'verified':
      return status === 'Verified';
    case 'needs':
      return status === 'Needs Verification';
    case 'expired':
      return status === 'Expired';
    case 'expiring':
      return status === 'Expiring Soon';
    default:
      return true;
  }
}

function matchesQuery(item: UserMedicine, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [item.displayName, item.genericName, item.strength, item.dosageForm]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}

function sortItems(entries: VaultItemWithMeta[], sortId: MemberSortId): VaultItemWithMeta[] {
  const sorted = [...entries];
  switch (sortId) {
    case 'name-az':
      return sorted.sort((a, b) => a.item.displayName.localeCompare(b.item.displayName));
    case 'expiry-nearest':
      return sorted.sort((a, b) => {
        const aTime = a.item.expirationDate ? new Date(a.item.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.item.expirationDate ? new Date(b.item.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.item.savedAt).getTime() - new Date(a.item.savedAt).getTime());
  }
}

export function FamilyMemberMedicinesScreen({ navigation, route }: StackProps<'FamilyMemberMedicines'>) {
  const { memberId } = route.params;
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const [memberName, setMemberName] = useState('');
  const [entries, setEntries] = useState<VaultItemWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MemberFilterId>('all');
  const [sort, setSort] = useState<MemberSortId>('newest');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [member, vaultItems] = await Promise.all([getFamilyMember(memberId), getVaultItems()]);
      if (!member) {
        setMemberName('');
        setEntries([]);
        return;
      }
      setMemberName(member.name);
      const withMeta = await loadVaultWithMeta(vaultItems);
      setEntries(filterByMember(withMeta, member.name));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filteredItems = useMemo(() => {
    const filtered = entries.filter(
      (entry) => matchesFilter(entry.item, selectedFilter) && matchesQuery(entry.item, query),
    );
    return sortItems(filtered, sort);
  }, [entries, query, selectedFilter, sort]);

  const cycleSort = () => {
    const currentIndex = SORT_CYCLE.indexOf(sort);
    setSort(SORT_CYCLE[(currentIndex + 1) % SORT_CYCLE.length]);
  };

  const title = memberName ? `${memberName}'s Medicines` : 'Medicines';

  return (
    <Screen>
      <AppBar title={title} subtitle="Search, filter, and manage assigned medicines" showBack onBack={() => navigation.goBack()} />

      {!loading && entries.length > 0 ? (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search medicines…" />
          <FilterChips
            chips={FILTER_CHIPS}
            selectedId={selectedFilter}
            onSelect={(id) => setSelectedFilter(id as MemberFilterId)}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.textMuted }}>
              {filteredItems.length} Medicine{filteredItems.length === 1 ? '' : 's'}
            </Text>
            <Pressable accessibilityRole="button" onPress={cycleSort} hitSlop={8}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brand }}>
                Sort: {SORT_LABELS[sort]}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {loading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No medicines assigned"
          message={memberName ? `${memberName} has no assigned medicines yet.` : 'Member not found.'}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState title="No medicines match" message="Try a different search term or filter." />
      ) : (
        <View>
          {filteredItems.map(({ item }) => (
            <MedicineListItem
              key={item.userMedicineId}
              name={item.displayName}
              subtitle={[item.genericName, item.dosageForm].filter(Boolean).join(' · ') || undefined}
              meta={item.expirationDate ? `Expires on ${formatDate(item.expirationDate)}` : 'Expiry not detected'}
              status={deriveDisplayStatus(item)}
              imageUri={item.imageUri}
              onPress={() => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
