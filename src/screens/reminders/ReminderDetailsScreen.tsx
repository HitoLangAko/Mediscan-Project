import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PillIcon } from '../../components/PillIcon';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { deleteReminder, getReminder } from '../../services/remindersStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { UserMedicine } from '../../types/Medicine';
import { daysUntilExpiry, formatDate, isExpiringSoon } from '../../utils/date';
import { deriveDisplayStatus } from '../../utils/familyMedicines';
import { StackProps } from '../_shared/ScreenStub';

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const display = value?.trim() ? value.trim() : 'Not set';

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={20} color={colors.brandDeep} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textMuted }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text }}>{display}</Text>
      </View>
    </View>
  );
}

export function ReminderDetailsScreen({ navigation, route }: StackProps<'ReminderDetails'>) {
  const { reminderId } = route.params;
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [reminder, setReminder] = useState<Awaited<ReturnType<typeof getReminder>>>();
  const [linkedMedicine, setLinkedMedicine] = useState<UserMedicine | undefined>();

  const loadReminder = useCallback(async () => {
    setLoading(true);
    try {
      const found = await getReminder(reminderId);
      setReminder(found);
      if (found?.medicineId) {
        const items = await getVaultItems();
        setLinkedMedicine(items.find((i) => i.userMedicineId === found.medicineId));
      } else {
        setLinkedMedicine(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [reminderId]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  const imageSource: ImageSourcePropType | undefined = useMemo(() => {
    if (linkedMedicine?.imageUri === undefined) return undefined;
    return typeof linkedMedicine.imageUri === 'number'
      ? linkedMedicine.imageUri
      : { uri: linkedMedicine.imageUri };
  }, [linkedMedicine]);

  const expiryHighlight = useMemo(() => {
    if (!linkedMedicine?.expirationDate) return null;
    if (isExpiringSoon(linkedMedicine.expirationDate)) {
      const days = daysUntilExpiry(linkedMedicine.expirationDate);
      return {
        label: days !== undefined ? `Expires in ${days} day${days === 1 ? '' : 's'}` : 'Expiring soon',
        status: 'Expiring Soon' as const,
      };
    }
    return null;
  }, [linkedMedicine]);

  const handleDelete = () => {
    Alert.alert('Delete reminder?', 'This reminder will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteReminder(reminderId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <AppBar title="Reminder Details" showBack onBack={() => navigation.goBack()} />
        <EmptyState title="Loading…" message="Fetching reminder details." />
      </Screen>
    );
  }

  if (!reminder) {
    return (
      <Screen>
        <AppBar title="Reminder Details" showBack onBack={() => navigation.goBack()} />
        <EmptyState title="Reminder not found" message="This reminder may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        title="Reminder Details"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable accessibilityLabel="More options" hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.brandDeep} />
          </Pressable>
        }
      />

      <View style={{ gap: spacing.md }}>
        <Card style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: radius.lg,
                backgroundColor: colors.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {imageSource ? (
                <Image source={imageSource} style={{ width: 80, height: 80 }} resizeMode="cover" />
              ) : (
                <PillIcon size={36} color={colors.brandDeep} />
              )}
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>
                {reminder.medicineName}
              </Text>
              {reminder.dosageForm ? (
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
                  {reminder.dosageForm}
                </Text>
              ) : null}
              {linkedMedicine ? (
                <StatusBadge status={deriveDisplayStatus(linkedMedicine)} />
              ) : null}
            </View>
          </View>
          {expiryHighlight ? (
            <View
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: colors.warningSoft,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.warning }}>
                {expiryHighlight.label}
              </Text>
              {linkedMedicine?.expirationDate ? (
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                  {formatDate(linkedMedicine.expirationDate)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <InfoRow icon="time-outline" label="Reminder Time" value={reminder.time} />
          <InfoRow icon="repeat-outline" label="Frequency" value={reminder.frequency} />
          <InfoRow icon="calendar-outline" label="Start Date" value={reminder.startDate ? formatDate(reminder.startDate) : undefined} />
          <InfoRow icon="document-text-outline" label="Notes" value={reminder.notes} />
          <InfoRow icon="person-outline" label="Assigned To" value={reminder.assignedTo} />
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Edit Reminder"
              variant="secondary"
              onPress={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
              icon={<Ionicons name="create-outline" size={18} color={colors.brand} />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Delete Reminder" variant="danger" onPress={handleDelete} loading={deleting} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
