# データベース設計ドキュメント

## 概要

このドキュメントは、飲み会記録アプリのデータベース設計の完全な仕様を記載しています。

> ⚠️ **このDBは each-spirit.com と共有しています**
>
> - 接続先 Supabase プロジェクト: `ctwpnaizwsrffrkkbuig`（"each-spirit and drink-mgt"）
> - 1つの Postgres を**スキーマで分離**して2つのアプリが共有しています:
>   - **`public`** … 本アプリ（drink-management）専用。本ドキュメントが対象とするのはこのスキーマ。
>   - **`es`** … each-spirit.com（Web）専用。本アプリは一切参照せず、変更もしない。
> - 両スキーマ間に外部キー依存はなく独立しています（共通点は `auth.users` を共有する点のみ）。
> - **破壊的操作の禁止**: `supabase/schema.sql` の `DROP TABLE ... CASCADE` 群やスキーマ全体の再実行は、共有・本番データが入った現環境では実行しないでください。スキーマ変更は追加マイグレーション（`supabase/migrations/`）で該当 DDL のみ適用します。
>
> `public` スキーマのテーブル（本ドキュメントで解説）:
> `profiles` / `events` / `event_members` / `drink_logs` / `drink_log_approvals` / `memos` / `products` / `account_deletion_requests`

## 設計思想

### アプリの目的
- 友達との飲み会で「何杯飲んだか」を可視化
- 「どちらが酒に強いか」を口論ではなくデータで証明
- 記録の信頼性・正確性を重視
- 学生ノリで楽しめるランキング表示

### 3つの記録ルール

#### 1. **個人管理 (Self)**
- **用途**: 日常の個人的な飲酒記録、または気軽な飲み会
- **記録方法**: 各参加者が自分の記録を自由に追加
- **承認**: 不要（即座に確定）
- **特徴**: 最もシンプルで制約なし

#### 2. **管理者記録管理 (Host Only)**
- **用途**: 厳密に管理したい飲み会、会費制のイベント
- **記録方法**: ホストとマネージャーのみが記録を追加可能
- **他人の記録**: 管理者は他の参加者の記録も代わりに追加できる
- **一般メンバー**: 記録の追加は一切できない（閲覧のみ）

#### 3. **ユーザー間同意制 (Consensus)**
- **用途**: 虚偽を防止し、正確性を担保したい飲み会
- **記録方法**: 各参加者が自分の記録を追加
- **承認**: 他のユーザーが設定人数以上承認する必要がある（デフォルト1人）
- **承認者**: 本人以外の参加者なら誰でも承認可能（指定不可）
- **ステータス**: pending → approved（必要数に達したら自動的に承認）

## テーブル構造

### 1. profiles（プロフィール）

ユーザーの基本情報とプロフィール。

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,                    -- auth.usersと連携
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  birthday DATE,                          -- 年齢計算用
  height INTEGER,                         -- cm（適正飲酒量計算用）
  weight INTEGER,                         -- kg（適正飲酒量計算用）
  gender TEXT,                            -- male/female/other
  bio TEXT,
  -- XP/レベル関連
  total_xp INTEGER DEFAULT 0,             -- 累計経験値
  level INTEGER DEFAULT 1,                -- 現在レベル
  negative_xp INTEGER DEFAULT 0,          -- 借金XP（記録削除時に蓄積、次回付与時に相殺）
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**特徴:**
- 新規ユーザー登録時にトリガーで自動作成
- RLS: 自分のプロフィールは閲覧・編集可能、イベントメンバーのプロフィールは閲覧可能

**XP/レベルシステム:**
- `total_xp`: 累計経験値（減少しない）
- `level`: 累計XPから算出されるレベル
- `negative_xp`: 記録削除時に蓄積される「借金XP」。次回XP付与時に相殺される

**借金XP（negative_xp）の仕組み:**
1. 記録追加 → +10 XP付与
2. 記録削除 → negative_xp += 10（借金として蓄積、total_xpは減らない）
3. 次の記録追加 → 本来+10だが借金10を相殺 → 実質+0 XP
4. これにより「削除→再追加でXP稼ぎ」を防止しつつ、レベルダウンは発生しない

---

### 2. events（イベント）

