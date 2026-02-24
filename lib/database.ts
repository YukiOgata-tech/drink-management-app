import { supabase } from './supabase';
import { User, UserProfile } from '@/types';

export interface DatabaseError {
  message: string;
  code?: string;
}

export interface ProfileResponse {
  profile: UserProfile | null;
  error: DatabaseError | null;
}

/**
 * プロフィール情報を取得
 */
export async function getProfile(userId: string): Promise<ProfileResponse> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('birthday, height, weight, gender, bio, total_xp, level, negative_xp')
      .eq('id', userId)
      .single();

    if (error) {
      return { profile: null, error: { message: error.message, code: error.code } };
    }

    const profile: UserProfile = {
      birthday: data.birthday || undefined,
      height: data.height || undefined,
      weight: data.weight || undefined,
      gender: data.gender || undefined,
      bio: data.bio || undefined,
      totalXP: data.total_xp ?? 0,
      level: data.level ?? 1,
      negativeXP: data.negative_xp ?? 0,
    };

    return { profile, error: null };
  } catch (err: any) {
    return { profile: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * プロフィール情報を更新
 */
export async function updateProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        birthday: profile.birthday,
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        bio: profile.bio,
      })
      .eq('id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 完全なユーザー情報を取得（プロフィール含む）
 */
export async function getUserWithProfile(userId: string): Promise<{
  user: User | null;
  error: DatabaseError | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    const user: User = {
      id: data.id,
      email: data.email,
      emailConfirmed: true, // DBから取得した場合は確認済みとみなす
      displayName: data.display_name,
      displayNameChangedAt: data.display_name_changed_at || undefined,
      avatar: data.avatar || undefined,
      profile: {
        birthday: data.birthday || undefined,
        height: data.height || undefined,
        weight: data.weight || undefined,
        gender: data.gender || undefined,
        bio: data.bio || undefined,
        totalXP: data.total_xp ?? 0,
        level: data.level ?? 1,
        negativeXP: data.negative_xp ?? 0,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 誕生日から年齢を計算
 */
export function calculateAge(birthday: string | undefined): number {
  if (!birthday) return 0;

  const birthDate = new Date(birthday);

  // 無効な日付の場合
  if (isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * 表示名を更新（1日1回制限付き）
 */
export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<{ error: DatabaseError | null; changedAt?: string }> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        display_name_changed_at: now,
      })
      .eq('id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null, changedAt: now };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 表示名変更が可能かチェック（1日1回制限）
 */
export function canChangeDisplayName(displayNameChangedAt?: string): {
  canChange: boolean;
  nextChangeAt?: Date;
  hoursRemaining?: number;
} {
  if (!displayNameChangedAt) {
    return { canChange: true };
  }

  const lastChanged = new Date(displayNameChangedAt);
  const now = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const nextChangeAt = new Date(lastChanged.getTime() + oneDayInMs);

  if (now >= nextChangeAt) {
    return { canChange: true };
  }

  const msRemaining = nextChangeAt.getTime() - now.getTime();
  const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));

  return {
    canChange: false,
    nextChangeAt,
    hoursRemaining,
  };
}

/**
 * アバター画像をSupabase Storageにアップロードしてプロフィールを更新
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string
): Promise<{ url: string | null; error: DatabaseError | null }> {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const ext = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const filename = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });

    if (uploadError) {
      return { url: null, error: { message: uploadError.message } };
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);

    const { error: dbError } = await updateAvatar(userId, urlData.publicUrl);
    if (dbError) {
      return { url: null, error: dbError };
    }

    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: { message: err.message || 'アップロードに失敗しました' } };
  }
}

/**
 * アバターURLを更新
 */
export async function updateAvatar(
  userId: string,
  avatarUrl: string
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar: avatarUrl })
      .eq('id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}
