import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import type { PainType } from '@vitapeak/contracts';
import { regionI18nKey } from '../../../src/components/BodyMap';
import { updatePainPoint, useCheckInDraft } from '../../../src/state/check-in-draft';

const PAIN_TYPES: PainType[] = ['BURNING', 'SHARP', 'RADIATING', 'DULL', 'ACHING', 'TINGLING'];

export default function CheckInDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useCheckInDraft();

  if (draft.selectedRegions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('checkIn.details.empty')}</Text>
        <Pressable style={styles.primary} onPress={() => router.replace('/(client)/check-in')}>
          <Text style={styles.primaryText}>{t('checkIn.details.backToSelect')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>{t('checkIn.step', { current: 2, total: 3 })}</Text>
      <Text style={styles.title}>{t('checkIn.details.title')}</Text>
      <Text style={styles.subtitle}>{t('checkIn.details.subtitle')}</Text>

      {draft.selectedRegions.map((regionId) => {
        const pp = draft.painPoints[regionId];
        if (!pp) return null;
        return (
          <View key={regionId} style={styles.card}>
            <Text style={styles.regionLabel}>
              {t(regionI18nKey(regionId), { defaultValue: regionId })}
            </Text>

            <Text style={styles.fieldLabel}>{t('checkIn.details.painType')}</Text>
            <View style={styles.chipRow}>
              {PAIN_TYPES.map((pt) => {
                const active = pp.painType === pt;
                return (
                  <Pressable
                    key={pt}
                    testID={`pain-type-${pt}-${regionId}`}
                    onPress={() => updatePainPoint(regionId, { painType: pt })}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(`painType.${pt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>
              {t('checkIn.details.level')}: {pp.level}
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={pp.level}
              onValueChange={(v) => updatePainPoint(regionId, { level: Math.round(v) })}
              minimumTrackTintColor="#0369a1"
              maximumTrackTintColor="#cbd5e1"
            />

            <Text style={styles.fieldLabel}>{t('checkIn.details.notes')}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              maxLength={2000}
              placeholder={t('checkIn.details.notesPlaceholder') ?? ''}
              value={pp.notes ?? ''}
              onChangeText={(text) => updatePainPoint(regionId, { notes: text })}
            />
          </View>
        );
      })}

      <Pressable
        testID="checkin-step2-continue"
        style={styles.primary}
        onPress={() => router.push('/(client)/check-in/review')}
      >
        <Text style={styles.primaryText}>{t('common.continue')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  step: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  regionLabel: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  fieldLabel: { fontSize: 13, color: '#475569', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipActive: { backgroundColor: '#0369a1', borderColor: '#0369a1' },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: '#0369a1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
