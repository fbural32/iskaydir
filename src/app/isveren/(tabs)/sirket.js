import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadLocalFile } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../lib/theme';
import { Button, Field, Screen, Title } from '../../../components/ui';

// Şirket profili — bir kere tanımlanır, tüm ilanlarda otomatik kullanılır.
export default function Company() {
  const { ilk } = useLocalSearchParams();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const c = profile?.company;
  const [f, setF] = useState(null);
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setF({
      name: c?.name || '',
      sector: c?.sector || '',
      city: c?.city || '',
      tax_no: c?.tax_no || '',
      corporate_email: c?.corporate_email || profile?.email || '',
      about: c?.about || '',
    });
    setLogo(c?.logo_url || null);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const pickLogo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!r.canceled) setLogo(r.assets[0].uri);
  };

  const save = async () => {
    if (!f.name.trim() || !f.city.trim() || !f.tax_no.trim()) {
      return Alert.alert('Eksik bilgi', 'Şirket adı, şehir ve vergi numarası zorunlu.');
    }
    setSaving(true);
    try {
      let logo_url = c?.logo_url || null;
      if (logo && logo !== c?.logo_url) {
        logo_url = await uploadLocalFile('public-media', `${user.id}/logo-${Date.now()}.jpg`, logo, 'image/jpeg');
      }
      const row = {
        owner_id: user.id,
        name: f.name.trim(),
        sector: f.sector.trim() || null,
        city: f.city.trim(),
        tax_no: f.tax_no.trim(),
        corporate_email: f.corporate_email.trim() || null,
        about: f.about.trim() || null,
        logo_url,
      };
      const { error } = c
        ? await supabase.from('companies').update(row).eq('id', c.id)
        : await supabase.from('companies').insert(row);
      if (error) throw error;
      await refreshProfile();
      if (ilk) router.replace('/isveren/yeni-ilan');
      else Alert.alert('Kaydedildi', 'Şirket bilgileri güncellendi.');
    } catch (e) {
      Alert.alert('Kaydedilemedi', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Title sub={ilk ? 'Bir kere gir, tüm ilanlarında otomatik kullanılsın.' : 'Şirket bilgileri'}>
        {ilk ? 'Şirketini tanımla' : 'Şirketim'}
      </Title>

      <Pressable onPress={pickLogo} style={{ alignItems: 'center', marginBottom: 16 }}>
        {logo ? (
          <Image source={{ uri: logo }} style={{ width: 96, height: 96, borderRadius: 20 }} />
        ) : (
          <View style={{
            width: 96, height: 96, borderRadius: 20, backgroundColor: colors.chip,
            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FED7AA',
          }}
          >
            <Text style={{ color: colors.chipText, fontWeight: '700' }}>+ Logo</Text>
          </View>
        )}
      </Pressable>

      {c ? (
        <Text style={{ textAlign: 'center', marginBottom: 12, color: c.verified ? colors.like : colors.muted, fontWeight: '700' }}>
          {c.verified ? '✓ Doğrulanmış şirket' : '⏳ Doğrulama bekleniyor'}
        </Text>
      ) : null}

      <Field label="Şirket adı" value={f.name} onChangeText={set('name')} />
      <Field label="Sektör" value={f.sector} onChangeText={set('sector')} placeholder="örn. Gıda üretimi" optional />
      <Field label="Şehir" value={f.city} onChangeText={set('city')} />
      <Field label="Vergi numarası" value={f.tax_no} onChangeText={set('tax_no')} keyboardType="number-pad" hint="Sahte ilanları önlemek için doğrulamada kullanılır, adaylara gösterilmez." />
      <Field label="Kurumsal e-posta" value={f.corporate_email} onChangeText={set('corporate_email')} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Şirket hakkında" value={f.about} onChangeText={set('about')} multiline optional />

      <Button title={ilk ? 'Kaydet ve ilk ilanı ver' : 'Kaydet'} onPress={save} loading={saving} />
      {!ilk ? (
        <Button title="Çıkış yap" variant="ghost" onPress={async () => { await signOut(); router.replace('/hosgeldin'); }} />
      ) : null}
    </Screen>
  );
}
