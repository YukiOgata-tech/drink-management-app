-- =====================================================
-- Drink Management App - Row Level Security (RLS)
-- =====================================================

-- RLSを有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_log_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. プロフィールテーブルのRLSポリシー
-- =====================================================

-- 自分のプロフィールは読み取り可能
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- イベントメンバーのプロフィールは閲覧可能
CREATE POLICY "Users can view event members profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em1
      INNER JOIN public.event_members em2 ON em1.event_id = em2.event_id
      WHERE em1.user_id = auth.uid()
        AND em2.user_id = public.profiles.id
    )
  );

-- 自分のプロフィールは更新可能
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 新規登録時の挿入は認証済みユーザーのみ（トリガーで自動作成されるため通常使用しない）
CREATE POLICY "Authenticated users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. イベントテーブルのRLSポリシー
-- =====================================================

-- イベントメンバーはイベントを閲覧可能
CREATE POLICY "Event members can view events"
  ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = events.id
        AND event_members.user_id = auth.uid()
    )
  );

-- 認証済みユーザーはイベントを作成可能
CREATE POLICY "Authenticated users can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_id
  );

-- ホストはイベントを更新可能
CREATE POLICY "Host can update events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- ホストはイベントを削除可能
CREATE POLICY "Host can delete events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = host_id);

-- =====================================================
-- 3. イベントメンバーテーブルのRLSポリシー
-- =====================================================

-- イベントメンバーは同じイベントのメンバーを閲覧可能
CREATE POLICY "Event members can view other members"
  ON public.event_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
    )
  );

-- ホストとマネージャーはメンバーを追加可能
CREATE POLICY "Host and managers can add members"
  ON public.event_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('host', 'manager')
    )
    OR
    -- ホストが最初のメンバーとして自分を追加する場合
    (
      role = 'host'
      AND user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.event_id = event_id
      )
    )
  );

-- ホストとマネージャーはメンバーの役割を更新可能（離脱フラグ含む）
CREATE POLICY "Host and managers can update members"
  ON public.event_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('host', 'manager')
    )
    OR
    -- 自分自身の離脱（left_atのみ更新可能）
    user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('host', 'manager')
    )
    OR
    user_id = auth.uid()
  );

-- ホストとマネージャーはメンバーを削除可能、または自分自身は退出可能
CREATE POLICY "Host and managers can remove members or users can leave"
  ON public.event_members
  FOR DELETE
  USING (
    -- ホストまたはマネージャーによる削除
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('host', 'manager')
    )
    OR
    -- 自分自身の退出
    user_id = auth.uid()
  );

-- =====================================================
-- 4. 飲酒記録テーブルのRLSポリシー
-- =====================================================

-- 自分の記録は閲覧可能
CREATE POLICY "Users can view own drink logs"
  ON public.drink_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- イベント参加者は同じイベントの記録を閲覧可能
CREATE POLICY "Event members can view event drink logs"
  ON public.drink_logs
  FOR SELECT
  USING (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = drink_logs.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- 記録の追加（記録ルールに応じて制御）
CREATE POLICY "Users can create drink logs based on recording rule"
  ON public.drink_logs
  FOR INSERT
  WITH CHECK (
    -- 日常記録（イベント外）は自分の記録のみ追加可能
    (
      event_id IS NULL
      AND auth.uid() = user_id
      AND auth.uid() = recorded_by_id
    )
    OR
    -- Self: 自分の記録を追加可能
    EXISTS (
      SELECT 1 FROM public.events e
      INNER JOIN public.event_members em ON e.id = em.event_id
      WHERE e.id = event_id
        AND em.user_id = auth.uid()
        AND e.recording_rule = 'self'
        AND auth.uid() = user_id
        AND auth.uid() = recorded_by_id
    )
    OR
    -- Host Only: 管理者のみが記録追加可能（他人の記録も追加できる）
    EXISTS (
      SELECT 1 FROM public.events e
      INNER JOIN public.event_members em ON e.id = em.event_id
      WHERE e.id = event_id
        AND em.user_id = auth.uid()
        AND e.recording_rule = 'host_only'
        AND em.role IN ('host', 'manager')
        AND auth.uid() = recorded_by_id
    )
    OR
    -- Consensus: 自分の記録を追加可能（pending状態で）
    EXISTS (
      SELECT 1 FROM public.events e
      INNER JOIN public.event_members em ON e.id = em.event_id
      WHERE e.id = event_id
        AND em.user_id = auth.uid()
        AND e.recording_rule = 'consensus'
        AND auth.uid() = user_id
        AND auth.uid() = recorded_by_id
        AND status = 'pending'
    )
  );

-- 記録の更新は不可（編集不可の要件）
-- ただし、consensusモードでの承認ステータス変更のみ許可
CREATE POLICY "Only status updates allowed for consensus approval"
  ON public.drink_logs
  FOR UPDATE
  USING (
    -- ステータスの更新のみ許可（システムトリガーによる自動承認用）
    FALSE
  )
  WITH CHECK (FALSE);

-- 記録の削除は可能
CREATE POLICY "Users can delete own drink logs"
  ON public.drink_logs
  FOR DELETE
  USING (
    -- 自分の記録は削除可能
    auth.uid() = user_id
    OR
    -- 管理者は削除可能
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = drink_logs.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host', 'manager')
    )
  );

