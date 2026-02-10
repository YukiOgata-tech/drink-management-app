import { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { signIn, resetPassword } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ResponsiveFormContainer } from '@/components/ui/ResponsiveContainer';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  // パスワードリセット用の状態
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    const { user, error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert('ログインエラー', error.message);
      return;
    }

    if (user) {
      setUser(user, false);
      router.replace('/(tabs)/profile');
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    setIsResetting(true);
    const { error } = await resetPassword(resetEmail);
    setIsResetting(false);

    if (error) {
      Alert.alert('エラー', error.message);
      return;
    }

    Alert.alert(
      'メール送信完了',
      'パスワードリセット用のメールを送信しました。メール内のリンクをタップして新しいパスワードを設定してください。',
      [{ text: 'OK', onPress: () => setShowResetModal(false) }]
    );
    setResetEmail('');
  };

  const openResetModal = () => {
    setResetEmail(email); // 入力済みのメールアドレスを引き継ぐ
    setShowResetModal(true);
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, alignItems: isMd ? 'center' : undefined }}
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveFormContainer className="px-6 flex-1">
            {/* 戻るボタン */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="py-4 flex-row items-center"
            >
              <Feather name="arrow-left" size={24} color={isDark ? '#9ca3af' : '#4b5563'} />
            <Text className={`text-base ml-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>戻る</Text>
          </TouchableOpacity>

          {/* ヘッダー */}
          <View className="pb-6">
            <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>ログイン</Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              アカウントにログインしてグループイベントに参加しましょう
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            <View>
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                メールアドレス
              </Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
              />
            </View>

            <View>
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                パスワード
              </Text>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
              />
            </View>

            {/* パスワードを忘れた場合 */}
            <TouchableOpacity onPress={openResetModal} className="self-end">
              <Text className="text-primary-600 text-sm">
                パスワードを忘れた場合
              </Text>
            </TouchableOpacity>

            <Button
              title={isLoading ? 'ログイン中...' : 'ログイン'}
              onPress={handleLogin}
              disabled={isLoading}
              fullWidth
            />
          </View>

          {/* アカウント作成へのリンク */}
          <View className="mt-8 items-center pb-8">
            <Text className={`mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              アカウントをお持ちでない方は
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-primary-600 font-semibold text-base">
                新規登録はこちら
              </Text>
            </TouchableOpacity>
          </View>
          </ResponsiveFormContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* パスワードリセットモーダル */}
      <Modal
        visible={showResetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResetModal(false)}
      >
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <View className="flex-1 px-6">
            {/* モーダルヘッダー */}
            <View className="flex-row items-center justify-between py-4">
              <TouchableOpacity onPress={() => setShowResetModal(false)}>
                <Text className="text-primary-600 text-base">キャンセル</Text>
              </TouchableOpacity>
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                パスワードリセット
              </Text>
              <View className="w-16" />
            </View>

            {/* 説明 */}
            <Card variant="elevated" className="mt-4">
              <View className="flex-row items-start">
                <View className="mt-0.5 mr-3">
                  <Feather name="mail" size={20} color="#0ea5e9" />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
                  </Text>
                </View>
              </View>
            </Card>

            {/* メールアドレス入力 */}
            <View className="mt-6">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                メールアドレス
              </Text>
              <Input
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
              />
            </View>

            {/* 送信ボタン */}
            <View className="mt-6">
              <Button
                title={isResetting ? '送信中...' : 'リセットメールを送信'}
                onPress={handleResetPassword}
                disabled={isResetting}
                fullWidth
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
