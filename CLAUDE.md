# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

飲み会イベントと日常の飲酒記録を追跡するExpo製React Nativeモバイルアプリです。本アプリは飲酒を促進するのではなく、記録・可視化・振り返りを主目的としたヘルスケアアプリとして設計されています。ユーザーはログインし、飲み会イベント（グループ）を作成・参加して、体調のメモと共に飲酒記録を残すことができます。

**技術スタック:**
- React Native (Expo SDK 54)
- React 19.1 / React Native 0.81
- TypeScript
- Expo Router v6 (ファイルベースルーティング)
- NativeWind v4 (React Native向けTailwind CSS)
- Zustand v5 (状態管理)
- Supabase (認証・データベースバックエンド)
- AsyncStorage (ローカルストレージ)
- React Native Reanimated v4 (アニメーション)
- Expo Haptics (触覚フィードバック)
- dayjs (日付処理、日本語ロケール)

## よく使うコマンド

### 開発
```bash
npm install              # 依存関係のインストール
npm start                # Expo開発サーバーの起動
npm run ios              # iOSシミュレータで実行（開発ビルド）
npm run android          # Androidエミュレータで実行
npm run web              # Webブラウザで実行
npm run lint             # ESLintの実行
```

### ビルド（ネイティブモジュール使用時）
```bash
npx expo prebuild --platform ios --clean  # iOSネイティブプロジェクト生成
npx expo run:ios                          # 開発ビルドで実行
```

### テスト・デバッグ
- テストスイートはまだ未設定
- デバッグにはExpo DevToolsを使用（`npm start`後にターミナルで`j`を押す）

## プロジェクト構造

```
drink-management/
├── app/                    # 画面（Expo Routerによるファイルベースルーティング）
│   ├── _layout.tsx         # ルートレイアウト（認証初期化、ディープリンク）
│   ├── consent.tsx         # 同意画面（初期ルート）
│   ├── join-event.tsx      # イベント参加確認画面
│   ├── (auth)/             # 認証グループ
│   │   ├── login.tsx       # ログイン画面
│   │   └── signup.tsx      # 新規登録画面
│   └── (tabs)/             # メインタブナビゲーション
│       ├── _layout.tsx     # タブレイアウト
│       ├── index.tsx       # ホーム画面（日次サマリー）
│       ├── drinks.tsx      # 飲酒記録画面
│       ├── events.tsx      # イベント一覧画面
│       ├── profile.tsx     # プロフィール画面
│       ├── drinks/         # 飲酒関連サブ画面
│       │   ├── add-personal.tsx    # 個人記録追加
│       │   └── add-custom-drink.tsx # カスタムドリンク作成
│       └── events/         # イベント関連サブ画面
│           ├── create.tsx  # イベント作成
│           └── [id]/       # イベント詳細（動的ルート）
│               ├── index.tsx    # イベント詳細
│               ├── add-drink.tsx # 飲酒記録追加
│               ├── invite.tsx   # 招待画面
│               ├── approvals.tsx # 承認管理（consensus用）
│               └── ranking.tsx  # ランキング
├── components/             # 再利用可能なコンポーネント
│   ├── ui/                 # 汎用UIコンポーネント
│   │   ├── Button.tsx      # アニメーション付きボタン
│   │   ├── Card.tsx        # カードコンテナ
│   │   └── Input.tsx       # テキスト入力
│   └── event/              # イベント専用コンポーネント
│       ├── EventCard.tsx   # イベントカード
│       ├── DrinkLogCard.tsx # 飲酒記録カード
│       ├── ParticipantRow.tsx # 参加者行
│       ├── ApprovalCard.tsx # 承認カード
│       └── RankingCard.tsx # ランキングカード
├── stores/                 # Zustand状態管理
│   ├── user.ts             # ユーザー認証・プロフィール
│   ├── events.ts           # イベント管理
│   ├── drinks.ts           # 飲酒記録（ダミーデータ）
│   ├── products.ts         # 公式ドリンクDB
│   ├── customDrinks.ts     # カスタムドリンク（ローカル）
│   ├── personalLogs.ts     # 個人記録（ローカル）
│   └── dev.ts              # 開発用フラグ
├── lib/                    # ユーティリティ・API関数
│   ├── auth.ts             # 認証操作
│   ├── database.ts         # プロフィールCRUD
│   ├── supabase.ts         # Supabaseクライアント初期化
│   ├── events.ts           # イベントCRUD
│   ├── drink-logs.ts       # 飲酒記録CRUD・承認
│   ├── products.ts         # 商品DB操作
│   └── storage/            # ローカルストレージ
│       ├── index.ts        # AsyncStorageアダプター
│       ├── customDrinks.ts # カスタムドリンク永続化
│       └── personalLogs.ts # 個人記録永続化
├── types/                  # TypeScript型定義
│   └── index.ts            # すべての型
├── data/                   # 静的データ
│   ├── default_drinks.json # デフォルトドリンク（27種類）
│   └── dummy_data.ts       # 開発用ダミーデータ
├── supabase/               # データベース定義
│   ├── schema.sql          # テーブル定義
│   └── rls.sql             # Row Level Security
└── docs/                   # ドキュメント
    ├── db-design.md        # DB設計仕様
    ├── database-setup-guide.md # セットアップガイド
    └── ui-design.md        # UI設計
```

