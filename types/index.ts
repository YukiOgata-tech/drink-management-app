// ユーザー関連
export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  avatar?: string;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  gender?: 'male' | 'female' | 'other';
  bio?: string;
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
  hostId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventMember {
  eventId: string;
  userId: string;
  role: EventMemberRole;
  joinedAt: string;
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
  customName?: string; // カスタム入力時の名前
  ml: number;
  abv: number;
  pureAlcoholG: number;
  count: number; // 杯数
  status: DrinkLogStatus;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  agreedAt: string;
  version: string;
}

// 統計関連
export interface DrinkStats {
  totalDrinks: number;
  totalPureAlcoholG: number;
  averagePerDay: number;
  mostFrequentDrink?: string;
}
