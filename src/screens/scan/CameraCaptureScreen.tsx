import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runImageScan } from '../../services/scanPipeline';
import { useTheme } from '../../theme/ThemeProvider';
import { ScanSource } from '../../types/Medicine';
import { StackProps } from '../_shared/ScreenStub';

const SCAN_TYPE_LABELS: Record<ScanSource, string> = {
  label: 'Label / Box',
  box: 'Box',
  blister: 'Blister Pack',
  barcode: 'Barcode',
  pill: 'Pill / Capsule',
  manual: 'Manual Text',
  photo: 'Photo',
};

function ViewfinderOverlay({ color }: { color: string }) {
  const bracketSize = 28;
  const bracketWidth = 3;
  const frameSize = 260;

  const bracket = (position: 'tl' | 'tr' | 'bl' | 'br') => {
    const base = { position: 'absolute' as const, width: bracketSize, height: bracketSize, borderColor: color };
    switch (position) {
      case 'tl':
        return { ...base, top: 0, left: 0, borderTopWidth: bracketWidth, borderLeftWidth: bracketWidth };
      case 'tr':
        return { ...base, top: 0, right: 0, borderTopWidth: bracketWidth, borderRightWidth: bracketWidth };
      case 'bl':
        return { ...base, bottom: 0, left: 0, borderBottomWidth: bracketWidth, borderLeftWidth: bracketWidth };
      case 'br':
        return { ...base, bottom: 0, right: 0, borderBottomWidth: bracketWidth, borderRightWidth: bracketWidth };
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.overlayDim} />
      <View style={styles.viewfinderCenter}>
        <View style={{ width: frameSize, height: frameSize, position: 'relative' }}>
          <View style={bracket('tl')} />
          <View style={bracket('tr')} />
          <View style={bracket('bl')} />
          <View style={bracket('br')} />
        </View>
      </View>
      <View style={styles.overlayDim} />
    </View>
  );
}

export function CameraCaptureScreen({ navigation, route }: StackProps<'CameraCapture'>) {
  const { scanType } = route.params;
  const insets = useSafeAreaInsets();
  const { colors, fonts, fontSizes, spacing, layout } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState(false);

  const processImage = useCallback(
    async (uri: string) => {
      setProcessing(true);
      try {
        const scanResult = await runImageScan(uri, scanType);
        navigation.replace('ScanResult', { scanResult });
      } catch (error) {
        Alert.alert('Scan failed', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setProcessing(false);
      }
    },
    [navigation, scanType],
  );

  const handleCapture = async () => {
    if (!cameraRef.current || processing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch (error) {
      Alert.alert('Capture failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleGallery = async () => {
    if (processing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000' }]}>
        <ActivityIndicator color={colors.textInverse} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.paper, padding: spacing.lg }]}>
        <Ionicons name="camera-outline" size={48} color={colors.brandDeep} />
        <Text
          style={{
            fontFamily: fonts.displayMedium,
            fontSize: fontSizes.lg,
            color: colors.text,
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          Camera permission needed
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          MediScan needs camera access to scan medicine labels. You can also use gallery import or manual text on the
          previous screen.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={requestPermission}
            style={{
              backgroundColor: colors.brand,
              borderRadius: 12,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              minHeight: layout.hitTargetMin,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.textInverse }}>
              Grant Permission
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => Linking.openSettings()}
            style={{
              backgroundColor: colors.brand,
              borderRadius: 12,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              minHeight: layout.hitTargetMin,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.textInverse }}>
              Open Settings
            </Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.brand }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const title = SCAN_TYPE_LABELS[scanType] || 'Scan';

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torch} />

      <ViewfinderOverlay color={colors.brand} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.textInverse} />
        </Pressable>
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.textInverse, flex: 1, textAlign: 'center' }}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
          onPress={() => setTorch((value) => !value)}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.xl }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose from gallery" onPress={handleGallery} style={styles.sideControl}>
          <Ionicons name="images-outline" size={28} color={colors.textInverse} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          onPress={handleCapture}
          disabled={processing}
          style={styles.shutterOuter}
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
          onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
          style={styles.sideControl}
        >
          <Ionicons name="camera-reverse-outline" size={28} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={[styles.instructionWrap, { bottom: insets.bottom + spacing.lg + 88 }]}>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textInverse, textAlign: 'center' }}>
          Align the {title.toLowerCase()} inside the frame and tap the shutter
        </Text>
      </View>

      {processing ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color={colors.textInverse} size="large" />
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.base, color: colors.textInverse, marginTop: spacing.md }}>
            Processing scan…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayDim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  viewfinderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  sideControl: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  instructionWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 2,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
