# Supabase データベースセットアップガイド

このディレクトリには、Drink Management Appのデータベーススキーマとセキュリティポリシーが含まれています。

## ファイル構成

- `schema.sql` - テーブル定義とトリガー
- `rls.sql` - Row Level Security (RLS) ポリシー
- `README.md` - このファイル

## セットアップ手順

### 1. Supabaseダッシュボードにアクセス

1. [Supabase](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左サイドバーから **SQL Editor** をクリック

### 2. スキーマの作成

1. SQL Editorで新しいクエリを作成
2. `schema.sql` の内容をコピー&ペースト
3. **Run** をクリックして実行

### 3. RLSポリシーの適用

1. SQL Editorで新しいクエリを作成
2. `rls.sql` の内容をコピー&ペースト
3. **Run** をクリックして実行

### 4. 確認

以下のテーブルが作成されていることを確認：

- ✅ `public.profiles` - ユーザープロフィール
- ✅ `public.events` - イベント情報
- ✅ `public.event_members` - イベント参加者
- ✅ `public.drink_logs` - 飲酒記録
- ✅ `public.memos` - メモ

## テーブル概要

### profiles（プロフィール）

ユーザーの基本情報とプロフィール設定を保存します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | auth.usersのIDと同一（主キー） |
| email | TEXT | メールアドレス |
| display_name | TEXT | 表示名 |
| avatar | TEXT | アバターURL（オプション） |
| age | INTEGER | 年齢（オプション） |
| height | INTEGER | 身長 cm（オプション） |
| weight | INTEGER | 体重 kg（オプション） |
| gender | TEXT | 性別: 'male', 'female', 'other'（オプション） |
| bio | TEXT | 自己紹介（オプション） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**特徴:**
- 新規ユーザー登録時に自動作成（トリガー）
- 自分のプロフィールのみ編集可能（RLS）
- イベント参加者のプロフィールは閲覧可能（RLS）

### events（イベント）

飲み会イベントの情報を保存します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | イベントID（主キー） |
| title | TEXT | イベント名 |
| description | TEXT | イベント説明（オプション） |
| recording_rule | TEXT | 記録ルール: 'self', 'host_only', 'consensus' |
| host_id | UUID | ホストのユーザーID |
| started_at | TIMESTAMP | 開始日時 |
| ended_at | TIMESTAMP | 終了日時（オプション） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**記録ルール:**
- **self**: 各参加者が自由に記録追加
- **host_only**: ホストとマネージャーのみ記録可能
- **consensus**: 承認制（記録は承認待ちになる）

**RLS:**
- イベント参加者のみ閲覧可能
- ホストのみ編集・削除可能

### event_members（イベント参加者）

イベントへの参加情報を保存します。

| カラム | 型 | 説明 |
|--------|-----|------|
| event_id | UUID | イベントID（複合主キー） |
| user_id | UUID | ユーザーID（複合主キー） |
| role | TEXT | 役割: 'host', 'manager', 'member' |
| joined_at | TIMESTAMP | 参加日時 |

**役割:**
- **host**: イベント作成者（全権限）
- **manager**: 管理者（メンバー管理、記録承認）
- **member**: 一般参加者

**RLS:**
- イベント参加者のみ他の参加者を閲覧可能
- ホストとマネージャーがメンバー管理可能

### drink_logs（飲酒記録）

飲酒の記録を保存します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 記録ID（主キー） |
| user_id | UUID | ユーザーID |
| event_id | UUID | イベントID（オプション） |
| drink_id | TEXT | デフォルトドリンクID（オプション） |
| drink_name | TEXT | ドリンク名 |
| ml | INTEGER | 容量 ml |
| abv | NUMERIC | アルコール度数 % |
| pure_alcohol_g | NUMERIC | 純アルコール量 g |
| count | INTEGER | 杯数（デフォルト: 1） |
| status | TEXT | ステータス: 'pending', 'approved', 'rejected' |
| recorded_at | TIMESTAMP | 記録日時 |
| created_at | TIMESTAMP | 作成日時 |

**ステータス:**
- **pending**: 承認待ち（consensusルールの場合）
- **approved**: 承認済み
- **rejected**: 却下

**RLS:**
- 自分の記録は常に閲覧・編集可能
- イベント参加者は同じイベントの記録を閲覧可能
- 記録ルールに応じて追加・編集権限が変わる

### memos（メモ）

個人メモまたはイベントメモを保存します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | メモID（主キー） |
| user_id | UUID | ユーザーID |
| event_id | UUID | イベントID（オプション） |
| content | TEXT | メモ内容 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**RLS:**
- 自分のメモは常に閲覧・編集可能
- イベント参加者は同じイベントのメモを閲覧可能

## セキュリティポリシー（RLS）の概要

### プライバシー保護

- ✅ ユーザーは自分のデータのみ編集可能
- ✅ プロフィールはイベント参加者間でのみ共有
- ✅ 飲酒記録は本人とイベント参加者のみ閲覧可能

### イベント権限

- ✅ **ホスト**: 全権限（イベント編集、メンバー管理、記録管理）
- ✅ **マネージャー**: メンバー管理、記録承認
- ✅ **メンバー**: 記録ルールに応じた記録追加

### 記録ルール

1. **Self（各自入力）**
   - 全参加者が自由に記録追加・編集

2. **Host Only（ホスト管理）**
   - ホストとマネージャーのみ記録追加可能
   - 正確な記録管理に適している

3. **Consensus（同意制）**
   - 全参加者が記録追加可能
   - 記録は承認待ちになる
   - ホストとマネージャーが承認・却下

## トリガーと自動処理

### 1. 新規ユーザー登録時の自動プロフィール作成

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

auth.usersにユーザーが追加されると、自動的にprofilesテーブルにレコードを作成します。

### 2. updated_atの自動更新

```sql
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

レコードが更新されると、updated_atが自動的に現在時刻に更新されます。

## トラブルシューティング

### テーブルが作成されない

- SQLエディタでエラーメッセージを確認
- 既存のテーブルと競合していないか確認
- schema.sqlを再実行（DROP IF EXISTSで安全に削除）

### RLSエラー「permission denied」

- ユーザーが認証されているか確認（auth.uid()がnullでない）
- 該当するRLSポリシーが存在するか確認
- ポリシーの条件を満たしているか確認

### トリガーが動作しない

- auth.usersテーブルのトリガーが有効か確認
- handle_new_user()関数が正しく作成されているか確認

## 開発環境でのリセット

開発中にデータベースをリセットしたい場合：

```sql
-- 全テーブルを削除して再作成
\i schema.sql
\i rls.sql
```

または、Supabaseダッシュボードから各テーブルを手動で削除してから、schema.sqlとrls.sqlを再実行してください。

## 本番環境への適用

本番環境では、以下の点に注意してください：

1. **バックアップ**: 既存データがある場合は必ずバックアップ
2. **段階的適用**: テーブルごとに適用してテスト
3. **RLSテスト**: 各ユーザー権限で動作確認
4. **パフォーマンス**: インデックスが適切に作成されているか確認

## 参考資料

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
