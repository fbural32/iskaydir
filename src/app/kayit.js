import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Button, Field, Screen, Title } from '../components/ui';

export default function Register() {
  const { rol } = useLocalSearchParams();
  const role = rol === 'employer' ? 'employer' : 'candidate';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      return Alert.alert('Eksik bilgi', 'Ad, e-posta ve en az 6 karakterli şifre gerekli.');
    }
    if (!consent) return Alert.alert('Onay gerekli', 'Devam etmek için KVKK aydınlatma metnini onayla.');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role, full_name: name.trim() } },
    });
    setLoading(false);
    if (error) return Alert.alert('Kayıt olunamadı', error.message);
    if (!data.session) {
      Alert.alert('E-postanı onayla', 'Gelen kutuna bir onay bağlantısı gönderdik. Onayladıktan sonra giriş yap.');
      return router.replace('/giris');
    }
    router.replace('/');
  };

  return (
    <Screen scroll>
      <Title sub={role === 'employer' ? 'İşveren hesabı oluştur' : 'İş arayan hesabı oluştur'}>Kayıt ol</Title>
      <Field label={role === 'employer' ? 'Yetkili adı soyadı' : 'Ad soyad'} value={name} onChangeText={setName} />
      <Field
        label={role === 'employer' ? 'Kurumsal e-posta' : 'E-posta'}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry hint="En az 6 karakter" />

      <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
        <View style={{
          width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary,
          backgroundColor: consent ? colors.primary : '#fff', alignItems: 'center', justifyContent: 'center',
        }}
        >
          {consent ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          {role === 'candidate'
            ? 'KVKK aydınlatma metnini okudum. CV ve profil bilgilerimin iş eşleştirmesi için işlenmesine ve bir ilanı beğendiğimde adımın, profilimin ve CV’min o işverenle paylaşılmasına, telefon ve e-postamın yalnızca eşleştiğim işverenlerle paylaşılmasına açık rıza veriyorum.'
            : 'KVKK aydınlatma metnini okudum. Aday verilerini yalnızca işe alım amacıyla kullanacağımı kabul ediyorum.'}
        </Text>
      </Pressable>

      <Button title="Hesap oluştur" onPress={submit} loading={loading} />
      <Button title="Rolü değiştir" variant="ghost" onPress={() => router.replace('/hosgeldin')} />
    </Screen>
  );
}
