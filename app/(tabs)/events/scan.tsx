import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card } from '@/components/ui';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // drinkmanagement://events/join?code=XXXXXX 形式のURLをパース
    const match = data.match(/drinkmanagement:\/\/events\/join\?code=([A-Z0-9]+)/i);

    if (match && match[1]) {
      const inviteCode = match[1];
      router.replace(`/join-event?code=${inviteCode}`);
    } else {
      Alert.alert(
        '無効なQRコード',
        'このQRコードは招待コードではありません',
        [
          {
            text: 'もう一度スキャン',
            onPress: () => setScanned(false),
          },
          {
            text: '戻る',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ]
      );
    }
  };

  if (!permission) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>カメラの権限を確認中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.centerContent}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="elevated" style={styles.permissionCard}>
              <Text style={styles.permissionIcon}>📷</Text>
              <Text style={styles.permissionTitle}>カメラへのアクセス</Text>
              <Text style={styles.permissionDescription}>
                QRコードをスキャンするにはカメラへのアクセスが必要です
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  title="カメラを許可"
                  onPress={requestPermission}
                  fullWidth
                  variant="primary"
                />
                <View style={styles.buttonSpacer} />
                <Button
                  title="戻る"
                  onPress={() => router.back()}
                  fullWidth
                  variant="outline"
                />
              </View>
            </Card>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* オーバーレイ */}
      <View style={styles.overlay}>
        {/* 上部 */}
        <SafeAreaView edges={['top']} style={styles.topOverlay}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>QRコードをスキャン</Text>
        </SafeAreaView>

        {/* スキャンエリア */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            {/* 四隅のコーナー */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* 下部 */}
        <View style={styles.bottomOverlay}>
          <Text style={styles.hint}>
            イベントの招待QRコードを枠内に合わせてください
          </Text>
          {scanned && (
            <TouchableOpacity
              onPress={() => setScanned(false)}
              style={styles.rescanButton}
            >
              <Text style={styles.rescanButtonText}>もう一度スキャン</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    color: '#fff',
    fontSize: 16,
  },
  permissionCard: {
    alignItems: 'center',
    padding: 24,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonSpacer: {
    height: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#0ea5e9',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  bottomOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
    alignItems: 'center',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
