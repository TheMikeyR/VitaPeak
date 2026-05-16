import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HistoryStub() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('history.title')}</Text>
      <Text style={styles.subtitle}>{t('history.empty')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#64748b' },
});
