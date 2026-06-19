import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonState = 'default' | 'loading' | 'disabled';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const { colors, fonts, fontSizes, radius, spacing, layout } = useTheme();
  const state: ButtonState = loading ? 'loading' : disabled ? 'disabled' : 'default';

  const palette = {
    primary: {
      bg: colors.brand,
      fg: colors.textInverse,
      border: colors.brand,
      pressed: colors.brandDeep,
    },
    secondary: {
      bg: colors.card,
      fg: colors.brand,
      border: colors.brand,
      pressed: colors.brandLight,
    },
    ghost: {
      bg: colors.brandLight,
      fg: colors.brand,
      border: 'transparent',
      pressed: colors.paper2,
    },
    danger: {
      bg: colors.dangerSoft,
      fg: colors.danger,
      border: colors.danger,
      pressed: colors.dangerSoft,
    },
  }[variant];

  const isDisabled = state !== 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          minHeight: layout.hitTargetMin,
          borderRadius: radius.md,
          paddingVertical: spacing.md - 2,
          paddingHorizontal: spacing.lg,
          backgroundColor: isDisabled ? colors.border : pressed ? palette.pressed : palette.bg,
          borderWidth: variant === 'secondary' || variant === 'danger' ? 1.5 : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: isDisabled ? 0.6 : 1,
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: isDisabled ? colors.textMuted : palette.fg,
              fontFamily: fonts.bodySemibold,
              fontSize: fontSizes.base,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
