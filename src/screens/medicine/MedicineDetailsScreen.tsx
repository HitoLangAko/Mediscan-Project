import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfidenceMeter } from '../../components/ConfidenceMeter';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { getAllMedicineReferences } from '../../services/medicineMatcher';
import { getFamilyMembers } from '../../services/familyStore';
import { getMedicineMeta, setMedicineMeta } from '../../services/medicineMetaStore';
import { deleteVaultItem, getVaultItems, saveScanToVault } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import {
  MedicineReference,
  ScanResult,
  ScanSource,
  ScanStatus,
  UserMedicine,
} from '../../types/Medicine';
import { formatDate } from '../../utils/date';
import { StackProps } from '../_shared/ScreenStub';

type DetailsViewModel = {
  displayName: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  category?: string;
  commonUses?: string;
  howToUse?: string;
  warnings?: string;
  manufacturer?: string;
  expirationDate?: string;
  storage?: string;
  scanSource: ScanSource;
  scanStatus: ScanStatus;
  confidenceScore: number;
  imageUri?: string | number;
};

/** Clipped content height when Medicine Information is collapsed (~2.5 InfoRows). */
const COLLAPSED_MAX_HEIGHT = 156;

const SCAN_SOURCE_LABELS: Record<ScanSource, string> = {
  label: 'label',
  box: 'box',
  blister: 'blister pack',
  barcode: 'barcode',
  pill: 'pill',
  manual: 'manual entry',
  photo: 'photo',
};

function displayValue(value?: string): string {
  return value?.trim() ? value.trim() : 'Not detected';
}

function inferCategory(reference?: MedicineReference): string | undefined {
  if (!reference?.commonUses) return undefined;
  const uses = reference.commonUses.toLowerCase();
  if (uses.includes('pain') || uses.includes('fever')) return 'Pain Reliever / Fever Reducer';
  if (uses.includes('antibiotic')) return 'Antibiotic';
  if (uses.includes('allergy')) return 'Allergy Relief';
  if (uses.includes('cough') || uses.includes('cold')) return 'Cough & Cold';
  return undefined;
}

function buildFromScanResult(scanResult: ScanResult): DetailsViewModel {
  const top = scanResult.candidates[0];
  const reference = top?.reference;

  return {
    displayName:
      scanResult.parsed.brandName ||
      reference?.brandName ||
      reference?.sourceDrugName ||
      scanResult.parsed.genericName ||
      'Unknown Medicine',
    genericName: scanResult.parsed.genericName || reference?.genericName,
    dosageForm: scanResult.parsed.dosageForm || reference?.dosageForm,
    strength: scanResult.parsed.strength || reference?.strength,
    category: inferCategory(reference),
    commonUses: reference?.commonUses,
    howToUse: reference?.route ? `${reference.route} — follow product label` : undefined,
    warnings: reference?.warnings || reference?.safetyNotes,
    manufacturer: scanResult.parsed.manufacturer || reference?.manufacturer,
    expirationDate: scanResult.parsed.expirationDate,
    storage: reference?.storageInstructions,
    scanSource: scanResult.source,
    scanStatus: scanResult.finalStatus,
    confidenceScore: scanResult.confidenceScore,
    imageUri: scanResult.imageUri,
  };
}

function buildFromVaultItem(item: UserMedicine, reference?: MedicineReference): DetailsViewModel {
  return {
    displayName: item.displayName,
    genericName: item.genericName || reference?.genericName,
    dosageForm: item.dosageForm || reference?.dosageForm,
    strength: item.strength || reference?.strength,
    category: inferCategory(reference),
    commonUses: reference?.commonUses,
    howToUse: reference?.route ? `${reference.route} — follow product label` : undefined,
    warnings: reference?.warnings || reference?.safetyNotes,
    manufacturer: item.manufacturer || reference?.manufacturer,
    expirationDate: item.expirationDate,
    storage: reference?.storageInstructions,
    scanSource: item.scanSource,
    scanStatus: item.scanStatus,
    confidenceScore: item.confidenceScore,
    imageUri: item.imageUri,
  };
}

function buildShareText(details: DetailsViewModel): string {
  const lines = [
    details.displayName,
    details.genericName ? `Generic: ${details.genericName}` : undefined,
    details.strength ? `Strength: ${details.strength}` : undefined,
    details.dosageForm ? `Type: ${details.dosageForm}` : undefined,
    details.expirationDate ? `Expiry: ${formatDate(details.expirationDate)}` : undefined,
    '',
    'Shared from MediScan Vault — not diagnosis or prescribing.',
  ].filter(Boolean);
  return lines.join('\n');
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
};

function InfoRow({ icon, label, value, danger }: InfoRowProps) {
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const display = displayValue(value);

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
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.brandDeep} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textMuted }}>
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            color: danger ? colors.danger : colors.text,
          }}
        >
          {display}
        </Text>
      </View>
    </View>
  );
}