-- =====================================================
-- 5. 飲酒記録承認テーブルのRLSポリシー
-- =====================================================

-- イベントメンバーは同じイベントの承認を閲覧可能
CREATE POLICY "Event members can view approvals"
  ON public.drink_log_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drink_logs dl
      INNER JOIN public.event_members em ON dl.event_id = em.event_id
      WHERE dl.id = drink_log_approvals.drink_log_id
        AND em.user_id = auth.uid()
    )
  );

-- イベントメンバーは承認を追加可能（本人の記録は承認できない）
CREATE POLICY "Event members can approve others drink logs"
  ON public.drink_log_approvals
  FOR INSERT
  WITH CHECK (
    -- consensusモードのイベント
    EXISTS (
      SELECT 1 FROM public.drink_logs dl
      INNER JOIN public.events e ON dl.event_id = e.id
      INNER JOIN public.event_members em ON e.id = em.event_id
      WHERE dl.id = drink_log_id
        AND e.recording_rule = 'consensus'
        AND em.user_id = auth.uid()
        AND dl.user_id != auth.uid() -- 本人の記録は承認できない
        AND dl.status = 'pending' -- pending状態のみ承認可能
    )
    AND auth.uid() = approved_by_user_id
  );

-- 承認の取り消し（削除）は可能
CREATE POLICY "Users can delete own approvals"
  ON public.drink_log_approvals
  FOR DELETE
  USING (auth.uid() = approved_by_user_id);

-- =====================================================
-- 6. メモテーブルのRLSポリシー
-- =====================================================

-- 自分のメモは閲覧可能
CREATE POLICY "Users can view own memos"
  ON public.memos
  FOR SELECT
  USING (auth.uid() = user_id);

-- イベント参加者は同じイベントのメモを閲覧可能
CREATE POLICY "Event members can view event memos"
  ON public.memos
  FOR SELECT
  USING (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.event_id = memos.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- 認証済みユーザーは自分のメモを作成可能
CREATE POLICY "Users can create own memos"
  ON public.memos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分のメモは更新可能
CREATE POLICY "Users can update own memos"
  ON public.memos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分のメモは削除可能
CREATE POLICY "Users can delete own memos"
  ON public.memos
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 特別なポリシー: システムトリガーによるステータス更新を許可
-- =====================================================

-- トリガー関数がステータスを更新できるようにする
-- （RLSをバイパスしてSECURITY DEFINERで実行）
CREATE OR REPLACE FUNCTION public.auto_approve_drink_log()
RETURNS TRIGGER AS $$
DECLARE
  required_count INTEGER;
  current_count INTEGER;
BEGIN
  -- イベントの必要承認数を取得
  SELECT e.required_approvals INTO required_count
  FROM public.events e
  INNER JOIN public.drink_logs dl ON dl.event_id = e.id
  WHERE dl.id = NEW.drink_log_id
    AND e.recording_rule = 'consensus';

  -- 承認数が設定されていない場合はスキップ
  IF required_count IS NULL THEN
    RETURN NEW;
  END IF;

  -- 現在の承認数を取得
  SELECT COUNT(*) INTO current_count
  FROM public.drink_log_approvals
  WHERE drink_log_id = NEW.drink_log_id;

  -- 必要数に達したら承認済みに変更
  IF current_count >= required_count THEN
    UPDATE public.drink_logs
    SET status = 'approved'
    WHERE id = NEW.drink_log_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINERでRLSをバイパス

-- =====================================================
-- 完了メッセージ
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been successfully applied to all tables.';
END $$;
