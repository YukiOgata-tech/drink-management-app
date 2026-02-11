import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function JoinByCodeScreen() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const handleCodeChange = (text: string) => {
    // 大文字に変換し、英数字のみ許可
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // 最大6文字
    setCode(formatted.slice(0, 6));
  };

  const handleJoin = () => {
    if (code.length !== 6) {
      Alert.alert('エラー', '招待コードは6桁で入力してください');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // join-event画面に遷移
    router.push(`/join-event?code=${code}`);
    setIsLoading(false);
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
              招待コードで参加
            </Text>
          </View>

          <View
            className="flex-1 px-6 py-8"
            style={{ alignItems: isMd ? 'center' : undefined }}
          >
            <ResponsiveContainer className={isMd ? 'max-w-md w-full' : 'w-full'}>
              {/* 説明 */}
              <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                <View className="items-center mb-8">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
                    <Feather name="hash" size={40} color="#0ea5e9" />
                  </View>
                  <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    イベントの招待コード（6桁）を入力してください
                  </Text>
                </View>
              </Animated.View>

              {/* コード入力 */}
              <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                <Card variant="elevated" className="mb-6">
                  <View className="items-center py-6">
                    <Text className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      招待コード
                    </Text>
                    <TextInput
                      style={[
                        styles.codeInput,
                        isDark && styles.codeInputDark,
                      ]}
                      value={code}
                      onChangeText={handleCodeChange}
                      placeholder="ABC123"
                      placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={6}
                      keyboardType="default"
                      autoFocus
                    />
                    <Text className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {code.length}/6文字
                    </Text>
                  </View>
                </Card>
              </Animated.View>

              {/* 参加ボタン */}
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <Button
                  title={isLoading ? '確認中...' : 'イベントを検索'}
                  onPress={handleJoin}
                  disabled={code.length !== 6 || isLoading}
                  fullWidth
                  size="lg"
                  variant="secondary"
                />
              </Animated.View>

              {/* ヒント */}
              <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                <Card variant="outlined" className={`mt-6 border-blue-200 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <View className="flex-row items-start">
                    <Feather name="info" size={16} color={isDark ? '#60a5fa' : '#1e40af'} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className={`flex-1 text-sm leading-5 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                      招待コードはイベント主催者から共有されます。QRコードでも参加できます。
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            </ResponsiveContainer>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minWidth: 220,
    color: '#111827',
  },
  codeInputDark: {
    backgroundColor: '#374151',
    color: '#f9fafb',
  },
});
