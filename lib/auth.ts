import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { User } from '@/types';
import { getUserWithProfile } from './database';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export interface OAuthResponse extends AuthResponse {
  /** ユーザーが認証フローを途中で閉じた場合 true（エラーではない） */
  cancelled?: boolean;
}

// OAuth 後にアプリへ戻るためのディープリンク（Supabaseの Redirect URLs に登録が必要）
const OAUTH_REDIRECT_URL = 'drinkmanagement://auth/callback';

/**
 * Supabaseの認証ユーザーから、DBプロフィール込みの User を組み立てる
 */
async function buildUserFromSupabase(
  supaUser: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    created_at?: string;
    user_metadata?: Record<string, any>;
  }
): Promise<User> {
  const { user: dbUser } = await getUserWithProfile(supaUser.id);
  if (dbUser) {
    return { ...dbUser, emailConfirmed: !!supaUser.email_confirmed_at };
  }
  const meta = supaUser.user_metadata ?? {};
  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    emailConfirmed: !!supaUser.email_confirmed_at,
    displayName: meta.display_name || meta.full_name || meta.name || 'ユーザー',
    avatar: meta.avatar_url || meta.picture,
    profile: {},
    createdAt: supaUser.created_at ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * OAuth リダイレクトURLからセッションを確立する。
 * PKCE（?code=...）と implicit（#access_token=...）の両方に対応。
 */
async function establishSessionFromUrl(url: string): Promise<AuthResponse> {
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get('code');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { user: null, error: { message: error.message, code: error.code } };
    if (!data.user) return { user: null, error: { message: '認証に失敗しました' } };
    return { user: await buildUserFromSupabase(data.user), error: null };
  }

  // implicit（hash fragment）フォールバック
  let accessToken = urlObj.searchParams.get('access_token');
  let refreshToken = urlObj.searchParams.get('refresh_token');
  if (!accessToken && urlObj.hash) {
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    accessToken = hashParams.get('access_token');
    refreshToken = hashParams.get('refresh_token');
  }
  if (!accessToken || !refreshToken) {
    return { user: null, error: { message: '認証情報が取得できませんでした' } };
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return { user: null, error: { message: error.message, code: error.code } };
  if (!data.user) return { user: null, error: { message: '認証に失敗しました' } };
  return { user: await buildUserFromSupabase(data.user), error: null };
}

/**
 * Googleでログイン / 新規登録（共通authのWeb側と同一プロバイダ）
 * ブラウザセッションで完結するため、_layout のディープリンク処理とは競合しない。
 */
export async function signInWithGoogle(): Promise<OAuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) return { user: null, error: { message: error.message, code: error.code } };
    if (!data?.url) return { user: null, error: { message: 'Google認証の開始に失敗しました' } };

    const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);

    // キャンセル/閉じた場合はエラー扱いしない
    if (result.type !== 'success' || !result.url) {
      return { user: null, error: null, cancelled: true };
    }

    return await establishSessionFromUrl(result.url);
  } catch (err: any) {
    return { user: null, error: { message: err.message || 'Googleログインに失敗しました' } };
  }
}

/**
 * メールアドレスとパスワードでサインアップ
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://make-it-tech.com/apps/drink-management/auth-callback',
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { user: null, error: { message: 'サインアップに失敗しました' } };
    }

    // Userオブジェクトを作成
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      emailConfirmed: !!data.user.email_confirmed_at,
      displayName: displayName,
      profile: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * メールアドレスとパスワードでログイン
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { user: null, error: { message: 'ログインに失敗しました' } };
    }

    // データベースから完全なユーザー情報を取得
    const { user: dbUser, error: dbError } = await getUserWithProfile(data.user.id);

    if (dbUser) {
      // データベースから取得した情報を使用（displayNameChangedAt含む）
      return {
        user: {
          ...dbUser,
          emailConfirmed: !!data.user.email_confirmed_at,
        },
        error: null,
      };
    }

    // データベースにプロフィールがない場合はフォールバック
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      emailConfirmed: !!data.user.email_confirmed_at,
      displayName: data.user.user_metadata?.display_name || 'ユーザー',
      avatar: data.user.user_metadata?.avatar_url,
      profile: {},
      createdAt: data.user.created_at,
      updatedAt: new Date().toISOString(),
    };

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * ログアウト
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 現在のセッションを取得
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return { user: null, error };
    }

    // データベースから完全なユーザー情報を取得
    const { user: dbUser, error: dbError } = await getUserWithProfile(data.session.user.id);

    if (dbUser) {
      // データベースから取得した情報を使用（displayNameChangedAt含む）
      return {
        user: {
          ...dbUser,
          emailConfirmed: !!data.session.user.email_confirmed_at,
        },
        error: null,
      };
    }

    // データベースにプロフィールがない場合はフォールバック
    const user: User = {
      id: data.session.user.id,
      email: data.session.user.email!,
      emailConfirmed: !!data.session.user.email_confirmed_at,
      displayName: data.session.user.user_metadata?.display_name || 'ユーザー',
      avatar: data.session.user.user_metadata?.avatar_url,
      profile: {},
      createdAt: data.session.user.created_at,
      updatedAt: new Date().toISOString(),
    };

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err };
  }
}

/**
 * パスワードリセットメールを送信
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://make-it-tech.com/apps/drink-management/auth-callback',
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * ディープリンクからの認証トークンを処理
 */
export async function handleAuthCallback(url: string): Promise<AuthResponse> {
  try {
    // URLからトークンを抽出（query paramsとhash fragmentの両方をチェック）
    const urlObj = new URL(url);
    let accessToken = urlObj.searchParams.get('access_token');
    let refreshToken = urlObj.searchParams.get('refresh_token');

    // hash fragmentにトークンがある場合（Supabaseのデフォルト形式）
    if (!accessToken && urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }

    if (!accessToken || !refreshToken) {
      return { user: null, error: { message: '認証トークンが見つかりません' } };
    }

    // Supabaseセッションを設定
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { user: null, error: { message: '認証に失敗しました' } };
    }

    // データベースから完全なユーザー情報を取得
    const { user: dbUser, error: dbError } = await getUserWithProfile(data.user.id);

    if (dbUser) {
      // データベースから取得した情報を使用（displayNameChangedAt含む）
      return {
        user: {
          ...dbUser,
          emailConfirmed: !!data.user.email_confirmed_at,
        },
        error: null,
      };
    }

    // データベースにプロフィールがない場合はフォールバック
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      emailConfirmed: !!data.user.email_confirmed_at,
      displayName: data.user.user_metadata?.display_name || 'ユーザー',
      avatar: data.user.user_metadata?.avatar_url,
      profile: {},
      createdAt: data.user.created_at,
      updatedAt: new Date().toISOString(),
    };

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * メール確認を再送信
 */
export async function resendConfirmationEmail(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: 'https://make-it-tech.com/apps/drink-management/auth-callback',
      },
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * メールアドレスを変更
 * 新しいメールアドレスに確認メールが送信されます
 */
export async function updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    }, {
      emailRedirectTo: 'https://make-it-tech.com/apps/drink-management/auth-callback',
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * パスワードを変更
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}
