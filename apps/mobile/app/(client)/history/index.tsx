import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import type { CheckInItem } from '@vitapeak/contracts';
import { useCheckIns } from '../../../src/api/check-ins';
import { regionI18nKey } from '../../../src/components/BodyMap';

export default function HistoryList() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useCheckIns();

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>{t('history.loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('history.loadFailed')}</Text>
        <Pressable style={styles.primary} onPress={() => void refetch()}>
          <Text style={styles.primaryText}>{t('history.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const checkIns = data?.checkIns ?? [];

  if (checkIns.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <Text style={styles.subtitle}>{t('history.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={checkIns}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      ListHeaderComponent={<Text style={styles.heading}>{t('history.title')}</Text>}
      renderItem={({ item }) => (
        <CheckInCard
          item={item}
          dateLabel={formatter.format(new Date(item.occurredAt))}
          onPress={() =>
            router.push({ pathname: '/(client)/history/[id]', params: { id: item.id } })
          }
        />
      )}
    />
  );
}

function CheckInCard({
  item,
  dateLabel,
  onPress,
}: {
  item: CheckInItem;
  dateLabel: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const regionIds = Array.from(new Set(item.painPoints.map((p) => p.bodyRegionId)));
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{dateLabel}</Text>
        {item.mood != null && (
          <View style={styles.moodPill}>
            <Text style={styles.moodPillText}>
              {t('history.mood')}: {item.mood}/5
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chipRow}>
        {regionIds.map((id) => (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>{t(regionI18nKey(id), { defaultValue: id })}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#64748b', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  moodPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
  },
  moodPillText: { fontSize: 12, color: '#075985', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  chipText: { fontSize: 12, color: '#334155' },
  primary: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: { color: '#fff', fontWeight: '600' },
});
