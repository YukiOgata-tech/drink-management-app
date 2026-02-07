import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

const { width } = Dimensions.get('window');

export function NotificationPermissionModal({
  visible,
  onAllow,
  onSkip,
}: NotificationPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          style={styles.container}
        >
          {/* アイコン */}
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={styles.iconContainer}
          >
            <Feather name="bell" size={40} color="#0ea5e9" />
          </Animated.View>

          {/* タイトル */}
          <Text style={styles.title}>通知を許可してください</Text>

          {/* 説明 */}
          <Text style={styles.description}>
            以下の重要な情報をお届けするために{'\n'}通知の許可が必要です
          </Text>

          {/* 機能リスト */}
          <View style={styles.featureList}>
            <FeatureItem
              icon="calendar"
              text="イベントへの招待通知"
            />
            <FeatureItem
              icon="check-circle"
              text="飲酒記録の承認リクエスト"
            />
            <FeatureItem
              icon="bar-chart-2"
              text="週間・月間レポート"
            />
            <FeatureItem
              icon="info"
              text="健康アドバイス"
            />
          </View>

          {/* ボタン */}
          <View style={styles.buttonContainer}>
            <Button
              title="通知を許可する"
              onPress={onAllow}
              fullWidth
              size="lg"
              variant="primary"
            />
            <View style={styles.buttonSpacer} />
            <Button
              title="あとで"
              onPress={onSkip}
              fullWidth
              variant="outline"
            />
          </View>

          {/* 補足 */}
          <Text style={styles.note}>
            設定はいつでも変更できます
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Feather name={icon} size={20} color="#0ea5e9" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    width: width - 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    width: 28,
    marginRight: 12,
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
  },
  buttonSpacer: {
    height: 8,
  },
  note: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 16,
  },
});
