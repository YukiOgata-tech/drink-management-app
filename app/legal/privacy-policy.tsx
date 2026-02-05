import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LEGAL_VERSIONS } from '@/types';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ヘッダー */}
      <View className="px-6 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary-600 text-base">戻る</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">
          プライバシーポリシー
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        <View className="space-y-6 pb-8">
          {/* バージョン情報 */}
          <View className="bg-gray-100 rounded-lg p-3">
            <Text className="text-sm text-gray-600">
              バージョン: {LEGAL_VERSIONS.PRIVACY_POLICY} | 最終更新日: 2025年2月1日
            </Text>
          </View>

          {/* 前文 */}
          <View>
            <Text className="text-base text-gray-800 leading-7">
              Alcohol Log & Event Hub（以下「本アプリ」といいます）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本アプリにおける個人情報の取り扱いについて定めるものです。
            </Text>
          </View>

          {/* 第1条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第1条（収集する情報）
            </Text>
            <Text className="text-base text-gray-800 leading-7 mb-3">
              本アプリは、以下の情報を収集することがあります。
            </Text>
            <View className="ml-4 space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. <Text className="font-semibold">アカウント情報</Text>{'\n'}
                メールアドレス、表示名、パスワード（暗号化して保存）
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. <Text className="font-semibold">プロフィール情報</Text>{'\n'}
                生年月日、性別、身長、体重、自己紹介文（任意入力）
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. <Text className="font-semibold">飲酒記録情報</Text>{'\n'}
                飲酒日時、飲料の種類・量、アルコール摂取量、メモ
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. <Text className="font-semibold">イベント参加情報</Text>{'\n'}
                参加イベント、イベント内での飲酒記録
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                5. <Text className="font-semibold">端末情報</Text>{'\n'}
                端末識別子、OSバージョン、アプリバージョン（技術的なトラブルシューティング目的のみ）
              </Text>
            </View>
          </View>

          {/* 第2条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第2条（情報の利用目的）
            </Text>
            <Text className="text-base text-gray-800 leading-7 mb-3">
              収集した情報は、以下の目的に利用します。
            </Text>
            <View className="ml-4 space-y-1">
              <Text className="text-base text-gray-800 leading-7">
                1. 本アプリのサービス提供およびその改善
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. ユーザー認証およびアカウント管理
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 飲酒記録の保存、統計表示、振り返り機能の提供
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. イベント機能における参加者間の情報共有
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                5. ユーザーサポートへの対応
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                6. 本アプリの安全性確保および不正利用の防止
              </Text>
            </View>
          </View>

          {/* 第3条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第3条（情報の保存場所）
            </Text>
            <View className="space-y-3">
              <Text className="text-base text-gray-800 leading-7">
                <Text className="font-semibold">1. クラウドサーバー</Text>{'\n'}
                アカウント情報、飲酒記録、イベント情報は、Supabase（米国所在のクラウドサービス）のサーバーに保存されます。データは暗号化して送受信されます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                <Text className="font-semibold">2. 端末内ストレージ</Text>{'\n'}
                一部のデータ（ゲストモードでの記録、カスタムドリンク等）は端末内のローカルストレージに保存されます。
              </Text>
            </View>
          </View>

          {/* 第4条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第4条（第三者への提供）
            </Text>
            <Text className="text-base text-gray-800 leading-7 mb-3">
              本アプリは、以下の場合を除き、収集した個人情報を第三者に提供することはありません。
            </Text>
            <View className="ml-4 space-y-1">
              <Text className="text-base text-gray-800 leading-7">
                1. 利用者本人の同意がある場合
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 法令に基づく場合
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 人の生命、身体または財産の保護のために必要がある場合であって、利用者本人の同意を得ることが困難であるとき
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. イベント機能において、同一イベントの参加者間で飲酒記録を共有する場合（イベント参加時に同意したものとみなします）
              </Text>
            </View>
          </View>

          {/* 第5条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第5条（情報の保存期間）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                • アカウント情報：アカウント削除まで
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • 飲酒記録：アカウント削除まで（利用者が個別に削除することも可能）
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • イベント情報：イベント終了後1年間
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • ログデータ：収集から90日間
              </Text>
            </View>
          </View>

          {/* 第6条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第6条（利用者の権利）
            </Text>
            <Text className="text-base text-gray-800 leading-7 mb-3">
              利用者は、自己の個人情報について以下の権利を有します。
            </Text>
            <View className="ml-4 space-y-1">
              <Text className="text-base text-gray-800 leading-7">
                1. <Text className="font-semibold">アクセス権</Text>：保存されている自己の情報の開示を求める権利
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. <Text className="font-semibold">訂正権</Text>：不正確な情報の訂正を求める権利
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. <Text className="font-semibold">削除権</Text>：自己の情報の削除を求める権利
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. <Text className="font-semibold">データポータビリティ</Text>：自己の情報を機械可読形式で受け取る権利
              </Text>
            </View>
            <Text className="text-base text-gray-800 leading-7 mt-3">
              これらの権利を行使する場合は、アプリ内の設定またはお問い合わせ先までご連絡ください。
            </Text>
          </View>

          {/* 第7条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第7条（セキュリティ）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本アプリは、個人情報の漏洩、滅失、毀損を防止するため、以下のセキュリティ対策を実施しています。
            </Text>
            <View className="ml-4 space-y-1 mt-2">
              <Text className="text-base text-gray-800 leading-7">
                • SSL/TLS暗号化通信の使用
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • パスワードのハッシュ化保存
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • アクセス制御（Row Level Security）の実装
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                • 定期的なセキュリティ監査
              </Text>
            </View>
          </View>

          {/* 第8条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第8条（Cookie・トラッキング）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本アプリは、Cookieおよびサードパーティのトラッキングツールを使用していません。ただし、認証セッション管理のため、端末内にセッション情報を保存します。
            </Text>
          </View>

          {/* 第9条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第9条（未成年者の利用）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本アプリは、20歳以上の方を対象としています。20歳未満の方による利用を意図しておらず、20歳未満の方の個人情報を故意に収集することはありません。万が一、20歳未満の方の情報を収集したことが判明した場合は、速やかに削除します。
            </Text>
          </View>

          {/* 第10条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第10条（プライバシーポリシーの変更）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本プライバシーポリシーは、法令の改正や本アプリの機能変更等に伴い、予告なく変更されることがあります。重要な変更がある場合は、アプリ内でお知らせします。変更後のプライバシーポリシーは、本アプリ内での掲示時から効力を生じるものとします。
            </Text>
          </View>

          {/* 第11条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第11条（お問い合わせ）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本プライバシーポリシーに関するお問い合わせは、以下の連絡先までお願いいたします。
            </Text>
            <View className="bg-gray-100 rounded-lg p-4 mt-3">
              <Text className="text-base text-gray-800">
                アプリ名: Alcohol Log & Event Hub{'\n'}
                お問い合わせ: アプリ内フィードバック機能をご利用ください
              </Text>
            </View>
          </View>

          {/* 適用法 */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Text className="text-sm text-blue-800">
              本プライバシーポリシーは、日本国の個人情報の保護に関する法律（個人情報保護法）に準拠して作成されています。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
