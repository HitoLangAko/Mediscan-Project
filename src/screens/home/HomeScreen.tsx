import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MedicineListItem } from '../../components/MedicineListItem';
import { PillIcon } from '../../components/PillIcon';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { RootStackParamList } from '../../navigation/types';
import { FamilyMember, getFamilyMembers } from '../../services/familyStore';
import { Reminder, getReminders } from '../../services/remindersStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { ScanStatus, UserMedicine } from '../../types/Medicine';
import { daysUntilExpiry, formatDate, isExpired, isExpiringSoon } from '../../utils/date';
import {
  VaultItemWithMeta,
  filterByMember,
  filterRemindersByMember,
  isReminderToday,
  loadVaultWithMeta,
} from '../../utils/familyMedicines';
import { parseReminderTime } from '../../utils/reminderTime';

function deriveDisplayStatus(item: UserMedicine): ScanStatus | 'Expiring Soon' {
  if (isExpired(item.expirationDate)) return 'Expired';
  if (isExpiringSoon(item.expirationDate)) return 'Expiring Soon';
  return item.scanStatus;
}

type ReminderPreviewItem =
  | { kind: 'medication'; reminder: Reminder }
  | { kind: 'expiry'; item: UserMedicine };

function SectionHeader({
  title,
  onViewAll,
}: {
  title: string;
  onViewAll?: () => void;
}) {
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

function ReminderPreviewRow({
  time,
  name,
  instruction,
  onPress,
}: {
  time: string;
  name: string;
  instruction: string;
  onPress: () => void;
}) {
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

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, fonts, fontSizes, radius, spacing, elevation } = useTheme();
  const [items, setItems] = useState<UserMedicine[]>([]);
  const [vaultWithMeta, setVaultWithMeta] = useState<VaultItemWithMeta[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('me');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultItems, members, storedReminders] = await Promise.all([
        getVaultItems(),
        getFamilyMembers(),
        getReminders(),
      ]);
      const withMeta = await loadVaultWithMeta(vaultItems);
      setItems(vaultItems);
      setVaultWithMeta(withMeta);
      setFamilyMembers(members);
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

  const selectedMember = useMemo(
    () => familyMembers.find((m) => m.id === selectedMemberId) ?? familyMembers[0],
    [familyMembers, selectedMemberId],
  );

  const memberItems = useMemo(() => {
    if (!selectedMember) return [];
    return filterByMember(vaultWithMeta, selectedMember.name).map((e) => e.item);
  }, [vaultWithMeta, selectedMember]);

  const stats = useMemo(() => {
    const total = items.length;
    const verified = items.filter((item) => item.scanStatus === 'Verified' && !isExpired(item.expirationDate)).length;
    const needsVerification = items.filter((item) => item.scanStatus === 'Needs Verification' && !isExpired(item.expirationDate)).length;
    const expiringSoon = items.filter((item) => isExpiringSoon(item.expirationDate)).length;
    return { total, verified, needsVerification, expiringSoon };
  }, [items]);

  const recentScans = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, 3),
    [items],
  );

  const reminderPreview = useMemo((): ReminderPreviewItem[] => {
    if (!selectedMember) return [];

    const medicationRows: ReminderPreviewItem[] = filterRemindersByMember(reminders, selectedMember.name)
      .filter((r) => r.type === 'medication' && isReminderToday(r))
      .sort((a, b) => {
        const timeA = parseReminderTime(a.time);
        const timeB = parseReminderTime(b.time);
        return timeA.hour24 * 60 + timeA.minute - (timeB.hour24 * 60 + timeB.minute);
      })
      .map((reminder) => ({ kind: 'medication' as const, reminder }));

    const expiryRows: ReminderPreviewItem[] = memberItems
      .filter((item) => isExpiringSoon(item.expirationDate))
      .sort((a, b) => {
        const daysA = daysUntilExpiry(a.expirationDate) ?? Number.MAX_SAFE_INTEGER;
        const daysB = daysUntilExpiry(b.expirationDate) ?? Number.MAX_SAFE_INTEGER;
        return daysA - daysB;
      })
      .map((item) => ({ kind: 'expiry' as const, item }));

    return [...medicationRows, ...expiryRows].slice(0, 2);
  }, [reminders, memberItems, selectedMember]);

  const hasVaultItems = items.length > 0;
  const memberName = selectedMember?.name ?? 'Me';

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setSelectorOpen(false);
  };

  const handleManageProfiles = () => {
    setSelectorOpen(false);
    navigation.navigate('FamilyProfiles');
  };

  return (
    <Screen>
      <AppBar
        showLogo
        subtitle="Scan. Identify. Save."
        rightAction={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              accessibilityLabel="Notifications"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Reminders' })}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.brandDeep} />
            </Pressable>
          </View>
        }
      />

      <View style={{ gap: spacing.lg }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.text }}>
            Hello there!
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              color: colors.textMuted,
              marginTop: spacing.xs,
            }}
          >
            Take care, stay safe.
          </Text>
        </View>

        <Card style={{ backgroundColor: colors.brandLight, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.brandDeep }}>
                Quick Scan
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
                Scan a medicine label, box, blister pack, barcode, or pill.
              </Text>
              <Button
                title="Start Scanning"
                onPress={() => navigation.navigate('ChooseScanType')}
                icon={<Ionicons name="camera-outline" size={18} color={colors.textInverse} />}
                style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
              />
            </View>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.lg,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PillIcon size={40} color={colors.brand} />
            </View>
          </View>
        </Card>

        {loading ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : !hasVaultItems ? (
          <EmptyState
            title="Your vault is empty"
            message="Scan your first medicine to see overview stats, recent scans, and expiry reminders here."
            action={
              <Button title="Start Scanning" onPress={() => navigation.navigate('ChooseScanType')} />
            }
          />
        ) : (
          <>
            <View>
              <SectionHeader
                title="Medicine Overview"
                onViewAll={() => navigation.navigate('MainTabs', { screen: 'Vault' })}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <StatCard compact label="Total Medicines" value={stats.total} tone="brand" icon="shield-outline" />
                <StatCard compact label="Verified" value={stats.verified} tone="success" icon="checkmark-circle-outline" />
                <StatCard
                  compact
                  label="Needs Verification"
                  value={stats.needsVerification}
                  tone="warning"
                  icon="alert-circle-outline"
                />
                <StatCard
                  compact
                  label="Expiring Soon"
                  value={stats.expiringSoon}
                  tone="danger"
                  icon="calendar-outline"
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: -spacing.sm,
                marginBottom: -spacing.md,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                Family Profile
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Family profile selector"
                onPress={() => setSelectorOpen(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Ionicons name="person-outline" size={16} color={colors.brandDeep} />
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.text }}>
                  {memberName}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            <View>
              <SectionHeader
                title="Upcoming Reminders"
                onViewAll={() => navigation.navigate('MainTabs', { screen: 'Reminders' })}
              />
              {reminderPreview.length > 0 ? (
                reminderPreview.map((row) => {
                  if (row.kind === 'medication') {
                    const { reminder } = row;
                    return (
                      <ReminderPreviewRow
                        key={`med-${reminder.id}`}
                        time={reminder.time}
                        name={reminder.medicineName}
                        instruction={
                          reminder.notes || `${reminder.frequency} · ${reminder.dosageForm || 'Medication'}`
                        }
                        onPress={() => navigation.navigate('ReminderDetails', { reminderId: reminder.id })}
                      />
                    );
                  }
                  const { item } = row;
                  const days = daysUntilExpiry(item.expirationDate);
                  return (
                    <MedicineListItem
                      key={`expiry-${item.userMedicineId}`}
                      name={item.displayName}
                      subtitle={item.dosageForm || item.genericName}
                      meta={
                        days !== undefined
                          ? `Expires in ${days} day${days === 1 ? '' : 's'}`
                          : 'Expiry date not detected'
                      }
                      status="Expiring Soon"
                      imageUri={item.imageUri}
                      onPress={() =>
                        navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })
                      }
                    />
                  );
                })
              ) : (
                <EmptyState
                  title="No upcoming reminders"
                  message={`No reminders for ${memberName} today. Medication schedules and medicines expiring within 30 days will appear here.`}
                />
              )}
            </View>

            <View>
              <SectionHeader
                title="Recent Scans"
                onViewAll={() => navigation.navigate('MainTabs', { screen: 'Vault' })}
              />
              {recentScans.map((item) => (
                <MedicineListItem
                  key={item.userMedicineId}
                  name={item.displayName}
                  subtitle={item.dosageForm || item.genericName}
                  meta={
                    item.expirationDate
                      ? `Expires on ${formatDate(item.expirationDate)}`
                      : `Saved ${formatDate(item.savedAt.slice(0, 10))}`
                  }
                  status={deriveDisplayStatus(item)}
                  imageUri={item.imageUri}
                  onPress={() =>
                    navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })
                  }
                />
              ))}
            </View>
          </>
        )}
      </View>

      <Modal visible={selectorOpen} transparent animationType="fade" onRequestClose={() => setSelectorOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close family profile selector"
          onPress={() => setSelectorOpen(false)}
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              },
              elevation.md,
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.displayMedium,
                fontSize: fontSizes.md,
                color: colors.text,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
              }}
            >
              Select Family Profile
            </Text>
            {familyMembers.map((member) => {
              const selected = member.id === selectedMemberId;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelectMember(member.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    backgroundColor: selected ? colors.brandLight : colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Ionicons name="person-circle-outline" size={22} color={colors.brandDeep} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                      {member.name}
                    </Text>
                    {member.relation ? (
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: fontSizes.sm,
                          color: colors.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {member.relation}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={handleManageProfiles}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Ionicons name="people-outline" size={22} color={colors.brand} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.brand }}>
                Manage Family Profiles
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
