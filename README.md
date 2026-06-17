# 飲酒記録アプリ (Drink Management)

飲み会イベントと日常の飲酒記録を統合管理するモバイルアプリ

## 概要

本アプリは、飲酒を促進するのではなく、**記録・可視化・振り返り**を主目的としたヘルスケアアプリです。ユーザーは個人アカウントでログインし、飲み会ごとにイベント（グループ）を作成・参加して、各自のドリンク記録やメモ（酔い具合/体調）を残せます。XP/レベルによるゲーミフィケーションや、イベント中のリアルタイム演出（乾杯）も備えます。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React Native (Expo SDK 54) |
| 言語 | TypeScript |
| バージョン | React 19.1 / React Native 0.81 |
| ルーティング | Expo Router v6 (ファイルベース) |
| スタイリング | NativeWind v4 (Tailwind CSS) |
| 状態管理 | Zustand v5 |
| バックエンド | Supabase (認証・PostgreSQL・Realtime・Storage・pg_cron) |
| ローカルストレージ | AsyncStorage |
| アニメーション | React Native Reanimated v4 |
| グラデーション/グラフィック | expo-linear-gradient / react-native-svg |
| カメラ（バーコード） | expo-camera |
| 画像処理 | expo-image-manipulator（アバターのリサイズ/圧縮） |
| 通知 | expo-notifications |
| 触覚フィードバック | Expo Haptics |
| 日付処理 | dayjs (日本語ロケール) |

## 実装済み機能

### 認証・アカウント
- メール/パスワード認証（Supabase Auth）
- **Googleログイン（OAuth）** — Web版(each-spirit.com)と共通の認証基盤
- ゲストモード（ローカルのみ）
- ディープリンク対応（メール確認 / OAuthコールバック: `drinkmanagement://auth/callback`）
- アカウント管理（表示名変更、1日1回制限）
- アカウント削除申請（管理者承認フロー）

### ホーム画面
- グラデーションのプレイヤーカード（レベル・XP進捗バー）
- 今日の飲酒記録サマリ（**円形プログレスリング**で適正量に対する割合を色分け表示）
- クイックアクション（記録追加、イベント）
- 直近のイベント一覧
- 健康メッセージ

### プロフィール
- プレイヤーカード（アバター＋レベル＋XP＋借金XP）
- **アバター画像のアップロード**（最大512pxにリサイズ＋JPEG圧縮してStorageへ。未設定時は頭文字プレースホルダ）
- 基本情報の設定（誕生日、身長、体重、性別、自己紹介。身長/体重は2カラム）
- 適正飲酒量の目安表示（性別に応じて）

### 飲酒記録
- デフォルトドリンクカタログ（27種類, `data/default_drinks.json`）
- 公式ドリンクDB（`products` テーブル, 日本の酒類210件）
- **バーコード（JAN）スキャン記録**: ローカルproducts → Yahoo!ショッピングAPI → Open Food Facts の順でフォールバック
- カスタムドリンク作成（ローカル保存）
- カテゴリ別フィルタリング・検索
- 純アルコール量の自動計算
- 個人記録（イベント外）の管理。Supabaseへ同期＋オフライン対応

### イベント管理
- イベント作成・編集・削除
- 3種類の記録ルール（RLSでサーバー強制）
  - **Self（個人管理）**: 各参加者が自分の記録を自由に追加
  - **Host Only（管理者記録）**: 管理者のみが記録追加可能
  - **Consensus（同意制）**: 他の参加者の承認が必要（必要承認数は「実効= min(設定値, アクティブ参加者-1)」で永久pendingを防止）
- イベント招待（QRコード生成、LINE共有、6桁招待コード、ディープリンク参加）
- **再参加対応**（離脱後も `join_event` RPCで復帰可）
- **ホスト離脱時の所有権自動移譲**（`leave_event` RPC）
- ページネーション（初期10件、追加読み込み、50件以上は別ページ）

### リアルタイム / イベント演出
- **イベント詳細のリアルタイム反映**（drink_logs の追加・承認を即時表示）
- **乾杯ボタン**（Realtime broadcast）: 1人3回/イベント・5秒クールダウン・残回数表示、「乾杯！」が飛び出す演出（効果音/Lottieは今後）
- 同時接続の上限ガード（開催中イベント40件超で手動更新モードに自動フォールバック→従量課金回避）

### XP / レベル
- 記録追加・イベント参加/完了でXP付与、レベルアップ
- **借金XP（negative_xp）**: 記録削除時に蓄積し次回付与で相殺（レベルダウン防止・稼ぎ防止）
- **イベント完了XPはサーバー側（終了トリガー）で在籍者へ一括付与**（離脱者除外・重複防止・手動終了/自動終了の両対応）

### 自動処理（サーバー側）
- **放置イベントの自動終了**（pg_cron が毎時、最終記録から12時間無操作の開催中イベントを終了）
- 完了XP付与トリガー、プロフィール自動作成トリガー、承認自動確定トリガー

### UI / ローディング
- 共通UI: Button / Card / Input / Avatar / ProgressRing / ResponsiveContainer
- ローディング: アプリアイコンのブランドローダー（AppLoader）/ スケルトン（Skeleton）
- ダークモード対応（※オンボーディング `consent` と法的ページ `legal/*` は可読性優先でライト固定）

