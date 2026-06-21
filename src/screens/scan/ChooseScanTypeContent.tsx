import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { FeatureTile } from '../../components/FeatureTile';
import { PillIcon } from '../../components/PillIcon';
import { demoSamples, DemoSample } from '../../data/demoSamples';
import { RootStackParamList } from '../../navigation/types';
import { runDemoScan, runManualTextScan } from '../../services/scanPipeline';
import { useTheme } from '../../theme/ThemeProvider';
import { ScanSource } from '../../types/Medicine';

type ScanTypeOption = {
  source: ScanSource;
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: React.ReactNode;
};

const SCAN_TYPES: ScanTypeOption[] = [
  { source: 'label', title: 'Label / Box', description: 'Scan the medicine label or outer box', icon: 'document-text-outline' },
  { source: 'blister', title: 'Blister Pack', description: 'Scan blister pack text and markings', icon: 'grid-outline' },
  { source: 'barcode', title: 'Barcode', description: 'Scan the product barcode', icon: 'barcode-outline' },
  { source: 'pill', title: 'Pill / Capsule', description: 'Identify by pill appearance only' },
];

type Props = {
  navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>;
};

export function ChooseScanTypeContent({ navigation }: Props) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const [manualText, setManualText] = useState('');
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const handleDemoScan = async (sample: DemoSample) => {
    setLoadingDemoId(sample.id);
    try {
      const scanResult = await runDemoScan(sample);
      navigation.navigate('ScanResult', { scanResult });
    } catch (error) {
      Alert.alert('Demo scan failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoadingDemoId(null);
    }
  };

  const handleManualScan = async () => {
    const text = manualText.trim();
    if (!text) {
      Alert.alert('Enter label text', 'Type visible medicine label text to scan manually.');
      return;
    }
    setManualLoading(true);
    try {
      const scanResult = await runManualTextScan(text);
      navigation.navigate('ScanResult', { scanResult });
    } catch (error) {
      Alert.alert('Manual scan failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
          What are you scanning?
        </Text>
        {SCAN_TYPES.map((option) => (
          <FeatureTile
            key={option.source}
            title={option.title}
            description={option.description}
            icon={option.icon}
            iconNode={
              option.source === 'pill' ? <PillIcon size={26} color={colors.brandDeep} /> : option.iconNode
            }
            onPress={() => navigation.navigate('CameraCapture', { scanType: option.source })}
          />
        ))}
      </View>

      <View>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.sm }}>
          Try a demo
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.md }}>
          Bundled samples use mock OCR text — reliable for hackathon demos.
        </Text>
        {demoSamples.map((sample) => (
          <Pressable
            key={sample.id}
            accessibilityRole="button"
            disabled={loadingDemoId !== null}
            onPress={() => handleDemoScan(sample)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: spacing.sm,
                flexDirection: 'row',
                gap: spacing.md,
                alignItems: 'center',
                opacity: pressed || loadingDemoId === sample.id ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                backgroundColor: colors.brandLight,
                overflow: 'hidden',
              }}
            >
              <Image source={sample.image} style={{ width: 56, height: 56 }} resizeMode="cover" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.text }}>
                {sample.title}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
                {sample.subtitle}
              </Text>
            </View>
            {loadingDemoId === sample.id ? (
              <Ionicons name="hourglass-outline" size={20} color={colors.brand} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text, marginBottom: spacing.xs }}>
          Manual text fallback
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.md }}>
          Type visible label text if the camera cannot read the photo clearly.
        </Text>
        <TextInput
          value={manualText}
          onChangeText={setManualText}
          placeholder="e.g. Paracetamol 500 mg Tablet EXP 2027-08"
          placeholderTextColor={colors.textMuted}
          multiline
          style={{
            minHeight: 96,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            fontFamily: fonts.body,
            fontSize: fontSizes.base,
            color: colors.text,
            textAlignVertical: 'top',
            marginBottom: spacing.md,
          }}
        />
        <Button title="Scan Text" onPress={handleManualScan} loading={manualLoading} disabled={!manualText.trim()} />
      </Card>
    </View>
  );
}