飲み会イベントの情報。

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  recording_rule TEXT NOT NULL,          -- self/host_only/consensus
  required_approvals INTEGER DEFAULT 1,  -- consensusモードの必要承認数
  invite_code TEXT UNIQUE NOT NULL,      -- 招待コード（6桁英数字、自動生成）
  host_id UUID NOT NULL,                 -- ホスト（作成者）
  started_at TIMESTAMP WITH TIME ZONE,   -- 開始時刻
  ended_at TIMESTAMP WITH TIME ZONE,     -- 終了時刻（NULL=進行中）
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**フィールド詳細:**
- `recording_rule`: 記録ルールを決定（self/host_only/consensus）
- `required_approvals`: consensusモードで必要な承認数（1人以上、イベント作成時に設定可能）
- `invite_code`: 招待コード（6桁英数字、自動生成、ユニーク）- イベント参加用
- `ended_at`: NULLの場合は進行中、値があれば終了済み

**RLS:**
- 作成: 認証済みユーザーなら誰でも可能
- 閲覧: イベント参加者のみ
- 編集・削除: ホストのみ

---

### 3. event_members（イベントメンバー）

イベントの参加者情報。

```sql
CREATE TABLE public.event_members (
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,                    -- host/manager/member
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,      -- 途中離脱時刻（NULL=参加中）
  PRIMARY KEY (event_id, user_id)
);
```

**役割 (role):**
- `host`: ホスト（イベント作成者）- 全権限
- `manager`: マネージャー（ホストが指定）- 管理権限あり
- `member`: 一般メンバー - 閲覧と自分の記録のみ

**途中離脱:**
- `left_at`がNULLなら参加中
- 値があれば離脱済み（記録は残るが、新規記録は追加できない）

**RLS:**
- 追加: ホスト・マネージャーのみ（またはホストが最初に自分を追加する場合）
- 閲覧: 認証済みユーザー全員（無限再帰回避のため簡略化）
- 更新: ホスト・マネージャー（または自分自身の離脱フラグ）
- 削除: ホスト・マネージャー、または自分自身

**注意:** event_membersのSELECTポリシーを「同じイベントのメンバーのみ」にすると、profilesテーブルのポリシーと相互参照して無限再帰エラーが発生するため、認証済みユーザー全員が閲覧可能なシンプルなポリシーを採用しています。

---

### 4. drink_logs（飲酒記録）

個別の飲酒記録。

```sql
CREATE TABLE public.drink_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,                 -- 記録対象のユーザー
  event_id UUID,                         -- NULL=日常記録
  drink_id TEXT,                         -- デフォルトドリンクID
  drink_name TEXT NOT NULL,
  ml INTEGER NOT NULL,
  abv NUMERIC(5, 2) NOT NULL,            -- アルコール度数%
  pure_alcohol_g NUMERIC(10, 2) NOT NULL, -- 純アルコール量g
  count INTEGER NOT NULL DEFAULT 1,      -- 杯数
  memo TEXT,                             -- 記録時のメモ
  recorded_by_id UUID NOT NULL,          -- 記録者
  status TEXT NOT NULL DEFAULT 'approved', -- pending/approved/rejected
  recorded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**フィールド詳細:**
- `user_id`: 飲んだ人（記録対象）
- `recorded_by_id`: 記録した人（通常は同じだが、host_onlyモードでは管理者が代わりに記録）
- `memo`: 「ここで酔った」「めっちゃ美味しい」などの軽いメモ
- `status`:
  - `pending`: 承認待ち（consensusモード）
  - `approved`: 承認済み
  - `rejected`: 却下（未使用）

**記録ルール別の動作:**

| ルール | 記録者 | user_id | recorded_by_id | status |
|--------|--------|---------|----------------|--------|
| self | 本人のみ | 本人 | 本人 | approved |
| host_only | 管理者のみ | 誰でも | 管理者 | approved |
| consensus | 本人のみ | 本人 | 本人 | pending→approved |

**編集・削除:**
- 編集: 不可（データの信頼性を担保）
- 削除: 可能（本人または管理者）

**RLS:**
- 閲覧: 自分の記録、またはイベント参加者
- 追加: 記録ルールに応じて制御
- 更新: 不可（システムトリガーによるステータス更新のみ）
- 削除: 本人または管理者

---

### 5. drink_log_approvals（承認記録）

consensusモードの承認記録。

```sql
CREATE TABLE public.drink_log_approvals (
  id UUID PRIMARY KEY,
  drink_log_id UUID NOT NULL,
  approved_by_user_id UUID NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(drink_log_id, approved_by_user_id)
);
```

**動作フロー:**
1. ユーザーAが記録を追加（status=pending）
2. ユーザーBが承認ボタンをタップ
3. `drink_log_approvals`に承認レコード追加
4. トリガーが発火し、承認数をチェック
5. 必要数（`required_approvals`）に達したら、`drink_logs.status`を`approved`に自動更新

**制約:**
- 同じユーザーが同じ記録を複数回承認できない（UNIQUE制約）
- 本人の記録は承認できない（RLSで制御）
- pending状態の記録のみ承認可能

**RLS:**
- 閲覧: イベント参加者
- 追加: イベント参加者（ただし本人の記録は除く、pending状態のみ）
- 削除: 自分の承認のみ取り消し可能

---

### 6. memos（メモ）

イベント全体のメモ・日記。

```sql
CREATE TABLE public.memos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID,                         -- NULL=個人メモ
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**用途:**
- イベント全体の感想、翌日の体調など
- 飲酒記録個別のメモは`drink_logs.memo`を使用

