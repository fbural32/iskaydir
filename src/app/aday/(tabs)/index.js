import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../lib/theme';
import SwipeDeck from '../../../components/SwipeDeck';
import JobCard from '../../../components/JobCard';
import MatchPopup from '../../../components/MatchPopup';
import DiscoverySettings from '../../../components/DiscoverySettings';
import { ineligibleReason } from '../../../lib/departments';
import { Button, Empty, Loading, Screen } from '../../../components/ui';

export default function Discover() {
  const { profile, refreshProfile } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cp = profile?.candidate;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deckKey, setDeckKey] = useState(0);
  const [match, setMatch] = useState(null);
  const extPage = useRef(1);
  const extDone = useRef(false);
  const extLoading = useRef(false);

  const loadExternal = useCallback(async () => {
    if (extDone.current || extLoading.current) return;
    extLoading.current = true;
    const { data } = await supabase.functions.invoke('jobs-feed', { body: { page: extPage.current } });
    extLoading.current = false;
    const jobs = data?.jobs || [];
    if (!jobs.length) { extDone.current = true; return; }
    extPage.current += 1;
    setItems((prev) => {
      const seen = new Set(prev.map((j) => j.id));
      return [...prev, ...jobs.filter((j) => !seen.has(j.id))];
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    extPage.current = 1;
    extDone.current = false;
    const { data, error } = await supabase.rpc('jobs_for_candidate', { p_limit: 40 });
    if (error) Alert.alert('İlanlar yüklenemedi', error.message);
    setItems(data || []);
    setDeckKey((k) => k + 1);
    setLoading(false);
    if (!data || data.length < 10) loadExternal();
  }, [loadExternal]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (cp && cp.search_lat == null) setSettingsOpen(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Kriterleri karşılamıyorsa sağa kaydırma engellenir
  const canSwipeRight = (job) => {
    if (job.external || job.eligible !== false) return true;
    Alert.alert('Başvuru yapamazsın', ineligibleReason(job, cp));
    return false;
  };

  const onSwipe = async (job, dir) => {
    if (job.external) {
      if (dir === 'right' && job.link) await WebBrowser.openBrowserAsync(job.link);
      return;
    }
    const { data: matched, error } = await supabase.rpc('candidate_swipe', {
      p_job: job.id, p_dir: dir === 'right' ? 'like' : 'pass',
    });
    if (error) {
      if (error.message?.includes('KRITER')) return Alert.alert('Başvuru yapamazsın', ineligibleReason(job, cp));
      return Alert.alert('Hata', error.message);
    }
    if (matched) setMatch(job);
  };

  const openChat = async () => {
    const { data } = await supabase.from('matches').select('id')
      .eq('job_id', match.id).eq('candidate_id', profile.id).single();
    setMatch(null);
    if (data) router.push(`/sohbet/${data.id}`);
  };

  if (loading) return <Screen><Loading text="Sana uygun ilanlar hazırlanıyor…" /></Screen>;

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>İşKaydır</Text>
          <Text style={{ color: colors.muted }} numberOfLines={1}>{cp?.title}</Text>
        </View>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          style={{
            backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
            borderWidth: 1, borderColor: colors.line, maxWidth: '58%',
          }}
        >
          <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={1}>
            📍 {cp?.search_label || cp?.city || 'Konum seç'}
            <Text style={{ color: colors.primary }}>
              {' · '}{cp?.max_distance_km == null ? (cp?.search_lat != null ? 'Tüm TR' : '—') : `${cp.max_distance_km} km`}
            </Text>
          </Text>
        </Pressable>
      </View>

      <SwipeDeck
        key={deckKey}
        items={items}
        renderCard={(job) => <JobCard job={job} />}
        onSwipe={onSwipe}
        canSwipeRight={canSwipeRight}
        onNearEnd={loadExternal}
        renderEmpty={() => (
          <Empty title="Şimdilik bu kadar 🎉" text="Bu mesafede başka ilan yok. Mesafeyi artırırsan daha çok ilan görürsün.">
            <Button title="Mesafeyi artır" onPress={() => setSettingsOpen(true)} />
            <Button title="Yenile" variant="outline" onPress={load} />
            <Button title="Profilimi düzenle" variant="outline" onPress={() => router.push('/aday/profil')} />
          </Empty>
        )}
      />

      <DiscoverySettings
        visible={settingsOpen}
        candidate={cp}
        userId={profile?.id}
        onClose={() => setSettingsOpen(false)}
        onSaved={async () => { setSettingsOpen(false); await refreshProfile(); load(); }}
      />

      <MatchPopup
        visible={!!match}
        text={match ? `${match.company_name} de seni beğendi. "${match.title}" için konuşmaya başlayabilirsin.` : ''}
        onChat={openChat}
        onClose={() => setMatch(null)}
      />
    </Screen>
  );
}
