# 飲酒記録アプリ (Drink Management)

飲み会イベントと日常の飲酒記録を統合管理するモバイルアプリ

## 概要

本アプリは、飲酒を促進するのではなく、**記録・可視化・振り返り**を主目的としたヘルスケアアプリです。ユーザーは個人アカウントでログインし、飲み会ごとにイベント（グループ）を作成・参加して、各自のドリンク記録やメモ（酔い具合/体調）を残せます。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React Native (Expo SDK 54) |
| 言語 | TypeScript |
| UIバージョン | React 19.1 / React Native 0.81 |
| ルーティング | Expo Router v6 (ファイルベース) |
| スタイリング | NativeWind v4 (Tailwind CSS) |
| 状態管理 | Zustand v5 |
| バックエンド | Supabase (認証・PostgreSQL) |
| ローカルストレージ | AsyncStorage |
| アニメーション | React Native Reanimated v4 |
| 触覚フィードバック | Expo Haptics |
| 日付処理 | dayjs (日本語ロケール) |

## 実装済み機能

### 認証・アカウント
- メール/パスワード認証（Supabase Auth）
- ゲストモード（ローカルのみ）
- ディープリンク対応（メール確認）
- アカウント管理（表示名変更、1日1回制限）
- アカウント削除申請（管理者承認フロー）

### ホーム画面
- 今日の飲酒記録サマリ（杯数、純アルコール量）
- 適正飲酒量との比較
- クイックアクション（記録追加、イベント作成）
- 直近のイベント一覧
- 健康メッセージ

### プロフィール管理
- 基本情報の設定（誕生日、身長、体重、性別、自己紹介）
- アバター表示
- 適正飲酒量の目安表示（性別に応じて）
- 統計情報の表示

### 飲酒記録
- デフォルトドリンクカタログ（27種類）
- カスタムドリンク作成（ローカル保存）
- カテゴリ別フィルタリング・検索
- 純アルコール量の自動計算
- 個人記録（イベント外）の管理

### イベント管理
- イベント作成・編集・削除
- 3種類の記録ルール
  - **Self（個人管理）**: 各参加者が自分の記録を自由に追加
  - **Host Only（管理者記録）**: 管理者のみが記録追加可能
  - **Consensus（同意制）**: 他の参加者の承認が必要
- イベント招待（QRコード、LINE共有、招待コード）
- ディープリンクでの参加（`drinkmanagement://events/join?code=ABC123`）
- ページネーション（初期10件、追加読み込み、50件以上は別ページ）

### UIコンポーネント
- Button（アニメーション、触覚フィードバック付き）
- Card（複数バリエーション）
- Input（ラベル、エラー表示対応）
- EventCard、DrinkLogCard、ParticipantRow など

## プロジェクト構造

```
drink-management/
├── app/                        # 画面（Expo Router）
│   ├── _layout.tsx             # ルートレイアウト
│   ├── consent.tsx             # 同意画面
│   ├── join-event.tsx          # イベント参加確認
│   ├── (auth)/                 # 認証画面
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                 # メインタブ
│   │   ├── index.tsx           # ホーム
│   │   ├── drinks.tsx          # 飲酒記録
│   │   ├── events/             # イベント関連
│   │   │   ├── index.tsx       # イベント一覧
│   │   │   ├── all.tsx         # 全イベント一覧
│   │   │   ├── create.tsx      # イベント作成
│   │   │   └── [id]/           # イベント詳細
│   │   └── profile.tsx         # プロフィール
│   └── account/                # アカウント管理
│       └── index.tsx
├── components/                 # UIコンポーネント
│   ├── ui/                     # 汎用UI
│   └── event/                  # イベント専用
├── stores/                     # Zustand状態管理
│   ├── user.ts                 # ユーザー認証・プロフィール
│   ├── events.ts               # イベント管理
│   ├── drinks.ts               # 飲酒記録
│   ├── products.ts             # 公式ドリンクDB
│   ├── customDrinks.ts         # カスタムドリンク
│   └── personalLogs.ts         # 個人記録
├── lib/                        # ユーティリティ・API
│   ├── supabase.ts             # Supabaseクライアント
│   ├── auth.ts                 # 認証操作
│   ├── database.ts             # プロフィールCRUD
│   ├── events.ts               # イベントCRUD
│   ├── drink-logs.ts           # 飲酒記録CRUD
│   ├── account-deletion.ts     # アカウント削除申請
│   └── storage/                # ローカルストレージ
├── types/                      # TypeScript型定義
├── data/                       # 静的データ
│   └── default_drinks.json     # デフォルトドリンク（27種類）
├── supabase/                   # データベース定義
│   ├── schema.sql              # テーブル定義
│   └── rls.sql                 # Row Level Security
└── docs/                       # ドキュメント
```

## 開発の始め方

### 1. 環境設定

```bash
# .env.exampleを.envにコピー
cp .env.example .env

# 環境変数を設定
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseセットアップ

```bash
# Supabase Dashboardで以下を実行
# 1. supabase/schema.sql - テーブル作成
# 2. supabase/rls.sql - RLSポリシー設定
```

詳細は `docs/database-setup-guide.md` を参照

### 4. アプリの起動

```bash
# 開発サーバーの起動
npm start

# iOS（開発ビルド）
npm run ios
# または
npx expo run:ios

# Android
npm run android

# Web
npm run web
```

**注意**: ネイティブモジュールを使用しているため、Expo Goでは動作しません。開発ビルドを使用してください。

### 5. ビルド・提出

```bash
# iOS本番ビルド
eas build --platform ios --profile production

# App Storeに提出
eas submit --platform ios

# ビルドと提出同時
eas build --platform ios --profile production --auto-submit
```

## 今後の実装予定

- [ ] リアルタイム更新（Supabase Realtime）
- [ ] 画像/アバターアップロード
- [ ] QRコード生成・スキャン
- [ ] 高度なフィルタリング・ソート
- [ ] オフラインモード同期
- [ ] プッシュ通知
- [ ] 統計・分析ダッシュボード

## デザイン方針

- シンプルで直感的なUI
- 若者向けの親しみやすいデザイン
- アニメーション・インタラクションの活用
- 競争や煽りを抑えた設計
- 健康的な飲酒習慣のサポート

## ライセンス

Private - 商用利用不可

## 注意事項

本アプリは20歳以上の成人を対象としています。飲酒は適量を守り、健康的な範囲でお楽しみください。
