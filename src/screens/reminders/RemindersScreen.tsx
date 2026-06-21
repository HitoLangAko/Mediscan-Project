import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { MedicineListItem } from '../../components/MedicineListItem';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { RootStackParamList } from '../../navigation/types';
import { Reminder, getReminders } from '../../services/remindersStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { UserMedicine } from '../../types/Medicine';
import { daysUntilExpiry, formatDate, isExpired, isExpiringSoon } from '../../utils/date';
import { formatGroupDate, isReminderToday } from '../../utils/familyMedicines';

type ReminderFilterId = 'all' | 'medication' | 'expiry';

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'medication', label: 'Medication Reminders' },
  { id: 'expiry', label: 'Expiry Alerts' },
];

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  const { colors, fonts, fontSizes, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>
        {title}
      </Text>
      {onViewAll ? (
        <Pressable accessibilityRole="button" onPress={onViewAll} hitSlop={8}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brand }}>
            View all
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ReminderRowProps = {
  time: string;
  name: string;
  instruction: string;
  onPress: () => void;
};

function ReminderRow({ time, name, instruction, onPress }: ReminderRowProps) {
  const { colors, fonts, fontSizes, radius, spacing, elevation } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.95 : 1,
        },
        elevation.sm,
      ]}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brandDeep, width: 72 }}>
        {time}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>{name}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
          {instruction}
        </Text>
      </View>
      <Ionicons name="notifications-outline" size={20} color={colors.brand} />
    </Pressable>
  );
}

