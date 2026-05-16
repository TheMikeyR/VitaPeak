import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SvgBack } from './svg-back.js';
import { SvgFront } from './svg-front.js';
import type { BodyView } from './regions.js';

export interface BodyMapProps {
  selected: ReadonlySet<string>;
  onToggleRegion: (regionId: string) => void;
  initialView?: BodyView;
  width?: number;
  height?: number;
}

export function BodyMap({
  selected,
  onToggleRegion,
  initialView = 'front',
  width,
  height,
}: BodyMapProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<BodyView>(initialView);

  const SvgComponent = view === 'front' ? SvgFront : SvgBack;

  return (
    <View style={styles.container}>
      <View style={styles.tabs} accessibilityRole="tablist">
        <Pressable
          testID="body-tab-front"
          style={[styles.tab, view === 'front' && styles.tabActive]}
          onPress={() => setView('front')}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'front' }}
        >
          <Text style={[styles.tabText, view === 'front' && styles.tabTextActive]}>
            {t('bodyMap.front')}
          </Text>
        </Pressable>
        <Pressable
          testID="body-tab-back"
          style={[styles.tab, view === 'back' && styles.tabActive]}
          onPress={() => setView('back')}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'back' }}
        >
          <Text style={[styles.tabText, view === 'back' && styles.tabTextActive]}>
            {t('bodyMap.back')}
          </Text>
        </Pressable>
      </View>

      <SvgComponent
        selected={selected}
        onToggleRegion={onToggleRegion}
        width={width}
        height={height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabActive: {
    backgroundColor: '#0369a1',
    borderColor: '#0369a1',
  },
  tabText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  tabTextActive: { color: '#fff' },
});

export { type BodyView };
