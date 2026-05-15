import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/auth/use-auth';

export default function ClientHome() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client</Text>
      <Text style={styles.subtitle}>Check-in flows land in later chunks.</Text>
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>{t('common.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { marginTop: 12, color: '#475569', textAlign: 'center' },
  button: { marginTop: 32, padding: 12, backgroundColor: '#0369a1', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '500' },
});
