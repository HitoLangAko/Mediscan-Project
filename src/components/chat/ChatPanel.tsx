import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChatMessage, createChatMessage, getInitialChatMessages, sendChatMessage } from '../../services/chatEngine';
import { useTheme } from '../../theme/ThemeProvider';

type ChatPanelProps = {
  variant: 'popup' | 'full';
  onClose?: () => void;
  onOpenFullChat?: () => void;
};

export function ChatPanel({ variant, onClose, onOpenFullChat }: ChatPanelProps) {
  const { colors, elevation, fonts, fontSizes, radius, spacing } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialChatMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const isPopup = variant === 'popup';

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setLoading(true);
    setMessages((current) => [...current, createChatMessage('user', trimmed)]);
    try {
      const response = await sendChatMessage(trimmed);
      setMessages((current) => [...current, response]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          ...createChatMessage(
            'assistant',
            'I could not answer that right now. Please try again, or confirm urgent medicine concerns with a pharmacist or doctor.',
          ),
          generatedBy: 'local-rag-fallback',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        flex: isPopup ? 0 : 1,
        maxHeight: isPopup ? '100%' : undefined,
        backgroundColor: colors.card,
        borderRadius: isPopup ? radius.lg : 0,
        overflow: 'hidden',
        paddingBottom: !isPopup && Platform.OS === 'android' ? keyboardHeight : 0,
        ...(isPopup ? elevation.lg : {}),
      }}
    >
      {isPopup ? (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: fontSizes.md, color: colors.text }}>
              MediScan Chat
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted }}>
              Saved medicines and health questions
            </Text>
          </View>

          {onOpenFullChat ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open full chat"
            onPress={onOpenFullChat}
            style={{ paddingHorizontal: spacing.sm, minHeight: 36, justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brand }}>
              Open full chat -&gt;
            </Text>
          </Pressable>
          ) : null}

          {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chat"
            onPress={onClose}
            hitSlop={8}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.lg, color: colors.textMuted }}>
              x
            </Text>
          </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: colors.paper }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {loading ? (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted }}>
              Checking MediScan sources...
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          backgroundColor: colors.card,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          multiline
          placeholder="Ask about your medicines..."
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
          blurOnSubmit={false}
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontFamily: fonts.body,
            fontSize: fontSizes.base,
            color: colors.text,
            backgroundColor: colors.paper,
          }}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : submit}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={loading || !input.trim()}
          onPress={submit}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: loading || !input.trim() ? colors.border : pressed ? colors.brandDeep : colors.brand,
          })}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.md, color: colors.textInverse }}>
            &gt;
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const { colors, fonts, fontSizes, radius, spacing } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '86%',
          borderRadius: radius.md,
          borderTopRightRadius: isUser ? radius.sm : radius.md,
          borderTopLeftRadius: isUser ? radius.md : radius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: isUser ? colors.brand : colors.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            color: isUser ? colors.textInverse : colors.text,
            lineHeight: Math.round(fontSizes.sm * 1.45),
          }}
        >
          {message.text}
        </Text>
        {!isUser && message.generatedBy ? (
          <Text
            style={{
              marginTop: spacing.xs,
              fontFamily: fonts.body,
              fontSize: fontSizes.xs,
              color: colors.textMuted,
            }}
          >
            {message.generatedBy}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
