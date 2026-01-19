# データベースセットアップガイド

このガイドでは、Supabaseでデータベースをセットアップし、アプリと連携する手順を説明します。

## 前提条件

- ✅ Supabaseプロジェクトが作成済み
- ✅ `.env` ファイルに `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` が設定済み
- ✅ 認証設定が完了（[supabase-setup.md](./supabase-setup.md) 参照）

## セットアップ手順

### ステップ1: データベーススキーマの作成

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバーから **SQL Editor** をクリック
   - 「New query」をクリック

3. **スキーマSQLを実行**
   - `supabase/schema.sql` の内容をコピー
   - SQL Editorにペースト
   - **Run** ボタンをクリック

4. **実行結果の確認**
   ```
   Success. No rows returned
   ```
   が表示されればOK

### ステップ2: Row Level Security (RLS) の設定

1. **SQL Editorで新しいクエリを作成**
   - 「New query」をクリック

2. **RLS SQLを実行**
   - `supabase/rls.sql` の内容をコピー
   - SQL Editorにペースト
   - **Run** ボタンをクリック

3. **実行結果の確認**
   ```
   RLS policies have been successfully applied to all tables.
   ```
   が表示されればOK

### ステップ3: テーブルの確認

1. **Table Editorを開く**
   - 左サイドバーから **Table Editor** をクリック

2. **作成されたテーブルを確認**
   - ✅ `profiles` - ユーザープロフィール
   - ✅ `events` - イベント情報
   - ✅ `event_members` - イベント参加者
   - ✅ `drink_logs` - 飲酒記録
   - ✅ `memos` - メモ

### ステップ4: アプリでの動作確認

#### 4.1 アカウント登録

1. アプリを起動
2. 新規登録画面で登録
3. メール確認（または無効化している場合はスキップ）

#### 4.2 プロフィールの確認

1. ログイン後、プロフィール画面を開く
2. Supabaseダッシュボードで `profiles` テーブルを確認
3. 新規ユーザーが自動作成されているか確認

#### 4.3 プロフィールの更新

1. プロフィール画面で「編集」をタップ
2. 年齢、身長、体重、自己紹介を入力
3. 「保存」をタップ
4. Supabaseダッシュボードで更新内容を確認

## データベース構造

### profiles テーブル

ユーザーのプロフィール情報を保存します。

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  age INTEGER,
  height INTEGER,  -- cm
  weight INTEGER,  -- kg
  gender TEXT,     -- 'male', 'female', 'other'
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**自動作成トリガー:**
- 新規ユーザー登録時（auth.users に INSERT）に自動的にプロフィールが作成されます

**RLS ポリシー:**
- ✅ 自分のプロフィールは閲覧・編集可能
- ✅ イベント参加者のプロフィールは閲覧可能

### events テーブル

飲み会イベントの情報を保存します。

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  recording_rule TEXT NOT NULL,  -- 'self', 'host_only', 'consensus'
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS ポリシー:**
- ✅ イベント参加者のみ閲覧可能
- ✅ ホストのみ編集・削除可能

### event_members テーブル

イベント参加者の情報を保存します。

```sql
CREATE TABLE public.event_members (
  event_id UUID NOT NULL REFERENCES public.events(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL,  -- 'host', 'manager', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);
```

**RLS ポリシー:**
- ✅ イベント参加者は他の参加者を閲覧可能
- ✅ ホストとマネージャーがメンバー管理可能

### drink_logs テーブル

飲酒記録を保存します。

```sql
CREATE TABLE public.drink_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_id UUID REFERENCES public.events(id),
  drink_id TEXT,
  drink_name TEXT NOT NULL,
  ml INTEGER NOT NULL,
  abv NUMERIC(5, 2) NOT NULL,
  pure_alcohol_g NUMERIC(10, 2) NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS ポリシー:**
- ✅ 自分の記録は閲覧・編集・削除可能
- ✅ イベント参加者は同じイベントの記録を閲覧可能
- ✅ 記録ルールに応じて追加権限が変わる

### memos テーブル

個人メモまたはイベントメモを保存します。

```sql
CREATE TABLE public.memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_id UUID REFERENCES public.events(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS ポリシー:**
- ✅ 自分のメモは閲覧・編集・削除可能
- ✅ イベント参加者は同じイベントのメモを閲覧可能

## よくある問題と解決方法

### 1. テーブル作成エラー

**エラー**: `relation "profiles" already exists`

**解決方法**:
- 既存のテーブルを削除してから再作成
- または `schema.sql` の最初にある `DROP TABLE IF EXISTS` が実行されているか確認

### 2. RLSエラー「permission denied」

**エラー**: `new row violates row-level security policy`

**原因**:
- ユーザーが認証されていない
- RLSポリシーの条件を満たしていない

**解決方法**:
```sql
-- RLSが有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- ポリシーを確認
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 3. プロフィールが自動作成されない

**原因**:
- トリガーが正しく作成されていない

**解決方法**:
```sql
-- トリガーを確認
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- トリガー関数を確認
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

### 4. プロフィール更新が保存されない

**原因**:
- ゲストモードで使用している（DBに保存されない）
- RLSポリシーで更新がブロックされている

**確認方法**:
1. ログイン状態を確認
2. ブラウザの開発者ツールでエラーを確認
3. Supabase Dashboard の Logs を確認

## セキュリティのベストプラクティス

### 1. RLSは必ず有効化

すべてのテーブルでRow Level Securityを有効にしています。

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 2. 最小権限の原則

ユーザーは必要最小限のデータのみにアクセスできます。

- 自分のデータ: 閲覧・編集・削除
- イベント参加者のデータ: 閲覧のみ
- ホスト権限: イベント管理

### 3. データ検証

データベースレベルでバリデーションを実施しています。

```sql
age INTEGER CHECK (age > 0 AND age < 150)
abv NUMERIC(5, 2) CHECK (abv >= 0 AND abv <= 100)
```

## パフォーマンス最適化

### インデックス

頻繁にクエリされるカラムにインデックスを作成済み：

```sql
CREATE INDEX idx_drink_logs_user_recorded
ON public.drink_logs(user_id, recorded_at DESC);
```

### クエリ最適化のヒント

- `user_id` と `recorded_at` を組み合わせたクエリは高速
- イベントIDによるフィルタリングも最適化済み

## 次のステップ

データベースのセットアップが完了したら：

1. ✅ イベント機能の実装
2. ✅ 飲酒記録機能の実装
3. ✅ メモ機能の実装

各機能の実装方法については、それぞれのドキュメントを参照してください。
