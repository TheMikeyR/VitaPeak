import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/use-auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signInWithSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setPending(true);
    try {
      const res = await apiFetch<{ token: string }>('/auth/sign-in/email', {
        method: 'POST',
        body: { email, password },
      });
      await signInWithSession(res.token);
    } catch (err) {
      Alert.alert(t('error.serverError'), err instanceof Error ? err.message : '');
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.login.title')}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={t('auth.login.emailLabel')}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        placeholder={t('auth.login.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} disabled={pending} onPress={onSubmit}>
        <Text style={styles.buttonText}>{pending ? '…' : t('auth.login.submit')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: {
    backgroundColor: '#0369a1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
