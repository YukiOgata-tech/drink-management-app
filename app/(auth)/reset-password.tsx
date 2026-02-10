import { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { updatePassword } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ResponsiveFormContainer } from '@/components/ui/ResponsiveContainer';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
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

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      Alert.alert('エラー', error.message);
      return;
    }

    Alert.alert(
      'パスワード変更完了',
      '新しいパスワードが設定されました。ログインしてください。',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
    );
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
            {/* ヘッダー */}
            <View className="py-6">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
              <Feather name="lock" size={32} color="#0ea5e9" />
            </View>
            <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              新しいパスワードを設定
            </Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              安全なパスワードを設定してください
            </Text>
          </View>

          {/* 注意事項 */}
          <Card variant="elevated" className="mb-6">
            <View className="flex-row items-start">
              <View className="mt-0.5 mr-3">
                <Feather name="info" size={18} color={isDark ? '#60a5fa' : '#3b82f6'} />
              </View>
              <View className="flex-1">
                <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  パスワードは6文字以上で設定してください。英数字と記号を組み合わせるとより安全です。
                </Text>
              </View>
            </View>
          </Card>

          {/* フォーム */}
          <View className="space-y-4">
            <View>
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                新しいパスワード
              </Text>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="6文字以上"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
              />
            </View>

            <View>
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                パスワード確認
              </Text>
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="もう一度入力"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
              />
            </View>

            <View className="pt-4">
              <Button
                title={isLoading ? '設定中...' : 'パスワードを設定'}
                onPress={handleSetPassword}
                disabled={isLoading}
                fullWidth
              />
            </View>
          </View>

          {/* ログインへ戻る */}
          <View className="mt-8 items-center pb-8">
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-primary-600 font-semibold text-base">
                ログイン画面へ戻る
              </Text>
            </TouchableOpacity>
          </View>
          </ResponsiveFormContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
