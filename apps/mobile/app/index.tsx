import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VitaPeak</Text>
      <Text style={styles.subtitle}>Scaffold ready. Client flows land in later chunks.</Text>
      <Link href="/body-tap-poc" style={styles.link}>
        → Body map PoC
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: '600', color: '#0369a1' },
  subtitle: { marginTop: 12, color: '#475569', textAlign: 'center' },
});
