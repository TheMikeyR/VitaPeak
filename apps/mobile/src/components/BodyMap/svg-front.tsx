import React from 'react';
import { BodySvg, type BodySvgCommonProps } from './body-svg.js';
import { FRONT_SHAPES } from './regions.js';

export function SvgFront(props: BodySvgCommonProps) {
  return <BodySvg shapes={FRONT_SHAPES} {...props} />;
}
