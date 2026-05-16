import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/use-auth';

export default function ClientHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('checkIn.home.title')}</Text>
      <Text style={styles.subtitle}>{t('checkIn.home.subtitle')}</Text>

      <TouchableOpacity
        testID="home-new-checkin"
        style={styles.primary}
        onPress={() => router.push('/(client)/check-in')}
      >
        <Text style={styles.primaryText}>{t('checkIn.home.newCheckIn')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(client)/history')}>
        <Text style={styles.secondaryText}>{t('checkIn.home.viewHistory')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { color: '#475569', textAlign: 'center', marginBottom: 8 },
  primary: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondary: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryText: { color: '#0f172a', fontWeight: '500', fontSize: 16 },
  signOut: { marginTop: 24, padding: 8 },
  signOutText: { color: '#64748b' },
});
