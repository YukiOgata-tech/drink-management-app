/**
 * エラーメッセージのユーザーフレンドリー化
 * Supabaseや一般的なエラーコードを日本語のわかりやすいメッセージに変換
 */

// Supabase/PostgreSQLエラーコードのマッピング
const ERROR_CODES: Record<string, string> = {
  // 認証関連
  'invalid_credentials': 'メールアドレスまたはパスワードが正しくありません',
  'email_not_confirmed': 'メールアドレスの確認が完了していません。確認メールをご確認ください',
  'user_not_found': 'ユーザーが見つかりません',
  'email_exists': 'このメールアドレスは既に登録されています',
  'weak_password': 'パスワードが弱すぎます。8文字以上で設定してください',
  'invalid_email': 'メールアドレスの形式が正しくありません',

  // PostgreSQL エラーコード
  '23505': 'このデータは既に登録されています', // unique_violation
  '23503': '関連するデータが見つかりません', // foreign_key_violation
  '23502': '必須項目が入力されていません', // not_null_violation
  '42501': 'この操作を行う権限がありません', // insufficient_privilege
  '42P01': 'データが見つかりません', // undefined_table
  'PGRST116': 'データが見つかりません', // single row not found
  'PGRST301': 'データが見つかりません',

  // ネットワーク関連
  'network_error': 'ネットワークに接続できません。接続状況をご確認ください',
  'timeout': '通信がタイムアウトしました。もう一度お試しください',
  'fetch_error': 'サーバーに接続できません。ネットワーク接続をご確認ください',

  // 一般的なエラー
  'unknown': '予期しないエラーが発生しました。しばらくしてからもう一度お試しください',
};

// エラーメッセージのパターンマッチング
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /network/i, message: ERROR_CODES.network_error },
  { pattern: /timeout/i, message: ERROR_CODES.timeout },
  { pattern: /fetch/i, message: ERROR_CODES.fetch_error },
  { pattern: /duplicate key/i, message: ERROR_CODES['23505'] },
  { pattern: /violates unique constraint/i, message: ERROR_CODES['23505'] },
  { pattern: /violates foreign key constraint/i, message: ERROR_CODES['23503'] },
  { pattern: /not null violation/i, message: ERROR_CODES['23502'] },
  { pattern: /permission denied/i, message: ERROR_CODES['42501'] },
  { pattern: /JSON object requested, multiple .* rows returned/i, message: '複数のデータが見つかりました' },
];

// 具体的なコンテキスト別エラーメッセージ
export const CONTEXT_ERRORS = {
  // イベント関連
  EVENT_NOT_FOUND: 'イベントが見つかりません',
  EVENT_ALREADY_ENDED: 'このイベントは既に終了しています',
  EVENT_ALREADY_JOINED: '既にこのイベントに参加しています',
  EVENT_JOIN_FAILED: 'イベントへの参加に失敗しました',
  EVENT_CREATE_FAILED: 'イベントの作成に失敗しました',
  EVENT_LOAD_FAILED: 'イベントの読み込みに失敗しました',

  // 飲酒記録関連
  DRINK_LOG_CREATE_FAILED: '記録の保存に失敗しました',
  DRINK_LOG_DELETE_FAILED: '記録の削除に失敗しました',
  DRINK_LOG_OFFLINE_QUEUED: 'オフラインのため記録を保存しました。オンライン復帰後に自動で同期されます',
  DRINK_LOG_SYNC_FAILED: '記録の同期に失敗しました',

  // 認証関連
  LOGIN_REQUIRED: 'この操作にはログインが必要です',
  SESSION_EXPIRED: 'セッションが切れました。再度ログインしてください',

  // 一般
  NETWORK_ERROR: 'ネットワークに接続できません',
  UNKNOWN_ERROR: '予期しないエラーが発生しました',
} as const;

export interface ParsedError {
  message: string;
  code?: string;
  isNetworkError: boolean;
  originalError?: any;
}

/**
 * エラーをユーザーフレンドリーなメッセージに変換
 */
export function parseError(error: any): ParsedError {
  // nullやundefinedの場合
  if (!error) {
    return {
      message: CONTEXT_ERRORS.UNKNOWN_ERROR,
      isNetworkError: false,
    };
  }

  // 既にParsedErrorの場合
  if (error.isNetworkError !== undefined) {
    return error;
  }

  const code = error.code || error.error_code || '';
  const originalMessage = error.message || error.error_description || String(error);

  // ネットワークエラーの判定
  const isNetworkError =
    /network|fetch|timeout|connection/i.test(originalMessage) ||
    error.name === 'TypeError' && /fetch/i.test(originalMessage);

  // エラーコードでマッチング
  if (code && ERROR_CODES[code]) {
    return {
      message: ERROR_CODES[code],
      code,
      isNetworkError,
      originalError: error,
    };
  }

  // パターンマッチング
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(originalMessage)) {
      return {
        message,
        code,
        isNetworkError,
        originalError: error,
      };
    }
  }

  // デフォルトメッセージ
  return {
    message: isNetworkError ? CONTEXT_ERRORS.NETWORK_ERROR : CONTEXT_ERRORS.UNKNOWN_ERROR,
    code,
    isNetworkError,
    originalError: error,
  };
}

/**
 * エラーメッセージを取得（シンプルなヘルパー）
 */
export function getErrorMessage(error: any): string {
  return parseError(error).message;
}

/**
 * ネットワークエラーかどうかを判定
 */
export function isNetworkError(error: any): boolean {
  return parseError(error).isNetworkError;
}
