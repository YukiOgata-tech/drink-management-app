import { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/user';
import { signUp } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);

  const handleSignUp = async () => {
    // バリデーション
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上にしてください');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    const { user, error } = await signUp(email, password, displayName);
    setIsLoading(false);

    if (error) {
      Alert.alert('登録エラー', error.message);
      return;
    }

    if (user) {
      // メール確認が必要な場合の処理
      Alert.alert(
        '登録完了',
        'ご登録ありがとうございます！\n\n確認メールを送信しました。メール内のリンクをクリックして、アカウントを有効化してください。',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 戻るボタン */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="py-4 flex-row items-center"
          >
            <Text className="text-2xl mr-2">←</Text>
            <Text className="text-base text-gray-600">戻る</Text>
          </TouchableOpacity>

          {/* ヘッダー */}
          <View className="pb-6">
            <Text className="text-3xl font-bold text-gray-900">新規登録</Text>
            <Text className="text-base text-gray-500 mt-2">
              アカウントを作成してグループイベントに参加しましょう
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                表示名
              </Text>
              <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="太郎"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
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
              <Text className="text-sm font-medium text-gray-700 mb-2">
                パスワード（6文字以上）
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

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                パスワード（確認）
              </Text>
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
              />
            </View>

            <Button
              title={isLoading ? '登録中...' : 'アカウント作成'}
              onPress={handleSignUp}
              disabled={isLoading}
              fullWidth
            />
          </View>

          {/* ログインへのリンク */}
          <View className="mt-8 items-center pb-8">
            <Text className="text-gray-600 mb-3">
              既にアカウントをお持ちの方は
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-primary-600 font-semibold text-base">
                ログインはこちら
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
