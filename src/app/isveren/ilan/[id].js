import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import SwipeDeck from '../../../components/SwipeDeck';
import CandidateCard from '../../../components/CandidateCard';
import MatchPopup from '../../../components/MatchPopup';
import { Button, Chip, ChipRow, Empty, Loading, Screen } from '../../../components/ui';

const RANGES = [{ v: null, t: 'Tümü' }, { v: 10, t: '10 km' }, { v: 25, t: '25 km' }, { v: 50, t: '50 km' }, { v: 100, t: '100 km' }];

// İşveren bir ilan için aday kaydırır
export default function JobCandidates() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deckKey, setDeckKey] = useState(0);
  const [match, setMatch] = useState(null);
  const [maxKm, setMaxKm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: j }, { data: c, error }] = await Promise.all([
      supabase.from('jobs').select('id, title, city').eq('id', id).single(),
      supabase.rpc('candidates_for_job', { p_job: id, p_limit: 40, p_max_km: maxKm }),
    ]);
    if (error) Alert.alert('Adaylar yüklenemedi', error.message);
    setJob(j);
    setItems(c || []);
    setDeckKey((k) => k + 1);
    setLoading(false);
  }, [id, maxKm]);

  useEffect(() => { load(); }, [load]);

  const onSwipe = async (c, dir) => {
    const { data: matched, error } = await supabase.rpc('employer_swipe', {
      p_job: id, p_candidate: c.user_id, p_dir: dir === 'right' ? 'like' : 'pass',
    });
    if (error) return Alert.alert('Hata', error.message);
    if (matched) setMatch(c);
  };

  const openChat = async () => {
    const { data } = await supabase.from('matches').select('id')
      .eq('job_id', id).eq('candidate_id', match.user_id).single();
    setMatch(null);
    if (data) router.push(`/sohbet/${data.id}`);
  };

  if (loading) return <Screen><Loading text="Uygun adaylar sıralanıyor…" /></Screen>;

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>‹ İlanlarım</Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.ink }} numberOfLines={1}>{job?.title}</Text>
        <Text style={{ color: colors.muted }}>Önce ilanını beğenen adaylar gösterilir</Text>
      </Pressable>
      <View style={{ marginBottom: 12 }}>
        <ChipRow>
          {RANGES.map((r) => (
            <Chip key={r.t} text={r.t} small selected={maxKm === r.v} onPress={() => setMaxKm(r.v)} />
          ))}
        </ChipRow>
      </View>

      <SwipeDeck
        key={deckKey}
        items={items}
        renderCard={(c) => <CandidateCard c={c} />}
        onSwipe={onSwipe}
        renderEmpty={() => (
          <View style={{ flex: 1 }}>
            <Empty title="Şimdilik aday kalmadı" text="Yeni adaylar kayıt oldukça burada görünecek.">
              <Button title="Yenile" onPress={load} />
            </Empty>
          </View>
        )}
      />

      <MatchPopup
        visible={!!match}
        text={match ? `${match.title} adayı da ilanınızı beğenmişti. İletişim bilgileri artık açık.` : ''}
        onChat={openChat}
        onClose={() => setMatch(null)}
      />
    </Screen>
  );
}
