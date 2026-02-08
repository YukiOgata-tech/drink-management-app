-- アカウント削除リクエストテーブル
-- 管理者がSupabaseコンソールで確認・処理する

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  reason TEXT, -- ユーザーが入力した削除理由（任意）
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE, -- 管理者が処理した日時
  admin_note TEXT, -- 管理者のメモ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id) -- 1ユーザーにつき1つのアクティブなリクエストのみ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.account_deletion_requests(status);

-- RLSポリシー
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のリクエストのみ閲覧可能
CREATE POLICY "Users can view own deletion request"
  ON public.account_deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のリクエストを作成可能
CREATE POLICY "Users can create own deletion request"
  ON public.account_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のリクエストをキャンセル可能（pendingの場合のみ）
CREATE POLICY "Users can cancel own pending deletion request"
  ON public.account_deletion_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- コメント
COMMENT ON TABLE public.account_deletion_requests IS 'アカウント削除リクエスト（管理者承認フロー）';
COMMENT ON COLUMN public.account_deletion_requests.status IS 'pending=申請中, approved=承認済み, completed=削除完了, cancelled=キャンセル';
COMMENT ON COLUMN public.account_deletion_requests.reason IS 'ユーザーが入力した削除理由';
COMMENT ON COLUMN public.account_deletion_requests.admin_note IS '管理者のメモ（処理内容など）';
