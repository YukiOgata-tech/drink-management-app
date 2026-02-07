import { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '@/stores/user';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);

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
            <Feather name="arrow-left" size={24} color="#4b5563" />
            <Text className="text-base text-gray-600 ml-2">戻る</Text>
          </TouchableOpacity>

          {/* ヘッダー */}
          <View className="pb-6">
            <Text className="text-3xl font-bold text-gray-900">ログイン</Text>
            <Text className="text-base text-gray-500 mt-2">
              アカウントにログインしてグループイベントに参加しましょう
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
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

            <Button
              title={isLoading ? 'ログイン中...' : 'ログイン'}
              onPress={handleLogin}
              disabled={isLoading}
              fullWidth
            />
          </View>

          {/* アカウント作成へのリンク */}
          <View className="mt-8 items-center pb-8">
            <Text className="text-gray-600 mb-3">
              アカウントをお持ちでない方は
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-primary-600 font-semibold text-base">
                新規登録はこちら
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
