-- =============================================
-- Supabase Storage: avatars バケット作成
-- =============================================
-- Supabase ダッシュボード > SQL Editor で実行してください。
-- =============================================

-- 1. avatars バケットを作成（publicアクセス許可）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,                                         -- 最大 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']  -- 許可する画像形式
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. RLS ポリシーを設定
-- =============================================

-- 誰でもアバターを閲覧可能（publicバケット）
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 自分のフォルダにのみアップロード可能（パス: {userId}/avatar.*)
CREATE POLICY "avatars_user_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 自分のアバターのみ上書き可能
CREATE POLICY "avatars_user_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 自分のアバターのみ削除可能
CREATE POLICY "avatars_user_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
