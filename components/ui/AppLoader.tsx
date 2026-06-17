import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useThemeStore } from '@/stores/theme';

const ICON_LIGHT = require('../../assets/images/DMA-icon_light.png');
const ICON_DARK = require('../../assets/images/DMA-icon_dark.png');

interface AppLoaderProps {
  /** アイコンの一辺（px） */
  size?: number;
}

/**
 * アプリアイコンを使ったブランドローディング。
 * アイコンが呼吸（パルス）しつつ、周囲をグラデーションのアークが回転する。
 */
export function AppLoader({ size = 72 }: AppLoaderProps) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';
  const pulse = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [pulse, spin]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, 1]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.85, 1]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const ringSize = size + 26;

  return (
    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* 回転するグラデ風アーク（上＋右だけ着色して回す） */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: 3,
            borderColor: 'transparent',
            borderTopColor: '#0ea5e9',
            borderRightColor: '#8b5cf6',
          },
          ringStyle,
        ]}
      />
      {/* 呼吸するアプリアイコン */}
      <Animated.Image
        source={isDark ? ICON_DARK : ICON_LIGHT}
        style={[{ width: size, height: size, borderRadius: size * 0.22 }, iconStyle]}
        resizeMode="contain"
      />
    </View>
  );
}
