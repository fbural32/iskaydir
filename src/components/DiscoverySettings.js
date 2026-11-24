import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { geocodePlace, getCurrentPlace } from '../lib/location';
import { colors } from '../lib/theme';
import DistanceSlider from './DistanceSlider';
import { Button, Field } from './ui';

/** Tinder'daki "Keşif ayarları": nerede arıyorum + en fazla kaç km */
export default function DiscoverySettings({ visible, candidate, userId, onClose, onSaved }) {
  const [place, setPlace] = useState(null);
  const [query, setQuery] = useState('');
  const [km, setKm] = useState(50);
  const [all, setAll] = useState(false);
  const [remote, setRemote] = useState(true);
  const [ineligible, setIneligible] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setPlace(candidate?.search_lat != null ? {
      lat: candidate.search_lat, lng: candidate.search_lng,
      label: candidate.search_label, city: candidate.search_city,
    } : null);
    setQuery('');
    setAll(candidate?.max_distance_km == null && candidate?.search_lat != null);
    setKm(candidate?.max_distance_km ?? 50);
    setRemote(candidate?.include_remote ?? true);
    setIneligible(candidate?.show_ineligible ?? false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const useGps = async () => {
    setBusy('gps');
    try { setPlace(await getCurrentPlace()); } catch (e) { Alert.alert('Konum alınamadı', e.message); }
    setBusy(null);
  };

  const search = async () => {
    setBusy('search');
    try { setPlace(await geocodePlace(query)); setQuery(''); } catch (e) { Alert.alert('Bulunamadı', e.message); }
    setBusy(null);
  };

  const save = async () => {
    if (!place) return Alert.alert('Konum seç', 'Şu anki konumunu kullan ya da bir şehir/ilçe yaz.');
    setBusy('save');
    const { error } = await supabase.from('candidate_profiles').update({
      search_label: place.label,
      search_city: place.city,
      search_lat: place.lat,
      search_lng: place.lng,
      max_distance_km: all ? null : km,
      include_remote: remote,
      show_ineligible: ineligible,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    setBusy(null);
    if (error) return Alert.alert('Kaydedilemedi', error.message);
    onSaved?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <Text style={styles.h1}>Keşif ayarları</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Kapat</Text></Pressable>
          </View>

          <Text style={styles.section}>NEREDE İŞ ARIYORSUN?</Text>
          <View style={styles.box}>
            <Text style={styles.placeLabel}>📍 {place?.label || 'Konum seçilmedi'}</Text>
            <Button title="Şu anki konumumu kullan" variant="outline" onPress={useGps} loading={busy === 'gps'} />
            <View style={{ height: 14 }} />
            <Field
              label="ya da başka bir yer"
              value={query}
              onChangeText={setQuery}
              placeholder="örn. Bartın, Ereğli, Manisa OSB"
              returnKeyType="search"
              onSubmitEditing={search}
            />
            <Button title="Bu yeri seç" variant="outline" onPress={search} loading={busy === 'search'} disabled={!query.trim()} />
            <Text style={styles.hint}>Başka şehre taşınmayı düşünüyorsan oradaki ilanları da görebilirsin.</Text>
          </View>

          <Text style={styles.section}>MESAFE</Text>
          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.rowTitle}>En fazla uzaklık</Text>
              <Text style={styles.km}>{all ? 'Tüm Türkiye' : `${km} km`}</Text>
            </View>
            <DistanceSlider value={km} min={1} max={300} onChange={(v) => { setKm(v); setAll(false); }} disabled={all} />
            <View style={styles.row}>
              <Text style={styles.rowText}>Tüm Türkiye'deki ilanları göster</Text>
              <Switch value={all} onValueChange={setAll} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowText}>Uzaktan çalışma ilanlarını da göster</Text>
              <Switch value={remote} onValueChange={setRemote} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" />
            </View>
          </View>

          <Text style={styles.section}>BAŞVURU KRİTERLERİ</Text>
          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.rowText}>Bölümüme uygun olmayan ilanları da göster</Text>
              <Switch value={ineligible} onValueChange={setIneligible} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" />
            </View>
            <Text style={styles.hint}>
              Açarsan bu ilanları görürsün ama "Kriterleri karşılamıyorsun" etiketiyle gelir, başvuru yapamazsın.
            </Text>
          </View>

          <Button title="Kaydet ve ilanları yenile" onPress={save} loading={busy === 'save'} style={{ marginTop: 18 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  h1: { fontSize: 26, fontWeight: '900', color: colors.ink },
  close: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  section: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  box: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line },
  placeLabel: { fontSize: 18, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  rowText: { fontSize: 15, color: colors.ink, flex: 1, paddingRight: 10 },
  km: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
