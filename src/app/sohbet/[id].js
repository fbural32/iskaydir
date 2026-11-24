import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function Chat() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const isEmployer = profile?.role === 'employer';

  const load = useCallback(async () => {
    const [{ data: all }, { data: msgs }] = await Promise.all([
      supabase.rpc('my_matches'),
      supabase.from('messages').select('*').eq('match_id', id).order('created_at'),
    ]);
    setInfo((all || []).find((m) => m.match_id === id) || null);
    setMessages(msgs || []);
  }, [id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
        (payload) => setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new])))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, load]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { data, error } = await supabase.from('messages')
      .insert({ match_id: id, sender_id: user.id, body }).select().single();
    if (error) { setText(body); return Alert.alert('Gönderilemedi', error.message); }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const openCv = async () => {
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(info.cv_path, 300);
    if (error) return Alert.alert('CV açılamadı', error.message);
    WebBrowser.openBrowserAsync(data.signedUrl);
  };

  const title = info ? (isEmployer ? (info.other_name || info.candidate_title) : info.company_name) : 'Sohbet';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      {info ? (
        <View style={styles.info}>
          <Text style={styles.infoJob}>{info.job_title}</Text>
          <View style={styles.infoRow}>
            {info.other_phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${info.other_phone}`)}>
                <Text style={styles.link}>📞 {info.other_phone}</Text>
              </Pressable>
            ) : null}
            {info.other_email ? (
              <Pressable onPress={() => Linking.openURL(`mailto:${info.other_email}`)}>
                <Text style={styles.link}>✉️ E-posta</Text>
              </Pressable>
            ) : null}
            {isEmployer && info.cv_path ? (
              <Pressable onPress={openCv}><Text style={styles.link}>📄 CV'yi aç</Text></Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 14, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={(
            <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 30 }}>
              {isEmployer ? 'Adaya merhaba de, mülakat için gün öner 👋' : 'İşverene merhaba de 👋'}
            </Text>
          )}
          renderItem={({ item }) => {
            const mine = item.sender_id === user.id;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={{ color: mine ? '#fff' : colors.ink, fontSize: 15 }}>{item.body}</Text>
                <Text style={[styles.time, mine && { color: '#FFEDD5' }]}>
                  {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz…"
            placeholderTextColor="#A8A29E"
            multiline
          />
          <Pressable style={styles.send} onPress={send}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Gönder</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  info: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: colors.line },
  infoJob: { fontWeight: '800', color: colors.ink },
  infoRow: { flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  link: { color: colors.primaryDark, fontWeight: '700' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  time: { fontSize: 10, color: colors.muted, marginTop: 2, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  input: {
    flex: 1, backgroundColor: colors.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 110, color: colors.ink,
  },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
});