export function MedicineDetailsScreen({ navigation, route }: StackProps<'MedicineDetails'>) {
  const { userMedicineId: paramId, scanResult: paramScanResult } = route.params;
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();

  const [loading, setLoading] = useState(Boolean(paramId));
  const [vaultItem, setVaultItem] = useState<UserMedicine | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | undefined>(paramScanResult);
  const [savedId, setSavedId] = useState<string | undefined>(paramId);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState('Me');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [familyOptions, setFamilyOptions] = useState<string[]>(['Me']);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const notesInputRef = useRef<TextInput>(null);
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const isSaved = Boolean(savedId);

  const reference = useMemo(() => {
    const refs = getAllMedicineReferences();
    if (vaultItem?.referenceId) {
      return refs.find((r) => r.id === vaultItem.referenceId);
    }
    return scanResult?.candidates[0]?.reference;
  }, [vaultItem, scanResult]);

  const details = useMemo(() => {
    if (vaultItem) return buildFromVaultItem(vaultItem, reference);
    if (scanResult) return buildFromScanResult(scanResult);
    return null;
  }, [vaultItem, scanResult, reference]);

  const imageSource: ImageSourcePropType | undefined =
    details?.imageUri !== undefined
      ? typeof details.imageUri === 'number'
        ? details.imageUri
        : { uri: details.imageUri }
      : undefined;

  const loadVaultItem = useCallback(async () => {
    if (!paramId) return;
    setLoading(true);
    try {
      const items = await getVaultItems();
      const found = items.find((i) => i.userMedicineId === paramId);
      if (!found) {
        setVaultItem(null);
        return;
      }
      setVaultItem(found);
      setSavedId(found.userMedicineId);
      setNotes(found.notes ?? '');
      const meta = await getMedicineMeta(found.userMedicineId);
      if (meta.notes !== undefined) setNotes(meta.notes);
      if (meta.tags) setTags(meta.tags);
      if (meta.assignedTo) setAssignedTo(meta.assignedTo);
    } finally {
      setLoading(false);
    }
  }, [paramId]);

  useEffect(() => {
    if (paramId) {
      loadVaultItem();
    }
  }, [paramId, loadVaultItem]);

  useEffect(() => {
    getFamilyMembers().then((members) => setFamilyOptions(members.map((m) => m.name)));
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      chevronAnim.setValue(infoExpanded ? 1 : 0);
      return;
    }
    Animated.timing(chevronAnim, {
      toValue: infoExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [infoExpanded, reduceMotion, chevronAnim]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggleInfoExpanded = useCallback(() => {
    setInfoExpanded((prev) => !prev);
  }, []);

  const persistMeta = useCallback(
    async (id: string, patch: { notes?: string; tags?: string[]; assignedTo?: string }) => {
      await setMedicineMeta(id, patch);
    },
    [],
  );

  const handleNotesBlur = useCallback(async () => {
    if (!savedId) return;
    await persistMeta(savedId, { notes, tags, assignedTo });
  }, [savedId, notes, tags, assignedTo, persistMeta]);

  const handleAddTag = useCallback(async () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const next = [...tags, trimmed];
    setTags(next);
    setTagInput('');
    if (savedId) await persistMeta(savedId, { notes, tags: next, assignedTo });
  }, [tagInput, tags, savedId, notes, assignedTo, persistMeta]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      if (savedId) await persistMeta(savedId, { notes, tags: next, assignedTo });
    },
    [tags, savedId, notes, assignedTo, persistMeta],
  );

  const handleAssignChange = useCallback(
    async (member: string) => {
      setAssignedTo(member);
      if (savedId) await persistMeta(savedId, { notes, tags, assignedTo: member });
    },
    [savedId, notes, tags, persistMeta],
  );

  const handleShare = useCallback(async () => {
    if (!details) return;
    try {
      await Share.share({ message: buildShareText(details), title: details.displayName });
    } catch {
      // User dismissed share sheet
    }
  }, [details]);

  const handleDelete = useCallback(() => {
    if (!savedId) return;
    Alert.alert('Delete medicine', 'Remove this medicine from your vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteVaultItem(savedId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [savedId, navigation]);

  const handleSave = useCallback(async () => {
    if (!scanResult) return;
    setSaving(true);
    try {
      const saved = await saveScanToVault(scanResult, notes);
      await setMedicineMeta(saved.userMedicineId, { notes, tags, assignedTo });
      setSavedId(saved.userMedicineId);
      setVaultItem(saved);
      setScanResult(undefined);
      Alert.alert('Saved to Vault', 'This medicine has been added to your vault.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [scanResult, notes, tags, assignedTo]);

  const showOverflowMenu = useCallback(() => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Share', onPress: handleShare },
    ];
    if (isSaved) {
      options.push({ text: 'Delete', style: 'destructive', onPress: handleDelete });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Options', undefined, options);
  }, [isSaved, handleShare, handleDelete]);

  if (loading) {
    return (
      <Screen>
        <AppBar title="Medicine Details" showBack onBack={() => navigation.goBack()} />
        <EmptyState title="Loading…" message="Fetching medicine details." />
      </Screen>
    );
  }

  if (!details) {
    return (
      <Screen>
        <AppBar title="Medicine Details" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          title="Medicine not found"
          message="This medicine could not be loaded. It may have been removed from your vault."
        />
      </Screen>
    );
  }

  const assignOptions =
    assignedTo && !familyOptions.includes(assignedTo) ? [assignedTo, ...familyOptions] : familyOptions;

  return (
    <Screen padded={false} contentStyle={{ padding: 0 }}>
      <AppBar
        title="Medicine Details"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            onPress={showOverflowMenu}
            hitSlop={8}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.brandDeep} />
          </Pressable>
        }
      />

      <View style={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}>
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
                <Ionicons name="medkit-outline" size={32} color={colors.brandDeep} />
              )}
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>
                {details.displayName}
              </Text>
              <StatusBadge status={details.scanStatus} />
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
                Scanned from {SCAN_SOURCE_LABELS[details.scanSource]}
              </Text>
              <ConfidenceMeter score={details.confidenceScore} />
            </View>
          </View>
        </Card>

        <View accessibilityRole="summary" accessibilityLabel="Medicine warnings">
          <Card style={{ marginBottom: 0, backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                marginBottom: spacing.xs,
                alignItems: 'center',
              }}
            >
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
                Warnings
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger }}>
              {displayValue(details.warnings)}
            </Text>
          </Card>
        </View>

        <Card style={{ marginBottom: 0, overflow: 'hidden' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: infoExpanded }}
            accessibilityLabel="Medicine Information"
            accessibilityHint="Shows full medicine details"
            onPress={toggleInfoExpanded}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
                Medicine Information
              </Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <Ionicons name="chevron-down" size={20} color={colors.brandDeep} />
              </Animated.View>
            </View>

            <View style={{ position: 'relative' }}>
              <View
                style={{
                  overflow: 'hidden',
                  maxHeight: infoExpanded ? undefined : COLLAPSED_MAX_HEIGHT,
                }}
              >
                <InfoRow icon="flask-outline" label="Generic" value={details.genericName} />
                <InfoRow icon="medical-outline" label="Type" value={details.dosageForm} />
                <InfoRow icon="scale-outline" label="Strength" value={details.strength} />
                <InfoRow icon="grid-outline" label="Category" value={details.category} />
                <InfoRow icon="heart-outline" label="Common Uses" value={details.commonUses} />
                <InfoRow icon="document-text-outline" label="How to Use" value={details.howToUse} />
                <InfoRow icon="business-outline" label="Manufacturer" value={details.manufacturer} />
                <InfoRow icon="calendar-outline" label="Expiry Date" value={formatDate(details.expirationDate)} />
                <InfoRow icon="thermometer-outline" label="Storage" value={details.storage} />
              </View>

              {!infoExpanded ? (
                <LinearGradient
                  colors={['transparent', colors.card]}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 44,
                  }}
                />
              ) : null}
            </View>

            {!infoExpanded ? (
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: fontSizes.xs,
                  color: colors.brand,
                  textAlign: 'center',
                  marginTop: spacing.xs,
                }}
              >
                Show all details
              </Text>
            ) : null}
          </Pressable>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Notes
          </Text>
          <TextInput
            ref={notesInputRef}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this medicine…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              minHeight: 96,
              fontFamily: fonts.body,
              fontSize: fontSizes.base,
              color: colors.text,
            }}
          />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Tags
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
            {tags.map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
                onPress={() => handleRemoveTag(tag)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  backgroundColor: colors.brandLight,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brandDeep }}>
                  {tag}
                </Text>
                <Ionicons name="close-circle" size={16} color={colors.brandDeep} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tag"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                color: colors.text,
              }}
            />
            <Button title="Add Tag" variant="secondary" onPress={handleAddTag} />
          </View>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
            Assigned to
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {assignOptions.map((member) => {
              const selected = assignedTo === member;
              return (
                <Pressable
                  key={member}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleAssignChange(member)}
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
                    {member}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Add Note"
              variant="secondary"
              onPress={() => notesInputRef.current?.focus()}
            />
          </View>
          <View style={{ flex: 1 }}>
            {isSaved ? (
              <Button title="Delete" variant="danger" onPress={handleDelete} loading={deleting} />
            ) : (
              <Button title="Save to Vault" onPress={handleSave} loading={saving} />
            )}
          </View>
        </View>

        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center' }}>
          Not diagnosis or prescribing — confirm with label, pharmacist, or doctor.
        </Text>
      </View>
    </Screen>
  );
}
