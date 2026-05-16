import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { BodyMap } from '../../../src/components/BodyMap';
import { resetDraft, toggleRegion, useCheckInDraft } from '../../../src/state/check-in-draft';

export default function CheckInSelect() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useCheckInDraft();

  useEffect(() => {
    resetDraft();
  }, []);

  const selectedSet = useMemo(() => new Set(draft.selectedRegions), [draft.selectedRegions]);
  const canContinue = draft.selectedRegions.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>{t('checkIn.step', { current: 1, total: 3 })}</Text>
      <Text style={styles.title}>{t('checkIn.selectRegions.title')}</Text>
      <Text style={styles.subtitle}>{t('checkIn.selectRegions.subtitle')}</Text>

      <BodyMap selected={selectedSet} onToggleRegion={toggleRegion} />

      <View style={styles.footer}>
        <Text style={styles.count}>
          {t('checkIn.selectedCount', { count: draft.selectedRegions.length })}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => router.push('/(client)/check-in/details')}
          style={[styles.primary, !canContinue && styles.primaryDisabled]}
        >
          <Text style={styles.primaryText}>{t('common.continue')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  step: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  footer: { alignSelf: 'stretch', marginTop: 24, gap: 12 },
  count: { fontSize: 13, color: '#334155', textAlign: 'center' },
  primary: {
    backgroundColor: '#0369a1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryDisabled: { backgroundColor: '#94a3b8' },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
