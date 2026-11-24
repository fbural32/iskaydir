import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { colors, salaryText } from '../../../lib/theme';
import { Button, Empty, Screen, Title } from '../../../components/ui';

export default function MyJobs() {
  const { profile } = useAuth();
  const company = profile?.company;
  const [jobs, setJobs] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const { data } = await supabase.from('jobs').select('*')
      .eq('company_id', company.id).order('created_at', { ascending: false });
    setJobs(data || []);
    // Her ilanda kaç aday sağa kaydırdı, işveren henüz bakmadı
    const { data: sw } = await supabase.from('job_swipes').select('job_id')
      .eq('candidate_dir', 'like').is('employer_dir', null)
      .in('job_id', (data || []).map((j) => j.id));
    const counts = {};
    (sw || []).forEach((s) => { counts[s.job_id] = (counts[s.job_id] || 0) + 1; });
    setLikes(counts);
    setLoading(false);
  }, [company]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = (job) => {
    Alert.alert(job.is_active ? 'İlanı durdur?' : 'İlanı yayına al?', job.title, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: job.is_active ? 'Durdur' : 'Yayına al',
        onPress: async () => {
          await supabase.from('jobs').update({ is_active: !job.is_active }).eq('id', job.id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Title sub={company?.name}>İlanlarım</Title>
      <Button title="+ Yeni ilan ver" onPress={() => router.push('/isveren/yeni-ilan')} style={{ marginBottom: 14 }} />
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={jobs.length ? null : { flex: 1 }}
        ListEmptyComponent={!loading ? (
          <Empty title="Henüz ilan yok" text="İlk ilanını ver, uygun adayları kaydırmaya başla." />
        ) : null}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.is_active && { opacity: 0.55 }]}
            onPress={() => router.push(`/isveren/ilan/${item.id}`)}
            onLongPress={() => toggleActive(item)}
          >
            <Image source={{ uri: item.photo_url }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>{item.city} · {salaryText(item.salary_min, item.salary_max)}</Text>
              <Text style={styles.cta}>
                {item.is_active
                  ? (likes[item.id] ? `♥ ${likes[item.id]} aday beğendi — kaydır` : 'Adayları kaydır →')
                  : 'Durduruldu (uzun bas: yayına al)'}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center',
  },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cta: { fontSize: 13, color: colors.primaryDark, fontWeight: '700', marginTop: 6 },
});
