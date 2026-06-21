import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { AppSettings, DEFAULT_SETTINGS, getSettings, subscribeSettings } from '../services/settingsStore';
import { themeTokens, ThemeTokens } from './tokens';

const ThemeContext = createContext<ThemeTokens>(themeTokens);

const NEUTRAL_DARK = {
  paper: '#121214',
  paper2: '#1A1A1E',
  background: '#121214',
  card: '#232328',
  border: '#3A3A42',
  borderStrong: '#52525B',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  muted: '#A1A1AA',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    let mounted = true;
    getSettings().then((storedSettings) => {
      if (mounted) setSettings(storedSettings);
    });

    const unsubscribeSettings = subscribeSettings(setSettings);
    const systemSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      mounted = false;
      unsubscribeSettings();
      systemSubscription.remove();
    };
  }, []);

  const tokens = useMemo(() => buildRuntimeTokens(settings, systemScheme), [settings, systemScheme]);

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}

export { themeTokens };

function buildRuntimeTokens(settings: AppSettings, systemScheme: ColorSchemeName): ThemeTokens {
  const accent = settings.accentColor || themeTokens.colors.brand;
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const fontScale = settings.textSize === 'small' ? 0.92 : settings.textSize === 'large' ? 1.12 : 1;
  // Dark mode uses an OPAQUE accent tint blended over the card surface. A semi-transparent
  // rgba here causes Android to render the elevation shadow as a darker filled box inside cards.
  const accentSoft = isDark ? blendOver(accent, NEUTRAL_DARK.card, 0.16) : tintAccent(accent);
  const accentDeep = darkenAccent(accent, isDark ? 0.15 : 0.2);

  const runtimeColors = isDark
    ? {
        ...themeTokens.colors,
        ...NEUTRAL_DARK,
        brand: accent,
        primary: accent,
        textLink: accent,
        focus: accent,
        brandDeep: accentDeep,
        primaryDark: accentDeep,
        info: accent,
        brandLight: accentSoft,
        infoSoft: accentSoft,
        blueSoft: accentSoft,
        textInverse: '#FFFFFF',
        successSoft: blendOver('#309653', NEUTRAL_DARK.card, 0.22),
        warningSoft: blendOver('#DC8D11', NEUTRAL_DARK.card, 0.22),
        dangerSoft: blendOver('#CC3E3C', NEUTRAL_DARK.card, 0.22),
        scrim: 'rgba(255, 255, 255, 0.06)',
      }
    : {
        ...themeTokens.colors,
        brand: accent,
        primary: accent,
        textLink: accent,
        focus: accent,
        brandDeep: accentDeep,
        primaryDark: accentDeep,
        info: accent,
        brandLight: accentSoft,
        infoSoft: accentSoft,
        blueSoft: accentSoft,
      };

  const runtimeFontSizes = Object.fromEntries(
    Object.entries(themeTokens.fontSizes).map(([key, value]) => [key, Math.round(value * fontScale)]),
  );

  const runtimeBrandGradientStops: readonly [string, string, string, string] = [
    blendOver('#FFFFFF', accent, 0.55),
    blendOver('#FFFFFF', accent, 0.25),
    blendOver(accent, accentDeep, 0.35),
    accentDeep,
  ];

  return {
    ...themeTokens,
    colors: runtimeColors,
    fontSizes: runtimeFontSizes,
    brandGradientStops: runtimeBrandGradientStops,
  } as ThemeTokens;
}

function tintAccent(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return themeTokens.colors.brandLight;
  const mix = (value: number) => Math.round(value + (255 - value) * 0.88);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
}

function blendOver(hex: string, baseHex: string, ratio: number): string {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(baseHex);
  if (!fg || !bg) return baseHex;
  const r = Math.round(bg.r + (fg.r - bg.r) * ratio);
  const g = Math.round(bg.g + (fg.g - bg.g) * ratio);
  const b = Math.round(bg.b + (fg.b - bg.b) * ratio);
  return rgbToHex(r, g, b);
}

function darkenAccent(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - amount;
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor),
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
