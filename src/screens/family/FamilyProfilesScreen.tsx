import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FeatureTile } from '../../components/FeatureTile';
import { Screen } from '../../components/Screen';
import {
  FamilyMember,
  addFamilyMember,
  getFamilyMembers,
} from '../../services/familyStore';
import { getVaultItems } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { assignedMemberName, loadVaultWithMeta } from '../../utils/familyMedicines';
import { StackProps } from '../_shared/ScreenStub';

type MemberWithCount = FamilyMember & { medicineCount: number };

export function FamilyProfilesScreen({ navigation }: StackProps<'FamilyProfiles'>) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [members, setMembers] = useState<MemberWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [family, vaultItems] = await Promise.all([getFamilyMembers(), getVaultItems()]);
      const withMeta = await loadVaultWithMeta(vaultItems);
      const counts = new Map<string, number>();
      for (const member of family) {
        counts.set(member.name, 0);
      }
      for (const entry of withMeta) {
        const name = assignedMemberName(entry.meta);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      setMembers(
        family.map((member) => ({
          ...member,
          medicineCount: counts.get(member.name) ?? 0,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers]),
  );

  const handleAddMember = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a name for the family member.');
      return;
    }
    setSaving(true);
    try {
      await addFamilyMember({ name, relation: newRelation.trim() || undefined });
      setNewName('');
      setNewRelation('');
      setShowAddForm(false);
      await loadMembers();
    } catch (error) {
      Alert.alert('Add failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppBar
        title="Family Profiles"
        subtitle="Manage medicines by family member"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable accessibilityLabel="Add family member" onPress={() => setShowAddForm((v) => !v)} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={24} color={colors.brandDeep} />
          </Pressable>
        }
      />

      {loading ? (
        <EmptyState title="Loading…" message="Fetching family profiles." />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Card style={{ backgroundColor: colors.brandLight, marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.brandDeep }}>
                  Manage medicines by family member
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs }}>
                  Assign medicines and reminders to each person in your household.
                </Text>
              </View>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.lg,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="people-outline" size={32} color={colors.brand} />
              </View>
            </View>
          </Card>

          {members.map((member) => (
            <FeatureTile
              key={member.id}
              title={member.name}
              description={`${member.medicineCount} Medicine${member.medicineCount === 1 ? '' : 's'}`}
              icon="person-circle-outline"
              onPress={() => navigation.navigate('FamilyMember', { memberId: member.id })}
            />
          ))}

          {showAddForm ? (
            <Card style={{ marginBottom: 0 }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
                New Family Member
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Name"
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  fontFamily: fonts.body,
                  fontSize: fontSizes.base,
                  color: colors.text,
                }}
              />
              <TextInput
                value={newRelation}
                onChangeText={setNewRelation}
                placeholder="Relation (optional)"
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  fontFamily: fonts.body,
                  fontSize: fontSizes.base,
                  color: colors.text,
                }}
              />
              <Button title="Save Member" onPress={handleAddMember} loading={saving} />
            </Card>
          ) : null}

          <Button
            title="+ Add Family Member"
            onPress={() => setShowAddForm(true)}
            icon={<Ionicons name="add-outline" size={18} color={colors.textInverse} />}
          />
        </View>
      )}
    </Screen>
  );
}
