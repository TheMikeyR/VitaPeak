/**
 * Shape data for the 2D body map. Each region has one geometric shape and a
 * stable id matching `BodyRegion.id` in the API. Two arrays — one per view
 * (front / back) — because some regions (shoulders, arms, hands, feet) are
 * surfaced on both views even though their primary `displayLayer` is one side.
 *
 * Geometry copied from the spike PoC at `apps/mobile/app/(poc)/body-tap-poc.tsx`.
 * The viewBox is 200×470 — keep new shapes inside that box.
 */

export type RegionShape =
  | { id: string; type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { id: string; type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { id: string; type: 'path'; d: string };

export const BODY_VIEWBOX = '0 0 200 470';
export const BODY_INTRINSIC_WIDTH = 200;
export const BODY_INTRINSIC_HEIGHT = 470;

export const FRONT_SHAPES: RegionShape[] = [
  { id: 'head', type: 'ellipse', cx: 100, cy: 34, rx: 28, ry: 32 },
  { id: 'neck', type: 'rect', x: 88, y: 64, width: 24, height: 22, rx: 4 },
  { id: 'shoulder.left', type: 'ellipse', cx: 63, cy: 93, rx: 22, ry: 15 },
  { id: 'shoulder.right', type: 'ellipse', cx: 137, cy: 93, rx: 22, ry: 15 },
  {
    id: 'chest.left',
    type: 'path',
    d: 'M78 88 L100 88 L100 145 L78 145 Q74 145 74 141 L74 92 Q74 88 78 88 Z',
  },
  {
    id: 'chest.right',
    type: 'path',
    d: 'M100 88 L122 88 Q126 88 126 92 L126 141 Q126 145 122 145 L100 145 Z',
  },
  { id: 'abdomen', type: 'rect', x: 78, y: 145, width: 44, height: 46, rx: 4 },
  { id: 'upper-arm.left', type: 'rect', x: 43, y: 100, width: 20, height: 60, rx: 10 },
  { id: 'upper-arm.right', type: 'rect', x: 137, y: 100, width: 20, height: 60, rx: 10 },
  { id: 'elbow.left', type: 'ellipse', cx: 53, cy: 160, rx: 11, ry: 9 },
  { id: 'elbow.right', type: 'ellipse', cx: 147, cy: 160, rx: 11, ry: 9 },
  { id: 'forearm.left', type: 'rect', x: 44, y: 169, width: 18, height: 54, rx: 9 },
  { id: 'forearm.right', type: 'rect', x: 138, y: 169, width: 18, height: 54, rx: 9 },
  { id: 'wrist.left', type: 'ellipse', cx: 53, cy: 223, rx: 10, ry: 7 },
  { id: 'wrist.right', type: 'ellipse', cx: 147, cy: 223, rx: 10, ry: 7 },
  { id: 'hand.left', type: 'ellipse', cx: 53, cy: 248, rx: 13, ry: 22 },
  { id: 'hand.right', type: 'ellipse', cx: 147, cy: 248, rx: 13, ry: 22 },
  { id: 'hip.left', type: 'rect', x: 78, y: 191, width: 22, height: 34, rx: 4 },
  { id: 'hip.right', type: 'rect', x: 100, y: 191, width: 22, height: 34, rx: 4 },
  { id: 'groin', type: 'ellipse', cx: 100, cy: 231, rx: 16, ry: 10 },
  { id: 'thigh.left', type: 'rect', x: 74, y: 241, width: 22, height: 78, rx: 10 },
  { id: 'thigh.right', type: 'rect', x: 104, y: 241, width: 22, height: 78, rx: 10 },
  { id: 'knee.left', type: 'ellipse', cx: 85, cy: 319, rx: 13, ry: 12 },
  { id: 'knee.right', type: 'ellipse', cx: 115, cy: 319, rx: 13, ry: 12 },
  { id: 'shin.left', type: 'rect', x: 74, y: 331, width: 22, height: 76, rx: 10 },
  { id: 'shin.right', type: 'rect', x: 104, y: 331, width: 22, height: 76, rx: 10 },
  { id: 'ankle.left', type: 'ellipse', cx: 85, cy: 408, rx: 11, ry: 8 },
  { id: 'ankle.right', type: 'ellipse', cx: 115, cy: 408, rx: 11, ry: 8 },
  { id: 'foot.left', type: 'ellipse', cx: 80, cy: 432, rx: 18, ry: 14 },
  { id: 'foot.right', type: 'ellipse', cx: 120, cy: 432, rx: 18, ry: 14 },
];

export const BACK_SHAPES: RegionShape[] = [
  { id: 'head', type: 'ellipse', cx: 100, cy: 34, rx: 28, ry: 32 },
  { id: 'neck', type: 'rect', x: 88, y: 64, width: 24, height: 22, rx: 4 },
  { id: 'shoulder.left', type: 'ellipse', cx: 63, cy: 93, rx: 22, ry: 15 },
  { id: 'shoulder.right', type: 'ellipse', cx: 137, cy: 93, rx: 22, ry: 15 },
  // upper-back rendered first so scapulae overlay it and intercept taps
  { id: 'upper-back', type: 'rect', x: 74, y: 88, width: 52, height: 57, rx: 4 },
  { id: 'scapula.left', type: 'path', d: 'M76 94 L91 94 L91 130 Q84 138 76 130 Z' },
  { id: 'scapula.right', type: 'path', d: 'M109 94 L124 94 L124 130 Q116 138 109 130 Z' },
  { id: 'mid-back', type: 'rect', x: 78, y: 145, width: 44, height: 30, rx: 4 },
  { id: 'lower-back', type: 'rect', x: 78, y: 175, width: 44, height: 30, rx: 4 },
  { id: 'upper-arm.left', type: 'rect', x: 43, y: 100, width: 20, height: 60, rx: 10 },
  { id: 'upper-arm.right', type: 'rect', x: 137, y: 100, width: 20, height: 60, rx: 10 },
  { id: 'elbow.left', type: 'ellipse', cx: 53, cy: 160, rx: 11, ry: 9 },
  { id: 'elbow.right', type: 'ellipse', cx: 147, cy: 160, rx: 11, ry: 9 },
  { id: 'forearm.left', type: 'rect', x: 44, y: 169, width: 18, height: 54, rx: 9 },
  { id: 'forearm.right', type: 'rect', x: 138, y: 169, width: 18, height: 54, rx: 9 },
  { id: 'wrist.left', type: 'ellipse', cx: 53, cy: 223, rx: 10, ry: 7 },
  { id: 'wrist.right', type: 'ellipse', cx: 147, cy: 223, rx: 10, ry: 7 },
  { id: 'hand.left', type: 'ellipse', cx: 53, cy: 248, rx: 13, ry: 22 },
  { id: 'hand.right', type: 'ellipse', cx: 147, cy: 248, rx: 13, ry: 22 },
  { id: 'hip.left', type: 'rect', x: 78, y: 205, width: 22, height: 22, rx: 4 },
  { id: 'hip.right', type: 'rect', x: 100, y: 205, width: 22, height: 22, rx: 4 },
  { id: 'glute.left', type: 'path', d: 'M74 227 Q74 270 100 270 L100 227 Z' },
  { id: 'glute.right', type: 'path', d: 'M100 227 L100 270 Q126 270 126 227 Z' },
  { id: 'hamstring.left', type: 'rect', x: 74, y: 270, width: 22, height: 48, rx: 10 },
  { id: 'hamstring.right', type: 'rect', x: 104, y: 270, width: 22, height: 48, rx: 10 },
  { id: 'knee.left', type: 'ellipse', cx: 85, cy: 319, rx: 13, ry: 12 },
  { id: 'knee.right', type: 'ellipse', cx: 115, cy: 319, rx: 13, ry: 12 },
  { id: 'calf.left', type: 'rect', x: 74, y: 331, width: 22, height: 60, rx: 10 },
  { id: 'calf.right', type: 'rect', x: 104, y: 331, width: 22, height: 60, rx: 10 },
  { id: 'ankle.left', type: 'ellipse', cx: 85, cy: 392, rx: 11, ry: 8 },
  { id: 'ankle.right', type: 'ellipse', cx: 115, cy: 392, rx: 11, ry: 8 },
  { id: 'heel.left', type: 'ellipse', cx: 80, cy: 418, rx: 14, ry: 12 },
  { id: 'heel.right', type: 'ellipse', cx: 120, cy: 418, rx: 14, ry: 12 },
  { id: 'foot.left', type: 'ellipse', cx: 80, cy: 445, rx: 18, ry: 13 },
  { id: 'foot.right', type: 'ellipse', cx: 120, cy: 445, rx: 18, ry: 13 },
];

export type BodyView = 'front' | 'back';

export const SHAPES_BY_VIEW: Record<BodyView, RegionShape[]> = {
  front: FRONT_SHAPES,
  back: BACK_SHAPES,
};

/**
 * i18next default keySeparator is '.', so a slug like `shoulder.left` would be
 * resolved as nested. Use this to flatten dotted slugs to a single key segment
 * (`shoulder.left` → `shoulder_left`). Translation files mirror this form.
 */
export function regionI18nKey(regionId: string): string {
  return `bodyRegion.${regionId.replace(/\./g, '_')}`;
}
