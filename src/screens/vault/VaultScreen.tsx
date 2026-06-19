import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { FilterChip, FilterChips } from '../../components/FilterChips';
import { MedicineListItem } from '../../components/MedicineListItem';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { RootStackParamList } from '../../navigation/types';
import { deleteVaultItem, getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { ScanStatus, UserMedicine } from '../../types/Medicine';
import { formatDate, isExpired, isExpiringSoon } from '../../utils/date';

type VaultFilterId = 'all' | 'verified' | 'needs' | 'expired' | 'expiring';
type VaultSortId = 'newest' | 'name-az' | 'expiry-nearest';

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'needs', label: 'Needs Verification' },
  { id: 'expired', label: 'Expired' },
  { id: 'expiring', label: 'Expiring Soon' },
];

const SORT_LABELS: Record<VaultSortId, string> = {
  newest: 'Newest',
  'name-az': 'Name A–Z',
  'expiry-nearest': 'Expiry Nearest',
};

const SORT_CYCLE: VaultSortId[] = ['newest', 'name-az', 'expiry-nearest'];

function deriveDisplayStatus(item: UserMedicine): ScanStatus | 'Expiring Soon' {
  if (isExpired(item.expirationDate)) return 'Expired';
  if (isExpiringSoon(item.expirationDate)) return 'Expiring Soon';
  return item.scanStatus;
}

function matchesFilter(item: UserMedicine, filterId: VaultFilterId): boolean {
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

function sortItems(items: UserMedicine[], sortId: VaultSortId): UserMedicine[] {
  const sorted = [...items];
  switch (sortId) {
    case 'name-az':
      return sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'expiry-nearest':
      return sorted.sort((a, b) => {
        const aTime = a.expirationDate ? new Date(a.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.expirationDate ? new Date(b.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }
}

export function VaultScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const [items, setItems] = useState<UserMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<VaultFilterId>('all');
  const [sort, setSort] = useState<VaultSortId>('newest');

  const loadVault = useCallback(async () => {
    setLoading(true);
    try {
      const vaultItems = await getVaultItems();
      setItems(vaultItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVault();
    }, [loadVault]),
  );

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => matchesFilter(item, selectedFilter) && matchesQuery(item, query));
    return sortItems(filtered, sort);
  }, [items, query, selectedFilter, sort]);

  const cycleSort = () => {
    const currentIndex = SORT_CYCLE.indexOf(sort);
    const nextIndex = (currentIndex + 1) % SORT_CYCLE.length;
    setSort(SORT_CYCLE[nextIndex]);
  };

  const handleDelete = (item: UserMedicine) => {
    Alert.alert('Delete medicine?', `Remove ${item.displayName} from your vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteVaultItem(item.userMedicineId);
          await loadVault();
        },
      },
    ]);
  };

  const isEmptyVault = !loading && items.length === 0;
  const hasNoResults = !loading && items.length > 0 && filteredItems.length === 0;

  return (
    <Screen>
      <AppBar title="My Medicine Vault" subtitle="Search, filter, and manage saved medicines" />

      {!isEmptyVault ? (
        <>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search medicines…"
          />
          <FilterChips
            chips={FILTER_CHIPS}
            selectedId={selectedFilter}
            onSelect={(id) => setSelectedFilter(id as VaultFilterId)}
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
              Total Medicines: {filteredItems.length}
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
      ) : isEmptyVault ? (
        <EmptyState
          title="Your vault is empty"
          message="Save medicines from scan results to build your personal medicine vault."
          action={
            <Button title="Start Scanning" onPress={() => navigation.navigate('ChooseScanType')} />
          }
        />
      ) : hasNoResults ? (
        <EmptyState
          title="No medicines match"
          message="Try a different search term or filter to find saved medicines."
        />
      ) : (
        <View>
          {filteredItems.map((item) => (
            <MedicineListItem
              key={item.userMedicineId}
              name={item.displayName}
              subtitle={[item.genericName, item.dosageForm].filter(Boolean).join(' · ') || undefined}
              meta={
                item.expirationDate
                  ? `Expires on ${formatDate(item.expirationDate)}`
                  : 'Expiry not detected'
              }
              status={deriveDisplayStatus(item)}
              imageUri={item.imageUri}
              onPress={() =>
                navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })
              }
              onMenuPress={() => handleDelete(item)}
            />
          ))}
        </View>
      )}

      {!isEmptyVault ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            title="Add Medicine"
            variant="secondary"
            onPress={() => navigation.navigate('ChooseScanType')}
            icon={<Ionicons name="add-outline" size={18} color={colors.brand} />}
            style={{ flexGrow: 1 }}
          />
          <Button
            title="Export"
            variant="ghost"
            onPress={() => navigation.navigate('SettingsBackup')}
            icon={<Ionicons name="share-outline" size={18} color={colors.brand} />}
            style={{ flexGrow: 1 }}
          />
          <Button
            title="Backup"
            variant="ghost"
            onPress={() => navigation.navigate('SettingsBackup')}
            icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.brand} />}
            style={{ flexGrow: 1 }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
