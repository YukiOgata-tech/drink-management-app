import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { resendConfirmationEmail, updateEmail, updatePassword } from '@/lib/auth';
import { canChangeDisplayName } from '@/lib/database';
import {
  DeletionRequest,
  createDeletionRequest,
  getDeletionRequest,
  cancelDeletionRequest,
} from '@/lib/account-deletion';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function AccountManagementScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const updateDisplayName = useUserStore((state) => state.updateDisplayName);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // メールアドレス変更関連
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // パスワード変更関連
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // 削除リクエスト関連
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);

  // 表示名変更可能かチェック
  const nameChangeStatus = useMemo(() => {
    return canChangeDisplayName(user?.displayNameChangedAt);
  }, [user?.displayNameChangedAt]);

  // 削除リクエストの状態を取得
  useEffect(() => {
    if (!isGuest && user) {
      fetchDeletionRequest();
    } else {
      setIsLoadingRequest(false);
    }
  }, [isGuest, user?.id]);

  const fetchDeletionRequest = async () => {
    if (!user) return;

    setIsLoadingRequest(true);
    const { request, error } = await getDeletionRequest(user.id);
    if (!error) {
      setDeletionRequest(request);
    }
    setIsLoadingRequest(false);
  };

  const handleStartEditName = () => {
    if (!nameChangeStatus.canChange) {
      Alert.alert(
        '変更制限中',
        `表示名は1日に1回のみ変更できます。\n次回変更可能まであと約${nameChangeStatus.hoursRemaining}時間です。`,
        [{ text: 'OK' }]
      );
      return;
    }
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (displayName.trim() === user?.displayName) {
      setIsEditingName(false);
      return;
    }

    if (!nameChangeStatus.canChange) {
      Alert.alert('エラー', '表示名の変更は1日に1回までです');
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updateDisplayName(displayName.trim());

      if (error) {
        Alert.alert('エラー', error.message || '名前の更新に失敗しました');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingName(false);
      Alert.alert('完了', '表示名を更新しました。次回の変更は24時間後から可能です。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditName = () => {
    setDisplayName(user?.displayName || '');
    setIsEditingName(false);
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

  // メールアドレス変更
  const handleStartEditEmail = () => {
    setNewEmail('');
    setIsEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setNewEmail('');
    setIsEditingEmail(false);
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('エラー', '新しいメールアドレスを入力してください');
      return;
    }

    // 簡単なメール形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      Alert.alert('エラー', '現在のメールアドレスと同じです');
      return;
    }

    setIsSavingEmail(true);
    try {
      const { error } = await updateEmail(newEmail.trim());

      if (error) {
        Alert.alert('エラー', error.message || 'メールアドレスの変更に失敗しました');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingEmail(false);
      setNewEmail('');
      Alert.alert(
        '確認メールを送信しました',
        '新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。'
      );
    } finally {
      setIsSavingEmail(false);
    }
  };

  // パスワード変更
  const handleStartEditPassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setIsEditingPassword(true);
  };

  const handleCancelEditPassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setIsEditingPassword(false);
  };

  const handleSavePassword = async () => {
    if (!newPassword) {
      Alert.alert('エラー', '新しいパスワードを入力してください');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        Alert.alert('エラー', error.message || 'パスワードの変更に失敗しました');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('完了', 'パスワードを変更しました');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteReason('');
    setShowDeleteModal(false);
  };

  const handleSubmitDeleteRequest = async () => {
    if (!user) return;

    setIsSubmittingDelete(true);
    try {
      const { request, error } = await createDeletionRequest(user.id, deleteReason || undefined);

      if (error) {
        Alert.alert('エラー', error.message);
        return;
      }

      setDeletionRequest(request);
      handleCloseDeleteModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '削除リクエストを受け付けました',
        '削除処理を進めています。完了までにお時間をいただく場合があります。'
      );
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleCancelDeleteRequest = () => {
    Alert.alert(
      '削除リクエストのキャンセル',
      'アカウント削除のリクエストをキャンセルしますか？',
      [
        { text: '戻る', style: 'cancel' },
        {
          text: 'キャンセルする',
          onPress: async () => {
            if (!user) return;

            const { success, error } = await cancelDeletionRequest(user.id);

            if (error) {
              Alert.alert('エラー', error.message);
              return;
            }

            setDeletionRequest(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('完了', '削除リクエストをキャンセルしました。');
          },
        },
      ]
    );
  };

  const isDeleteConfirmValid = deleteConfirmText === '削除する';

  if (isGuest) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-gray-50">
        {/* ヘッダー */}
        <View className="px-4 py-3 border-b border-gray-200 bg-white flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center py-2 pr-4"
          >
            <Feather name="chevron-left" size={24} color="#0ea5e9" />
            <Text className="text-primary-600 text-base ml-1">戻る</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1 text-center mr-16">
            アカウント管理
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Feather name="user-x" size={64} color="#9ca3af" />
          <Text className="text-lg font-semibold text-gray-700 mt-4 mb-2">
            ゲストモードでは利用できません
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            アカウント管理機能を利用するには{'\n'}アカウントを作成してください
          </Text>
          <Button
            title="新規登録"
            onPress={() => router.push('/(auth)/signup')}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* ヘッダー */}
      <View className={`px-4 py-3 border-b flex-row items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center py-2 pr-4"
        >
          <Feather name="chevron-left" size={24} color="#0ea5e9" />
          <Text className="text-primary-600 text-base ml-1">戻る</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold flex-1 text-center mr-16 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          アカウント管理
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: isMd ? 'center' : undefined }}
      >
        <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-2xl' : ''}`}>
          {/* 削除リクエスト中の警告バナー */}
          {deletionRequest && deletionRequest.status === 'pending' && (
            <Animated.View entering={FadeInDown.delay(0).duration(500)}>
              <Card variant="elevated" className="mb-6 bg-amber-50 border-2 border-amber-300">
                <View className="flex-row items-start">
                  <View className="bg-amber-100 rounded-full p-2 mr-3">
                    <Feather name="clock" size={24} color="#b45309" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-amber-900 mb-1">
                      アカウント削除リクエスト中
                    </Text>
                    <Text className="text-sm text-amber-800 mb-2">
                      削除処理を進めています。完了までにお時間をいただく場合があります。
                    </Text>
                    <Text className="text-xs text-amber-700">
                      リクエスト日: {dayjs(deletionRequest.requestedAt).format('YYYY年M月D日 HH:mm')}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDeleteRequest}
                      className="mt-3 bg-white border border-amber-400 rounded-lg py-2 px-4 self-start"
                    >
                      <Text className="text-amber-700 font-semibold text-sm">
                        リクエストをキャンセル
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 削除承認済みの警告バナー */}
          {deletionRequest && deletionRequest.status === 'approved' && (
            <Animated.View entering={FadeInDown.delay(0).duration(500)}>
              <Card variant="elevated" className="mb-6 bg-red-50 border-2 border-red-300">
                <View className="flex-row items-start">
                  <View className="bg-red-100 rounded-full p-2 mr-3">
                    <Feather name="alert-triangle" size={24} color="#dc2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-red-900 mb-1">
                      アカウント削除が承認されました
                    </Text>
                    <Text className="text-sm text-red-800">
                      まもなくアカウントが削除されます。この操作は取り消せません。
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 表示名 */}
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-gray-900">
                    表示名
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    1日に1回のみ変更可能
                  </Text>
                </View>
                {!isEditingName && (
                  <TouchableOpacity
                    onPress={handleStartEditName}
                    className={`px-4 py-2 rounded-lg ${
                      nameChangeStatus.canChange ? 'bg-primary-50' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        nameChangeStatus.canChange ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    >
                      編集
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditingName ? (
                <View>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="表示名を入力"
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                    maxLength={50}
                    autoFocus
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Button
                        title="キャンセル"
                        variant="outline"
                        onPress={handleCancelEditName}
                        fullWidth
                        disabled={isSaving}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        title={isSaving ? '保存中...' : '保存'}
                        onPress={handleSaveName}
                        fullWidth
                        disabled={isSaving}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <View className="flex-row items-center">
                    <Feather name="user" size={20} color="#6b7280" style={{ marginRight: 12 }} />
                    <Text className="text-base text-gray-900 flex-1">
                      {user?.displayName || '未設定'}
                    </Text>
                  </View>
                  {!nameChangeStatus.canChange && (
                    <View className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <View className="flex-row items-center">
                        <Feather name="clock" size={16} color="#b45309" style={{ marginRight: 8 }} />
                        <Text className="text-xs text-amber-700">
                          次回変更可能まであと約{nameChangeStatus.hoursRemaining}時間
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* メール認証ステータス */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                メール認証
              </Text>

              <View className="flex-row items-center mb-4">
                <Feather name="mail" size={20} color="#6b7280" style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">メールアドレス</Text>
                  <Text className="text-base text-gray-900">{user?.email}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <View
                    className={`w-3 h-3 rounded-full mr-3 ${
                      user?.emailConfirmed ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                  />
                  <Text className="text-sm text-gray-700">
                    {user?.emailConfirmed ? '認証済み' : '未認証'}
                  </Text>
                </View>
                {!user?.emailConfirmed && (
                  <TouchableOpacity
                    onPress={handleResendEmail}
                    className="bg-primary-50 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-primary-600 text-sm font-semibold">
                      確認メール再送信
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </Animated.View>

          {/* メールアドレス変更 */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  メールアドレス変更
                </Text>
                {!isEditingEmail && (
                  <TouchableOpacity
                    onPress={handleStartEditEmail}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}
                  >
                    <Text className="text-primary-600 font-semibold">変更</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditingEmail ? (
                <View>
                  <Text className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    現在: {user?.email}
                  </Text>
                  <TextInput
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="新しいメールアドレス"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`border rounded-xl px-4 py-3 text-base mb-4 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                    autoFocus
                  />
                  <View className={`border rounded-xl p-3 mb-4 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                    <View className="flex-row items-start">
                      <Feather name="info" size={16} color={isDark ? '#fbbf24' : '#b45309'} style={{ marginRight: 8, marginTop: 2 }} />
                      <Text className={`text-sm flex-1 ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
                        新しいメールアドレスに確認メールが送信されます。メール内のリンクをクリックすると変更が完了します。
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Button
                        title="キャンセル"
                        variant="outline"
                        onPress={handleCancelEditEmail}
                        fullWidth
                        disabled={isSavingEmail}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        title={isSavingEmail ? '送信中...' : '確認メール送信'}
                        onPress={handleSaveEmail}
                        fullWidth
                        disabled={isSavingEmail}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Feather name="mail" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                  <Text className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {user?.email}
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* パスワード変更 */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  パスワード変更
                </Text>
                {!isEditingPassword && (
                  <TouchableOpacity
                    onPress={handleStartEditPassword}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}
                  >
                    <Text className="text-primary-600 font-semibold">変更</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditingPassword ? (
                <View>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="新しいパスワード（6文字以上）"
                    secureTextEntry
                    className={`border rounded-xl px-4 py-3 text-base mb-3 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                    autoFocus
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="新しいパスワード（確認）"
                    secureTextEntry
                    className={`border rounded-xl px-4 py-3 text-base mb-4 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Button
                        title="キャンセル"
                        variant="outline"
                        onPress={handleCancelEditPassword}
                        fullWidth
                        disabled={isSavingPassword}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        title={isSavingPassword ? '保存中...' : 'パスワードを変更'}
                        onPress={handleSavePassword}
                        fullWidth
                        disabled={isSavingPassword}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Feather name="lock" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                  <Text className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    ••••••••
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* アカウントID */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Card variant="elevated" className="mb-6">
              <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                アカウント情報
              </Text>

              <View className="flex-row items-center">
                <Feather name="hash" size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>アカウントID</Text>
                  <Text className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {user?.id}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* 危険な操作 */}
          {!deletionRequest && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Card variant="elevated" className="mb-6 border-2 border-red-100">
                <Text className="text-lg font-bold text-red-600 mb-2">
                  危険な操作
                </Text>
                <Text className="text-sm text-gray-500 mb-4">
                  以下の操作は取り消すことができません。
                </Text>

                <TouchableOpacity
                  onPress={handleOpenDeleteModal}
                  className="flex-row items-center py-3 border-t border-gray-100"
                >
                  <Feather name="trash-2" size={20} color="#dc2626" style={{ marginRight: 12 }} />
                  <View className="flex-1">
                    <Text className="text-base text-red-600 font-semibold">
                      アカウントを削除
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      全てのデータが完全に削除されます
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </Card>
            </Animated.View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* アカウント削除確認モーダル */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDeleteModal}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            {/* モーダルヘッダー */}
            <View className="bg-red-50 px-6 py-5 border-b border-red-100">
              <View className="flex-row items-center">
                <View className="bg-red-100 rounded-full p-3 mr-4">
                  <Feather name="alert-triangle" size={28} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-red-600">
                    アカウント削除の確認
                  </Text>
                  <Text className="text-sm text-red-500 mt-1">
                    この操作は取り消せません
                  </Text>
                </View>
              </View>
            </View>

            {/* モーダルコンテンツ */}
            <ScrollView className="px-6 py-5" style={{ maxHeight: 400 }}>
              <Text className="text-base text-gray-800 leading-6 mb-4">
                アカウントを削除すると、以下のデータが完全に削除されます：
              </Text>

              <View className="bg-gray-50 rounded-xl p-4 mb-5">
                <View className="flex-row items-center mb-2">
                  <Feather name="x-circle" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text className="text-sm text-gray-700">プロフィール情報</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Feather name="x-circle" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text className="text-sm text-gray-700">全ての飲酒記録</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Feather name="x-circle" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text className="text-sm text-gray-700">イベント参加履歴</Text>
                </View>
                <View className="flex-row items-center">
                  <Feather name="x-circle" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text className="text-sm text-gray-700">XP・レベルデータ</Text>
                </View>
              </View>

              <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <View className="flex-row items-start">
                  <Feather name="info" size={16} color="#b45309" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text className="text-sm text-amber-800 flex-1">
                    削除リクエストは管理者による確認後に処理されます。完了までにお時間をいただく場合があります。
                  </Text>
                </View>
              </View>

              <Text className="text-sm text-gray-600 mb-2">
                削除理由（任意）：
              </Text>
              <TextInput
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="理由を入力（任意）"
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                multiline
                numberOfLines={2}
                maxLength={200}
              />

              <Text className="text-sm text-gray-600 mb-3">
                続行するには「削除する」と入力してください：
              </Text>

              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="削除する"
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-5"
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="キャンセル"
                    variant="outline"
                    onPress={handleCloseDeleteModal}
                    fullWidth
                    disabled={isSubmittingDelete}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title={isSubmittingDelete ? '送信中...' : '削除リクエスト'}
                    variant="danger"
                    onPress={handleSubmitDeleteRequest}
                    fullWidth
                    disabled={!isDeleteConfirmValid || isSubmittingDelete}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
