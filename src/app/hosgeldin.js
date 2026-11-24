import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen } from '../components/ui';
import { colors } from '../lib/theme';

export default function Welcome() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text style={styles.logo}>İşKaydır</Text>
      <Text style={styles.tag}>Kaydır, eşleş, işe başla.</Text>

      <Pressable style={styles.role} onPress={() => router.push('/kayit?rol=candidate')}>
        <Text style={styles.roleEmoji}>🔎</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitle}>İş arıyorum</Text>
          <Text style={styles.roleText}>CV'ni yükle, sana uygun ilanları kaydır.</Text>
        </View>
      </Pressable>

      <Pressable style={styles.role} onPress={() => router.push('/kayit?rol=employer')}>
        <Text style={styles.roleEmoji}>🏭</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitle}>İşvereniyim</Text>
          <Text style={styles.roleText}>İlan ver, uygun adayları kaydır, eşleş.</Text>
        </View>
      </Pressable>

      <Button title="Zaten hesabım var — Giriş yap" variant="ghost" onPress={() => router.push('/giris')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { fontSize: 44, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  tag: { fontSize: 17, color: colors.muted, textAlign: 'center', marginBottom: 36 },
  role: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff',
    borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1.5, borderColor: colors.line,
  },
  roleEmoji: { fontSize: 38 },
  roleTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  roleText: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
