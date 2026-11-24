import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import { Chip, ChipRow, Empty, Screen, Title } from '../../../components/ui';
import { eduLabel } from '../../../lib/departments';

const FILTERS = [
  { v: 'yeni', t: 'Bekleyenler' },
  { v: 'hepsi', t: 'Hepsi' },
  { v: 'eslesen', t: 'Eşleşenler' },
];

// İlanlarını beğenen TÜM adaylar — ad, profil ve CV açık. Sağa kaydırmak yerine buradan direkt eşleş.
export default function Likers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('yeni');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('my_likers');
    if (error) Alert.alert('Yüklenemedi', error.message);
    setItems(data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = items.filter((i) => (
    filter === 'hepsi' ? true : filter === 'eslesen' ? i.matched : !i.employer_dir
  ));
  const pending = items.filter((i) => !i.employer_dir).length;

  const decide = async (item, dir) => {
    const key = `${item.job_id}-${item.candidate_id}`;
    setBusy(key);
    const { data: matched, error } = await supabase.rpc('employer_swipe', {
      p_job: item.job_id, p_candidate: item.candidate_id, p_dir: dir,
    });
    setBusy(null);
    if (error) return Alert.alert('Hata', error.message);
    if (matched) {
      const { data: m } = await supabase.from('matches').select('id')
        .eq('job_id', item.job_id).eq('candidate_id', item.candidate_id).single();
      Alert.alert('Eşleştiniz! 🤝', `${item.full_name} ile sohbet açıldı, telefon ve e-posta artık görünür.`, [
        { text: 'Sonra', style: 'cancel' },
        { text: 'Mesaj gönder', onPress: () => m && router.push(`/sohbet/${m.id}`) },
      ]);
    }
    load();
  };

  const openCv = async (path) => {
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(path, 300);
    if (error) return Alert.alert('CV açılamadı', error.message);
    WebBrowser.openBrowserAsync(data.signedUrl);
  };

  const openChat = async (item) => {
    const { data: m } = await supabase.from('matches').select('id')
      .eq('job_id', item.job_id).eq('candidate_id', item.candidate_id).single();
    if (m) router.push(`/sohbet/${m.id}`);
  };

  return (
    <Screen>
      <Title sub={pending ? `${pending} aday cevabını bekliyor` : 'İlanlarını beğenen herkes burada'}>Beğenenler</Title>
      <View style={{ marginBottom: 12 }}>
        <ChipRow>
          {FILTERS.map((f) => (
            <Chip key={f.v} text={f.t} small selected={filter === f.v} onPress={() => setFilter(f.v)} />
          ))}
        </ChipRow>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(i) => `${i.job_id}-${i.candidate_id}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={shown.length ? { paddingBottom: 20 } : { flex: 1 }}
        ListEmptyComponent={!loading ? (
          <Empty
            title={filter === 'yeni' ? 'Bekleyen yok' : 'Henüz beğeni yok'}
            text="Adaylar ilanlarını sağa kaydırdıkça burada görünür."
          />
        ) : null}
        renderItem={({ item }) => {
          const key = `${item.job_id}-${item.candidate_id}`;
          return (
            <View style={[styles.card, item.employer_dir === 'pass' && { opacity: 0.55 }]}>
              <View style={styles.top}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.full_name || '?').slice(0, 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name || 'İsimsiz aday'}</Text>
                  <Text style={styles.title}>{item.title || '—'}{item.experience_years != null ? ` · ${item.experience_years} yıl` : ''}</Text>
                  <Text style={styles.meta}>
                    📍 {item.city || '—'}{item.distance_km != null ? ` · ${Math.round(item.distance_km)} km` : ''}
                  </Text>
                </View>
              </View>

              {item.department || item.education_level ? (
                <Text style={[styles.meta, { marginTop: 8, color: colors.ink }]}>
                  🎓 {[item.department, eduLabel(item.education_level)].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Text style={styles.liked}>♥ "{item.job_title}" ilanını beğendi</Text>
              {item.salary_expectation ? <Text style={styles.salary}>💰 Beklenti: {item.salary_expectation}</Text> : null}
              {item.skills?.length ? (
                <View style={{ marginTop: 8 }}>
                  <ChipRow>{item.skills.slice(0, 6).map((s) => <Chip key={s} text={s} small />)}</ChipRow>
                </View>
              ) : null}
              {item.summary ? <Text style={styles.summary} numberOfLines={3}>{item.summary}</Text> : null}

              <View style={styles.actions}>
                {item.cv_path ? (
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => openCv(item.cv_path)}>
                    <Text style={styles.btnGhostText}>📄 CV</Text>
                  </Pressable>
                ) : null}
                {item.matched ? (
                  <Pressable style={[styles.btn, styles.btnLike, { flex: 1 }]} onPress={() => openChat(item)}>
                    <Text style={styles.btnText}>💬 Sohbete git</Text>
                  </Pressable>
                ) : (
                  <>
                    {item.employer_dir !== 'pass' ? (
                      <Pressable
                        style={[styles.btn, styles.btnPass]}
                        disabled={busy === key}
                        onPress={() => decide(item, 'pass')}
                      >
                        <Text style={[styles.btnText, { color: colors.pass }]}>✕ Geç</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.btn, styles.btnLike, { flex: 1 }]}
                      disabled={busy === key}
                      onPress={() => decide(item, 'like')}
                    >
                      <Text style={styles.btnText}>{item.employer_dir === 'pass' ? 'Fikrimi değiştirdim ♥' : '♥ Eşleş'}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.line,
  },
  top: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  title: { fontSize: 14, color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 1 },
  liked: { marginTop: 10, color: colors.like, fontWeight: '700', fontSize: 13 },
  salary: { marginTop: 4, color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  summary: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: colors.chip },
  btnGhostText: { color: colors.chipText, fontWeight: '800' },
  btnPass: { borderWidth: 1.5, borderColor: colors.pass, backgroundColor: '#fff' },
  btnLike: { backgroundColor: colors.like },
  btnText: { color: '#fff', fontWeight: '800' },
});
