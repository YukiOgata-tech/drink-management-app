-- =====================================================
-- Drink Management App - Database Schema
-- =====================================================

-- 既存のテーブルがあれば削除（開発環境のみ）
DROP TABLE IF EXISTS public.drink_log_approvals CASCADE;
DROP TABLE IF EXISTS public.memos CASCADE;
DROP TABLE IF EXISTS public.drink_logs CASCADE;
DROP TABLE IF EXISTS public.event_members CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- 1. プロフィールテーブル
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  birthday DATE, -- 誕生日
  height INTEGER CHECK (height > 0 AND height < 300), -- cm
  weight INTEGER CHECK (weight > 0 AND weight < 500), -- kg
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  bio TEXT,
  -- XP/レベル関連
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  negative_xp INTEGER NOT NULL DEFAULT 0 CHECK (negative_xp >= 0), -- 借金XP（記録削除時に蓄積）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- プロフィールテーブルのインデックス
CREATE INDEX idx_profiles_email ON public.profiles(email);

COMMENT ON TABLE public.profiles IS 'ユーザープロフィール情報';
COMMENT ON COLUMN public.profiles.birthday IS '誕生日（年齢計算用）';
COMMENT ON COLUMN public.profiles.gender IS '性別（適正飲酒量計算用）';

-- =====================================================
-- 2. イベントテーブル
-- =====================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  recording_rule TEXT NOT NULL CHECK (recording_rule IN ('self', 'host_only', 'consensus')),
  required_approvals INTEGER NOT NULL DEFAULT 1 CHECK (required_approvals > 0),
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 6)),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- イベントテーブルのインデックス
CREATE INDEX idx_events_host_id ON public.events(host_id);
CREATE INDEX idx_events_started_at ON public.events(started_at DESC);
CREATE INDEX idx_events_invite_code ON public.events(invite_code);

COMMENT ON TABLE public.events IS '飲み会イベント情報';
COMMENT ON COLUMN public.events.recording_rule IS '記録ルール: self=個人管理, host_only=管理者記録管理, consensus=ユーザー間同意制';
COMMENT ON COLUMN public.events.required_approvals IS 'consensusモードで必要な承認数（デフォルト1人以上）';
COMMENT ON COLUMN public.events.invite_code IS '招待コード（6桁英数字、自動生成、ユニーク）';

-- =====================================================
-- 3. イベントメンバーテーブル
-- =====================================================
CREATE TABLE public.event_members (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('host', 'manager', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE, -- 途中離脱時刻（NULLなら参加中）
  PRIMARY KEY (event_id, user_id)
);

-- イベントメンバーテーブルのインデックス
CREATE INDEX idx_event_members_user_id ON public.event_members(user_id);
CREATE INDEX idx_event_members_event_id ON public.event_members(event_id);

COMMENT ON TABLE public.event_members IS 'イベント参加者情報';
COMMENT ON COLUMN public.event_members.role IS '役割: host=ホスト, manager=マネージャー（管理者権限）, member=一般メンバー';
COMMENT ON COLUMN public.event_members.left_at IS '離脱時刻（NULLの場合は参加中）';

-- =====================================================
-- 4. 飲酒記録テーブル
-- =====================================================
CREATE TABLE public.drink_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  drink_id TEXT, -- デフォルトドリンクID（default_drinks.jsonのID）
  drink_name TEXT NOT NULL,
  ml INTEGER NOT NULL CHECK (ml > 0),
  abv NUMERIC(5, 2) NOT NULL CHECK (abv >= 0 AND abv <= 100), -- アルコール度数 %
  pure_alcohol_g NUMERIC(10, 2) NOT NULL CHECK (pure_alcohol_g >= 0), -- 純アルコール量 g
  count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
  memo TEXT, -- 記録時のメモ（「ここで酔った」など）
  recorded_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- 誰が記録したか
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 飲酒記録テーブルのインデックス
CREATE INDEX idx_drink_logs_user_id ON public.drink_logs(user_id);
CREATE INDEX idx_drink_logs_event_id ON public.drink_logs(event_id);
CREATE INDEX idx_drink_logs_recorded_at ON public.drink_logs(recorded_at DESC);
CREATE INDEX idx_drink_logs_user_recorded ON public.drink_logs(user_id, recorded_at DESC);
CREATE INDEX idx_drink_logs_status ON public.drink_logs(status);

COMMENT ON TABLE public.drink_logs IS '飲酒記録';
COMMENT ON COLUMN public.drink_logs.memo IS '記録時の個別メモ（酔い具合など）';
COMMENT ON COLUMN public.drink_logs.recorded_by_id IS '記録者（host_onlyモードで管理者が他人の記録を追加する場合に使用）';
COMMENT ON COLUMN public.drink_logs.status IS '承認ステータス: pending=承認待ち, approved=承認済み, rejected=却下';

-- =====================================================
-- 5. 飲酒記録承認テーブル（新規）
-- =====================================================
CREATE TABLE public.drink_log_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_log_id UUID NOT NULL REFERENCES public.drink_logs(id) ON DELETE CASCADE,
  approved_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(drink_log_id, approved_by_user_id) -- 同じユーザーが複数回承認できないように
);

-- 承認テーブルのインデックス
CREATE INDEX idx_drink_log_approvals_drink_log_id ON public.drink_log_approvals(drink_log_id);
CREATE INDEX idx_drink_log_approvals_user_id ON public.drink_log_approvals(approved_by_user_id);

COMMENT ON TABLE public.drink_log_approvals IS 'ユーザー間同意制の承認記録';
COMMENT ON COLUMN public.drink_log_approvals.approved_by_user_id IS '承認したユーザー';

-- =====================================================
-- 6. メモテーブル（イベント全体のメモ用）
-- =====================================================
CREATE TABLE public.memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- メモテーブルのインデックス
CREATE INDEX idx_memos_user_id ON public.memos(user_id);
CREATE INDEX idx_memos_event_id ON public.memos(event_id);

COMMENT ON TABLE public.memos IS 'イベント全体のメモ・日記（飲酒記録個別のメモはdrink_logs.memoを使用）';

-- =====================================================
-- トリガー: updated_at を自動更新
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON public.memos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- トリガー: 新規ユーザー登録時にプロフィールを自動作成
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'ユーザー'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersテーブルのトリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- トリガー: 承認数が達したら自動的にapprovedに変更
-- =====================================================
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_approve_drink_log
  AFTER INSERT ON public.drink_log_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_drink_log();

COMMENT ON FUNCTION public.auto_approve_drink_log IS 'consensusモードで必要な承認数に達したら自動的にapprovedに変更';

-- =====================================================
-- トリガー: イベント作成時にホストを自動的にメンバーとして追加
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_add_host_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (NEW.id, NEW.host_id, 'host');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_add_host_as_member
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_host_as_member();

COMMENT ON FUNCTION public.auto_add_host_as_member IS 'イベント作成時にホストを自動的にメンバーとして追加（RLSをバイパス）';

-- =====================================================
-- RPC関数: イベント作成（RLSをバイパス、イベントデータを返す）
-- =====================================================
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

  -- イベントを作成
  INSERT INTO public.events (title, description, recording_rule, required_approvals, started_at, host_id)
  VALUES (p_title, p_description, p_recording_rule, p_required_approvals, p_started_at, v_user_id)
  RETURNING * INTO v_event;

  -- ホストをメンバーとして追加
  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event.id, v_user_id, 'host')
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_event_with_host IS 'イベントを作成しホストをメンバーとして追加（RLSをバイパス、イベントデータを返す）';
