import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MedicineListItem } from '../../components/MedicineListItem';
import { PillIcon } from '../../components/PillIcon';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { FamilyMember, getFamilyMember, updateFamilyMember } from '../../services/familyStore';
import { Reminder, getReminders } from '../../services/remindersStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { daysUntilExpiry, formatDate } from '../../utils/date';
import {
  VaultItemWithMeta,
  deriveDisplayStatus,
  filterByMember,
  loadVaultWithMeta,
  memberStats,
} from '../../utils/familyMedicines';
import { StackProps } from '../_shared/ScreenStub';

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

export function FamilyMemberScreen({ navigation, route }: StackProps<'FamilyMember'>) {
  const { memberId } = route.params;
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<FamilyMember | undefined>();
  const [memberEntries, setMemberEntries] = useState<VaultItemWithMeta[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      const [found, vaultItems, allReminders] = await Promise.all([
        getFamilyMember(memberId),
        getVaultItems(),
        getReminders(),
      ]);
      if (!found) {
        setMember(undefined);
        return;
      }
      setMember(found);
      setEditName(found.name);
      const withMeta = await loadVaultWithMeta(vaultItems);
      const scoped = filterByMember(withMeta, found.name);
      setMemberEntries(scoped);
      setReminders(allReminders.filter((r) => r.assignedTo === found.name).slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember]),
  );

  const stats = useMemo(() => memberStats(memberEntries), [memberEntries]);

  const recentMedicines = useMemo(
    () =>
      [...memberEntries]
        .sort((a, b) => new Date(b.item.savedAt).getTime() - new Date(a.item.savedAt).getTime())
        .slice(0, 3),
    [memberEntries],
  );

  const handleSaveName = async () => {
    const name = editName.trim();
    if (!name || !member) return;
    setSaving(true);
    try {
      await updateFamilyMember(member.id, { name });
      setEditing(false);
      await loadMember();
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <AppBar title="Family Member" showBack onBack={() => navigation.goBack()} />
        <EmptyState title="Loading…" message="Fetching member overview." />
      </Screen>
    );
  }

  if (!member) {
    return (
      <Screen>
        <AppBar title="Family Member" showBack onBack={() => navigation.goBack()} />
        <EmptyState title="Member not found" message="This family profile may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        title={member.name}
        subtitle={member.relation}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable accessibilityLabel="More options" hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.brandDeep} />
          </Pressable>
        }
      />

      <View style={{ gap: spacing.lg }}>
        <Card style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.pill,
                backgroundColor: colors.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={36} color={colors.brandDeep} />
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.base,
                    color: colors.text,
                  }}
                />
              ) : (
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>
                  {member.name}
                </Text>
              )}
              {member.relation ? (
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                  {member.relation}
                </Text>
              ) : null}
            </View>
            {editing ? (
              <Button title="Save" onPress={handleSaveName} loading={saving} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} />
            )}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard
            compact
            label="Total"
            value={stats.total}
            tone="info"
            iconNode={<PillIcon size={16} color={colors.info} />}
          />
          <StatCard compact label="Verified" value={stats.verified} tone="success" icon="checkmark-circle-outline" />
          <StatCard
            compact
            label="Needs Verification"
            value={stats.needsVerification}
            tone="warning"
            icon="alert-circle-outline"
          />
          <StatCard compact label="Expiring Soon" value={stats.expiringSoon} tone="warning" icon="calendar-outline" />
        </View>

        <View>
          <SectionHeader title="Upcoming Reminders" />
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <Pressable
                key={reminder.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('ReminderDetails', { reminderId: reminder.id })}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                  {reminder.medicineName}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                  {reminder.time} · {reminder.frequency}
                </Text>
              </Pressable>
            ))
          ) : (
            <EmptyState title="No reminders" message={`No reminders assigned to ${member.name} yet.`} />
          )}
        </View>

        <View>
          <SectionHeader
            title="Recent Medicines"
            onViewAll={() => navigation.navigate('FamilyMemberMedicines', { memberId: member.id })}
          />
          {recentMedicines.length > 0 ? (
            recentMedicines.map(({ item }) => {
              const days = daysUntilExpiry(item.expirationDate);
              return (
                <MedicineListItem
                  key={item.userMedicineId}
                  name={item.displayName}
                  subtitle={[item.dosageForm, item.genericName].filter(Boolean).join(' · ') || undefined}
                  meta={
                    days !== undefined && days >= 0
                      ? `Expires in ${days} day${days === 1 ? '' : 's'}`
                      : item.expirationDate
                        ? `Expires on ${formatDate(item.expirationDate)}`
                        : undefined
                  }
                  status={deriveDisplayStatus(item)}
                  imageUri={item.imageUri}
                  onPress={() => navigation.navigate('MedicineDetails', { userMedicineId: item.userMedicineId })}
                />
              );
            })
          ) : (
            <EmptyState
              title="No medicines assigned"
              message={`Assign medicines to ${member.name} from Medicine Details.`}
            />
          )}
        </View>

        <Button
          title={`View ${member.name}'s Medicines`}
          variant="secondary"
          onPress={() => navigation.navigate('FamilyMemberMedicines', { memberId: member.id })}
        />
      </View>
    </Screen>
  );
}
