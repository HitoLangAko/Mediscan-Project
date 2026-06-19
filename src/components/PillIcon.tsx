import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const PILL_PATH =
  'M351.896 615.23C303.417 663.709 224.816 663.709 176.337 615.23L165.366 604.259C116.887 555.78 116.887 477.18 165.366 428.701L286.062 308.005L472.592 494.535L351.896 615.23ZM615.231 176.337C663.71 224.816 663.71 303.416 615.231 351.895L483.564 483.562L297.034 297.032L428.701 165.366C477.18 116.887 555.781 116.887 604.26 165.366L615.231 176.337Z';

/** Crop around the pill path with even padding so it stays centered and doesn't clip. */
const PILL_VIEW_BOX = '93 93 595 595';

type PillIconProps = {
  size?: number;
  color?: string;
  accessibilityLabel?: string;
};

export function PillIcon({ size = 24, color = '#000', accessibilityLabel = 'Pill' }: PillIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={PILL_VIEW_BOX}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Path d={PILL_PATH} fill={color} />
    </Svg>
  );
}
