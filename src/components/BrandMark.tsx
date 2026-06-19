import React, { useId } from 'react';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { PILL_PATH } from './PillIcon';

const SHIELD_PATH =
  'M636.208 434.483C643.967 434.485 669.312 474.709 698.276 488.793C726.046 502.296 775.793 504.308 775.862 504.311V682.758C775.862 682.758 713.794 783.556 636.208 783.557C558.622 783.557 496.552 682.758 496.552 682.758V504.311C496.552 504.311 546.349 502.305 574.138 488.793C603.104 474.709 628.45 434.483 636.208 434.483ZM712.78 567.401C706.431 562.552 697.354 563.769 692.505 570.117L621.45 663.147L590.28 631.979C584.452 626.151 575.003 626.151 569.175 631.979L558.622 642.532L611.37 695.28C612.753 696.662 614.341 697.711 616.034 698.438C622.132 701.528 629.753 699.939 634.052 694.311L724.276 576.182L712.78 567.401Z';

type BrandMarkProps = {
  size?: number;
  accessibilityLabel?: string;
};

export function BrandMark({ size = 40, accessibilityLabel = 'Mediscan' }: BrandMarkProps) {
  const { brandGradientStops, colors } = useTheme();
  const gradientId = `brand-mark-grad-${useId().replace(/:/g, '')}`;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 900 900"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Defs>
        <RadialGradient
          id={gradientId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(310.345 318.103) rotate(45) scale(603.479 553.189)"
        >
          <Stop offset="0" stopColor={brandGradientStops[0]} />
          <Stop offset="0.5" stopColor={brandGradientStops[1]} />
          <Stop offset="0.75" stopColor={brandGradientStops[2]} />
          <Stop offset="1" stopColor={brandGradientStops[3]} />
        </RadialGradient>
      </Defs>
      <Rect width="900" height="900" rx="77.5862" fill={`url(#${gradientId})`} />
      <Path d={PILL_PATH} fill={colors.textInverse} />
      <Path d={SHIELD_PATH} fill={colors.textInverse} />
    </Svg>
  );
}
