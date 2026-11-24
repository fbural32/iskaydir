import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import { Button } from './ui';

export default function MatchPopup({ visible, text, onChat, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={{ fontSize: 56, textAlign: 'center' }}>🤝</Text>
          <Text style={styles.title}>Eşleştiniz!</Text>
          <Text style={styles.text}>{text}</Text>
          <Button title="Mesaj gönder" onPress={onChat} />
          <Button title="Kaydırmaya devam" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 },
  box: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  title: { fontSize: 30, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginVertical: 10, lineHeight: 21 },
});
