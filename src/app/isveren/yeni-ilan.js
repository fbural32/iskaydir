import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadLocalFile } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { BENEFITS, EMPLOYMENT_TYPES, WORK_MODES, colors, splitList } from '../../lib/theme';
import { Button, Chip, ChipRow, Field, Label, Screen, Title } from '../../components/ui';
import JobCard from '../../components/JobCard';
import { geocodePlace, getCurrentPlace } from '../../lib/location';
import DepartmentPicker from '../../components/DepartmentPicker';
import { EDU_LEVELS } from '../../lib/departments';

const empty = {
  title: '', city: '', address: '', work_mode: 'ofis', employment_type: 'tam',
  description: '', requirements: '', min_experience: '', skills: '',
  benefits: [], benefits_note: '', salary_min: '', salary_max: '',
  allowed_departments: [], min_education: null, any_department: false,
};

export default function NewJob() {
  const { user, profile } = useAuth();
  const company = profile?.company;
  const [f, setF] = useState({ ...empty, city: company?.city || '' });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [geo, setGeo] = useState(null); // { lat, lng, label }
  const [locBusy, setLocBusy] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const toggleBenefit = (b) => setF((s) => ({
    ...s,
    benefits: s.benefits.includes(b) ? s.benefits.filter((x) => x !== b) : [...s.benefits, b],
  }));
  const num = (v) => (v ? parseInt(String(v).replace(/\D/g, ''), 10) || null : null);

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const useGps = async () => {
    setLocBusy(true);
    try {
      const p = await getCurrentPlace();
      setGeo(p);
      setF((s) => ({ ...s, city: s.city || p.city, address: s.address || (p.label !== p.city ? p.label.split(',')[0] : '') }));
    } catch (e) { Alert.alert('Konum alınamadı', e.message); }
    setLocBusy(false);
  };

  // Konum butonu kullanılmadıysa yazılan adres + şehirden koordinat bul
  const resolveGeo = async () => {
    if (geo) return geo;
    try {
      return await geocodePlace(f.address.trim() ? `${f.address.trim()}, ${f.city.trim()}` : f.city.trim());
    } catch {
      try { return await geocodePlace(f.city.trim()); } catch { return null; }
    }
  };

  const validate = () => {
    const missing = [];
    if (!photo) missing.push('fotoğraf');
    if (!f.title.trim()) missing.push('pozisyon');
    if (!f.city.trim()) missing.push('şehir');
    if (!f.description.trim()) missing.push('iş tanımı');
    if (!f.requirements.trim()) missing.push('aranan nitelikler');
    if (!f.benefits.length && !f.benefits_note.trim()) missing.push('haklar');
    if (!f.any_department && !f.allowed_departments.length) missing.push('başvurabilecek bölümler (ya da "Bölüm fark etmez")');
    const min = num(f.salary_min); const max = num(f.salary_max);
    if (min && max && min > max) {
      Alert.alert('Maaş aralığı', 'En düşük maaş en yüksekten büyük olamaz.');
      return false;
    }
    if (missing.length) {
      Alert.alert('Eksik alanlar', `Lütfen doldur: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const publish = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const place = await resolveGeo();
      const photo_url = await uploadLocalFile('public-media', `${user.id}/jobs/${Date.now()}.jpg`, photo, 'image/jpeg');
      const { error } = await supabase.from('jobs').insert({
        company_id: company.id,
        title: f.title.trim(),
        city: f.city.trim(),
        address: f.address.trim() || null,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        work_mode: f.work_mode,
        employment_type: f.employment_type,
        description: f.description.trim(),
        requirements: f.requirements.trim(),
        min_experience: num(f.min_experience) || 0,
        skills: splitList(f.skills),
        benefits: f.benefits,
        benefits_note: f.benefits_note.trim() || null,
        salary_min: num(f.salary_min),
        salary_max: num(f.salary_max),
        allowed_departments: f.any_department ? [] : f.allowed_departments,
        min_education: f.min_education,
        photo_url,
      });
      if (error) throw error;
      Alert.alert('İlan yayında 🎉', 'Uygun adaylar şimdi ilanını görebilir.');
      setF({ ...empty, city: company?.city || '' });
      setPhoto(null);
      router.replace('/isveren');
    } catch (e) {
      Alert.alert('Yayınlanamadı', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <Screen>
        <Title sub="İlan vermeden önce şirketini tanımlamalısın.">Şirket bilgisi eksik</Title>
        <Button title="Şirketi tanımla" onPress={() => router.replace('/isveren/sirket?ilk=1')} />
      </Screen>
    );
  }

  if (preview) {
    return (
      <Screen>
        <Title sub="Adaylar kartını böyle görecek.">Önizleme</Title>
        <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff', elevation: 4 }}>
          <JobCard
            preview
            job={{
              ...f,
              photo_url: photo,
              allowed_departments: f.any_department ? [] : f.allowed_departments,
              company_name: company.name,
              company_logo: company.logo_url,
              salary_min: num(f.salary_min),
              salary_max: num(f.salary_max),
            }}
          />
        </View>
        <Button title="Yayınla" onPress={publish} loading={saving} />
        <Button title="Düzenlemeye dön" variant="ghost" onPress={() => setPreview(false)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Title sub={`${company.name} adına`}>Yeni ilan</Title>

      <Label required>İş yeri fotoğrafı</Label>
      <Pressable onPress={pickPhoto} style={{ marginBottom: 16 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16 }} />
        ) : (
          <View style={{
            width: '100%', aspectRatio: 4 / 3, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
            borderColor: '#FDBA74', backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center',
          }}
          >
            <Text style={{ fontSize: 36 }}>📷</Text>
            <Text style={{ color: colors.chipText, fontWeight: '700', marginTop: 6 }}>Fotoğraf seç</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Fabrika, ofis, ekip — kartın kapağı olur</Text>
          </View>
        )}
      </Pressable>

      <Field label="Pozisyon *" value={f.title} onChangeText={set('title')} placeholder="örn. Üretim Mühendisi" />
      <Field label="Şehir (il) *" value={f.city} onChangeText={(v) => { set('city')(v); setGeo(null); }} />
      <Field
        label="İlçe / adres"
        optional
        value={f.address}
        onChangeText={(v) => { set('address')(v); setGeo(null); }}
        placeholder="örn. Organize Sanayi Bölgesi, Yunusemre"
        hint="Adaylar ilanı mesafeye göre görür — iş yerinin konumu ne kadar doğruysa o kadar iyi."
      />
      <Button
        title={geo ? `✓ Konum alındı: ${geo.label}` : '📍 İş yerindeysem konumumu kullan'}
        variant="outline"
        onPress={useGps}
        loading={locBusy}
        style={{ marginTop: -4, marginBottom: 16 }}
      />

      <Label required>Çalışma şekli</Label>
      <ChipRow>
        {WORK_MODES.map((m) => (
          <Chip key={m.value} text={m.label} selected={f.work_mode === m.value} onPress={() => set('work_mode')(m.value)} />
        ))}
      </ChipRow>
      <View style={{ height: 10 }} />
      <ChipRow>
        {EMPLOYMENT_TYPES.map((m) => (
          <Chip key={m.value} text={m.label} selected={f.employment_type === m.value} onPress={() => set('employment_type')(m.value)} />
        ))}
      </ChipRow>
      <View style={{ height: 16 }} />

      <View style={{
        backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA', marginBottom: 16,
      }}
      >
        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.ink, marginBottom: 4 }}>🎓 Kimler başvurabilir?</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
          Seçtiğin bölümler dışındaki adaylar bu ilanı görmez ve başvuramaz.
        </Text>

        <Label>En az eğitim seviyesi</Label>
        <ChipRow>
          <Chip text="Fark etmez" selected={!f.min_education} onPress={() => set('min_education')(null)} />
          {EDU_LEVELS.map((e) => (
            <Chip key={e.value} text={`${e.label}+`} selected={f.min_education === e.value} onPress={() => set('min_education')(e.value)} />
          ))}
        </ChipRow>
        <View style={{ height: 14 }} />

        <Label required>Bölümler</Label>
        <ChipRow>
          <Chip
            text="Bölüm fark etmez"
            selected={f.any_department}
            onPress={() => setF((s) => ({ ...s, any_department: !s.any_department }))}
          />
          {!f.any_department ? f.allowed_departments.map((d) => (
            <Chip key={d} text={`${d}  ✕`} selected onPress={() => setF((s) => ({ ...s, allowed_departments: s.allowed_departments.filter((x) => x !== d) }))} />
          )) : null}
        </ChipRow>
        {!f.any_department ? (
          <Button title="+ Bölüm ekle" variant="outline" onPress={() => setDeptOpen(true)} style={{ marginTop: 10 }} />
        ) : null}
      </View>
      <DepartmentPicker
        visible={deptOpen}
        multi
        selected={f.allowed_departments}
        onDone={(list) => { setF((s) => ({ ...s, allowed_departments: list, any_department: false })); setDeptOpen(false); }}
        onClose={() => setDeptOpen(false)}
      />

      <Field label="İş tanımı *" value={f.description} onChangeText={set('description')} multiline placeholder="Ne iş yapılacak?" />
      <Field label="Aranan nitelikler *" value={f.requirements} onChangeText={set('requirements')} multiline placeholder="Eğitim, deneyim, belgeler…" />
      <Field label="En az deneyim (yıl)" value={f.min_experience} onChangeText={set('min_experience')} keyboardType="number-pad" optional />
      <Field label="Yetenekler" value={f.skills} onChangeText={set('skills')} optional hint="Virgülle ayır — uygun adayları bulmamıza yardım eder. örn. OEE, Yalın Üretim" />

      <Label required>Haklar ve yan haklar</Label>
      <ChipRow>
        {BENEFITS.map((b) => (
          <Chip key={b} text={b} selected={f.benefits.includes(b)} onPress={() => toggleBenefit(b)} />
        ))}
      </ChipRow>
      <View style={{ height: 10 }} />
      <Field value={f.benefits_note} onChangeText={set('benefits_note')} multiline placeholder="Diğer haklar (örn. yılda 2 ikramiye, kreş desteği)" />

      <Label>
        Maaş aralığı <Text style={{ fontWeight: '400', color: colors.muted }}>(isteğe bağlı)</Text>
      </Label>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field value={f.salary_min} onChangeText={set('salary_min')} keyboardType="number-pad" placeholder="En az ₺" />
        </View>
        <View style={{ flex: 1 }}>
          <Field value={f.salary_max} onChangeText={set('salary_max')} keyboardType="number-pad" placeholder="En çok ₺" />
        </View>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: -6, marginBottom: 12 }}>
        Boş bırakırsan kartta "Maaş görüşülür" yazar.
      </Text>

      <Button title="Önizle" variant="outline" onPress={() => validate() && setPreview(true)} />
      <Button title="Yayınla" onPress={publish} loading={saving} />
    </Screen>
  );
}
