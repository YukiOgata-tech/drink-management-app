// ユーザー関連
export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  displayNameChangedAt?: string; // 表示名最終変更日時（1日1回制限用）
  avatar?: string;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  birthday?: string; // YYYY-MM-DD format
  height?: number; // cm
  weight?: number; // kg
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  // XP/レベル関連
  totalXP?: number;
  level?: number;
  negativeXP?: number; // 削除による借金XP（次回付与時に相殺）
}

// イベント関連
export type EventRecordingRule = 'self' | 'host_only' | 'consensus';
export type EventMemberRole = 'host' | 'manager' | 'member';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startedAt: string;
  endedAt?: string;
  recordingRule: EventRecordingRule;
  requiredApprovals: number; // consensusモードで必要な承認数（デフォルト1）
  inviteCode: string; // 招待コード（6桁英数字、自動生成）
  hostId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventMember {
  eventId: string;
  userId: string;
  role: EventMemberRole;
  joinedAt: string;
  leftAt?: string; // 途中離脱時刻（NULLなら参加中）
  // プロフィール情報（JOINで取得）
  displayName?: string;
  avatar?: string;
}

// ドリンク関連
export type DrinkCategory =
  | 'beer'
  | 'highball'
  | 'chuhai_sour'
  | 'shochu'
  | 'sake'
  | 'wine'
  | 'fruit_liquor'
  | 'shot_straight'
  | 'cocktail'
  | 'soft_drink'
  | 'other';

export type DrinkLogStatus = 'pending' | 'approved' | 'rejected';

export interface DefaultDrink {
  id: string;
  category: DrinkCategory;
  name: string;
  ml: number;
  abv: number; // Alcohol by volume (%)
  pureAlcoholG: number; // 純アルコール量(g)
  notes?: string;
  emoji?: string;
}

export interface DrinkLog {
  id: string;
  userId: string;
  eventId?: string; // nullの場合は日常ログ
  drinkId?: string; // DefaultDrinkのID（カスタムの場合はnull）
  drinkName: string; // ドリンク名
  ml: number;
  abv: number;
  pureAlcoholG: number;
  count: number; // 杯数
  memo?: string; // 記録時のメモ（「ここで酔った」など）
  recordedById: string; // 誰が記録したか
  status: DrinkLogStatus;
  recordedAt: string;
  createdAt: string;
}

// 飲酒記録（プロフィール情報付き）
export interface DrinkLogWithUser extends DrinkLog {
  userName?: string;
  userAvatar?: string;
}

export interface DrinkLogApproval {
  id: string;
  drinkLogId: string;
  approvedByUserId: string;
  approvedAt: string;
}

// メモ関連
export type MemoType = 'feeling' | 'condition' | 'next_day' | 'general';

export interface Memo {
  id: string;
  userId: string;
  eventId?: string;
  type: MemoType;
  content: string;
  createdAt: string;
}

// 同意関連
export interface ConsentRecord {
  // 年齢確認
  birthday: string; // YYYY-MM-DD
  ageVerifiedAt: string; // ISO8601
  isAdult: boolean; // 20歳以上かどうか
  // 利用規約同意
  termsVersion: string; // 例: "1.0.0"
  termsAgreedAt: string; // ISO8601
  // プライバシーポリシー同意
  privacyPolicyVersion: string; // 例: "1.0.0"
  privacyPolicyAgreedAt: string; // ISO8601
  // 飲酒注意事項確認
  drinkingWarningAcknowledgedAt: string; // ISO8601
}

// 法的ドキュメントのバージョン管理
export const LEGAL_VERSIONS = {
  TERMS: '1.0.0',
  PRIVACY_POLICY: '1.0.0',
  DRINKING_GUIDELINES: '1.0.0',
} as const;

// 統計関連
export interface DrinkStats {
  totalDrinks: number;
  totalPureAlcoholG: number;
  averagePerDay: number;
  mostFrequentDrink?: string;
}

// Supabase商品マスター
export interface Product {
  id: string;
  category: DrinkCategory;
  name: string;
  brand: string;
  manufacturer: string;
  ml: number;
  abv: number;
  emoji?: string;
  jan_code?: string;
  price_range?: string;
  notes?: string;
  is_official: boolean;
  created_at: string;
  updated_at: string;
}

// カスタムドリンク（ローカルストレージ）
export interface CustomDrink {
  id: string;
  category: DrinkCategory;
  name: string;
  brand?: string;
  manufacturer?: string;
  ml: number;
  abv: number;
  emoji?: string;
  notes?: string;
  createdAt: string;
}

// 個人飲酒記録（ローカルストレージ + Supabase同期）
export type PersonalLogSyncStatus = 'local' | 'synced' | 'pending';

export interface PersonalDrinkLog {
  id: string;
  userId: string;
  drinkId?: string; // products.id or customDrink.id
  drinkName: string;
  drinkCategory: DrinkCategory;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  count: number;
  memo?: string;
  recordedAt: string;
  isCustomDrink: boolean; // カスタムドリンクかどうか
  // 同期関連（認証ユーザーのみ使用）
  supabaseId?: string; // Supabase drink_logs.id
  syncStatus?: PersonalLogSyncStatus; // デフォルト: 'local'
  // ソフトデリート用
  deletedAt?: string; // 削除日時（Undo可能期間中に設定）
}

// XP/レベル関連
export type XPSource = 'drink_log' | 'event_join' | 'event_complete' | 'daily_bonus';

export interface UserXP {
  totalXP: number;
  level: number;
  currentLevelXP: number; // 現在レベル開始時のXP
  nextLevelXP: number; // 次レベルに必要なXP
  progress: number; // 0-100%
  negativeXP: number; // 削除による借金XP
}
