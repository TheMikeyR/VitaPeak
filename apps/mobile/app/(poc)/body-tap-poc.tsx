/**
 * Spike acceptance check — body region tap PoC.
 *
 * Navigate to this screen in dev to verify that tapping a region logs its id.
 * Route: /(poc)/body-tap-poc   (Expo Router, dev only — not linked from main nav)
 *
 * HOW TO TEST ON DEVICE / SIMULATOR
 *   1. pnpm dev  (from repo root)
 *   2. Open Expo Go on iOS sim or Android emulator
 *   3. Navigate to the route or add a temporary link from index.tsx
 *   4. Tap body regions → observe console output and on-screen label
 *   5. Verify the logged id matches the region slug from regions.json
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ellipse, G, Path, Rect, Svg } from 'react-native-svg';

type RegionId = string;

interface RegionProps {
  onPress: (id: RegionId) => void;
}

// ─── Front body ──────────────────────────────────────────────────────────────

function FrontBody({ onPress }: RegionProps) {
  const p = (id: RegionId) => () => {
    console.log('[BodyTapPoC] tapped region:', id);
    onPress(id);
  };

  return (
    <Svg viewBox="0 0 200 470" width={180} height={423}>
      <Ellipse
        id="head"
        onPress={p('head')}
        cx={100}
        cy={34}
        rx={28}
        ry={32}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="neck"
        onPress={p('neck')}
        x={88}
        y={64}
        width={24}
        height={22}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="shoulder.left"
        onPress={p('shoulder.left')}
        cx={63}
        cy={93}
        rx={22}
        ry={15}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="shoulder.right"
        onPress={p('shoulder.right')}
        cx={137}
        cy={93}
        rx={22}
        ry={15}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Path
        id="chest.left"
        onPress={p('chest.left')}
        d="M78 88 L100 88 L100 145 L78 145 Q74 145 74 141 L74 92 Q74 88 78 88 Z"
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Path
        id="chest.right"
        onPress={p('chest.right')}
        d="M100 88 L122 88 Q126 88 126 92 L126 141 Q126 145 122 145 L100 145 Z"
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="abdomen"
        onPress={p('abdomen')}
        x={78}
        y={145}
        width={44}
        height={46}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="upper-arm.left"
        onPress={p('upper-arm.left')}
        x={43}
        y={100}
        width={20}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="upper-arm.right"
        onPress={p('upper-arm.right')}
        x={137}
        y={100}
        width={20}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="elbow.left"
        onPress={p('elbow.left')}
        cx={53}
        cy={160}
        rx={11}
        ry={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="elbow.right"
        onPress={p('elbow.right')}
        cx={147}
        cy={160}
        rx={11}
        ry={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="forearm.left"
        onPress={p('forearm.left')}
        x={44}
        y={169}
        width={18}
        height={54}
        rx={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="forearm.right"
        onPress={p('forearm.right')}
        x={138}
        y={169}
        width={18}
        height={54}
        rx={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="wrist.left"
        onPress={p('wrist.left')}
        cx={53}
        cy={223}
        rx={10}
        ry={7}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="wrist.right"
        onPress={p('wrist.right')}
        cx={147}
        cy={223}
        rx={10}
        ry={7}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="hand.left"
        onPress={p('hand.left')}
        cx={53}
        cy={248}
        rx={13}
        ry={22}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="hand.right"
        onPress={p('hand.right')}
        cx={147}
        cy={248}
        rx={13}
        ry={22}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="hip.left"
        onPress={p('hip.left')}
        x={78}
        y={191}
        width={22}
        height={34}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="hip.right"
        onPress={p('hip.right')}
        x={100}
        y={191}
        width={22}
        height={34}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="groin"
        onPress={p('groin')}
        cx={100}
        cy={231}
        rx={16}
        ry={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="thigh.left"
        onPress={p('thigh.left')}
        x={74}
        y={241}
        width={22}
        height={78}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="thigh.right"
        onPress={p('thigh.right')}
        x={104}
        y={241}
        width={22}
        height={78}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="knee.left"
        onPress={p('knee.left')}
        cx={85}
        cy={319}
        rx={13}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="knee.right"
        onPress={p('knee.right')}
        cx={115}
        cy={319}
        rx={13}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="shin.left"
        onPress={p('shin.left')}
        x={74}
        y={331}
        width={22}
        height={76}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="shin.right"
        onPress={p('shin.right')}
        x={104}
        y={331}
        width={22}
        height={76}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="ankle.left"
        onPress={p('ankle.left')}
        cx={85}
        cy={408}
        rx={11}
        ry={8}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="ankle.right"
        onPress={p('ankle.right')}
        cx={115}
        cy={408}
        rx={11}
        ry={8}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="foot.left"
        onPress={p('foot.left')}
        cx={80}
        cy={432}
        rx={18}
        ry={14}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="foot.right"
        onPress={p('foot.right')}
        cx={120}
        cy={432}
        rx={18}
        ry={14}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

// ─── Back body ───────────────────────────────────────────────────────────────

function BackBody({ onPress }: RegionProps) {
  const p = (id: RegionId) => () => {
    console.log('[BodyTapPoC] tapped region:', id);
    onPress(id);
  };

  return (
    <Svg viewBox="0 0 200 470" width={180} height={423}>
      <Ellipse
        id="head"
        onPress={p('head')}
        cx={100}
        cy={34}
        rx={28}
        ry={32}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="neck"
        onPress={p('neck')}
        x={88}
        y={64}
        width={24}
        height={22}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="shoulder.left"
        onPress={p('shoulder.left')}
        cx={63}
        cy={93}
        rx={22}
        ry={15}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="shoulder.right"
        onPress={p('shoulder.right')}
        cx={137}
        cy={93}
        rx={22}
        ry={15}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      {/* upper-back rendered first; scapulae on top so they intercept taps */}
      <Rect
        id="upper-back"
        onPress={p('upper-back')}
        x={74}
        y={88}
        width={52}
        height={57}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Path
        id="scapula.left"
        onPress={p('scapula.left')}
        d="M76 94 L91 94 L91 130 Q84 138 76 130 Z"
        fill="#e0e0e0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Path
        id="scapula.right"
        onPress={p('scapula.right')}
        d="M109 94 L124 94 L124 130 Q116 138 109 130 Z"
        fill="#e0e0e0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="mid-back"
        onPress={p('mid-back')}
        x={78}
        y={145}
        width={44}
        height={30}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="lower-back"
        onPress={p('lower-back')}
        x={78}
        y={175}
        width={44}
        height={30}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="upper-arm.left"
        onPress={p('upper-arm.left')}
        x={43}
        y={100}
        width={20}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="upper-arm.right"
        onPress={p('upper-arm.right')}
        x={137}
        y={100}
        width={20}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="elbow.left"
        onPress={p('elbow.left')}
        cx={53}
        cy={160}
        rx={11}
        ry={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="elbow.right"
        onPress={p('elbow.right')}
        cx={147}
        cy={160}
        rx={11}
        ry={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="forearm.left"
        onPress={p('forearm.left')}
        x={44}
        y={169}
        width={18}
        height={54}
        rx={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="forearm.right"
        onPress={p('forearm.right')}
        x={138}
        y={169}
        width={18}
        height={54}
        rx={9}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="wrist.left"
        onPress={p('wrist.left')}
        cx={53}
        cy={223}
        rx={10}
        ry={7}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="wrist.right"
        onPress={p('wrist.right')}
        cx={147}
        cy={223}
        rx={10}
        ry={7}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="hand.left"
        onPress={p('hand.left')}
        cx={53}
        cy={248}
        rx={13}
        ry={22}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="hand.right"
        onPress={p('hand.right')}
        cx={147}
        cy={248}
        rx={13}
        ry={22}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="hip.left"
        onPress={p('hip.left')}
        x={78}
        y={205}
        width={22}
        height={22}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="hip.right"
        onPress={p('hip.right')}
        x={100}
        y={205}
        width={22}
        height={22}
        rx={4}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Path
        id="glute.left"
        onPress={p('glute.left')}
        d="M74 227 Q74 270 100 270 L100 227 Z"
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Path
        id="glute.right"
        onPress={p('glute.right')}
        d="M100 227 L100 270 Q126 270 126 227 Z"
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="hamstring.left"
        onPress={p('hamstring.left')}
        x={74}
        y={270}
        width={22}
        height={48}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="hamstring.right"
        onPress={p('hamstring.right')}
        x={104}
        y={270}
        width={22}
        height={48}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="knee.left"
        onPress={p('knee.left')}
        cx={85}
        cy={319}
        rx={13}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="knee.right"
        onPress={p('knee.right')}
        cx={115}
        cy={319}
        rx={13}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Rect
        id="calf.left"
        onPress={p('calf.left')}
        x={74}
        y={331}
        width={22}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Rect
        id="calf.right"
        onPress={p('calf.right')}
        x={104}
        y={331}
        width={22}
        height={60}
        rx={10}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="ankle.left"
        onPress={p('ankle.left')}
        cx={85}
        cy={392}
        rx={11}
        ry={8}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="ankle.right"
        onPress={p('ankle.right')}
        cx={115}
        cy={392}
        rx={11}
        ry={8}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="heel.left"
        onPress={p('heel.left')}
        cx={80}
        cy={418}
        rx={14}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="heel.right"
        onPress={p('heel.right')}
        cx={120}
        cy={418}
        rx={14}
        ry={12}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />

      <Ellipse
        id="foot.left"
        onPress={p('foot.left')}
        cx={80}
        cy={445}
        rx={18}
        ry={13}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
      <Ellipse
        id="foot.right"
        onPress={p('foot.right')}
        cx={120}
        cy={445}
        rx={18}
        ry={13}
        fill="#f0f0f0"
        stroke="#888"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function BodyTapPoc() {
  const [lastTapped, setLastTapped] = useState<RegionId | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Body Map PoC</Text>
      <Text style={styles.subtitle}>Tap a region — id is logged to console</Text>

      <View style={styles.toggle}>
        <Text
          style={[styles.tab, view === 'front' && styles.tabActive]}
          onPress={() => setView('front')}
        >
          Front
        </Text>
        <Text
          style={[styles.tab, view === 'back' && styles.tabActive]}
          onPress={() => setView('back')}
        >
          Back
        </Text>
      </View>

      {view === 'front' ? (
        <FrontBody onPress={setLastTapped} />
      ) : (
        <BackBody onPress={setLastTapped} />
      )}

      <View style={styles.result}>
        <Text style={styles.resultLabel}>Last tapped:</Text>
        <Text style={styles.resultId}>{lastTapped ?? '—'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  toggle: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  tab: {
    fontSize: 15,
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabActive: { color: '#fff', backgroundColor: '#4a7a9b', borderColor: '#4a7a9b' },
  result: { marginTop: 20, alignItems: 'center' },
  resultLabel: { fontSize: 13, color: '#888' },
  resultId: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 4 },
});