## アーキテクチャと主要パターン

### ルーティング (Expo Router)
- Expo Router v6を使用したファイルベースルーティング
- `app/_layout.tsx` - 認証初期化とディープリンク処理を含むルートレイアウト
- `app/(tabs)/_layout.tsx` - タブナビゲーションレイアウト
- `app/consent.tsx` - 初回同意画面（タブの前に表示）
- 初期ルート: `consent` (`unstable_settings`で設定)

### 状態管理 (Zustand)
`stores/`に7つのストアがあります:

1. **`useUserStore`** - ユーザー認証とプロフィール
   - 認証済みユーザーとゲストモードの両方をサポート
   - ゲストモード: ローカルのみのデータ（DBには保存しない）
   - 認証モード: プロフィールをSupabaseと同期
   - 主要メソッド: `initializeAuth()`, `updateProfile()`, `logout()`, `agreeToConsent()`

2. **`useEventsStore`** - イベント（飲み会）管理
   - イベントには記録ルールがある: `self`, `host_only`, `consensus`
   - イベントメンバーとその役割（host, manager, member）を追跡
   - 主要メソッド: `fetchEvents()`, `createEvent()`, `fetchEventMembers()`, `addEventMember()`

3. **`useDrinksStore`** - 飲酒記録とメモ
   - 飲酒記録を管理（ステータス: pending, approved, rejected）
   - デフォルトドリンクは`data/default_drinks.json`から読み込み（27種類のプリセット）
   - ユーザー、イベント、日付でフィルタリングするメソッド
   - 現在はダミーデータを使用

4. **`useProductsStore`** - 公式ドリンクデータベース
   - Supabaseの`products`テーブルと連携
   - カテゴリフィルタリング、全文検索機能

5. **`useCustomDrinksStore`** - カスタムドリンク（ローカル）
   - AsyncStorageに永続化
   - 非同期CRUD操作

6. **`usePersonalLogsStore`** - 個人飲酒記録（ローカル）
   - AsyncStorageに永続化
   - 日付範囲フィルタリング

7. **`useDevStore`** - 開発用フラグ
   - ダミーデータの有効/無効切り替え

### 認証フロー
- Supabase Authをメール/パスワードで設定
- ディープリンク: メール確認用に`drinkmanagement://auth/callback`を使用
- ゲストモードフォールバック: 未認証の場合は一時的なゲストユーザーを作成
- 認証は`app/_layout.tsx`のマウント時に初期化
- セッションはAsyncStorageに保存（アプリ再起動後も永続化）

### ローカルストレージ (AsyncStorage)
- `lib/storage/index.ts` - AsyncStorageベースのストレージアダプター
- カスタムドリンク: `custom-drinks:` プレフィックス
- 個人飲酒記録: `personal-logs:` プレフィックス
- Supabase認証: AsyncStorageに直接保存

**注意:** 以前使用していた`react-native-mmkv`はExpo SDK 54との互換性問題により削除されました。

### データベース (Supabase)
- スキーマとRLSポリシーは`supabase/schema.sql`と`supabase/rls.sql`で定義
- テーブル: `profiles`, `events`, `event_members`, `drink_logs`, `drink_log_approvals`, `memos`, `products`
- プロフィール自動作成トリガー: 新規認証ユーザーは自動的にプロフィール行が作成される
- 承認自動処理トリガー: Consensusモードで必要数の承認が集まったら自動的にapprovedに変更
- RLS: ユーザーは自分のデータとイベント参加者のデータのみ閲覧可能
- セットアップガイド: `docs/database-setup-guide.md`
- DB設計ドキュメント: `docs/db-design.md`（完全な仕様）

**ライブラリ関数:**
- `lib/auth.ts` - 認証操作（signUp, signIn, signOut, getCurrentSession, resetPassword, handleAuthCallback）
- `lib/database.ts` - プロフィールCRUD（getProfile, updateProfile, getUserWithProfile）
- `lib/events.ts` - イベントCRUD・メンバー管理（createEvent, getEvents, addEventMember, leaveEvent）
- `lib/drink-logs.ts` - 飲酒記録CRUD・承認（createDrinkLog, approveDrinkLog, rejectDrinkLog）
- `lib/products.ts` - 商品検索（getAllProducts, searchProducts, calculatePureAlcohol）
- `lib/supabase.ts` - Supabaseクライアントの初期化

