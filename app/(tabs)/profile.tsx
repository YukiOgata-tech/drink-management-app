import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Card, Input, ResponsiveContainer } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDevStore } from '@/stores/dev';
import { useSyncStore } from '@/stores/sync';
import { useThemeStore, ThemeMode } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { resendConfirmationEmail } from '@/lib/auth';
import { calculateAge, uploadAvatar } from '@/lib/database';
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

  // テーマ関連
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'アクセス許可が必要です',
        'プロフィール写真を変更するには、写真ライブラリへのアクセスを許可してください。設定アプリから許可できます。'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    if (isGuest || !user) {
      // ゲストはローカルのみ反映
      useUserStore.setState((state) => ({
        user: state.user ? { ...state.user, avatar: result.assets[0].uri } : null,
      }));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { url, error } = await uploadAvatar(
        user.id,
        result.assets[0].base64 ?? '',
        result.assets[0].mimeType
      );
      if (error || !url) {
        Alert.alert('エラー', error?.message || 'アップロードに失敗しました');
        return;
      }
      // ローカルステートも更新
      useUserStore.setState((state) => ({
        user: state.user ? { ...state.user, avatar: url } : null,
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsUploadingAvatar(false);
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

  const { isMd, isTablet } = useResponsive();

  if (!user) return null;

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* オフライン/同期ステータスバナー */}
      <SyncStatusBanner />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: isMd ? 'center' : undefined }}
      >
        <ResponsiveContainer className={`px-6 py-8 ${isMd ? 'max-w-2xl' : ''}`}>
          {!isGuest ? (
            /* プレイヤーカード（認証ユーザー）: アバター + 名前 + レベル + XP */
            <Animated.View entering={FadeInDown.duration(500)} className="mb-6">
              <LinearGradient
                colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 28, padding: 20 }}
              >
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={handleChangeAvatar} disabled={isUploadingAvatar}>
                    <Avatar
                      uri={user.avatar}
                      name={user.displayName}
                      size={80}
                      style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}
                    />
                    <View
                      className="absolute bottom-0 right-0 rounded-full w-7 h-7 items-center justify-center"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color="#0ea5e9" />
                      ) : (
                        <Feather name="camera" size={14} color="#0ea5e9" />
                      )}
                    </View>
                  </TouchableOpacity>

                  <View className="flex-1 ml-4">
                    <Text className="text-xl font-bold text-white" numberOfLines={1}>
                      {user.displayName}
                    </Text>
                    <Text className="text-xs text-white/75" numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>

                  <View
                    className="items-center justify-center rounded-2xl px-3.5 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <Text className="text-white/80 text-[10px] font-semibold tracking-wider">LEVEL</Text>
                    <Text className="text-white text-2xl font-extrabold leading-7">{xpInfo.level}</Text>
                  </View>
                </View>

                {/* XPプログレス */}
                <View className="mt-5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-white/90 text-xs font-semibold">
                      {xpInfo.totalXP.toLocaleString()} XP
                    </Text>
                    <Text className="text-white/70 text-[11px]">
                      次のレベルまで {getXPToNextLevel(xpInfo.totalXP).toLocaleString()} XP
                    </Text>
                  </View>
                  <View
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                  >
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${Math.max(4, Math.min(100, xpInfo.progress))}%`, backgroundColor: '#ffffff' }}
                    />
                  </View>
                </View>

                {/* 借金XP */}
                {xpInfo.negativeXP > 0 && (
                  <View
                    className="flex-row items-center mt-3 rounded-xl px-3 py-2"
                    style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                  >
                    <Feather name="alert-triangle" size={14} color="#fde68a" />
                    <Text className="text-amber-100 text-xs ml-2 flex-1">
                      借金XP {xpInfo.negativeXP.toLocaleString()} XP（次回の記録時に相殺）
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          ) : (
            /* ゲスト: シンプルヘッダー */
            <View className="items-center mb-8">
              <TouchableOpacity className="mb-4" onPress={handleChangeAvatar} disabled={isUploadingAvatar}>
                <Avatar
                  uri={user.avatar}
                  name={user.displayName}
                  size={96}
                  style={{ borderWidth: 4, borderColor: '#0ea5e9' }}
                />
                <View className="absolute bottom-0 right-0 bg-primary-500 rounded-full w-8 h-8 items-center justify-center">
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Feather name="camera" size={16} color="#ffffff" />
                  )}
                </View>
              </TouchableOpacity>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user.displayName}
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</Text>
            </View>
          )}

          {/* ゲストモードまたはログアウト */}
          {isGuest ? (
            <Animated.View entering={FadeInDown.delay(50).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <View className="items-center py-4">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="user" size={40} color={isDark ? '#9ca3af' : '#6b7280'} />
                  </View>
                  <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ゲストモードで利用中
                  </Text>
                  <Text className={`text-sm text-center mb-6 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    グループイベントに参加するには{'\n'}アカウントの作成が必要です
                  </Text>
                  <View className="w-full gap-3">
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
              <View className="mb-4">
                <Button
                  title="ログアウト"
                  onPress={handleLogout}
                  variant="outline"
                  fullWidth
                />
              </View>
              <TouchableOpacity
                onPress={() => router.push('/account')}
                className="flex-row items-center justify-center py-3 mb-6"
              >
                <Feather name="settings" size={16} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 8 }} />
                <Text className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>アカウント管理</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* メール未確認の警告 */}
          {!isGuest && user && !user.emailConfirmed && (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Card variant="elevated" className="mb-6 bg-amber-50 border-2 border-amber-300">
                <View className="flex-row items-start">
                  <Feather name="alert-triangle" size={28} color="#b45309" style={{ marginRight: 12 }} />
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
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  基本情報
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}
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
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      誕生日
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className={`border rounded-xl px-4 py-3 flex-row items-center ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    >
                      <Feather name="gift" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                      <Text className={`text-base flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {birthday
                          ? new Date(birthday).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '誕生日を選択'}
                      </Text>
                      <Feather name="chevron-down" size={16} color="#9ca3af" />
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
                    <View className={`border rounded-xl p-2 mb-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <Button
                        title="完了"
                        onPress={() => setShowDatePicker(false)}
                        size="sm"
                      />
                    </View>
                  )}

                  {/* 身長・体重は横並び（縦長を解消） */}
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="身長 (cm)"
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="numeric"
                        placeholder="例: 172"
                        icon={<Feather name="arrow-up" size={20} color="#6b7280" />}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="体重 (kg)"
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                        placeholder="例: 65"
                        icon={<Feather name="activity" size={20} color="#6b7280" />}
                      />
                    </View>
                  </View>
                  <Input
                    label="自己紹介"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="簡単な自己紹介を入力..."
                    multiline
                    numberOfLines={3}
                    icon={<Feather name="edit-3" size={20} color="#6b7280" />}
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
                <View className="gap-y-4">
                  <InfoRow
                    icon="gift"
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
                  <InfoRow icon="arrow-up" label="身長" value={user.profile.height ? `${user.profile.height}cm` : '未設定'} />
                  <InfoRow icon="activity" label="体重" value={user.profile.weight ? `${user.profile.weight}kg` : '未設定'} />
                  {user.profile.bio && (
                    <View>
                      <Text className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        自己紹介
                      </Text>
                      <Text className={`text-base ${isDark ? 'text-gray-100' : 'text-gray-600'}`}>
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
              <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                適正飲酒量の目安
              </Text>
              <View className={`border rounded-xl p-4 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                <Text className={`text-sm leading-6 ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
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
              <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                情報・サポート
              </Text>
              <View className="gap-y-2">
                <TouchableOpacity
                  onPress={() => router.push('/legal/drinking-guide')}
                  className={`flex-row items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
                >
                  <Feather name="book-open" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>飲酒ガイドライン</Text>
                  <Feather name="chevron-right" size={16} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/legal/terms')}
                  className={`flex-row items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
                >
                  <Feather name="file-text" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>利用規約</Text>
                  <Feather name="chevron-right" size={16} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/legal/privacy-policy')}
                  className="flex-row items-center py-3"
                >
                  <Feather name="lock" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>プライバシーポリシー</Text>
                  <Feather name="chevron-right" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* 同期ステータス（認証ユーザーのみ） */}
          {!isGuest && (
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    データ同期
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${isOnline ? (isDark ? 'bg-green-900/30' : 'bg-green-100') : (isDark ? 'bg-gray-700' : 'bg-gray-100')}`}>
                    <Text className={`text-xs font-semibold ${isOnline ? 'text-green-600' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                      {isOnline ? 'オンライン' : 'オフライン'}
                    </Text>
                  </View>
                </View>

                <View className="gap-y-3 mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>同期待ちデータ</Text>
                    <Text className={`text-sm font-semibold ${totalPending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {totalPending > 0 ? `${totalPending}件` : '全て同期済み'}
                    </Text>
                  </View>
                  {lastSyncAt && (
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>最終同期</Text>
                      <Text className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
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

          {/* テーマ設定 */}
          <Animated.View entering={FadeInDown.delay(340).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                テーマ設定
              </Text>
              <View className="flex-row gap-2">
                {([
                  { value: 'light', label: 'ライト', icon: 'sun' },
                  { value: 'dark', label: 'ダーク', icon: 'moon' },
                  { value: 'system', label: '自動', icon: 'smartphone' },
                ] as { value: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[]).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setThemeMode(option.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      themeMode === option.value
                        ? 'bg-primary-500'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <Feather
                      name={option.icon}
                      size={20}
                      color={themeMode === option.value ? '#ffffff' : isDark ? '#d1d5db' : '#6b7280'}
                    />
                    <Text
                      className={`text-sm mt-1 ${
                        themeMode === option.value
                          ? 'text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* 開発モード設定（開発環境のみ表示） */}
          {__DEV__ && (
            <>
              <Animated.View entering={FadeInDown.delay(350).duration(600)}>
                <Card variant="elevated" className="mb-6">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        開発モード
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ダミーデータを{isDummyDataEnabled ? '表示中' : '非表示'}
                      </Text>
                    </View>
                    <Switch
                      value={isDummyDataEnabled}
                      onValueChange={() => {
                        toggleDummyData();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: isDark ? '#374151' : '#e5e7eb', true: '#0ea5e9' }}
                      thumbColor={isDummyDataEnabled ? '#ffffff' : '#f4f3f4'}
                    />
                  </View>
                </Card>
              </Animated.View>

              {/* 統計情報 */}
              {isDummyDataEnabled && (
                <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                  <Card variant="elevated">
                    <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      あなたの記録（ダミーデータ）
                    </Text>
                    <View className="flex-row justify-around">
                      <StatBox label="総記録数" value="12" icon="bar-chart-2" isDark={isDark} />
                      <StatBox label="イベント参加" value="3" icon="calendar" isDark={isDark} />
                      <StatBox label="平均/日" value="1.5杯" icon="trending-up" isDark={isDark} />
                    </View>
                  </Card>
                </Animated.View>
              )}
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-row items-center">
      <Feather name={icon} size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
      <View className="flex-1">
        <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</Text>
        <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</Text>
      </View>
    </View>
  );
}

function StatBox({ label, value, icon, isDark }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; isDark?: boolean }) {
  return (
    <View className="items-center">
      <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
        <Feather name={icon} size={24} color="#0ea5e9" />
      </View>
      <Text className="text-2xl font-bold text-primary-600">{value}</Text>
      <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</Text>
    </View>
  );
}
