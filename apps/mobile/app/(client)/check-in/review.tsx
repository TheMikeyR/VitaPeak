import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { regionI18nKey } from '../../../src/components/BodyMap';
import { useSubmitCheckIn } from '../../../src/api/check-ins';
import {
  buildPainPointsPayload,
  resetDraft,
  setMood,
  setNotes,
  useCheckInDraft,
} from '../../../src/state/check-in-draft';

const MOODS = [1, 2, 3, 4, 5];

export default function CheckInReview() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useCheckInDraft();
  const submit = useSubmitCheckIn();

  const onSubmit = async () => {
    const painPoints = buildPainPointsPayload();
    if (painPoints.length === 0) return;
    try {
      await submit.mutateAsync({
        occurredAt: new Date().toISOString(),
        ...(draft.mood ? { mood: draft.mood } : {}),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
        painPoints,
      });
      resetDraft();
      Alert.alert(t('checkIn.saved'));
      router.replace('/(client)/history');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.serverError');
      Alert.alert(t('checkIn.review.submitFailed'), message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>{t('checkIn.step', { current: 3, total: 3 })}</Text>
      <Text style={styles.title}>{t('checkIn.review.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('checkIn.review.painPoints')}</Text>
        {draft.selectedRegions.map((id) => {
          const pp = draft.painPoints[id];
          if (!pp) return null;
          return (
            <View key={id} style={styles.row}>
              <Text style={styles.rowRegion}>{t(regionI18nKey(id), { defaultValue: id })}</Text>
              <Text style={styles.rowMeta}>
                {t(`painType.${pp.painType}`)} · {pp.level}/10
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('checkIn.review.mood')}</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const active = draft.mood === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMood(active ? null : m)}
                style={[styles.moodChip, active && styles.moodChipActive]}
              >
                <Text style={[styles.moodText, active && styles.moodTextActive]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{t('checkIn.review.notes')}</Text>
        <TextInput
          style={styles.textArea}
          multiline
          maxLength={2000}
          value={draft.notes}
          onChangeText={setNotes}
          placeholder={t('checkIn.review.notesPlaceholder') ?? ''}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={submit.isPending}
        onPress={onSubmit}
        style={[styles.primary, submit.isPending && styles.primaryDisabled]}
      >
        <Text style={styles.primaryText}>
          {submit.isPending ? t('common.loading') : t('checkIn.review.submit')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  step: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowRegion: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  rowMeta: { fontSize: 14, color: '#475569' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodChipActive: { backgroundColor: '#0369a1', borderColor: '#0369a1' },
  moodText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  moodTextActive: { color: '#fff' },
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
  },
  primaryDisabled: { backgroundColor: '#94a3b8' },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
