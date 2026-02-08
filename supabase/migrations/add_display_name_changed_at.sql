-- 表示名変更日時カラムを追加（1日1回制限用）
-- このマイグレーションは既存のデータベースに適用してください

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name_changed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.profiles.display_name_changed_at IS '表示名最終変更日時（1日1回制限用）';
