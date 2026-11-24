import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Empty, Screen, Title } from './ui';

export default function MatchesList({ role }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('my_matches');
    setItems(data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Title sub={role === 'employer' ? 'Sizi ve sizin beğendiğiniz adaylar' : 'Karşılıklı beğenilen ilanlar'}>
        Eşleşmeler
      </Title>
      <FlatList
        data={items}
        keyExtractor={(m) => m.match_id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={items.length ? null : { flex: 1 }}
        ListEmptyComponent={!loading ? (
          <Empty
            title="Henüz eşleşme yok"
            text={role === 'employer'
              ? 'İlanlarınızdaki adayları sağa kaydırın. Aday da ilanı beğendiyse eşleşirsiniz.'
              : 'Beğendiğin ilanları sağa kaydır. İşveren de seni beğenirse burada görünür.'}
          />
        ) : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/sohbet/${item.match_id}`)}>
            {role === 'candidate' && item.company_logo ? (
              <Image source={{ uri: item.company_logo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {((role === 'employer' ? item.other_name : item.company_name) || '?').slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {role === 'employer' ? (item.other_name || item.candidate_title) : item.company_name}
              </Text>
              <Text style={styles.job} numberOfLines={1}>{item.job_title}</Text>
              <Text style={styles.last} numberOfLines={1}>{item.last_message || 'Yeni eşleşme — ilk mesajı sen at 👋'}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff',
    padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.line,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  job: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  last: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
