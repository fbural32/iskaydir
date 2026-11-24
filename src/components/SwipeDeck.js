import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { colors } from '../lib/theme';

const W = Dimensions.get('window').width;
const THRESHOLD = W * 0.28;

/**
 * Tinder tarzı kart destesi.
 * items: kart verileri, renderCard(item): kart içeriği,
 * onSwipe(item, 'right' | 'left'), renderEmpty(): deste bitince.
 */
export default function SwipeDeck({ items, renderCard, onSwipe, renderEmpty, onNearEnd, canSwipeRight }) {
  const [index, setIndex] = useState(0);
  const pos = useRef(new Animated.ValueXY()).current;

  const itemsRef = useRef(items);
  const indexRef = useRef(index);
  const onSwipeRef = useRef(onSwipe);
  itemsRef.current = items;
  indexRef.current = index;
  onSwipeRef.current = onSwipe;
  const canRightRef = useRef(canSwipeRight);
  canRightRef.current = canSwipeRight;

  useEffect(() => {
    if (onNearEnd && items.length - index <= 3) onNearEnd();
  }, [index, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (dir) => {
    const item = itemsRef.current[indexRef.current];
    setIndex((i) => i + 1);
    pos.setValue({ x: 0, y: 0 });
    if (item) onSwipeRef.current(item, dir);
  };

  const springBack = () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();

  const swipe = (dir, dy = 0) => {
    const item = itemsRef.current[indexRef.current];
    if (!item) return;
    // Kriterleri karşılamıyorsa sağa kaydırma engellenir, kart geri döner
    if (dir === 'right' && canRightRef.current && canRightRef.current(item) === false) {
      springBack();
      return;
    }
    Animated.timing(pos, {
      toValue: { x: dir === 'right' ? W * 1.5 : -W * 1.5, y: dy },
      duration: 220,
      useNativeDriver: false,
    }).start(() => finish(dir));
  };

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > THRESHOLD) swipe('right', g.dy);
      else if (g.dx < -THRESHOLD) swipe('left', g.dy);
      else springBack();
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = items[index];
  const next = items[index + 1];

  if (!current) return renderEmpty ? renderEmpty() : null;

  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pos.x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = pos.x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({
    inputRange: [-W, 0, W], outputRange: [1, 0.94, 1], extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stack}>
        {next ? (
          <Animated.View key={`n-${index + 1}`} style={[styles.card, { transform: [{ scale: nextScale }] }]}>
            {renderCard(next)}
          </Animated.View>
        ) : null}
        <Animated.View
          key={`c-${index}`}
          {...responder.panHandlers}
          style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
        >
          {renderCard(current)}
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: colors.like }]}>EVET</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
            <Text style={[styles.stampText, { color: colors.pass }]}>GEÇ</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.buttons}>
        <Pressable style={[styles.round, { borderColor: colors.pass }]} onPress={() => swipe('left')}>
          <Text style={[styles.roundIcon, { color: colors.pass }]}>✕</Text>
        </Pressable>
        <Pressable style={[styles.round, { borderColor: colors.like }]} onPress={() => swipe('right')}>
          <Text style={[styles.roundIcon, { color: colors.like }]}>♥</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1 },
  card: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  stamp: {
    position: 'absolute', top: 36, borderWidth: 4, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stampLike: { left: 24, borderColor: colors.like, transform: [{ rotate: '-15deg' }] },
  stampPass: { right: 24, borderColor: colors.pass, transform: [{ rotate: '15deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 14 },
  round: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  roundIcon: { fontSize: 28, fontWeight: '800' },
});
