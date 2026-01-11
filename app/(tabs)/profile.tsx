import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, Input } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDevStore } from '@/stores/dev';
import { resendConfirmationEmail } from '@/lib/auth';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const logout = useUserStore((state) => state.logout);
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);
  const toggleDummyData = useDevStore((state) => state.toggleDummyData);

  const [isEditing, setIsEditing] = useState(false);
  const [age, setAge] = useState(user?.profile.age?.toString() || '');
  const [height, setHeight] = useState(user?.profile.height?.toString() || '');
  const [weight, setWeight] = useState(user?.profile.weight?.toString() || '');
  const [bio, setBio] = useState(user?.profile.bio || '');

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      age: age ? parseInt(age) : undefined,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      bio: bio || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setAge(user?.profile.age?.toString() || '');
    setHeight(user?.profile.height?.toString() || '');
    setWeight(user?.profile.weight?.toString() || '');
    setBio(user?.profile.bio || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleResendEmail = async () => {
    if (!user?.email) return;

    Alert.alert(
      '確認メール再送信',
      `${user.email} に確認メールを再送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信',
          onPress: async () => {
            const { error } = await resendConfirmationEmail(user.email);

            if (error) {
              Alert.alert('エラー', error.message);
            } else {
              Alert.alert(
                '送信完了',
                '確認メールを再送信しました。メール内のリンクをクリックしてアカウントを有効化してください。'
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* ヘッダー */}
          <View className="items-center mb-8">
            <TouchableOpacity className="mb-4">
              <Image
                source={{ uri: user.avatar }}
                className="w-24 h-24 rounded-full border-4 border-primary-500"
              />
              <View className="absolute bottom-0 right-0 bg-primary-500 rounded-full w-8 h-8 items-center justify-center">
                <Text className="text-white text-lg">📷</Text>
              </View>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">
              {user.displayName}
            </Text>
            <Text className="text-sm text-gray-500">{user.email}</Text>
          </View>

          {/* ゲストモードまたはログアウト */}
          {isGuest ? (
            <Animated.View entering={FadeInDown.delay(50).duration(600)}>
              <Card variant="elevated" className="mb-6 bg-gradient-to-br from-primary-50 to-secondary-50">
                <View className="items-center py-4">
                  <Text className="text-5xl mb-4">🎭</Text>
                  <Text className="text-xl font-bold text-gray-900 mb-2">
                    ゲストモードで利用中
                  </Text>
                  <Text className="text-sm text-gray-600 text-center mb-6 px-4">
                    グループイベントに参加するには{'\n'}アカウントの作成が必要です
                  </Text>
                  <View className="w-full space-y-3">
                    <Button
                      title="新規登録"
                      onPress={() => router.push('/(auth)/signup')}
                      variant="primary"
                      fullWidth
                    />
                    <Button
                      title="ログイン"
                      onPress={() => router.push('/(auth)/login')}
                      variant="outline"
                      fullWidth
                    />
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(50).duration(600)}>
              <View className="mb-6">
                <Button
                  title="ログアウト"
                  onPress={handleLogout}
                  variant="outline"
                  fullWidth
                />
              </View>
            </Animated.View>
          )}

          {/* メール未確認の警告 */}
          {!isGuest && user && !user.emailConfirmed && (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Card variant="elevated" className="mb-6 bg-amber-50 border-2 border-amber-300">
                <View className="flex-row items-start">
                  <Text className="text-3xl mr-3">⚠️</Text>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-amber-900 mb-2">
                      メールアドレス未確認
                    </Text>
                    <Text className="text-sm text-amber-800 mb-4 leading-5">
                      アカウントの安全性を確保するため、メールアドレスの確認が必要です。確認メールが届いていない場合は、再送信してください。
                    </Text>
                    <Button
                      title="確認メールを再送信"
                      onPress={handleResendEmail}
                      variant="primary"
                      size="sm"
                      fullWidth
                    />
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 基本情報 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-900">
                  基本情報
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    className="bg-primary-50 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-primary-600 font-semibold">
                      編集
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View>
                  <Input
                    label="年齢"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    placeholder="例: 22"
                    icon={<Text className="text-xl">🎂</Text>}
                  />
                  <Input
                    label="身長 (cm)"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="例: 172"
                    icon={<Text className="text-xl">📏</Text>}
                  />
                  <Input
                    label="体重 (kg)"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="例: 65"
                    icon={<Text className="text-xl">⚖️</Text>}
                  />
                  <Input
                    label="自己紹介"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="簡単な自己紹介を入力..."
                    multiline
                    numberOfLines={3}
                    icon={<Text className="text-xl">✍️</Text>}
                  />

                  <View className="flex-row gap-3">
                    <Button
                      title="キャンセル"
                      variant="outline"
                      onPress={handleCancel}
                      fullWidth
                    />
                    <Button
                      title="保存"
                      onPress={handleSave}
                      fullWidth
                    />
                  </View>
                </View>
              ) : (
                <View className="space-y-4">
                  <InfoRow icon="🎂" label="年齢" value={user.profile.age ? `${user.profile.age}歳` : '未設定'} />
                  <InfoRow icon="📏" label="身長" value={user.profile.height ? `${user.profile.height}cm` : '未設定'} />
                  <InfoRow icon="⚖️" label="体重" value={user.profile.weight ? `${user.profile.weight}kg` : '未設定'} />
                  {user.profile.bio && (
                    <View>
                      <Text className="text-sm font-semibold text-gray-700 mb-1">
                        自己紹介
                      </Text>
                      <Text className="text-base text-gray-600">
                        {user.profile.bio}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* 健康に関する情報 */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                適正飲酒量の目安
              </Text>
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Text className="text-sm text-amber-800 leading-6">
                  {user.profile.gender === 'male'
                    ? '成人男性の1日あたりの適正飲酒量は純アルコール換算で約20gとされています。'
                    : user.profile.gender === 'female'
                    ? '成人女性の1日あたりの適正飲酒量は純アルコール換算で約10g（男性の半分程度）とされています。'
                    : '厚生労働省の基準では、成人男性の1日あたりの適正飲酒量は純アルコール換算で約20g、女性はその半分程度とされています。'}
                  {'\n\n'}
                  これは、ビール中ジョッキ約1杯、日本酒1合、ワイングラス2杯程度に相当します。
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* 開発モード設定 */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 mb-1">
                    開発モード
                  </Text>
                  <Text className="text-sm text-gray-500">
                    ダミーデータを{isDummyDataEnabled ? '表示中' : '非表示'}
                  </Text>
                </View>
                <Switch
                  value={isDummyDataEnabled}
                  onValueChange={() => {
                    toggleDummyData();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#e5e7eb', true: '#0ea5e9' }}
                  thumbColor={isDummyDataEnabled ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </Card>
          </Animated.View>

          {/* 統計情報 */}
          {isDummyDataEnabled && (
            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
              <Card variant="elevated">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  あなたの記録（ダミーデータ）
                </Text>
                <View className="flex-row justify-around">
                  <StatBox label="総記録数" value="12" icon="📊" />
                  <StatBox label="イベント参加" value="3" icon="🎉" />
                  <StatBox label="平均/日" value="1.5杯" icon="📈" />
                </View>
              </Card>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="text-xl mr-3">{icon}</Text>
      <View className="flex-1">
        <Text className="text-sm text-gray-500">{label}</Text>
        <Text className="text-base font-semibold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View className="items-center">
      <Text className="text-3xl mb-2">{icon}</Text>
      <Text className="text-2xl font-bold text-primary-600">{value}</Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
}