### UIコンポーネント
- カスタムコンポーネントは`components/ui/`に配置
- `Button` - 触覚フィードバック付きアニメーションボタン（ReanimatedとExpo Hapticsを使用）
  - バリアント: primary, secondary, outline, danger
  - サイズ: sm, md, lg
- `Card` - バリアント付きコンテナ
- `Input` - テキスト入力フィールド
- スタイリングにはNativeWind（Tailwind）を使用
- アニメーション: スムーズなインタラクションのためにReact Native Reanimatedを使用

### データモデル (types/index.ts)
主要な型:
- `User` - プロフィール付きユーザー（誕生日、身長、体重、性別、自己紹介）
- `Event` - 記録ルール付き飲み会イベント（requiredApprovals: 必要承認数、inviteCode: 招待コード）
- `EventRecordingRule` - `'self' | 'host_only' | 'consensus'`
- `EventMemberRole` - `'host' | 'manager' | 'member'`
- `EventMember` - イベント参加者（role、joinedAt、leftAt: 途中離脱時刻）
- `DrinkLog` - 個別の飲酒記録（memo、recordedById、status含む）
- `DrinkLogStatus` - `'pending' | 'approved' | 'rejected'`
- `DrinkLogApproval` - Consensusモードの承認記録
- `DrinkCategory` - 11種類（beer, highball, chuhai_sour, shochu, sake, wine, fruit_liquor, shot_straight, cocktail, soft_drink, other）
- `DefaultDrink` - ml、ABV、純アルコール量（g）、絵文字を含むプリセットドリンク
- `CustomDrink` - ユーザー定義ドリンク（ローカル保存）
- `PersonalDrinkLog` - 個人飲酒記録（ローカル保存）
- `Product` - 公式ドリンク（ブランド、メーカー、JANコード含む）
- `Memo` - メモ（type: feeling, condition, next_day, general）

### 純アルコール量の計算
- 計算式: `ml * (abv / 100) * 0.8`（0.8 = アルコールの比重近似値）
- デフォルトドリンクは`default_drinks.json`で事前計算済み
- 健康ガイドライン: 男性20g/日、女性10g/日の推奨上限（アプリ内に表示）

### XP/レベルシステム
ゲーミフィケーション要素としてXP（経験値）とレベルシステムを実装。

**XP付与:**
- 飲酒記録追加: +10 XP
- 当日初回記録ボーナス: +5 XP
- イベント参加: +50 XP
- イベント完了: +30 XP

**レベル計算:**
- 計算式: `50 * Math.pow(level, 1.5)`
- レベル5: 559 XP、レベル10: 1,581 XP、レベル20: 4,472 XP

**借金XP（negative_xp）システム:**
記録削除時のXP整合性を保つための仕組み。
- 記録削除 → `negative_xp += 10`（借金として蓄積、total_xpは減らない）
- 次の記録追加 → 付与XPから借金を相殺
- メリット: レベルダウンなし、「削除→再追加でXP稼ぎ」を防止

**関連ファイル:**
- `lib/xp.ts` - XP計算ロジック
- `lib/xp-api.ts` - Supabase連携（addXPToProfile, addNegativeXP）
- `stores/user.ts` - ユーザーストアのXP管理

## 開発パターン

### 新しい画面の追加
1. `app/`または`app/(tabs)/`にファイルを作成
2. デフォルトReactコンポーネントをエクスポート
3. タブ画面の場合は`app/(tabs)/_layout.tsx`に追加

### Zustandストアアクションの追加
```typescript
// stores/example.ts
export const useExampleStore = create<ExampleState>((set, get) => ({
  // state
  items: [],
  isLoading: false,

  // 同期アクション
  setItems: (items) => set({ items }),

  // 非同期アクション
  fetchItems: async () => {
    set({ isLoading: true });
    try {
      const items = await fetchFromAPI();
      set({ items });
    } finally {
      set({ isLoading: false });
    }
  },

  // getterを使用したアクション
  getItemById: (id) => {
    return get().items.find(item => item.id === id);
  }
}));
```

### Supabaseとの連携
- DB関数を呼び出す前に必ず`isGuest`をチェック
- DB操作は`{ data, error }`を返すので、必ずerrorをチェック
- すべてのテーブルでRLSが有効 - クエリは認証コンテキストで自動的にフィルタリング
- `lib/`のヘルパー関数を使用（コンポーネントから直接Supabaseを呼び出さない）

