import { User, Event, DrinkLog, Memo, EventMember } from '@/types';

// ダミーユーザー
export const dummyUser: User = {
  id: 'user-1',
  email: 'demo@example.com',
  emailConfirmed: true,
  displayName: '山田太郎',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  profile: {
    birthday: '2002-04-15', // 22歳
    height: 172,
    weight: 65,
    gender: 'male',
    bio: '大学4年生。お酒は適度に楽しむ派。',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ダミー参加者
export const dummyParticipants: User[] = [
  {
    id: 'user-2',
    email: 'tanaka@example.com',
    emailConfirmed: true,
    displayName: '田中花子',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka',
    profile: {
      birthday: '2003-08-20', // 21歳
      gender: 'female',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'suzuki@example.com',
    emailConfirmed: true,
    displayName: '鈴木次郎',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=suzuki',
    profile: {
      birthday: '2001-11-05', // 23歳
      gender: 'male',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-4',
    email: 'sato@example.com',
    emailConfirmed: true,
    displayName: '佐藤美咲',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sato',
    profile: {
      birthday: '2002-06-10', // 22歳
      gender: 'female',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ダミーイベント
export const dummyEvents: Event[] = [
  {
    id: 'event-1',
    title: 'サークルの新年会',
    description: 'テニスサークルのみんなで新年会！',
    startedAt: '2024-01-10T18:00:00Z',
    endedAt: '2024-01-10T22:00:00Z',
    recordingRule: 'self',
    requiredApprovals: 1,
    inviteCode: 'EVENT1',
    hostId: 'user-1',
    createdAt: '2024-01-08T10:00:00Z',
    updatedAt: '2024-01-10T22:00:00Z',
  },
  {
    id: 'event-2',
    title: '🍻 ゼミの打ち上げ',
    description: '前期お疲れ様でした！',
    startedAt: '2024-01-15T19:00:00Z',
    recordingRule: 'self',
    requiredApprovals: 1,
    inviteCode: 'EVENT2',
    hostId: 'user-2',
    createdAt: '2024-01-14T15:00:00Z',
    updatedAt: '2024-01-15T19:00:00Z',
  },
  {
    id: 'event-3',
    title: '🎊 卒業記念パーティー',
    description: '4年間ありがとう！',
    startedAt: '2024-01-20T17:00:00Z',
    recordingRule: 'host_only',
    requiredApprovals: 1,
    inviteCode: 'EVENT3',
    hostId: 'user-3',
    createdAt: '2024-01-18T12:00:00Z',
    updatedAt: '2024-01-20T17:00:00Z',
  },
];

// ダミーイベントメンバー
export const dummyEventMembers: EventMember[] = [
  {
    eventId: 'event-1',
    userId: 'user-1',
    role: 'host',
    joinedAt: '2024-01-08T10:00:00Z',
  },
  {
    eventId: 'event-1',
    userId: 'user-2',
    role: 'member',
    joinedAt: '2024-01-08T11:00:00Z',
  },
  {
    eventId: 'event-1',
    userId: 'user-3',
    role: 'member',
    joinedAt: '2024-01-08T12:00:00Z',
  },
  {
    eventId: 'event-1',
    userId: 'user-4',
    role: 'member',
    joinedAt: '2024-01-08T13:00:00Z',
  },
];

// ダミードリンクログ
export const dummyDrinkLogs: DrinkLog[] = [
  {
    id: 'log-1',
    userId: 'user-1',
    eventId: 'event-1',
    drinkId: 'beer_draft_medium',
    drinkName: '生ビール（中）',
    ml: 435,
    abv: 5,
    pureAlcoholG: 17.2,
    count: 2,
    recordedById: 'user-1',
    status: 'approved',
    recordedAt: '2024-01-10T18:30:00Z',
    createdAt: '2024-01-10T18:30:00Z',
  },
  {
    id: 'log-2',
    userId: 'user-1',
    eventId: 'event-1',
    drinkId: 'highball_regular',
    drinkName: 'ハイボール',
    ml: 350,
    abv: 7,
    pureAlcoholG: 19.3,
    count: 1,
    recordedById: 'user-1',
    status: 'approved',
    recordedAt: '2024-01-10T19:45:00Z',
    createdAt: '2024-01-10T19:45:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-1',
    eventId: 'event-1',
    drinkId: 'chuhai_lemon',
    drinkName: 'レモンサワー',
    ml: 350,
    abv: 5,
    pureAlcoholG: 13.8,
    count: 1,
    recordedById: 'user-1',
    status: 'approved',
    recordedAt: '2024-01-10T21:00:00Z',
    createdAt: '2024-01-10T21:00:00Z',
  },
  {
    id: 'log-4',
    userId: 'user-1',
    drinkId: 'beer_draft_medium',
    drinkName: '生ビール（中）',
    ml: 435,
    abv: 5,
    pureAlcoholG: 17.2,
    count: 1,
    recordedById: 'user-1',
    status: 'approved',
    recordedAt: '2024-01-08T20:00:00Z',
    createdAt: '2024-01-08T20:00:00Z',
  },
];

// ダミーメモ
export const dummyMemos: Memo[] = [
  {
    id: 'memo-1',
    userId: 'user-1',
    eventId: 'event-1',
    type: 'feeling',
    content: 'いい感じにほろ酔い😊',
    createdAt: '2024-01-10T20:00:00Z',
  },
  {
    id: 'memo-2',
    userId: 'user-1',
    eventId: 'event-1',
    type: 'next_day',
    content: '翌日は頭痛なし！適量でした',
    createdAt: '2024-01-11T09:00:00Z',
  },
];
