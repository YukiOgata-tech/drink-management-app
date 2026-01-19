# 実装完了サマリー

## ✅ Phase 1: 基礎実装（完了）

### 1. Supabase API関数

#### `lib/events.ts` - イベント関連API
```typescript
// 実装済み関数:
- createEvent() - イベント作成
- getEvents() - イベント一覧取得
- getEventById() - イベントID検索
- getEventByInviteCode() - 招待コード検索
- updateEvent() - イベント更新
- endEvent() - イベント終了
- deleteEvent() - イベント削除
- addEventMember() - メンバー追加
- getEventMembers() - メンバー一覧
- updateEventMember() - メンバー更新
- removeEventMember() - メンバー削除
- leaveEvent() - イベント離脱
```

#### `lib/drink-logs.ts` - 飲酒記録関連API
```typescript
// 実装済み関数:
- createDrinkLog() - 飲酒記録作成
- getDrinkLogsByEvent() - イベント別取得
- getDrinkLogsByUser() - ユーザー別取得
- deleteDrinkLog() - 記録削除
- approveDrinkLog() - 承認
- getDrinkLogApprovals() - 承認一覧
- removeApproval() - 承認取り消し
- rejectDrinkLog() - 却下
```

### 2. Zustand Stores

#### `stores/events.ts` - イベントストア（完全実装）
- Supabase APIと完全統合
- リアクティブなstate管理
- エラーハンドリング
- ローカルキャッシュ

#### `stores/drinks.ts` - 飲酒記録ストア
現状のまま使用可能（必要に応じて拡張）

---

## 📋 Phase 2-5: 画面実装ガイド

### 必要な画面ファイル構造

```
app/
├── (tabs)/
│   ├── events.tsx                    # ✅ 既存（拡張必要）
│   ├── events/
│   │   ├── create.tsx               # 🆕 イベント作成
│   │   └── [id]/
│   │       ├── index.tsx            # 🆕 イベント詳細
│   │       ├── invite.tsx           # 🆕 招待画面
│   │       ├── add-drink.tsx        # 🆕 記録追加
│   │       ├── approvals.tsx        # 🆕 承認待ち
│   │       └── ranking.tsx          # 🆕 ランキング
│   └── ...
├── join-event.tsx                    # 🆕 参加確認
└── _layout.tsx                       # ✅ 既存（ディープリンク追加必要）
```

### 必要な共通コンポーネント

```
components/
└── event/
    ├── EventCard.tsx                # イベントカード
    ├── DrinkLogCard.tsx             # 飲酒記録カード
    ├── ParticipantRow.tsx           # 参加者行
    ├── ApprovalCard.tsx             # 承認待ちカード
    └── RankingCard.tsx              # ランキングカード
```

---

## 🚀 実装の進め方

### Step 1: 共通コンポーネント作成
`docs/ui-implementation-plan.md`の「共通コンポーネント」セクションを参照して実装。

### Step 2: イベント作成画面
`app/(tabs)/events/create.tsx`を実装。

**使用例:**
```typescript
import { useEventsStore } from '@/stores/events';
import { useUserStore } from '@/stores/user';

const { createEvent } = useEventsStore();
const { user } = useUserStore();

const handleCreate = async () => {
  const { event, error } = await createEvent({
    title,
    description,
    recordingRule,
    requiredApprovals,
    startedAt: new Date().toISOString(),
    hostId: user.id,
  });

  if (event) {
    router.push(`/(tabs)/events/${event.id}`);
  }
};
```

### Step 3: イベント詳細画面
`app/(tabs)/events/[id]/index.tsx`を実装。

**データ取得:**
```typescript
const { id } = useLocalSearchParams<{ id: string }>();
const { fetchEventById, fetchEventMembers, getEventById, getEventMembers } = useEventsStore();

useEffect(() => {
  fetchEventById(id);
  fetchEventMembers(id);
}, [id]);

const event = getEventById(id);
const members = getEventMembers(id);
```

### Step 4: 招待画面
`app/(tabs)/events/[id]/invite.tsx`を実装。

**LINE共有:**
```typescript
import { Share, Linking } from 'react-native';

const inviteLink = `drinkmanagement://events/join?code=${event.inviteCode}`;
const shareText = `🎉 「${event.title}」への招待\n\n${inviteLink}\n\nこのリンクをタップして参加！`;

// LINE専用共有
const shareToLine = async () => {
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
  await Linking.openURL(lineUrl);
};

// 汎用共有
const shareInvite = async () => {
  await Share.share({ message: shareText });
};
```

### Step 5: ディープリンク処理
`app/_layout.tsx`を更新。

```typescript
useEffect(() => {
  const subscription = Linking.addEventListener('url', async (event) => {
    const { path, queryParams } = Linking.parse(event.url);

    if (path === 'events/join' && queryParams?.code) {
      router.push(`/join-event?code=${queryParams.code}`);
    }
  });

  return () => subscription.remove();
}, []);
```

### Step 6: 参加確認画面
`app/join-event.tsx`を実装。

**参加処理:**
```typescript
const { code } = useLocalSearchParams<{ code: string }>();
const { fetchEventByInviteCode, addEventMember } = useEventsStore();
const { user } = useUserStore();

const event = await fetchEventByInviteCode(code);

const handleJoin = async () => {
  await addEventMember({
    eventId: event.id,
    userId: user.id,
    role: 'member',
  });

  router.replace(`/(tabs)/events/${event.id}`);
};
```

### Step 7: 飲酒記録追加画面
`app/(tabs)/events/[id]/add-drink.tsx`を実装。

**記録追加:**
```typescript
import * as DrinkLogsAPI from '@/lib/drink-logs';

