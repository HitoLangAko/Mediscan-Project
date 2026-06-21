import React, { useMemo, useState } from 'react';
import { Alert, Image, ImageSourcePropType, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBar } from '../../components/AppBar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfidenceMeter } from '../../components/ConfidenceMeter';
import { MedicineListItem } from '../../components/MedicineListItem';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { assessExistingScanForConcern } from '../../services/scanPipeline';
import { saveScanToVault } from '../../services/vaultStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { ScanResult, ScanStatus } from '../../types/Medicine';
import { StackProps } from '../_shared/ScreenStub';

type BannerVariant = 'verified' | 'needsVerification' | 'lowConfidence' | 'expired';

function getBannerVariant(result: ScanResult): BannerVariant {
  if (result.finalStatus === 'Expired') return 'expired';
  if (result.confidenceScore < 40) return 'lowConfidence';
  if (result.finalStatus === 'Verified' && result.confidenceScore >= 85) return 'verified';
  if (result.finalStatus === 'Needs Verification' || result.confidenceScore < 85) return 'needsVerification';
  return 'verified';
}

function getBannerConfig(variant: BannerVariant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'expired':
      return {
        bg: colors.danger,
        title: 'Expired Medicine',
        message: 'This medicine appears to be past its expiration date.',
      };
    case 'lowConfidence':
      return {
        bg: colors.danger,
        title: 'Low Confidence',
        message: 'We could not confidently identify this medicine. Try scanning the label or box.',
      };
    case 'needsVerification':
      return {
        bg: colors.warning,
        title: 'Needs Verification',
        message: 'This match needs manual confirmation before you rely on it.',
      };
    case 'verified':
    default:
      return {
        bg: colors.success,
        title: 'Verified Match',
        message: 'This scan matched the local reference database with high confidence.',
      };
  }
}

function getDisplayStatus(result: ScanResult): ScanStatus | 'Low Confidence' {
  if (result.finalStatus === 'Expired') return 'Expired';
  if (result.confidenceScore < 40) return 'Low Confidence';
  return result.finalStatus;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  const { colors, fonts, fontSizes, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textMuted, flex: 1 }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: fontSizes.sm,
          color: colors.text,
          flex: 1.2,
          textAlign: 'right',
        }}
      >
        {value?.trim() ? value : 'Not detected'}
      </Text>
    </View>
  );
}

