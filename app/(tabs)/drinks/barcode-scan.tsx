import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  fetchProductByBarcode,
  isValidBarcode,
  OpenFoodFactsProduct,
} from '@/lib/openfoodfacts';
import { calculatePureAlcohol } from '@/lib/products';

type ScanMode = 'camera' | 'manual';
type ResultState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    beer: '🍺',
    highball: '🥃',
    chuhai_sour: '🍋',
    shochu: '🥃',
    sake: '🍶',
    wine: '🍷',
    fruit_liquor: '🍑',
    shot_straight: '🥃',
    cocktail: '🍹',
    soft_drink: '🥤',
    other: '🍸',
  };
  return emojiMap[category] || '🍺';
};

export default function BarcodeScanScreen() {
  // returnTo パラメータで戻り先を指定可能（デフォルトは個人記録追加画面）
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<ScanMode>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [resultState, setResultState] = useState<ResultState>('idle');
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { isMd } = useResponsive();

  // 手動入力用の容量・度数
  const [customMl, setCustomMl] = useState('');
  const [customAbv, setCustomAbv] = useState('');

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await lookupBarcode(data);
  };

  const lookupBarcode = async (barcode: string) => {
    if (!isValidBarcode(barcode)) {
      setResultState('error');
      setErrorMessage('無効なバーコードです（8桁または13桁の数字）');
      return;
    }

    setResultState('loading');
    setProduct(null);

    const result = await fetchProductByBarcode(barcode);

    if (result.error) {
      setResultState('error');
      setErrorMessage(result.error.message);
      return;
    }

    if (result.notFound) {
      setResultState('not_found');
      setManualBarcode(barcode);
      return;
    }

    if (result.product) {
      setProduct(result.product);
      setCustomMl(result.product.ml?.toString() || '');
      setCustomAbv(result.product.abv?.toString() || '');
      setResultState('found');
    }
  };

  const handleManualLookup = () => {
    const cleaned = manualBarcode.replace(/\D/g, '');
    if (cleaned) {
      lookupBarcode(cleaned);
    }
  };

  const handleAddProduct = () => {
    if (!product) return;

    const ml = parseInt(customMl);
    const abv = parseFloat(customAbv);

    if (!ml || isNaN(ml) || ml <= 0) {
      Alert.alert('エラー', '容量を正しく入力してください');
      return;
    }

    if (isNaN(abv) || abv < 0 || abv > 100) {
      Alert.alert('エラー', 'アルコール度数を0〜100で入力してください');
      return;
    }

    const pureAlcoholG = calculatePureAlcohol(ml, abv);

    const productData = JSON.stringify({
      id: `barcode_${product.barcode}`,
      name: product.name,
      brand: product.brand,
      category: product.category,
      ml,
      abv,
      pureAlcoholG,
      emoji: getCategoryEmoji(product.category),
      barcode: product.barcode,
    });

    // 商品情報をパラメータとして渡して戻る
    // returnToが指定されていればそちらに、なければ個人記録追加画面へ
    const targetPath = returnTo || '/(tabs)/drinks/add-personal';

    router.navigate({
      pathname: targetPath as any,
      params: {
        barcodeProduct: productData,
      },
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetScan = () => {
    setScanned(false);
    setResultState('idle');
    setProduct(null);
    setErrorMessage('');
    setCustomMl('');
    setCustomAbv('');
  };

  // カメラ権限確認中
  if (!permission) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>カメラの権限を確認中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // カメラ権限なし
  if (!permission.granted && mode === 'camera') {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.centerContent}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="elevated" style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <Feather name="camera" size={48} color="#6b7280" />
              </View>
              <Text style={styles.permissionTitle}>カメラへのアクセス</Text>
              <Text style={styles.permissionDescription}>
                バーコードをスキャンするにはカメラへのアクセスが必要です
              </Text>
              <View style={styles.buttonGroup}>
                <Button
                  title="次へ"
                  onPress={requestPermission}
                  fullWidth
                  variant="primary"
                />
                <View style={styles.buttonSpacer} />
                <Button
                  title="バーコードを手入力"
                  onPress={() => setMode('manual')}
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

  // 結果表示
  if (resultState !== 'idle' && resultState !== 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.containerLight}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.headerLight}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <View style={styles.backButtonContent}>
                <Feather name="arrow-left" size={16} color="#0284c7" />
                <Text style={styles.backButtonText}>戻る</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>バーコード検索結果</Text>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              isMd && { alignItems: 'center' },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <ResponsiveContainer className={isMd ? 'max-w-xl w-full' : 'w-full'}>
            {resultState === 'found' && product && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Card variant="elevated" style={styles.resultCard}>
                  {/* 商品画像 */}
                  {product.imageUrl && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  {/* 商品情報 */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productEmoji}>
                      {getCategoryEmoji(product.category)}
                    </Text>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.brand && (
                      <Text style={styles.productBrand}>{product.brand}</Text>
                    )}
                    <Text style={styles.productBarcode}>
                      JAN: {product.barcode}
                    </Text>
                  </View>

                  {/* 容量・度数入力 */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputSectionTitle}>
                      容量・度数を確認してください
                    </Text>

                    <View style={styles.inputRow}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>容量 (ml)</Text>
                        <TextInput
                          style={styles.input}
                          value={customMl}
                          onChangeText={setCustomMl}
                          keyboardType="numeric"
                          placeholder="350"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>度数 (%)</Text>
                        <TextInput
                          style={styles.input}
                          value={customAbv}
                          onChangeText={setCustomAbv}
                          keyboardType="decimal-pad"
                          placeholder="5.0"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    {customMl && customAbv && (
                      <View style={styles.alcoholInfo}>
                        <Feather name="info" size={14} color="#6b7280" />
                        <Text style={styles.alcoholInfoText}>
                          純アルコール量:{' '}
                          {calculatePureAlcohol(
                            parseInt(customMl) || 0,
                            parseFloat(customAbv) || 0
                          ).toFixed(1)}
                          g
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.buttonGroup}>
                    <Button
                      title="この商品を追加"
                      onPress={handleAddProduct}
                      fullWidth
                      variant="primary"
                    />
                    <View style={styles.buttonSpacer} />
                    <Button
                      title="もう一度スキャン"
                      onPress={resetScan}
                      fullWidth
                      variant="outline"
                    />
                  </View>
                </Card>
              </Animated.View>
            )}

            {resultState === 'not_found' && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Card variant="elevated" style={styles.resultCard}>
                  <View style={styles.notFoundIcon}>
                    <Feather name="search" size={48} color="#9ca3af" />
                  </View>
                  <Text style={styles.notFoundTitle}>商品が見つかりません</Text>
                  <Text style={styles.notFoundDescription}>
                    このバーコードはデータベースに登録されていません。{'\n'}
                    カスタムドリンクとして手動で登録できます。
                  </Text>
                  <Text style={styles.barcodeText}>
                    JAN: {manualBarcode}
                  </Text>
                  <View style={styles.buttonGroup}>
                    <Button
                      title="カスタムドリンクを作成"
                      onPress={() => router.push('/(tabs)/drinks/add-custom-drink')}
                      fullWidth
                      variant="primary"
                    />
                    <View style={styles.buttonSpacer} />
                    <Button
                      title="もう一度スキャン"
                      onPress={resetScan}
                      fullWidth
                      variant="outline"
                    />
                  </View>
                </Card>
              </Animated.View>
            )}

            {resultState === 'error' && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Card variant="elevated" style={styles.resultCard}>
                  <View style={styles.errorIcon}>
                    <Feather name="alert-circle" size={48} color="#ef4444" />
                  </View>
                  <Text style={styles.errorTitle}>エラーが発生しました</Text>
                  <Text style={styles.errorDescription}>{errorMessage}</Text>
                  <View style={styles.buttonGroup}>
                    <Button
                      title="もう一度試す"
                      onPress={resetScan}
                      fullWidth
                      variant="primary"
                    />
                  </View>
                </Card>
              </Animated.View>
            )}
            </ResponsiveContainer>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ローディング
  if (resultState === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.containerLight}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>商品情報を検索中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 手動入力モード
  if (mode === 'manual') {
    return (
      <SafeAreaView edges={['top']} style={styles.containerLight}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.headerLight}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <View style={styles.backButtonContent}>
                <Feather name="arrow-left" size={16} color="#0284c7" />
                <Text style={styles.backButtonText}>戻る</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>バーコード入力</Text>
          </View>

          <View style={[styles.manualInputContainer, isMd && { alignItems: 'center' }]}>
            <ResponsiveContainer className={isMd ? 'max-w-md w-full' : 'w-full'}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <Card variant="elevated" style={styles.manualCard}>
                <View style={styles.barcodeIconContainer}>
                  <Feather name="maximize" size={48} color="#0ea5e9" />
                </View>
                <Text style={styles.manualTitle}>
                  バーコード番号を入力
                </Text>
                <Text style={styles.manualDescription}>
                  商品のJANコード（8桁または13桁）を入力してください
                </Text>

                <TextInput
                  style={styles.barcodeInput}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  keyboardType="numeric"
                  placeholder="4901777326439"
                  placeholderTextColor="#9ca3af"
                  maxLength={13}
                />

                <View style={styles.buttonGroup}>
                  <Button
                    title="検索"
                    onPress={handleManualLookup}
                    fullWidth
                    variant="primary"
                    disabled={manualBarcode.length < 8}
                  />
                  <View style={styles.buttonSpacer} />
                  {permission.granted && (
                    <Button
                      title="カメラでスキャン"
                      onPress={() => setMode('camera')}
                      fullWidth
                      variant="outline"
                    />
                  )}
                </View>
              </Card>
            </Animated.View>
            </ResponsiveContainer>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // カメラスキャンモード
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* オーバーレイ */}
      <View style={styles.overlay}>
        {/* 上部 */}
        <SafeAreaView edges={['top']} style={styles.topOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonContent}>
              <Feather name="arrow-left" size={16} color="#ffffff" />
              <Text style={styles.backButtonTextWhite}>戻る</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>バーコードをスキャン</Text>
          <Text style={styles.subtitle}>商品のバーコードを枠内に合わせてください</Text>
        </SafeAreaView>

        {/* スキャンエリア */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* 下部 */}
        <View style={styles.bottomOverlay}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setMode('manual')}
          >
            <Feather name="edit-3" size={20} color="#ffffff" />
            <Text style={styles.manualButtonText}>手入力する</Text>
          </TouchableOpacity>
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
  containerLight: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    padding: 16,
  },
  headerLight: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  backButtonTextWhite: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  permissionCard: {
    alignItems: 'center',
    padding: 24,
  },
  permissionIcon: {
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
  buttonGroup: {
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
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 150,
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
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  manualCard: {
    alignItems: 'center',
    padding: 24,
  },
  barcodeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  manualDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  barcodeInput: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#111827',
    marginBottom: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  resultCard: {
    padding: 24,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  productEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  productBrand: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  productBarcode: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  inputSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  inputSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  alcoholInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'center',
  },
  alcoholInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  notFoundIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  notFoundDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  barcodeText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});
