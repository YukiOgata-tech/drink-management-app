import LottieView from 'lottie-react-native';

interface LottieLoaderProps {
  size?: number;
}

/**
 * アプリ共通のローディングアニメ（dlogo ローディングLottie）。
 * 全画面ローダーやオーバーレイの中身として使う。
 */
export function LottieLoader({ size = 120 }: LottieLoaderProps) {
  return (
    <LottieView
      source={require('../../assets/lottie/dlogo_loading.json')}
      autoPlay
      loop
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}