export function RemindersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const [vaultItems, setVaultItems] = useState<UserMedicine[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReminderFilterId>('all');
  const [showAllReminders, setShowAllReminders] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, storedReminders] = await Promise.all([getVaultItems(), getReminders()]);
      setVaultItems(items);
      setReminders(storedReminders);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const expiredItems = useMemo(
    () => vaultItems.filter((item) => isExpired(item.expirationDate)),
    [vaultItems],
  );

  const expiringSoonItems = useMemo(
    () =>
      vaultItems
        .filter((item) => isExpiringSoon(item.expirationDate))
        .sort((a, b) => {
          const daysA = daysUntilExpiry(a.expirationDate) ?? Number.MAX_SAFE_INTEGER;
          const daysB = daysUntilExpiry(b.expirationDate) ?? Number.MAX_SAFE_INTEGER;
          return daysA - daysB;
        }),
    [vaultItems],
  );

  const medicationReminders = useMemo(
    () => reminders.filter((r) => r.type === 'medication'),
    [reminders],
  );

  const remindersToday = useMemo(
    () => medicationReminders.filter(isReminderToday).length,
    [medicationReminders],
  );

  const totalReminders = reminders.length + expiredItems.length + expiringSoonItems.length;

  const groupedReminders = useMemo(() => {
    const rows: { group: string; key: string; kind: 'medication' | 'expiry'; onPress: () => void; time: string; name: string; instruction: string }[] = [];

    if (filter === 'all' || filter === 'medication') {
      for (const reminder of medicationReminders) {
        rows.push({
          group: formatGroupDate(reminder.startDate),
          key: reminder.id,
          kind: 'medication',
          onPress: () => navigation.navigate('ReminderDetails', { reminderId: reminder.id }),
          time: reminder.time,
          name: reminder.medicineName,
          instruction: reminder.notes || `${reminder.frequency} · ${reminder.dosageForm || 'Medication'}`,
        });
      }
    }

    if (filter === 'all' || filter === 'expiry') {
      for (const item of expiringSoonItems) {
        const days = daysUntilExpiry(item.expirationDate);
        rows.push({
          group: 'Expiring Soon',
          key: `exp-soon-${item.userMedicineId}`,
          kind: 'expiry',
          onPress: () => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId }),
          time: '—',
          name: item.displayName,
          instruction: days !== undefined ? `Expires in ${days} day${days === 1 ? '' : 's'}` : 'Expiry alert',
        });
      }
      for (const item of expiredItems) {
        rows.push({
          group: 'Expired',
          key: `expired-${item.userMedicineId}`,
          kind: 'expiry',
          onPress: () => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId }),
          time: '—',
          name: item.displayName,
          instruction: item.expirationDate ? `Expired on ${formatDate(item.expirationDate)}` : 'Expired',
        });
      }
    }

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const existing = groups.get(row.group) ?? [];
      existing.push(row);
      groups.set(row.group, existing);
    }
    return groups;
  }, [filter, medicationReminders, expiringSoonItems, expiredItems, navigation]);

  const isEmpty = !loading && vaultItems.length === 0 && reminders.length === 0;

  return (
    <Screen>
      <AppBar
        title="Reminders"
        subtitle="Expiry alerts and medication schedules"
        rightAction={
          <Pressable accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={colors.brandDeep} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isEmpty ? (
        <EmptyState
          title="No reminders yet"
          message="Add medication reminders or save medicines to your vault to see expiry alerts here."
          action={<Button title="+ Add Reminder" onPress={() => navigation.navigate('AddReminder')} />}
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard compact label="Expired" value={expiredItems.length} tone="danger" icon="close-circle-outline" />
            <StatCard compact label="Expiring Soon" value={expiringSoonItems.length} tone="warning" icon="time-outline" />
            <StatCard compact label="Reminders Today" value={remindersToday} tone="brand" icon="today-outline" />
            <StatCard compact label="Total Reminders" value={totalReminders} tone="info" icon="notifications-outline" />
          </View>

          {expiringSoonItems.length > 0 ? (
            <View>
              <SectionHeader title="Expiring Soon" />
              {(showAllReminders ? expiringSoonItems : expiringSoonItems.slice(0, 3)).map((item) => {
                const days = daysUntilExpiry(item.expirationDate);
                return (
                  <MedicineListItem
                    key={item.userMedicineId}
                    name={item.displayName}
                    subtitle={item.dosageForm || item.genericName}
                    meta={days !== undefined ? `Expires in ${days} day${days === 1 ? '' : 's'}` : 'Expiring soon'}
                    status="Expiring Soon"
                    imageUri={item.imageUri}
                    onPress={() => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })}
                  />
                );
              })}
            </View>
          ) : null}

          {expiredItems.length > 0 ? (
            <View>
              <SectionHeader title="Expired" />
              {(showAllReminders ? expiredItems : expiredItems.slice(0, 3)).map((item) => (
                <MedicineListItem
                  key={item.userMedicineId}
                  name={item.displayName}
                  subtitle={item.dosageForm || item.genericName}
                  meta={item.expirationDate ? `Expired on ${formatDate(item.expirationDate)}` : 'Expired'}
                  status="Expired"
                  imageUri={item.imageUri}
                  onPress={() => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })}
                />
              ))}
            </View>
          ) : null}

          <View>
            <SectionHeader
              title="All Reminders"
              onViewAll={() => setShowAllReminders((prev) => !prev)}
            />
            <FilterChips chips={FILTER_CHIPS} selectedId={filter} onSelect={(id) => setFilter(id as ReminderFilterId)} />
            {groupedReminders.size === 0 ? (
              <EmptyState
                title="No reminders in this filter"
                message="Try another filter or add a new medication reminder."
              />
            ) : (
              Array.from(groupedReminders.entries()).map(([group, rows]) => (
                <View key={group} style={{ marginBottom: spacing.md }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.sm,
                      color: colors.textMuted,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {group}
                  </Text>
                  {rows.map((row) => (
                    <ReminderRow
                      key={row.key}
                      time={row.time}
                      name={row.name}
                      instruction={row.instruction}
                      onPress={row.onPress}
                    />
                  ))}
                </View>
              ))
            )}
          </View>

          <Button
            title="+ Add Reminder"
            onPress={() => navigation.navigate('AddReminder')}
            icon={<Ionicons name="add-outline" size={18} color={colors.textInverse} />}
          />
        </View>
      )}
    </Screen>
  );
}
