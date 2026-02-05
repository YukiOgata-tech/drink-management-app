import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, Input } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDevStore } from '@/stores/dev';
import { useSyncStore } from '@/stores/sync';
import { resendConfirmationEmail } from '@/lib/auth';
import { calculateAge } from '@/lib/database';
import { getXPInfo, getXPToNextLevel } from '@/lib/xp';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ProfileScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const logout = useUserStore((state) => state.logout);
  const refreshProfile = useUserStore((state) => state.refreshProfile);

  // 画面マウント時にプロフィールを最新化（認証ユーザーのみ）
  useEffect(() => {
    if (!isGuest && user) {
      refreshProfile();
    }
  }, [isGuest, user?.id]);
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);
  const toggleDummyData = useDevStore((state) => state.toggleDummyData);

  // 同期関連
  const syncStatus = useSyncStore((state) => state.status);
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingPersonalLogs = useSyncStore((state) => state.pendingPersonalLogs);
  const pendingEventLogs = useSyncStore((state) => state.pendingEventLogs);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const sync = useSyncStore((state) => state.sync);

  // XP情報を計算（セレクター外で呼び出し）
  const totalXP = user?.profile?.totalXP ?? 0;
  const negativeXP = user?.profile?.negativeXP ?? 0;
  const xpInfo = React.useMemo(() => getXPInfo(totalXP, negativeXP), [totalXP, negativeXP]);

  const [isEditing, setIsEditing] = useState(false);
  const [birthday, setBirthday] = useState(user?.profile.birthday || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(
    user?.profile.birthday ? new Date(user.profile.birthday) : new Date(2000, 0, 1)
  );
  const [height, setHeight] = useState(user?.profile.height?.toString() || '');
  const [weight, setWeight] = useState(user?.profile.weight?.toString() || '');
  const [bio, setBio] = useState(user?.profile.bio || '');

  // ユーザーデータが更新されたら編集フォームの状態を同期
  useEffect(() => {
    if (user && !isEditing) {
      setBirthday(user.profile.birthday || '');
      setDatePickerValue(
        user.profile.birthday ? new Date(user.profile.birthday) : new Date(2000, 0, 1)
      );
      setHeight(user.profile.height?.toString() || '');
      setWeight(user.profile.weight?.toString() || '');
      setBio(user.profile.bio || '');
    }
  }, [user?.profile.birthday, user?.profile.height, user?.profile.weight, user?.profile.bio]);

  const handleSave = async () => {
    const { error } = await updateProfile({
      birthday: birthday || undefined,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      bio: bio || undefined,
    });

    if (error) {
      Alert.alert('エラー', error.message || 'プロフィールの更新に失敗しました');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);

    if (!isGuest) {
      Alert.alert('保存完了', 'プロフィールを更新しました');
    }
  };

  const handleCancel = () => {
    setBirthday(user?.profile.birthday || '');
    setDatePickerValue(
      user?.profile.birthday ? new Date(user.profile.birthday) : new Date(2000, 0, 1)
    );
    setHeight(user?.profile.height?.toString() || '');
    setWeight(user?.profile.weight?.toString() || '');
    setBio(user?.profile.bio || '');
    setIsEditing(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDatePickerValue(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setBirthday(formattedDate);
    }
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

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* オフライン/同期ステータスバナー */}
      <SyncStatusBanner />

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

          {/* レベル表示（認証ユーザーのみ） */}
          {!isGuest && (
            <Animated.View entering={FadeInDown.delay(25).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-primary-100 rounded-full w-12 h-12 items-center justify-center mr-3">
                      <Text className="text-2xl font-bold text-primary-600">
                        {xpInfo.level}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-gray-900">
                        レベル {xpInfo.level}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {xpInfo.totalXP.toLocaleString()} XP
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-gray-500">
                      次のレベルまで
                    </Text>
                    <Text className="text-sm font-semibold text-primary-600">
                      {getXPToNextLevel(xpInfo.totalXP).toLocaleString()} XP
                    </Text>
                  </View>
                </View>
                {/* プログレスバー */}
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(100, xpInfo.progress)}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-400 text-center mt-2">
                  {xpInfo.currentLevelXP.toLocaleString()} / {xpInfo.nextLevelXP.toLocaleString()} XP
                </Text>
                {/* 借金XP表示 */}
                {xpInfo.negativeXP > 0 && (
                  <View className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">⚠️</Text>
                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-amber-700">
                          借金XP: {xpInfo.negativeXP.toLocaleString()} XP
                        </Text>
                        <Text className="text-xs text-amber-600 mt-0.5">
                          次回の記録追加時に相殺されます
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            </Animated.View>
          )}

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
                  {/* 誕生日 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      誕生日
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center"
                    >
                      <Text className="text-xl mr-3">🎂</Text>
                      <Text className="text-base text-gray-900 flex-1">
                        {birthday
                          ? new Date(birthday).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '誕生日を選択'}
                      </Text>
                      <Text className="text-gray-400">▼</Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={datePickerValue}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      locale="ja-JP"
                    />
                  )}

                  {Platform.OS === 'ios' && showDatePicker && (
                    <View className="bg-white border border-gray-200 rounded-xl p-2 mb-4">
                      <Button
                        title="完了"
                        onPress={() => setShowDatePicker(false)}
                        size="sm"
                      />
                    </View>
                  )}

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
                    <View className="flex-1">
                      <Button
                        title="キャンセル"
                        variant="outline"
                        onPress={handleCancel}
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        title="保存"
                        onPress={handleSave}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="space-y-4">
                  <InfoRow
                    icon="🎂"
                    label="年齢"
                    value={
                      user.profile.birthday
                        ? (() => {
                            const age = calculateAge(user.profile.birthday);
                            return age > 0 ? `${age}歳` : '未設定';
                          })()
                        : '未設定'
                    }
                  />
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

          {/* 法的情報・ヘルプ */}
          <Animated.View entering={FadeInDown.delay(250).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                情報・サポート
              </Text>
              <View className="space-y-2">
                <TouchableOpacity
                  onPress={() => router.push('/legal/drinking-guide')}
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <Text className="text-xl mr-3">📖</Text>
                  <Text className="flex-1 text-base text-gray-800">飲酒ガイドライン</Text>
                  <Text className="text-gray-400">›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/legal/terms')}
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <Text className="text-xl mr-3">📋</Text>
                  <Text className="flex-1 text-base text-gray-800">利用規約</Text>
                  <Text className="text-gray-400">›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/legal/privacy-policy')}
                  className="flex-row items-center py-3"
                >
                  <Text className="text-xl mr-3">🔒</Text>
                  <Text className="flex-1 text-base text-gray-800">プライバシーポリシー</Text>
                  <Text className="text-gray-400">›</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* 同期ステータス（認証ユーザーのみ） */}
          {!isGuest && (
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold text-gray-900">
                    データ同期
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-gray-600'}`}>
                      {isOnline ? 'オンライン' : 'オフライン'}
                    </Text>
                  </View>
                </View>

                <View className="space-y-3 mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-600">同期待ちデータ</Text>
                    <Text className={`text-sm font-semibold ${totalPending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {totalPending > 0 ? `${totalPending}件` : '全て同期済み'}
                    </Text>
                  </View>
                  {lastSyncAt && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">最終同期</Text>
                      <Text className="text-sm text-gray-500">
                        {new Date(lastSyncAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  title={syncStatus === 'syncing' ? '同期中...' : '今すぐ同期'}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await sync();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  disabled={syncStatus === 'syncing' || !isOnline}
                  variant="outline"
                  fullWidth
                />
              </Card>
            </Animated.View>
          )}

          {/* 開発モード設定 */}
          <Animated.View entering={FadeInDown.delay(350).duration(600)}>
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