export function ScanResultScreen({ navigation, route }: StackProps<'ScanResult'>) {
  const { scanResult: initialResult } = route.params;
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [scanResult, setScanResult] = useState(initialResult);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [concern, setConcern] = useState(scanResult.suitability?.userConcern || '');
  const [assessing, setAssessing] = useState(false);

  const variant = useMemo(() => getBannerVariant(scanResult), [scanResult]);
  const banner = getBannerConfig(variant, colors);
  const topMatch = scanResult.candidates[0];
  const reference = topMatch?.reference;
  const displayName =
    scanResult.parsed.brandName ||
    reference?.brandName ||
    reference?.sourceDrugName ||
    scanResult.parsed.genericName ||
    'Unknown Medicine';
  const genericName = scanResult.parsed.genericName || reference?.genericName;
  const dosageForm = scanResult.parsed.dosageForm || reference?.dosageForm;

  const imageSource: ImageSourcePropType | undefined =
    scanResult.imageUri !== undefined
      ? typeof scanResult.imageUri === 'number'
        ? scanResult.imageUri
        : { uri: scanResult.imageUri }
      : undefined;

  const showMatchesList = variant === 'needsVerification' || variant === 'lowConfidence';

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveScanToVault(scanResult);
      setSaved(true);
      Alert.alert('Saved to Vault', 'This medicine has been added to your vault.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssessConcern = async () => {
    const trimmed = concern.trim();
    if (!trimmed) {
      Alert.alert('Enter a concern', 'Describe what you want to check about this medicine.');
      return;
    }
    setAssessing(true);
    try {
      const updated = await assessExistingScanForConcern(scanResult, trimmed);
      setScanResult(updated);
    } catch (error) {
      Alert.alert('Assessment failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAssessing(false);
    }
  };

  return (
    <Screen padded={false} contentStyle={{ padding: 0 }}>
      <AppBar title="Scan Result" showBack onBack={() => navigation.goBack()} />

      <View style={{ backgroundColor: banner.bg, padding: spacing.lg, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.textInverse, flex: 1 }}>
            {banner.title}
          </Text>
          <StatusBadge status={getDisplayStatus(scanResult)} />
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textInverse }}>{banner.message}</Text>
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        {imageSource ? (
          <View style={{ alignItems: 'center' }}>
            <Image
              source={imageSource}
              style={{ width: 120, height: 120, borderRadius: radius.lg, backgroundColor: colors.brandLight }}
              resizeMode="cover"
            />
          </View>
        ) : null}

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.text }}>{displayName}</Text>
          {genericName ? (
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 4 }}>
              {genericName}
              {dosageForm ? ` · ${dosageForm}` : ''}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.md }}>
            <ConfidenceMeter score={scanResult.confidenceScore} />
          </View>
        </Card>

        {showMatchesList ? (
          <View>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
              Possible matches
            </Text>
            {scanResult.candidates.length > 0 ? (
              scanResult.candidates.slice(0, 5).map((candidate) => (
                <MedicineListItem
                  key={candidate.reference.id}
                  name={candidate.reference.brandName || candidate.reference.sourceDrugName}
                  subtitle={`${candidate.reference.genericName} · ${candidate.score}% match`}
                  meta={candidate.reasons.slice(0, 2).join(' · ')}
                  status={scanResult.finalStatus}
                />
              ))
            ) : (
              <Card style={{ marginBottom: 0 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
                  No close matches found in the local database. Try scanning the full label or entering text manually.
                </Text>
              </Card>
            )}
          </View>
        ) : (
          <Card style={{ marginBottom: 0 }}>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
              Detected details
            </Text>
            <DetailRow label="Generic" value={genericName} />
            <DetailRow label="Strength" value={scanResult.parsed.strength || reference?.strength} />
            <DetailRow label="Form" value={dosageForm} />
            <DetailRow label="Manufacturer" value={scanResult.parsed.manufacturer || reference?.manufacturer} />
            <DetailRow label="Expiry" value={scanResult.parsed.expirationDate} />
            <DetailRow label="Barcode" value={scanResult.parsed.barcodeGtin || reference?.barcodeGtin} />
          </Card>
        )}

        <Card style={{ marginBottom: 0, backgroundColor: colors.warningSoft, borderColor: colors.warning }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text }}>
              {scanResult.safetyWarning}
            </Text>
          </View>
          {scanResult.qvacNotes ? (
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm }}>
              {scanResult.qvacNotes}
            </Text>
          ) : null}
        </Card>

        {scanResult.source === 'pill' ? (
          <Card style={{ marginBottom: 0, backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.danger, marginBottom: spacing.xs }}>
              Pill-only scan warning
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text }}>
              Pill appearance alone cannot confirm identity. Always verify using the label, box, blister pack, or a
              pharmacist.
            </Text>
          </Card>
        ) : null}

        <Card style={{ marginBottom: 0 }}>
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.xs }}>
            Check a concern
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.md }}>
            Optional: ask whether this medicine may fit a symptom or use case.
          </Text>
          <TextInput
            value={concern}
            onChangeText={setConcern}
            placeholder="e.g. Can I take this for fever?"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              fontFamily: fonts.body,
              fontSize: fontSizes.base,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          />
          <Button title="Assess Concern" variant="secondary" onPress={handleAssessConcern} loading={assessing} />
          {scanResult.suitability ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brandDeep }}>
                {scanResult.suitability.decision}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text }}>
                {scanResult.suitability.answer}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted }}>
                {scanResult.suitability.safety}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            title={saved ? 'Saved to Vault' : 'Save to Vault'}
            onPress={handleSave}
            loading={saving}
            disabled={saved}
          />
          <Button
            title="View Details"
            variant="secondary"
            onPress={() => navigation.navigate('MedicineDetails', { scanResult })}
          />
          <Button title="Scan Again" variant="ghost" onPress={() => navigation.navigate('ChooseScanType')} />
        </View>

        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center' }}>
          Not diagnosis or prescribing — confirm with label, pharmacist, or doctor.
        </Text>
      </View>
    </Screen>
  );
}
