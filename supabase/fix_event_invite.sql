-- =====================================================
-- イベント招待機能の修正SQL
-- Supabase Dashboard > SQL Editor で実行してください
-- =====================================================

-- =====================================================
-- 0. invite_code カラムの追加（存在しない場合）
-- =====================================================

-- invite_codeカラムを追加
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 既存のイベントに招待コードを生成
UPDATE public.events
SET invite_code = upper(substring(md5(random()::text || id::text) from 1 for 6))
WHERE invite_code IS NULL;

-- NOT NULL制約を追加（既存データに値を設定した後）
ALTER TABLE public.events
ALTER COLUMN invite_code SET NOT NULL;

-- デフォルト値を設定（新規作成時に自動生成）
ALTER TABLE public.events
ALTER COLUMN invite_code SET DEFAULT upper(substring(md5(random()::text) from 1 for 6));

-- =====================================================
-- 1. 招待コードでイベントを検索できるようにするRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（存在しない場合はエラーになるので無視してOK）
DROP POLICY IF EXISTS "Authenticated users can lookup events by invite code" ON public.events;

-- 認証済みユーザーは招待コードでイベントを検索可能
CREATE POLICY "Authenticated users can lookup events by invite code"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (invite_code IS NOT NULL);

-- =====================================================
-- 2. ユーザーが自分自身をメンバーとして追加できるようにする
-- =====================================================

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Host and managers can add members" ON public.event_members;

-- ホストとマネージャーはメンバーを追加可能、または認証済みユーザーは自分自身をメンバーとして追加可能
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
    OR
    -- 招待コードでの参加: ユーザーは自分自身をメンバーとして追加可能
    (
      role = 'member'
      AND user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.event_id = event_id
          AND em.user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 3. イベント作成RPC関数の確認・再作成
-- =====================================================

-- RPC関数を再作成（SECURITY DEFINERでRLSをバイパス）
CREATE OR REPLACE FUNCTION public.create_event_with_host(
  p_title TEXT,
  p_description TEXT,
  p_recording_rule TEXT,
  p_required_approvals INTEGER,
  p_started_at TIMESTAMP WITH TIME ZONE
)
RETURNS public.events AS $$
DECLARE
  v_event public.events;
  v_user_id UUID;
BEGIN
  -- 現在の認証ユーザーを取得
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- イベントを作成（invite_codeはDEFAULT値で自動生成）
  INSERT INTO public.events (
    title,
    description,
    recording_rule,
    required_approvals,
    started_at,
    host_id
  )
  VALUES (
    p_title,
    p_description,
    p_recording_rule,
    p_required_approvals,
    p_started_at,
    v_user_id
  )
  RETURNING * INTO v_event;

  -- ホストをメンバーとして追加
  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event.id, v_user_id, 'host')
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. 動作確認用クエリ
-- =====================================================

-- イベントテーブルの構造確認
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 完了メッセージ
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Event invite fix has been applied successfully!';
END $$;
