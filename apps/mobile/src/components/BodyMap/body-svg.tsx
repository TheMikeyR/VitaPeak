import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ellipse, Path, Rect, Svg } from 'react-native-svg';
import {
  BODY_INTRINSIC_HEIGHT,
  BODY_INTRINSIC_WIDTH,
  BODY_VIEWBOX,
  regionI18nKey,
  type RegionShape,
} from './regions.js';

export interface BodySvgCommonProps {
  selected: ReadonlySet<string>;
  onToggleRegion: (regionId: string) => void;
  width?: number;
  height?: number;
}

interface BodySvgProps extends BodySvgCommonProps {
  shapes: RegionShape[];
}

const IDLE_FILL = '#f0f0f0';
const SELECTED_FILL = '#0369a1';
const SELECTED_STROKE = '#0c4a6e';
const IDLE_STROKE = '#888';
const SCAPULA_IDLE_FILL = '#e0e0e0';

export function BodySvg({
  shapes,
  selected,
  onToggleRegion,
  width = 200,
  height = 470,
}: BodySvgProps) {
  const { t } = useTranslation();

  return (
    <Svg viewBox={BODY_VIEWBOX} width={width} height={height}>
      {shapes.map((shape) => {
        const isSelected = selected.has(shape.id);
        const label = t(regionI18nKey(shape.id), { defaultValue: shape.id });
        const handlePress = () => onToggleRegion(shape.id);
        const fill = isSelected
          ? SELECTED_FILL
          : shape.id.startsWith('scapula.')
            ? SCAPULA_IDLE_FILL
            : IDLE_FILL;
        const stroke = isSelected ? SELECTED_STROKE : IDLE_STROKE;
        const common = {
          accessibilityLabel: label,
          fill,
          stroke,
          strokeWidth: 1.5,
          onPress: handlePress,
        } as const;

        if (shape.type === 'ellipse') {
          return (
            <Ellipse
              key={shape.id}
              cx={shape.cx}
              cy={shape.cy}
              rx={shape.rx}
              ry={shape.ry}
              {...common}
            />
          );
        }
        if (shape.type === 'rect') {
          return (
            <Rect
              key={shape.id}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              rx={shape.rx}
              {...common}
            />
          );
        }
        return <Path key={shape.id} d={shape.d} {...common} />;
      })}
    </Svg>
  );
}

export { BODY_INTRINSIC_HEIGHT, BODY_INTRINSIC_WIDTH };
