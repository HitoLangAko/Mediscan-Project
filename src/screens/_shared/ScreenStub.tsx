import React from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { RootStackParamList } from '../../navigation/types';

type Props = {
  title: string;
  routeName: string;
  planRef: string;
  showBack?: boolean;
  onBack?: () => void;
};

export function ScreenStub({ title, routeName, planRef, showBack, onBack }: Props) {
  const { colors, fonts, fontSizes, spacing } = useTheme();

  return (
    <Screen>
      <AppBar title={title} showBack={showBack} onBack={onBack} />
      <EmptyState
        title={`${title} — scaffold`}
        message={`Route: ${routeName}. Implement per FRONTEND_PLAN.md § ${planRef}.`}
      />
      <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandLight, borderRadius: 12 }}>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: fontSizes.sm, color: colors.brandDeep }}>
          Foundation phase placeholder
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs }}>
          Wire services and full layout in the screen implementation pass.
        </Text>
      </View>
    </Screen>
  );
}

export type StackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
