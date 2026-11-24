import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import { Chip, ChipRow } from './ui';
import { eduLabel } from '../lib/departments';

// İşverenin gördüğü aday kartı. Ad, telefon, e-posta eşleşmeden önce GÖSTERİLMEZ.
export default function CandidateCard({ c }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(c.title || '?').slice(0, 1)}</Text>
        </View>
        {c.liked_job ? (
          <View style={styles.liked}><Text style={styles.likedText}>♥ İlanınızı beğendi</Text></View>
        ) : null}
        <Text style={styles.title}>{c.title}</Text>
        {c.sector ? <Text style={styles.sector}>{c.sector}</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.meta}>📍 {c.city || 'Şehir belirtilmemiş'}{c.distance_km != null ? ` · ${Math.round(c.distance_km)} km uzakta` : ''}</Text>
        <Text style={styles.meta}>🧰 {c.experience_years ?? '?'} yıl deneyim</Text>
        {c.department || c.education_level ? (
          <Text style={styles.meta}>🎓 {[c.department, eduLabel(c.education_level)].filter(Boolean).join(' · ')}</Text>
        ) : null}
        {c.salary_expectation ? <Text style={styles.salary}>💰 Beklenti: {c.salary_expectation}</Text> : null}
        {c.skills?.length ? (
          <View style={{ marginTop: 8 }}>
            <ChipRow>{c.skills.slice(0, 8).map((s) => <Chip key={s} text={s} small />)}</ChipRow>
          </View>
        ) : null}
        {c.summary ? <Text style={styles.summary} numberOfLines={5}>{c.summary}</Text> : null}
        <Text style={styles.note}>Adı ve CV'si aday ilanı beğenince, telefonu eşleşince açılır</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.primary, padding: 22, paddingTop: 30, alignItems: 'center' },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  liked: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  likedText: { color: colors.like, fontWeight: '800', fontSize: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sector: { color: '#FFEDD5', fontSize: 15, marginTop: 2 },
  body: { flex: 1, padding: 18, gap: 4 },
  meta: { fontSize: 15, color: colors.ink },
  salary: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  summary: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 10 },
  note: { fontSize: 12, color: colors.muted, marginTop: 'auto', textAlign: 'center' },
});
