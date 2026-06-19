import { useCallback, useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useThemeStore } from '@/stores/theme';

// 立ち上る泡の設定（位置%・サイズ・色・周期・遅延）
const BUBBLES = [
  { x: 0.12, size: 16, color: '#0ea5e9', duration: 2600, delay: 0 },
  { x: 0.22, size: 10, color: '#8b5cf6', duration: 3000, delay: 500 },
  { x: 0.34, size: 22, color: '#0ea5e9', duration: 2300, delay: 200 },
  { x: 0.46, size: 12, color: '#6366f1', duration: 3200, delay: 900 },
  { x: 0.58, size: 18, color: '#8b5cf6', duration: 2500, delay: 300 },
  { x: 0.68, size: 9, color: '#0ea5e9', duration: 2900, delay: 700 },
  { x: 0.78, size: 20, color: '#6366f1', duration: 2400, delay: 100 },
  { x: 0.88, size: 13, color: '#8b5cf6', duration: 3100, delay: 1100 },
];

function Bubble({
  x,
  size,
  color,
  duration,
  delay,
  screenW,
  screenH,
}: {
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  screenW: number;
  screenH: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
  }, [t, duration, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [screenH * 0.55, -80]) },
      { translateX: interpolate(t.value, [0, 0.5, 1], [0, 12, -10]) },
      { scale: interpolate(t.value, [0, 0.5, 1], [0.6, 1, 0.8]) },
    ],
    opacity: interpolate(t.value, [0, 0.12, 0.85, 1], [0, 0.65, 0.65, 0]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: screenW * x,
          bottom: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * Lottie + 背景エフェクト（立ち上る泡＋ロゴ後ろの光のパルス）のアニメスプラッシュ。
 * 約3秒で再生・フェードアウトして onFinish を呼ぶ。背景はネイティブsplashと同色で繋ぎ目なし。
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';
  const { width, height } = useWindowDimensions();
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glow]);

  const handleReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // ローディング系（ループ）アニメのため、約3秒でフェードアウトして終了
  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
    }, 2700);
    return () => clearTimeout(timer);
  }, [opacity, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + glow.value * 0.3 }],
    opacity: 0.18 + glow.value * 0.22,
  }));

  return (
    <Animated.View
      onLayout={handleReady}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isDark ? '#000000' : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          overflow: 'hidden',
        },
        rootStyle,
      ]}
    >
      {/* 立ち上る泡 */}
      {BUBBLES.map((b, i) => (
        <Bubble key={i} {...b} screenW={width} screenH={height} />
      ))}

      {/* ロゴ後ろの光のパルス */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: '#0ea5e9',
          },
          glowStyle,
        ]}
      />

      {/* Lottie ロゴ（dlogo ローディング・ループ。約3秒でフェード） */}
      <LottieView
        source={require('../assets/lottie/dlogo_loading.json')}
        autoPlay
        loop
        speed={1.2}
        resizeMode="contain"
        style={{ width: 260, height: 260 }}
      />
    </Animated.View>
  );
}
