import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { PillIcon } from '../../components/PillIcon';
import { Screen } from '../../components/Screen';
import { getFamilyMembers } from '../../services/familyStore';
import {
  ReminderFrequency,
  addReminder,
  getReminder,
  updateReminder,
} from '../../services/remindersStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { UserMedicine } from '../../types/Medicine';
import { todayIso } from '../../utils/familyMedicines';
import {
  formatReminderTime,
  from12HourParts,
  parseReminderTime,
  to12HourParts,
} from '../../utils/reminderTime';
import { StackProps } from '../_shared/ScreenStub';

const FREQUENCY_CHIPS = [
  { id: 'Once', label: 'Once' },
  { id: 'Daily', label: 'Daily' },
  { id: 'Weekly', label: 'Weekly' },
  { id: 'Monthly', label: 'Monthly' },
];

export function AddReminderScreen({ navigation, route }: StackProps<'AddReminder'>) {
  const editId = route.params?.reminderId;
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();

  const [loading, setLoading] = useState(Boolean(editId));
  const [vaultItems, setVaultItems] = useState<UserMedicine[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [medicineId, setMedicineId] = useState<string | undefined>();
  const [medicineName, setMedicineName] = useState('');
  const [dosageForm, setDosageForm] = useState('');
  const [hourText, setHourText] = useState('08');
  const [minuteText, setMinuteText] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [frequency, setFrequency] = useState<ReminderFrequency>('Daily');
  const [startDate, setStartDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('Me');
  const [saving, setSaving] = useState(false);

  const buildFormattedTime = (): string | null => {
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!hourText.trim() || !minuteText.trim()) return null;
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    const { hour24, minute: mins } = from12HourParts(hour, minute, period);
    return formatReminderTime(hour24, mins);
  };

  const loadForm = useCallback(async () => {
    setLoading(true);
    try {
      const [items, members] = await Promise.all([getVaultItems(), getFamilyMembers()]);
      setVaultItems(items);
      setFamilyMembers(members.map((m) => ({ id: m.id, name: m.name })));

      if (editId) {
        const existing = await getReminder(editId);
        if (!existing) {
          Alert.alert('Reminder not found', 'This reminder may have been deleted.');
          navigation.goBack();
          return;
        }
        setMedicineId(existing.medicineId);
        setMedicineName(existing.medicineName);
        setDosageForm(existing.dosageForm ?? '');
        const parsed = parseReminderTime(existing.time);
        const { hour12, period: parsedPeriod } = to12HourParts(parsed.hour24);
        setHourText(String(hour12).padStart(2, '0'));
        setMinuteText(String(parsed.minute).padStart(2, '0'));
        setPeriod(parsedPeriod);
        setFrequency(existing.frequency);
        setStartDate(existing.startDate?.slice(0, 10) ?? todayIso());
        setNotes(existing.notes ?? '');
        setAssignedTo(existing.assignedTo ?? 'Me');
      }
    } finally {
      setLoading(false);
    }
  }, [editId, navigation]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const selectMedicine = (item: UserMedicine) => {
    setMedicineId(item.userMedicineId);
    setMedicineName(item.displayName);
    setDosageForm(item.dosageForm ?? '');
  };

  const handleSave = async () => {
    const name = medicineName.trim();
    if (!name) {
      Alert.alert('Medicine required', 'Select a medicine from your vault or enter a name.');
      return;
    }

    const formattedTime = buildFormattedTime();
    if (!formattedTime) {
      Alert.alert('Invalid time', 'Enter a valid time — hour 1–12 and minute 0–59.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        medicineId,
        medicineName: name,
        dosageForm: dosageForm.trim() || undefined,
        type: 'medication' as const,
        time: formattedTime,
        frequency,
        startDate,
        notes: notes.trim() || undefined,
        assignedTo,
      };

      if (editId) {
        await updateReminder(editId, payload);
      } else {
        await addReminder(payload);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <AppBar
          title={editId ? 'Edit Reminder' : 'Add Reminder'}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState title="Loading…" message="Preparing reminder form." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        title={editId ? 'Edit Reminder' : 'Add Reminder'}
        subtitle="Set time, frequency, and notes"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={{ gap: spacing.md }}>
        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Medicine
          </Text>
          {vaultItems.length > 0 ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              {vaultItems.slice(0, 5).map((item) => {
                const selected = medicineId === item.userMedicineId;
                return (
                  <Pressable
                    key={item.userMedicineId}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectMedicine(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.brand : colors.border,
                      backgroundColor: selected ? colors.brandLight : colors.card,
                    }}
                  >
                    <PillIcon size={18} color={colors.brandDeep} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.text }}>
                        {item.displayName}
                      </Text>
                      {item.dosageForm ? (
                        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted }}>
                          {item.dosageForm}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.sm }}>
              No vault medicines yet — enter a name below.
            </Text>
          )}
          <TextInput
            value={medicineName}
            onChangeText={(text) => {
              setMedicineName(text);
              setMedicineId(undefined);
            }}
            placeholder="Medicine name"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              fontFamily: fonts.body,
              fontSize: fontSizes.base,
              color: colors.text,
            }}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Reminder Time
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={hourText}
              onChangeText={(text) => setHourText(text.replace(/[^0-9]/g, '').slice(0, 2))}
              onBlur={() => setHourText((prev) => (prev.trim() ? prev.padStart(2, '0') : prev))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="HH"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Hour"
              style={{
                width: 64,
                textAlign: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontFamily: fonts.bodySemibold,
                fontSize: fontSizes.lg,
                color: colors.text,
              }}
            />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.lg, color: colors.text }}>:</Text>
            <TextInput
              value={minuteText}
              onChangeText={(text) => setMinuteText(text.replace(/[^0-9]/g, '').slice(0, 2))}
              onBlur={() => setMinuteText((prev) => (prev.trim() ? prev.padStart(2, '0') : prev))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="MM"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Minute"
              style={{
                width: 64,
                textAlign: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontFamily: fonts.bodySemibold,
                fontSize: fontSizes.lg,
                color: colors.text,
              }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm }}>
              {(['AM', 'PM'] as const).map((value) => {
                const selected = period === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setPeriod(value)}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.brand : colors.border,
                      backgroundColor: selected ? colors.brandLight : colors.card,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: fontSizes.sm,
                        color: selected ? colors.brandDeep : colors.text,
                      }}
                    >
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Frequency
          </Text>
          <FilterChips
            chips={FREQUENCY_CHIPS}
            selectedId={frequency}
            onSelect={(id) => setFrequency(id as ReminderFrequency)}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Start Date
          </Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              fontFamily: fonts.body,
              fontSize: fontSizes.base,
              color: colors.text,
            }}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Take 1 tablet after breakfast…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              minHeight: 88,
              fontFamily: fonts.body,
              fontSize: fontSizes.base,
              color: colors.text,
            }}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Assign to
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {familyMembers.map((member) => {
              const selected = assignedTo === member.name;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setAssignedTo(member.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.brand : colors.border,
                    backgroundColor: selected ? colors.brandLight : colors.card,
                  }}
                >
                  <Ionicons name="person-circle-outline" size={20} color={colors.brandDeep} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.sm,
                      color: selected ? colors.brandDeep : colors.text,
                    }}
                  >
                    {member.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Button title={editId ? 'Save Changes' : 'Save Reminder'} onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  );
}
