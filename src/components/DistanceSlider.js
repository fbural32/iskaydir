import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

/** Tinder'daki gibi mesafe kaydırıcısı. value: km (min..max) */
export default function DistanceSlider({ value, min = 1, max = 300, onChange, disabled }) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fromX = (x) => {
    const w = widthRef.current || 1;
    const t = Math.min(1, Math.max(0, x / w));
    return Math.round(min + t * (max - min));
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => onChangeRef.current(fromX(e.nativeEvent.locationX)),
    onPanResponderMove: (e) => onChangeRef.current(fromX(e.nativeEvent.locationX)),
  })).current;

  const t = (Math.min(max, Math.max(min, value)) - min) / (max - min);

  return (
    <View
      style={[styles.hit, disabled && { opacity: 0.35 }]}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; setWidth(e.nativeEvent.layout.width); }}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: t * width }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: t * width - 14 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center', marginHorizontal: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary },
  thumb: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 3, borderColor: colors.primary, elevation: 3,
  },
});