**RLS:**
- 閲覧: 自分のメモ、またはイベント参加者
- 追加・編集・削除: 本人のみ

---

### 7. products（公式ドリンクDB）

アプリ内のドリンクカタログ（公式登録商品）。`lib/products.ts` / `stores/products.ts` から参照される。

```sql
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,                   -- 商品ID（文字列）
  category TEXT NOT NULL,                -- DrinkCategory（beer, sake, wine など）
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  ml INTEGER NOT NULL,                   -- 容量 ml
  abv NUMERIC NOT NULL,                  -- アルコール度数%
  emoji TEXT NOT NULL,                   -- 表示用絵文字
  jan_code TEXT,                         -- JANコード（任意）
  price_range TEXT,                      -- 価格帯（任意）
  notes TEXT,                            -- 備考（任意）
  is_official BOOLEAN DEFAULT true,      -- 公式商品フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**インデックス:** `category` / `manufacturer` / `name` にそれぞれ作成。

**RLS:**
- 閲覧: 全ユーザー（`SELECT USING (true)`）
- 追加・更新・削除: ポリシー無し（= 一般ユーザーは書き込み不可、`service role` のみ投入・更新）

---

### 8. account_deletion_requests（アカウント削除リクエスト）

アカウント削除の申請を管理者承認フローで処理するためのテーブル。

```sql
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,          -- 1ユーザーにつき1リクエスト
  status TEXT NOT NULL DEFAULT 'pending',-- pending/approved/completed/cancelled
  reason TEXT,                           -- ユーザーが入力した削除理由（任意）
  requested_at TIMESTAMP WITH TIME ZONE, -- 申請日時
  processed_at TIMESTAMP WITH TIME ZONE, -- 管理者が処理した日時
  admin_note TEXT,                       -- 管理者のメモ
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**ステータス:**
- `pending`: 申請中
- `approved`: 承認済み
- `completed`: 削除完了
- `cancelled`: キャンセル

**制約:** `user_id` に UNIQUE（1ユーザーにつきアクティブなリクエストは1つ）

---

## トリガーとビジネスロジック

### 1. プロフィール自動作成トリガー

```sql
CREATE FUNCTION handle_new_user() ...
CREATE TRIGGER on_auth_user_created ...
```

**動作:**
- 新規ユーザー登録時（`auth.users`にINSERT）
- 自動的に`profiles`テーブルにレコード作成
- メタデータから表示名とアバターを取得

---

### 2. 承認数チェック＆自動承認トリガー

```sql
CREATE FUNCTION auto_approve_drink_log() ...
CREATE TRIGGER trigger_auto_approve_drink_log ...
```

**動作:**
1. `drink_log_approvals`にINSERT（承認追加）
2. 現在の承認数をカウント
3. イベントの`required_approvals`を取得
4. 承認数 >= 必要数 → `drink_logs.status`を`approved`に更新
5. SECURITY DEFINERでRLSをバイパスして更新

---

### 3. updated_at自動更新トリガー

```sql
CREATE FUNCTION update_updated_at_column() ...
```

**対象テーブル:**
- `profiles`
- `events`
- `memos`

**動作:**
- UPDATE時に`updated_at`を自動的にNOW()に更新

---

## インデックス設計

### パフォーマンス最適化のためのインデックス