const handleAddDrink = async () => {
  const { drinkLog, error } = await DrinkLogsAPI.createDrinkLog({
    userId: selectedUser.id, // host_onlyの場合は選択したユーザー
    eventId: event.id,
    drinkId: selectedDrink.id,
    drinkName: selectedDrink.name,
    ml: selectedDrink.ml,
    abv: selectedDrink.abv,
    pureAlcoholG: selectedDrink.pureAlcoholG * count,
    count,
    memo,
    recordedById: user.id,
    status: event.recordingRule === 'consensus' ? 'pending' : 'approved',
  });

  router.back();
};
```

### Step 8: 承認待ち一覧画面
`app/(tabs)/events/[id]/approvals.tsx`を実装。

**承認処理:**
```typescript
import * as DrinkLogsAPI from '@/lib/drink-logs';

const handleApprove = async (drinkLogId: string) => {
  await DrinkLogsAPI.approveDrinkLog({
    drinkLogId,
    approvedByUserId: user.id,
  });

  // リフレッシュ
  refetchLogs();
};
```

### Step 9: ランキング画面
`app/(tabs)/events/[id]/ranking.tsx`を実装。

**ランキング計算:**
```typescript
const calculateRankings = (drinkLogs: DrinkLog[], type: 'total' | 'alcohol' | 'pace') => {
  const memberStats = new Map<string, number>();

  drinkLogs
    .filter((log) => log.status === 'approved')
    .forEach((log) => {
      const current = memberStats.get(log.userId) || 0;

      if (type === 'total') {
        memberStats.set(log.userId, current + log.count);
      } else if (type === 'alcohol') {
        memberStats.set(log.userId, current + log.pureAlcoholG);
      }
    });

  return Array.from(memberStats.entries())
    .map(([userId, value]) => ({ userId, value }))
    .sort((a, b) => b.value - a.value);
};
```

### Step 10: Supabase Realtime統合
各画面でリアルタイム更新を追加。

**例（イベント詳細画面）:**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel(`event:${id}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'drink_logs', filter: `event_id=eq.${id}` },
      () => refetchLogs()
    )
    .subscribe();

  return () => { subscription.unsubscribe(); };
}, [id]);
```

---

## 📦 必要なパッケージ

### 追加インストールが必要:

```bash
# QRコード生成
npm install react-native-qrcode-svg react-native-svg

# クリップボード
npm install @react-native-clipboard/clipboard

# カメラ（QRスキャン用）
# 既にexpo-cameraがインストール済み
```

### app.json / app.config.js 更新:

```json
{
  "expo": {
    "scheme": "drinkmanagement",
    "ios": {
      "associatedDomains": ["applinks:drinkmanagement.app"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "drinkmanagement",
              "host": "events"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## 🎨 スタイリングガイド

### Tailwind Classes（NativeWind）

**カード:**
```tsx
className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
```

**ボタン:**
```tsx
// Primary
className="bg-sky-500 active:bg-sky-600 px-4 py-3 rounded-xl"

// Outline
className="bg-transparent border-2 border-sky-500 active:bg-sky-50 px-4 py-3 rounded-xl"
```

**バッジ:**
```tsx
// 開催中
className="bg-green-100 px-3 py-1 rounded-full"
<Text className="text-green-700 text-xs font-semibold">開催中</Text>

// 承認待ち
className="bg-yellow-100 px-2 py-1 rounded-full"
<Text className="text-yellow-700 text-xs">⏳ 承認待ち</Text>
```

---

## 🧪 テスト手順

### 1. イベント作成フロー
1. イベント一覧で[+]ボタンをタップ
2. イベント情報を入力
3. 記録ルールを選択
4. [作成]をタップ
5. イベント詳細画面に遷移

### 2. 招待フロー
1. イベント詳細で[招待]ボタンをタップ
2. LINE共有をタップ
3. LINEで送信
4. 受信者がリンクをタップ
5. アプリが開き、参加確認画面へ
6. [参加する]をタップ
7. イベント詳細画面へ

### 3. 記録追加フロー（consensusモード）
1. イベント詳細で[記録追加]をタップ
2. ドリンクを選択
3. 杯数とメモを入力
4. [完了]をタップ
5. ステータスが「承認待ち」になる
6. 他の参加者が承認待ち画面で承認
7. 自動的に「承認済み」になる

---

## 📖 参照ドキュメント

- **DB設計:** `docs/db-design.md`
- **UI設計:** `docs/ui-design.md`
- **実装計画:** `docs/ui-implementation-plan.md`

---

## ✅ 実装状況チェックリスト

### Phase 1: 基礎実装
- [x] Supabase API関数（events）
- [x] Supabase API関数（drink-logs）
- [x] Zustandストア（events）
- [ ] Zustandストア（drinks）の拡張
- [ ] 共通コンポーネント

### Phase 2: コア機能
- [ ] イベント一覧画面の拡張
- [ ] イベント作成画面
- [ ] イベント詳細画面
- [ ] 飲酒記録追加画面

### Phase 3: 招待機能
- [ ] 招待画面（QR・LINE共有）
- [ ] 参加確認画面
- [ ] ディープリンク処理

### Phase 4: 承認・ランキング
- [ ] 承認待ち一覧画面
- [ ] ランキング画面

### Phase 5: リアルタイム
- [ ] Supabase Realtimeの統合

---

## 🚀 次のアクション

実装を完成させるには:

1. **共通コンポーネント**を`docs/ui-implementation-plan.md`の設計通りに実装
2. **各画面**をこのサマリーの「実装の進め方」に従って実装
3. **ディープリンク**を`app.json`と`app/_layout.tsx`で設定
4. **リアルタイム更新**を各画面に追加

全ての設計とAPI関数は完成しているので、UI実装を進めることができます。
