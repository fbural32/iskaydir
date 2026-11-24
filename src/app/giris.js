import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button, Field, Screen, Title } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return Alert.alert('Giriş yapılamadı', 'E-posta veya şifre hatalı.');
    router.replace('/');
  };

  return (
    <Screen scroll>
      <Title sub="Kaldığın yerden devam et.">Giriş yap</Title>
      <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Giriş yap" onPress={submit} loading={loading} />
      <Button title="Hesabın yok mu? Kayıt ol" variant="ghost" onPress={() => router.replace('/hosgeldin')} />
    </Screen>
  );
}