```sql
-- プロフィール
CREATE INDEX idx_profiles_email ON profiles(email);

-- イベント
CREATE INDEX idx_events_host_id ON events(host_id);
CREATE INDEX idx_events_started_at ON events(started_at DESC);

-- イベントメンバー
CREATE INDEX idx_event_members_user_id ON event_members(user_id);
CREATE INDEX idx_event_members_event_id ON event_members(event_id);

-- 飲酒記録
CREATE INDEX idx_drink_logs_user_id ON drink_logs(user_id);
CREATE INDEX idx_drink_logs_event_id ON drink_logs(event_id);
CREATE INDEX idx_drink_logs_recorded_at ON drink_logs(recorded_at DESC);
CREATE INDEX idx_drink_logs_user_recorded ON drink_logs(user_id, recorded_at DESC);
CREATE INDEX idx_drink_logs_status ON drink_logs(status);

-- 承認記録
CREATE INDEX idx_drink_log_approvals_drink_log_id ON drink_log_approvals(drink_log_id);
CREATE INDEX idx_drink_log_approvals_user_id ON drink_log_approvals(approved_by_user_id);

-- メモ
CREATE INDEX idx_memos_user_id ON memos(user_id);
CREATE INDEX idx_memos_event_id ON memos(event_id);
```

---

## セキュリティ（RLS）

### Row Level Security（RLS）の設計方針

1. **最小権限の原則**: ユーザーは必要最小限のデータのみアクセス可能
2. **イベント単位の分離**: イベントメンバーのみがイベントデータを閲覧
3. **記録ルールの厳密な制御**: 各ルールに応じた権限チェック
4. **本人確認**: 自分のデータは常に閲覧・操作可能
5. **無限再帰の回避**: テーブル間の相互参照によるRLS再帰を防止

### 主要なポリシー

- **プロフィール**: 自分＋イベントに参加しているユーザー閲覧可能
- **イベント**: 参加者のみ閲覧、ホストのみ編集・削除
- **イベントメンバー**: 認証済みユーザーは閲覧可能（無限再帰回避）
- **飲酒記録**: 参加者閲覧、記録ルールに応じて追加権限
- **承認記録**: 本人以外が承認可能、取り消しも可能

### 無限再帰問題と対策

profilesテーブルで「イベントメンバーのプロフィールを閲覧可能」なポリシーと、event_membersテーブルで「同じイベントのメンバーのみ閲覧可能」なポリシーを両方設定すると、PostgreSQLのRLSチェック時に相互参照が発生し、`infinite recursion detected in policy`エラーが発生します。

**対策:**
- event_membersのSELECTポリシーを`USING (true)`（認証済みユーザー全員閲覧可能）に簡略化
- これにより再帰が発生せず、profilesのポリシーが正常に動作

---

## UI設計への示唆

### イベント作成画面
- タイトル、説明入力
- 記録ルール選択（self/host_only/consensus）
- consensusの場合、必要承認数を設定（1〜参加者数）

### 飲酒記録追加画面
- ドリンク選択（プリセットまたはカスタム）
- 杯数入力
- メモ入力欄（オプション）
- host_onlyの場合: 管理者が「誰の記録か」を選択

### 承認待ち画面（consensus）
- pending状態の記録一覧
- 承認ボタン（本人の記録は非表示）
- 現在の承認数 / 必要数を表示

### ランキング画面
- 総杯数ランキング
- 純アルコール量ランキング
- 平均ペースランキング
- ドリンク別ランキング
- 時系列グラフ

---

## 招待機能（実装済み）

### 3つの招待方法

1. **QRコード表示**
   - イベント詳細画面から招待画面へ
   - QRコードを生成（`drinkmanagement://events/join?code={invite_code}`）
   - 参加者がアプリのカメラでスキャン

2. **LINE共有**（必須実装）
   - 招待リンクをLINEで共有
   - `https://line.me/R/msg/text/?{招待メッセージ}`
   - リンクタップでアプリが開く

3. **招待コード入力**
   - 6桁の英数字コードを口頭で伝える
   - アプリ内でコード入力画面から参加

### 実装詳細

- `events.invite_code`: 自動生成（6桁英数字、ユニーク）
- ディープリンク: `drinkmanagement://events/join?code=ABC123`
- 参加フロー: リンク → 参加確認画面 → イベント詳細画面

## 今後の拡張性

### 統計・分析
- ユーザーごとの飲酒傾向
- イベントごとの比較
- 健康アドバイス

### 通知機能
- 承認リクエストのプッシュ通知
- イベント開始・終了通知

---

## まとめ

このDB設計は以下の要件を満たしています：

✅ **3つの記録ルール**を完全にサポート
✅ **編集不可・削除可能**の仕様を実現
✅ **記録者のメモ**をサポート
✅ **途中離脱**に対応
✅ **承認フロー**を自動化
✅ **RLS**で厳格なセキュリティ
✅ **パフォーマンス**を考慮したインデックス

次のステップ: UI設計とフロントエンド実装に進んでください。