## アーキテクチャの要点

- **Supabaseプロジェクトは each-spirit.com(Web) と共有**。スキーマで分離:
  - `public` … 本アプリ専用
  - `es` … each-spirit.com 専用（本アプリからは触らない）
  - ⚠️ 共有・本番DBのため `supabase/schema.sql` の `DROP TABLE ... CASCADE` 等は実行しない。変更は `supabase/migrations/` で追加適用。
- 記録ルールの権限・承認は RLS でサーバー強制。XP整合・完了付与・自動終了は SQL関数/トリガー/pg_cron 側に集約。
- 詳細は `docs/db-design.md` / `CLAUDE.md` を参照。

## プロジェクト構造（抜粋）

```
drink-management/
├── app/                        # 画面（Expo Router）
│   ├── _layout.tsx             # ルート（認証初期化・ディープリンク・通知許可）
│   ├── consent.tsx             # 同意/年齢確認（ライト固定）
│   ├── join-event.tsx          # イベント参加確認
│   ├── (auth)/                 # login / signup（Googleログイン含む）
│   ├── (tabs)/
│   │   ├── index.tsx           # ホーム
│   │   ├── drinks/             # 記録（add-personal / add-custom-drink / barcode-scan）
│   │   ├── events/             # 一覧 / all / create / scan / join-by-code / [id]（詳細・add-drink・invite・approvals・ranking）
│   │   └── profile.tsx         # プロフィール
│   ├── account/                # アカウント管理
│   └── legal/                  # 利用規約・プライバシー・飲酒ガイド（ライト固定）
├── components/ui/              # 汎用UI（Avatar/Button/Card/Input/ProgressRing/Skeleton/AppLoader/LoadingScreen）
├── components/auth/            # GoogleSignInButton
├── components/event/           # EventCard / DrinkLogCard / CheersOverlay / RealtimeCappedNotice 他
├── stores/                     # user / events / drinks / products / customDrinks / personalLogs / theme / sync / consent / dev
├── lib/                        # supabase, auth, database, events, drink-logs, products, xp, xp-api,
│                               #   openfoodfacts, yahoo-shopping, barcode-lookup, event-recording,
│                               #   useEventRealtime, notifications, storage/
├── types/                      # TypeScript型
├── data/default_drinks.json    # デフォルトドリンク27種
├── supabase/                   # schema.sql / rls.sql / migrations/
└── docs/                       # 設計ドキュメント
```

## 開発の始め方

### 1. 環境設定

`.env.example` を `.env` にコピーして設定:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# バーコード→商品名解決（任意）。未設定でもアプリは動作（Open Food Factsのみ）
EXPO_PUBLIC_YAHOO_APP_ID=your-yahoo-client-id
```

Googleログインを使う場合、Supabase の Authentication → URL Configuration → Redirect URLs に
`drinkmanagement://auth/callback` を追加しておく。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseセットアップ

新規プロジェクトの場合のみ `supabase/schema.sql` → `supabase/rls.sql` を実行（詳細は `docs/database-setup-guide.md`）。
**既存の共有・本番プロジェクトでは破壊的SQLを実行しないこと。**

### 4. アプリの起動

```bash
npm start          # 開発サーバー（JS変更はFast Refreshで即反映）
npm run ios        # iOS開発ビルド（ネイティブ変更/初回時のみ。= npx expo run:ios）
npm run android    # Android
npm run web        # Web
```

**注意**: ネイティブモジュールを使用しているため Expo Go では動作しません。開発ビルドを使用してください。
日常のJS変更は `npm start` のみでOK。ネイティブパッケージ追加や `app.json` 変更時のみ `npm run ios` で再ビルド。

### 5. 品質チェック

```bash
npm run lint       # ESLint
npx tsc --noEmit   # 型チェック
```

### 6. ビルド・提出（EAS）

```bash
eas build --platform ios --profile production    # iOS本番ビルド
eas submit --platform ios                        # App Storeに提出
eas build --platform ios --profile production --auto-submit  # 同時
```

> JSのみの変更は `eas update`（OTA）で審査なし即時配信が可能。ネイティブ変更時はビルド＋ストア審査が必要。

## 今後の実装予定

- [ ] 乾杯演出の Lottie 化・効果音（`lottie-react-native` / `expo-audio`）
- [ ] プッシュ通知の配信（サーバー側送信。受信/トークン基盤は実装済み）
- [ ] 週次/月次レポート・休肝日トラッキング
- [ ] 公式ドリンクDBへの JANコード拡充
- [ ] フォーム系画面のダークモード仕上げ（create / add-drink 等の一部）

## デザイン方針

- シンプルで直感的、若者向けの親しみやすいUI（グラデーション・アニメーション）
- 競争や煽りを抑え、**飲酒を促進しない**設計（XPやランキングは記録・参加を称える方向）
- 健康的な飲酒習慣のサポート

## ライセンス

Private - 商用利用不可

## 注意事項

本アプリは20歳以上の成人を対象としています。飲酒は適量を守り、健康的な範囲でお楽しみください。
