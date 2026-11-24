import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { colors, splitList } from '../../../lib/theme';
import { Button, Chip, ChipRow, Field, Label, Screen, Title } from '../../../components/ui';
import DepartmentPicker from '../../../components/DepartmentPicker';
import { EDU_LEVELS } from '../../../lib/departments';
import { geocodePlace } from '../../../lib/location';

export default function CandidateProfile() {
  const { onay } = useLocalSearchParams();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const cp = profile?.candidate || {};
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setF({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      title: cp.title || '',
      sector: cp.sector || '',
      city: cp.city || '',
      experience_years: cp.experience_years != null ? String(cp.experience_years) : '',
      education: cp.education || '',
      department: cp.department || '',
      education_level: cp.education_level || '',
      skills: (cp.skills || []).join(', '),
      salary_expectation: cp.salary_expectation || '',
      summary: cp.summary || '',
    });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.title.trim() || !f.city.trim()) {
      return Alert.alert('Eksik bilgi', 'Pozisyon ve şehir zorunlu — ilanları bunlara göre gösteriyoruz.');
    }
    if (!f.education_level || !f.department) {
      return Alert.alert('Eksik bilgi', 'Eğitim seviyeni ve bölümünü seç — işverenler ilanlarında bölüm şartı koyuyor, buna göre başvurabildiğin ilanları gösteriyoruz.');
    }
    setSaving(true);
    // İlk kurulumda arama konumu yoksa yazdığı şehri varsayılan yap (50 km)
    let searchDefaults = {};
    if (cp.search_lat == null) {
      try {
        const p = await geocodePlace(f.city.trim());
        searchDefaults = { search_label: p.label, search_city: p.city, search_lat: p.lat, search_lng: p.lng, max_distance_km: 50 };
      } catch { searchDefaults = { search_city: f.city.trim(), search_label: f.city.trim() }; }
    }
    const { error: e1 } = await supabase.from('candidate_profiles').upsert({
      user_id: user.id,
      title: f.title.trim(),
      sector: f.sector.trim() || null,
      city: f.city.trim(),
      experience_years: f.experience_years ? parseInt(f.experience_years, 10) : null,
      education: f.education.trim() || null,
      department: f.department,
      education_level: f.education_level,
      skills: splitList(f.skills),
      salary_expectation: f.salary_expectation.trim() || null,
      summary: f.summary.trim() || null,
      updated_at: new Date().toISOString(),
      ...searchDefaults,
    });
    const { error: e2 } = await supabase.from('profiles')
      .update({ full_name: f.full_name.trim(), phone: f.phone.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (e1 || e2) return Alert.alert('Kaydedilemedi', (e1 || e2).message);
    await refreshProfile();
    if (onay) router.replace('/aday');
    else Alert.alert('Kaydedildi', 'Profilin güncellendi.');
  };

  if (!f.title && f.title !== '') return null;

  return (
    <Screen scroll>
      <Title sub={onay ? 'CV\'nden çıkardıklarımızı kontrol et, gerekirse düzelt.' : 'İlanlar bu bilgilere göre sıralanır.'}>
        {onay ? 'Profilini onayla' : 'Profilim'}
      </Title>

      <Field label="Pozisyon" value={f.title} onChangeText={set('title')} placeholder="örn. Üretim Mühendisi" />
      <Field label="Şehir" value={f.city} onChangeText={set('city')} placeholder="örn. Manisa" />
      <Field label="Sektör" value={f.sector} onChangeText={set('sector')} placeholder="örn. Gıda / FMCG" optional />
      <Field label="Deneyim (yıl)" value={f.experience_years} onChangeText={set('experience_years')} keyboardType="number-pad" />
      <Label required>Eğitim seviyesi</Label>
      <ChipRow>
        {EDU_LEVELS.map((e) => (
          <Chip key={e.value} text={e.label} selected={f.education_level === e.value} onPress={() => set('education_level')(e.value)} />
        ))}
      </ChipRow>
      <View style={{ height: 14 }} />
      <Label required>Bölüm</Label>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={{
          backgroundColor: '#fff', borderWidth: 1, borderColor: f.department ? colors.primary : colors.line,
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 16, color: f.department ? colors.ink : '#A8A29E' }}>
          {f.department || 'Bölümünü seç…'}
        </Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 14 }}>
        Sadece bölümünün başvurabildiği ilanları görürsün.
      </Text>
      <Field label="Okul" value={f.education} onChangeText={set('education')} placeholder="örn. Ege Üniversitesi" optional />
      <DepartmentPicker
        visible={pickerOpen}
        selected={f.department ? [f.department] : []}
        onDone={([d]) => { set('department')(d); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
      <Field
        label="Yetenekler"
        value={f.skills}
        onChangeText={set('skills')}
        hint="Virgülle ayır: Yalın Üretim, OEE, İSG"
      />
      <Field
        label="Maaş beklentisi"
        optional
        value={f.salary_expectation}
        onChangeText={set('salary_expectation')}
        placeholder="örn. 70.000 ₺ net"
        hint="Yazarsan işveren kartında görür, boş bırakırsan görünmez."
      />
      <Field label="Kısa özet" value={f.summary} onChangeText={set('summary')} multiline optional />

      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 8, marginBottom: 8, color: colors.ink }}>
        🔒 Sadece eşleştiğin işveren görür
      </Text>
      <Field label="Ad soyad" value={f.full_name} onChangeText={set('full_name')} />
      <Field label="Telefon" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" optional />

      <Button title={onay ? 'Onayla ve ilanları gör' : 'Kaydet'} onPress={save} loading={saving} />
      {!onay ? (
        <>
          <Button title="CV'yi yeniden yükle" variant="outline" onPress={() => router.push('/aday/cv')} />
          <Button title="Çıkış yap" variant="ghost" onPress={async () => { await signOut(); router.replace('/hosgeldin'); }} />
        </>
      ) : null}
    </Screen>
  );
}
