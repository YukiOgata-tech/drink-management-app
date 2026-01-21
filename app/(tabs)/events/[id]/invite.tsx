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
import { Button, Card } from '@/components/ui';
import { useEventsStore } from '@/stores/events';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEventsStore((state) => state.getEventById(id));

  if (!event) {
    router.back();
    return null;
  }

  const inviteLink = `drinkmanagement://events/join?code=${event.inviteCode}`;
  const shareText = `🎉 「${event.title}」への招待\n\n招待コード: ${event.inviteCode}\n\nこのコードをアプリで入力して参加してください！`;

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
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="mb-2">
            <Text className="text-primary-600 font-semibold text-base">
              ← 戻る
            </Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            イベントに招待
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* イベント情報 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-6 bg-gradient-to-br from-secondary-50 to-primary-50">
              <View className="items-center py-4">
                <Text className="text-4xl mb-3">🎉</Text>
                <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                  {event.title}
                </Text>
                {event.description && (
                  <Text className="text-sm text-gray-600 text-center">
                    {event.description}
                  </Text>
                )}
              </View>
            </Card>
          </Animated.View>

          {/* 招待コード */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mb-6"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">
              招待コード
            </Text>
            <Card variant="elevated">
              <View className="items-center py-6">
                <Text className="text-sm text-gray-500 mb-2">
                  このコードをアプリで入力
                </Text>
                <View className="bg-gray-100 px-6 py-4 rounded-xl mb-4">
                  <Text className="text-3xl font-bold text-gray-900 tracking-widest">
                    {event.inviteCode}
                  </Text>
                </View>
                <Button
                  title="コードをコピー"
                  icon={<Text className="text-xl">📋</Text>}
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
            <Text className="text-lg font-bold text-gray-900 mb-3">
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
                <Text className="text-sm text-gray-600 text-center">
                  カメラでスキャンして参加
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* 共有方法 */}
          <Animated.View entering={FadeInDown.delay(250).duration(600)}>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              共有する
            </Text>
            <Card variant="elevated">
              <View className="space-y-2">
                <Button
                  title="LINEで共有"
                  icon={<Text className="text-xl">💬</Text>}
                  onPress={handleShareToLine}
                  fullWidth
                  variant="primary"
                />
                <Button
                  title="その他の方法で共有"
                  icon={<Text className="text-xl">📤</Text>}
                  onPress={handleShare}
                  fullWidth
                  variant="outline"
                />
                <Button
                  title="リンクをコピー"
                  icon={<Text className="text-xl">🔗</Text>}
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
            <Card variant="outlined" className="bg-blue-50 border-blue-200">
              <Text className="text-base font-bold text-blue-900 mb-2">
                📖 招待方法
              </Text>
              <Text className="text-sm text-blue-800 leading-6">
                1. 上記の方法で招待コードを共有{'\n'}
                2. 受け取った人がアプリで招待コードを入力{'\n'}
                3. または共有されたリンクをタップしてアプリを開く{'\n'}
                4. 参加確認画面で「参加する」をタップ
              </Text>
            </Card>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
