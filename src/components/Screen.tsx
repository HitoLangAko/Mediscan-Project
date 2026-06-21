import React, { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, isAppBarElement } from './AppBar';
import { useTheme } from '../theme/ThemeProvider';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

function splitScreenChildren(children: ReactNode) {
  const items = React.Children.toArray(children);
  if (items.length > 0 && isAppBarElement(items[0])) {
    return { header: items[0], body: items.slice(1) };
  }
  return { header: null, body: items };
}

function renderBody(children: ReactNode, horizontalPadding: number) {
  if (horizontalPadding === 0) {
    return children;
  }

  return <View style={{ paddingHorizontal: horizontalPadding }}>{children}</View>;
}

export function Screen({ children, scroll = true, padded = true, style, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const horizontalPadding = padded ? spacing.md : 0;
  const { header, body } = splitScreenChildren(children);
  const contentTopGap = header && padded ? spacing.lg : 0;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.paper,
    ...style,
  };

  if (scroll) {
    return (
      <View style={containerStyle}>
        {header}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingTop: contentTopGap, paddingBottom: spacing.xl + insets.bottom, flexGrow: 1 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {renderBody(body, horizontalPadding)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, contentStyle]}>
      {header}
      <View style={{ flex: 1, paddingTop: contentTopGap }}>{renderBody(body, horizontalPadding)}</View>
    </View>
  );
}
