/**
 * Dev smoke screen for the reusable BodyMap component.
 *
 * Distinct from `(poc)/body-tap-poc.tsx` (the spike) — this one renders the
 * production `BodyMap` component end-to-end (tabs + selection state + i18n
 * labels) so Phase 5 has a visual acceptance harness without depending on the
 * full check-in flow (Phase 6).
 *
 * Route: /(poc)/body-map-dev
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BodyMap, regionI18nKey } from '../../src/components/BodyMap';

export default function BodyMapDev() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>BodyMap dev harness</Text>
      <Text style={styles.subtitle}>Tap a region to toggle. Switch front/back via the tabs.</Text>

      <BodyMap selected={selected} onToggleRegion={toggle} />

      <View style={styles.selectedBox}>
        <Text style={styles.selectedHeading}>Selected ({selected.size})</Text>
        {selected.size === 0 ? (
          <Text style={styles.selectedEmpty}>—</Text>
        ) : (
          [...selected].map((id) => (
            <Text key={id} style={styles.selectedRow}>
              {id} — {t(regionI18nKey(id), { defaultValue: id })}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
  selectedBox: { marginTop: 24, alignSelf: 'stretch' },
  selectedHeading: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#334155' },
  selectedEmpty: { fontSize: 13, color: '#94a3b8' },
  selectedRow: { fontSize: 13, color: '#0f172a', paddingVertical: 2 },
});
