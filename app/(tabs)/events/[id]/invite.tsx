import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEventsStore((state) => state.getEventById(id));
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  if (!event) {
    router.back();
    return null;
  }

  const inviteLink = `drinkmanagement://events/join?code=${event.inviteCode}`;
  const shareText = `「${event.title}」への招待\n\n招待コード: ${event.inviteCode}\n\nこのコードをアプリで入力して参加してください！`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(event.inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('コピー完了', '招待コードをコピーしました');
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('コピー完了', 'リンクをコピーしました');
  };

  const handleShareToLine = async () => {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
      shareText
    )}`;
    try {
      await Linking.openURL(lineUrl);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('エラー', 'LINEを開けませんでした');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareText,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity onPress={() => router.back()} className="mb-2 flex-row items-center">
            <Feather name="arrow-left" size={16} color="#0284c7" />
            <Text className="text-primary-600 font-semibold text-base ml-1">
              戻る
            </Text>
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            イベントに招待
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 100,
            paddingHorizontal: 24,
            paddingVertical: 24,
            alignItems: isMd ? 'center' : undefined,
          }}
        >
          <ResponsiveContainer className={isMd ? 'max-w-xl w-full' : 'w-full'}>
          {/* イベント情報（グラデーションヒーロー） */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-6">
            <LinearGradient
              colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 24 }}
            >
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                >
                  <Feather name="calendar" size={32} color="#ffffff" />
                </View>
                <Text className="text-xl font-bold text-white text-center mb-1">
                  {event.title}
                </Text>
                {event.description && (
                  <Text className="text-sm text-white/80 text-center">
                    {event.description}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* 招待コード */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mb-6"
          >
            <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              招待コード
            </Text>
            <Card variant="elevated">
              <View className="items-center py-6">
                <Text className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  このコードをアプリで入力
                </Text>
                <View className={`px-6 py-4 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Text className={`text-3xl font-bold tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {event.inviteCode || '読み込み中...'}
                  </Text>
                </View>
                {!event.inviteCode && (
                  <Text className="text-sm text-red-500 mb-2">
                    招待コードの取得に失敗しました。イベントを再読み込みしてください。
                  </Text>
                )}
                <Button
                  title="コードをコピー"
                  icon={<Feather name="copy" size={18} color="#6b7280" />}
                  onPress={handleCopyCode}
                  variant="outline"
                />
              </View>
            </Card>
          </Animated.View>

          {/* QRコード */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mb-6"
          >
            <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              QRコード
            </Text>
            <Card variant="elevated">
              <View className="items-center py-6">
                <View className="bg-white p-4 rounded-xl mb-4 shadow-sm">
                  <QRCode
                    value={inviteLink}
                    size={180}
                    backgroundColor="white"
                    color="#111827"
                  />
                </View>
                <Text className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  カメラでスキャンして参加
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* 共有方法 */}
          <Animated.View entering={FadeInDown.delay(250).duration(600)}>
            <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              共有する
            </Text>
            <Card variant="elevated">
              <View className="gap-2">
                <Button
                  title="LINEで共有"
                  icon={<Feather name="message-circle" size={18} color="#ffffff" />}
                  onPress={handleShareToLine}
                  fullWidth
                  variant="primary"
                />
                <Button
                  title="その他の方法で共有"
                  icon={<Feather name="share-2" size={18} color="#6b7280" />}
                  onPress={handleShare}
                  fullWidth
                  variant="outline"
                />
                <Button
                  title="リンクをコピー"
                  icon={<Feather name="link" size={18} color="#6b7280" />}
                  onPress={handleCopyLink}
                  fullWidth
                  variant="outline"
                />
              </View>
            </Card>
          </Animated.View>

          {/* 使い方 */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            className="mt-6 mb-6"
          >
            <Card variant="outlined" className={`border-blue-200 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <View className="flex-row items-center mb-2">
                <Feather name="book-open" size={16} color={isDark ? '#60a5fa' : '#1e40af'} style={{ marginRight: 6 }} />
                <Text className={`text-base font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                  招待方法
                </Text>
              </View>
              <Text className={`text-sm leading-6 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                1. 上記の方法で招待コードを共有{'\n'}
                2. 受け取った人がアプリで招待コードを入力{'\n'}
                3. または共有されたリンクをタップしてアプリを開く{'\n'}
                4. 参加確認画面で「参加する」をタップ
              </Text>
            </Card>
          </Animated.View>
          </ResponsiveContainer>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
