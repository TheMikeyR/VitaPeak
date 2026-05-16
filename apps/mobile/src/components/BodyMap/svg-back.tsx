import React from 'react';
import { BodySvg, type BodySvgCommonProps } from './body-svg.js';
import { BACK_SHAPES } from './regions.js';

export function SvgBack(props: BodySvgCommonProps) {
  return <BodySvg shapes={BACK_SHAPES} {...props} />;
}
