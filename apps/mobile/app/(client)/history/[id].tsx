import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PainPointItem } from '@vitapeak/contracts';
import { useCheckIns } from '../../../src/api/check-ins';
import { regionI18nKey } from '../../../src/components/BodyMap';

export default function HistoryDetail() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useCheckIns();

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const checkIn = data?.checkIns.find((c) => c.id === id);

  if (!checkIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('history.notFound')}</Text>
        <Pressable style={styles.primary} onPress={() => router.replace('/(client)/history')}>
          <Text style={styles.primaryText}>{t('history.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>{formatter.format(new Date(checkIn.occurredAt))}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('history.painPoints')}</Text>
        {checkIn.painPoints.length === 0 ? (
          <Text style={styles.muted}>{t('history.noPoints')}</Text>
        ) : (
          checkIn.painPoints.map((pp) => <PainPointRow key={pp.id} pp={pp} />)
        )}
      </View>

      {(checkIn.mood != null || (checkIn.notes && checkIn.notes.length > 0)) && (
        <View style={styles.card}>
          {checkIn.mood != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('history.mood')}</Text>
              <Text style={styles.metaValue}>{checkIn.mood}/5</Text>
            </View>
          )}
          {checkIn.notes ? (
            <>
              <Text style={styles.metaLabel}>{t('history.notes')}</Text>
              <Text style={styles.notes}>{checkIn.notes}</Text>
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function PainPointRow({ pp }: { pp: PainPointItem }) {
  const { t } = useTranslation();
  return (
    <View style={styles.pointRow}>
      <View style={styles.pointHeader}>
        <Text style={styles.region}>
          {t(regionI18nKey(pp.bodyRegionId), { defaultValue: pp.bodyRegionId })}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{t(`painType.${pp.painType}`)}</Text>
        </View>
      </View>
      <Text style={styles.level}>{pp.level}/10</Text>
      {pp.notes ? (
        <>
          <Text style={styles.metaLabel}>{t('history.painNotes')}</Text>
          <Text style={styles.notes}>{pp.notes}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  date: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#334155' },
  pointRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 4,
  },
  pointHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  region: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
  },
  typeBadgeText: { fontSize: 12, color: '#075985', fontWeight: '600' },
  level: { fontSize: 14, color: '#475569' },
  muted: { color: '#64748b' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  metaValue: { fontSize: 14, color: '#0f172a' },
  notes: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  primary: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: { color: '#fff', fontWeight: '600' },
});