```typescript
// 正しいパターン
const { isGuest } = useUserStore();
if (!isGuest) {
  const { data, error } = await createEvent(params);
  if (error) {
    // エラーハンドリング
  }
}
```

### NativeWindでのスタイリング
- `className`プロップでTailwindクラスを使用
- カラーパレット: primary（スカイブルー）、secondary、red（danger）
- カスタムクラスは`global.css`で定義
- 複雑なアニメーションの場合は、代わりにReanimatedの`Animated.View`を使用

## 環境設定

### 必須の環境変数
`.env.example`を`.env`にコピーして以下を設定:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Supabaseのセットアップ
1. `supabase/schema.sql`を実行してテーブルを作成
2. `supabase/rls.sql`を実行してRow Level Securityポリシーを設定
3. メール認証のリダイレクトを設定: `drinkmanagement://auth/callback`
4. 詳細な手順は`docs/database-setup-guide.md`を参照

## 重要な注意事項

- **ゲスト vs 認証済み**: DB操作の前に必ず`useUserStore`の`isGuest`をチェック
- **ダミーデータ**: `useDrinksStore`は現在ダミーデータを使用（永続化されない）
- **ローカルストレージ**: カスタムドリンクと個人記録はAsyncStorageに保存（オフライン対応）
- **記録ルール**: イベントの飲酒記録には3つのモード:
  - `self`（個人管理） - 各参加者が自分の記録を自由に追加、即座に確定
  - `host_only`（管理者記録管理） - 管理者（ホスト・マネージャー）のみが記録追加可能、他人の記録も代わりに追加できる
  - `consensus`（ユーザー間同意制） - 本人が記録を追加し、他の参加者が設定人数以上承認したら確定（虚偽防止）
- **記録の編集・削除**: 編集は不可（データの信頼性担保）、削除は可能（本人または管理者）
- **記録メモ**: 各飲酒記録に個別メモを追加可能（「ここで酔った」など）
- **健康重視**: アプリは飲酒促進ではなく健康意識を重視
- **年齢制限**: 同意画面には20歳以上の成人向けという警告を含む（日本の法定飲酒年齢）

## イベント招待機能

### 3つの招待方法
1. **QRコード** - その場で参加者に見せる
2. **LINE共有** - LINEグループで招待リンクを送る
3. **招待コード入力** - 6桁の英数字を口頭で伝える

### ディープリンク
- 認証コールバック: `drinkmanagement://auth/callback`
- イベント参加: `drinkmanagement://events/join?code=ABC123`
- 招待コードは自動生成（6桁英数字、ユニーク）
- リンクタップで`app/join-event.tsx`へ遷移

## 実装状況

### 完了済み
- ✅ 認証フロー（サインアップ、ログイン、ログアウト、ディープリンク）
- ✅ 同意画面（法的警告付き）
- ✅ ユーザープロフィール管理
- ✅ タブナビゲーション（ホーム、記録、イベント、プロフィール）
- ✅ ホーム画面（日次サマリー、クイックアクション）
- ✅ イベント作成（ルール選択付き）
- ✅ イベント招待（ディープリンク対応）
- ✅ イベント参加確認画面
- ✅ デフォルトドリンクカタログ（27種類）
- ✅ カスタムドリンク作成（ローカル保存）
- ✅ 個人飲酒記録（ローカル保存）
- ✅ UIコンポーネントライブラリ
- ✅ アニメーション・触覚フィードバック
- ✅ ゲストモードサポート

### 部分的に実装
- ⚠️ イベント詳細画面（基本機能のみ）
- ⚠️ 飲酒記録表示（カードコンポーネントあり、API連携は一部）
- ⚠️ Consensus承認システム（構造のみ）
- ⚠️ ランキング画面（コンポーネントあり）

### 未実装
- ❌ リアルタイム更新（Supabase Realtime）
- ❌ 画像/アバターアップロード
- ❌ QRコード生成
- ❌ 高度なフィルタリング・ソート
- ❌ オフラインモード同期
- ❌ プッシュ通知

## 既知の問題・注意点

### Expo SDK 54 互換性
- `react-native-mmkv`はExpo SDK 54 / React Native 0.81との互換性問題があるため削除済み
- 代わりにAsyncStorageを使用（Supabase公式推奨）

### ビルド時の注意
- ネイティブモジュールを使用しているため、Expo Goでは動作しない
- 必ず`npx expo run:ios`または`npx expo run:android`で開発ビルドを使用
- prebuild後は`ios/`フォルダを削除してクリーンビルドを推奨

### TypeScriptエラー
- `data/dummy_data.ts`に型の不一致があるが、開発用データのため無視可能
