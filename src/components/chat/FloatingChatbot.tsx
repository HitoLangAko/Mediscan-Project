import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { ChatPanel } from './ChatPanel';
import { useTheme } from '../../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FloatingChatbotProps = {
  onOpenFullChat: () => void;
};

export function FloatingChatbot({ onOpenFullChat }: FloatingChatbotProps) {
  const { colors, elevation, fonts, fontSizes, radius, spacing, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const popupMaxHeight = Math.min(height * 0.82, 640);

  function openFullChat() {
    setVisible(false);
    onOpenFullChat();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open MediScan chat"
        onPress={() => setVisible(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.md,
          bottom: insets.bottom + layout.tabBarHeight + spacing.md,
          width: 54,
          height: 54,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.brandDeep : colors.brand,
          ...elevation.lg,
        })}
      >
        <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.lg, color: colors.textInverse }}>
          ?
        </Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss chat"
            onPress={() => setVisible(false)}
            style={{ flex: 1, backgroundColor: colors.overlay }}
          />
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
              maxHeight: popupMaxHeight,
            }}
          >
            <ChatPanel variant="popup" onClose={() => setVisible(false)} onOpenFullChat={openFullChat} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
