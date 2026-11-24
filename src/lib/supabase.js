import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { File } from 'expo-file-system';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ornek.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eksik-anahtar';

export const isConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Telefondaki bir dosyayı Supabase Storage'a yükler. */
export async function uploadLocalFile(bucket, path, uri, contentType) {
  const bytes = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  if (bucket === 'public-media') {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  return path;
}
