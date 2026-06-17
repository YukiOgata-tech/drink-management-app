import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface CheersOverlayProps {
  /** インクリメントするたびにアニメーションを再生（乾杯受信のたびに +1） */
  signal: number;
  /** 送信者名（任意） */
  from?: string;
}

/**
 * 「乾杯！」が3D的に飛び出す演出オーバーレイ。
 *
 * 後で Lottie に差し替える前提の独立コンポーネント。
 * 差し替え時は中身（Animated.View 部分）を <LottieView source={...} autoPlay loop={false} />
 * に置き換え、signal の変化で再生する形にすればOK。
 */
export function CheersOverlay({ signal, from }: CheersOverlayProps) {
  const progress = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (signal <= 0) return;
    setVisible(true);
    progress.value = 0;
    progress.value = withSequence(
      // 飛び出し（オーバーシュート）
      withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.2)) }),
      // 少し見せてから引っ込む
      withDelay(
        750,
        withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setVisible)(false);
        })
      )
    );
  }, [signal]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.35,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { perspective: 800 },
      { scale: 0.4 + progress.value * 0.75 },
      { rotateX: `${(1 - progress.value) * 70}deg` },
    ],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]} />
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.emoji}>🍻</Text>
          <Text style={styles.kanpai}>乾杯！</Text>
          {!!from && <Text style={styles.from}>{from} さんが乾杯！</Text>}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 88,
    marginBottom: 4,
  },
  kanpai: {
    fontSize: 60,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(14,165,233,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
    letterSpacing: 2,
  },
  from: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
