# UI実装計画書

## 全体構造

### アプリの階層構造

```
App Root
├── Consent Screen (初回のみ)
├── Auth Flow (未認証時)
│   ├── Login
│   └── Signup
└── Main App (認証後)
    └── Tab Navigation
        ├── Home (ホーム)
        ├── Drinks (日常の飲酒記録)
        ├── Events (イベント) ★メイン
        └── Profile (プロフィール)
```

### Eventsタブの画面構造

```
Events (イベント一覧)
├── Create Event (イベント作成)
│   └── → Event Detail (作成完了後)
│
├── Event Detail (イベント詳細) [id]
│   ├── Invite (招待) [id]/invite
│   │   ├── QRコード表示
│   │   └── リンク共有
│   │
│   ├── Add Drink Log (記録追加) [id]/add-drink
│   │   └── → Event Detail (追加完了後)
│   │
│   ├── Approvals (承認待ち) [id]/approvals
│   │   └── → Event Detail (承認/却下後)
│   │
│   ├── Ranking (ランキング) [id]/ranking
│   │
│   └── Settings (設定) [id]/settings
│       └── End Event (イベント終了)
│
└── Join Event (イベント参加)
    ├── Scan QR (QRスキャン)
    ├── Enter Code (コード入力)
    └── → Event Detail (参加完了後)
```

---

## 画面遷移フロー図

### 基本フロー（新規イベント作成）

```
イベント一覧
    ↓ [+]ボタン
イベント作成画面
    ↓ [完了]
イベント詳細画面
    ↓ [招待]ボタン
招待画面（QR/リンク表示）
    ↓ リンクをLINEで共有
友達がリンクをタップ
    ↓
参加確認画面
    ↓ [参加する]
イベント詳細画面（参加者として）
```

### 記録追加フロー

```
イベント詳細画面
    ↓ [記録追加]ボタン
記録追加画面
    ├─ selfモード: 自分の記録を追加
    ├─ host_onlyモード: 管理者が誰かの記録を追加
    └─ consensusモード: 自分の記録を追加（pending）
    ↓ [完了]
イベント詳細画面（記録が追加される）
```

### 承認フロー（consensusモードのみ）

```
イベント詳細画面
    ↓ 「承認待ち 3件」をタップ
承認待ち一覧画面
    ↓ [承認する]ボタン
承認処理
    ↓ 必要数に達したら自動的にapproved
イベント詳細画面（記録がリストに表示）
```

### ランキング表示フロー

```
イベント詳細画面
    ↓ [ランキング]ボタン
ランキング画面
    ├─ 総杯数タブ
    ├─ 純アルコール量タブ
    └─ 飲酒ペースタブ
    ↓ [共有]ボタン
スクショ共有（後ほど実装）
```

---

## LINE招待の実装詳細

### 1. ディープリンクの設定

#### app.json / app.config.js

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

### 2. リンク形式

```
drinkmanagement://events/join?code=ABC123

または

https://drinkmanagement.app/events/join?code=ABC123
（Webサイトがある場合）
```

### 3. 招待画面のUI実装

#### `app/(tabs)/events/[id]/invite.tsx`

```typescript
import { Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// リンク生成
const inviteLink = `drinkmanagement://events/join?code=${event.inviteCode}`;
const shareText = `🎉 「${event.title}」への招待\n\n${inviteLink}\n\nこのリンクをタップして参加！`;

// LINE共有
const shareToLine = async () => {
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
  await Linking.openURL(lineUrl);
};

// 汎用共有（LINE含む）
const shareInvite = async () => {
  await Share.share({
    message: shareText,
    url: inviteLink, // iOSの場合
  });
};
```

### 4. 参加フローの実装

#### `app/_layout.tsx` でディープリンクを処理

```typescript
useEffect(() => {
  const subscription = Linking.addEventListener('url', async (event) => {
    const { path, queryParams } = Linking.parse(event.url);

    if (path === 'events/join' && queryParams?.code) {
      // 招待コードからイベントを検索
      const inviteCode = queryParams.code as string;
      router.push(`/join-event?code=${inviteCode}`);
    }
  });

  return () => subscription.remove();
}, []);
```

#### `app/join-event.tsx` (参加確認画面)

```typescript
// クエリパラメータから招待コードを取得
const { code } = useLocalSearchParams<{ code: string }>();

// コードからイベント情報を取得
const event = await fetchEventByInviteCode(code);

// 参加ボタン
const handleJoin = async () => {
  await joinEvent(event.id);
  router.replace(`/(tabs)/events/${event.id}`);
};
```

---

## 画面別の詳細実装計画

## 1. イベント一覧画面の拡張

### 現状: `app/(tabs)/events.tsx`

既存の画面を以下のように拡張：

**追加要素:**
- 右上に`[+]`ボタン（イベント作成）
- 開催中セクション（リアルタイム更新）
- 終了済みセクション（折りたたみ可能）
- 各カードにステータスバッジ

**実装ポイント:**
```typescript
// リアルタイム更新（Supabase Realtime）
useEffect(() => {
  const subscription = supabase
    .channel('events')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      (payload) => {
        // イベントリストを更新
      }
    )
    .subscribe();

  return () => { subscription.unsubscribe(); };
}, []);
```

---

## 2. イベント作成画面

### 新規: `app/(tabs)/events/create.tsx`

**コンポーネント構成:**
```
<ScrollView>
  <Input label="イベント名" />
  <TextArea label="説明" />

  <RecordingRuleSelector
    value={recordingRule}
    onChange={setRecordingRule}
  />

  {recordingRule === 'consensus' && (
    <NumberInput
      label="必要な承認数"
      value={requiredApprovals}
      onChange={setRequiredApprovals}
    />
  )}

  <DateTimePicker
    label="開始時刻"
    value={startedAt}
    onChange={setStartedAt}
  />

  <Button onPress={handleCreate}>作成</Button>
</ScrollView>
```

**バリデーション:**
- イベント名: 必須、1〜50文字
- 記録ルール: 必須
- 必要承認数: consensusの場合のみ、1以上
- 開始時刻: 必須

**作成処理:**
```typescript
const handleCreate = async () => {
  // 1. イベント作成（invite_codeは自動生成）
  const event = await createEvent({
    title,
    description,
    recordingRule,
    requiredApprovals,
    startedAt,
    hostId: user.id,
  });

  // 2. 自分をホストとして追加
  await addEventMember({
    eventId: event.id,
    userId: user.id,
    role: 'host',
  });

  // 3. イベント詳細画面へ
  router.replace(`/(tabs)/events/${event.id}`);
};
```

---

## 3. イベント詳細画面

### 新規: `app/(tabs)/events/[id]/index.tsx`

**セクション構成:**

#### ヘッダーセクション
```tsx
<View className="bg-sky-500 p-4 rounded-b-3xl">
  <Text className="text-white text-2xl font-bold">{event.title}</Text>
  <View className="flex-row items-center mt-2">
    <StatusBadge status={event.endedAt ? 'ended' : 'ongoing'} />
    <Text className="text-white ml-2">
      {event.endedAt ? '終了済み' : `開催中 (${elapsedTime})`}
    </Text>
  </View>
  <Text className="text-white text-sm mt-1">
    📊 {recordingRuleLabel}
  </Text>
</View>
```

#### 参加者セクション
```tsx
<View className="p-4">
  <View className="flex-row justify-between items-center mb-3">
    <Text className="text-lg font-bold">👥 参加者 ({members.length})</Text>
    {isHost && (
      <Button
        variant="outline"
        size="sm"
        onPress={() => router.push(`/events/${id}/invite`)}
      >
        招待+
      </Button>
    )}
  </View>

  {members.map((member, index) => (
    <ParticipantRow
      key={member.userId}
      user={member.user}
      rank={index + 1}
      stats={member.stats}
      role={member.role}
    />
  ))}
</View>
```

#### 承認待ち通知（consensusのみ）
```tsx
{pendingCount > 0 && (
  <TouchableOpacity
    onPress={() => router.push(`/events/${id}/approvals`)}
    className="bg-yellow-50 border border-yellow-300 p-4 mx-4 rounded-xl"
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Text className="text-2xl mr-2">⚠️</Text>
        <Text className="font-semibold">承認待ち {pendingCount}件</Text>
      </View>
      <Text className="text-sky-500">確認する &gt;</Text>
    </View>
  </TouchableOpacity>
)}
```

#### 飲酒記録セクション
```tsx
<View className="p-4">
  <Text className="text-lg font-bold mb-3">📝 飲酒記録</Text>

  {drinkLogs.slice(0, 5).map((log) => (
    <DrinkLogCard
      key={log.id}
      drinkLog={log}
      showApprovalStatus={event.recordingRule === 'consensus'}
    />
  ))}

  {drinkLogs.length > 5 && (
    <Button variant="ghost" onPress={showAllLogs}>
      さらに表示
    </Button>
  )}
</View>
```

#### アクションボタン
```tsx
<View className="p-4 flex-row gap-3">
  <Button
    className="flex-1"
    onPress={() => router.push(`/events/${id}/add-drink`)}
  >
    🍺 記録追加
  </Button>
  <Button
    className="flex-1"
    variant="secondary"
    onPress={() => router.push(`/events/${id}/ranking`)}
  >
    🏆 ランキング
  </Button>
</View>
```

**リアルタイム更新:**
```typescript
useEffect(() => {
  // イベント情報の更新を監視
  const eventSubscription = supabase
    .channel(`event:${id}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${id}` },
      () => { refetchEvent(); }
    )
    .subscribe();

  // 飲酒記録の追加を監視
  const logsSubscription = supabase
    .channel(`drink_logs:${id}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'drink_logs', filter: `event_id=eq.${id}` },
      () => { refetchLogs(); }
    )
    .subscribe();

  return () => {
    eventSubscription.unsubscribe();
    logsSubscription.unsubscribe();
  };
}, [id]);
```

---

## 4. 招待画面

### 新規: `app/(tabs)/events/[id]/invite.tsx`

```tsx
<ScrollView className="flex-1 bg-white">
  <View className="p-6">
    <Text className="text-2xl font-bold mb-6">参加者を招待</Text>

    {/* QRコード */}
    <View className="bg-white p-6 rounded-2xl shadow-lg mb-4 items-center">
      <Text className="text-lg font-semibold mb-4">
        このQRコードを見せる
      </Text>
      <QRCode
        value={inviteLink}
        size={200}
        backgroundColor="white"
      />
      <Text className="text-gray-500 text-sm mt-4">
        {event.title}
      </Text>
      <Text className="text-gray-400 text-xs">
        👥 {memberCount}人参加中
      </Text>
    </View>

    {/* LINE共有 */}
    <TouchableOpacity
      onPress={shareToLine}
      className="bg-[#06C755] p-4 rounded-xl flex-row items-center justify-center mb-3"
    >
      <Text className="text-white text-lg font-bold mr-2">LINE</Text>
      <Text className="text-white">で招待リンクを送る</Text>
    </TouchableOpacity>

    {/* 汎用共有 */}
    <Button
      variant="outline"
      onPress={shareInvite}
      className="mb-3"
    >
      🔗 その他の方法で共有
    </Button>

    {/* 招待コード表示 */}
    <View className="bg-gray-50 p-4 rounded-xl">
      <Text className="text-gray-600 text-sm mb-2">招待コード</Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-3xl font-mono font-bold tracking-wider">
          {event.inviteCode}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          onPress={copyCode}
        >
          コピー
        </Button>
      </View>
      <Text className="text-gray-400 text-xs mt-2">
        このコードを口頭で伝えることもできます
      </Text>
    </View>
  </View>
</ScrollView>
```

**実装ポイント:**
- QRコード: `react-native-qrcode-svg`使用
- LINE共有: 専用URLスキーム使用
- 汎用共有: React Nativeの`Share` API使用
- コピー: `@react-native-clipboard/clipboard`使用

---

## 5. 参加確認画面

### 新規: `app/join-event.tsx`

```tsx
<SafeAreaView className="flex-1 bg-white">
  <View className="p-6">
    {loading ? (
      <ActivityIndicator />
    ) : error ? (
      <ErrorView message="イベントが見つかりません" />
    ) : (
      <>
        <View className="items-center mb-6">
          <Text className="text-4xl mb-4">🎉</Text>
          <Text className="text-2xl font-bold">{event.title}</Text>
        </View>

        <View className="bg-gray-50 p-4 rounded-xl mb-6">
          <InfoRow icon="📊" label="記録ルール" value={recordingRuleLabel} />
          <InfoRow icon="👤" label="ホスト" value={event.host.displayName} />
          <InfoRow icon="⏱" label="開催予定" value={formatDateTime(event.startedAt)} />
          <InfoRow icon="👥" label="参加者" value={`${memberCount}人`} />
        </View>

        <View className="bg-sky-50 p-4 rounded-xl mb-6">
          <Text className="font-semibold mb-2">参加者</Text>
          <Text className="text-gray-600 text-sm">
            {members.map(m => m.displayName).join('、')}
          </Text>
        </View>

        <Button
          onPress={handleJoin}
          disabled={joining}
          className="mb-3"
        >
          ✅ このイベントに参加する
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.back()}
        >
          キャンセル
        </Button>
      </>
    )}
  </View>
</SafeAreaView>
```

**参加処理:**
```typescript
const handleJoin = async () => {
  setJoining(true);

  try {
    // イベントメンバーとして追加
    await addEventMember({
      eventId: event.id,
      userId: user.id,
      role: 'member',
    });

    // 成功メッセージ
    Alert.alert('参加しました！', `「${event.title}」に参加しました`);

    // イベント詳細画面へ
    router.replace(`/(tabs)/events/${event.id}`);
  } catch (error) {
    Alert.alert('エラー', '参加できませんでした');
  } finally {
    setJoining(false);
  }
};
```

---

## 6. 飲酒記録追加画面

### 新規: `app/(tabs)/events/[id]/add-drink.tsx`

**host_onlyモードの場合、記録対象選択UIを追加:**

```tsx
{event.recordingRule === 'host_only' && isManager && (
  <View className="mb-4">
    <Text className="text-sm font-semibold mb-2">記録対象 *</Text>
    <TouchableOpacity
      onPress={openUserSelector}
      className="border border-gray-300 rounded-xl p-4 flex-row items-center justify-between"
    >
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">{selectedUser.avatar || '👤'}</Text>
        <Text className="text-lg">{selectedUser.displayName}</Text>
      </View>
      <Text className="text-sky-500">変更</Text>
    </TouchableOpacity>
  </View>
)}
```

**ユーザー選択モーダル:**
```tsx
<Modal visible={showUserSelector}>
  <View className="flex-1 bg-white">
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">記録対象を選択</Text>
      {members.map((member) => (
        <TouchableOpacity
          key={member.userId}
          onPress={() => {
            setSelectedUser(member.user);
            setShowUserSelector(false);
          }}
          className="p-4 border-b border-gray-200"
        >
          <Text className="text-lg">{member.user.displayName}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
</Modal>
```

**記録追加処理:**
```typescript
const handleAddDrink = async () => {
  const drinkLog = {
    userId: selectedUser.id, // host_onlyの場合は選択したユーザー
    eventId: event.id,
    drinkId: selectedDrink.id,
    drinkName: selectedDrink.name,
    ml: selectedDrink.ml,
    abv: selectedDrink.abv,
    pureAlcoholG: selectedDrink.pureAlcoholG * count,
    count,
    memo,
    recordedById: user.id, // 記録者は常に自分
    status: event.recordingRule === 'consensus' ? 'pending' : 'approved',
  };

  await createDrinkLog(drinkLog);

  // 成功メッセージ
  if (event.recordingRule === 'consensus') {
    Alert.alert('記録を追加しました', '他の参加者の承認を待っています');
  } else {
    Alert.alert('記録を追加しました');
  }

  router.back();
};
```

---

## 7. 承認待ち一覧画面

### 新規: `app/(tabs)/events/[id]/approvals.tsx`

```tsx
<ScrollView className="flex-1 bg-white">
  <View className="p-4">
    <Text className="text-xl font-bold mb-4">
      ⚠️ 承認が必要な記録 ({pendingLogs.length}件)
    </Text>

    {pendingLogs.map((log) => (
      <ApprovalCard
        key={log.id}
        drinkLog={log}
        requiredApprovals={event.requiredApprovals}
        currentApprovals={log.approvals?.length || 0}
        onApprove={() => handleApprove(log.id)}
        onReject={() => handleReject(log.id)}
        canApprove={log.userId !== user.id} // 自分の記録は承認できない
      />
    ))}

    {pendingLogs.length === 0 && (
      <View className="items-center py-10">
        <Text className="text-6xl mb-4">✅</Text>
        <Text className="text-lg text-gray-500">
          承認待ちの記録はありません
        </Text>
      </View>
    )}

    {approvedLogs.length > 0 && (
      <>
        <Text className="text-lg font-bold mt-6 mb-4">
          ✅ 承認済み ({approvedLogs.length}件)
        </Text>
        {approvedLogs.map((log) => (
          <DrinkLogCard
            key={log.id}
            drinkLog={log}
            compact
          />
        ))}
      </>
    )}
  </View>
</ScrollView>
```

**承認処理:**
```typescript
const handleApprove = async (drinkLogId: string) => {
  await approveDrinkLog({
    drinkLogId,
    approvedByUserId: user.id,
  });

  // リアルタイムで更新されるが、念のため再取得
  refetchLogs();

  // 触覚フィードバック
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};
```

**却下処理:**
```typescript
const handleReject = async (drinkLogId: string) => {
  Alert.alert(
    '記録を却下',
    'この記録を却下しますか？',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '却下する',
        style: 'destructive',
        onPress: async () => {
          await rejectDrinkLog(drinkLogId);
          refetchLogs();
        },
      },
    ]
  );
};
```

---

## 8. ランキング画面

### 新規: `app/(tabs)/events/[id]/ranking.tsx`

```tsx
<View className="flex-1 bg-white">
  {/* タブ */}
  <View className="flex-row border-b border-gray-200">
    <TabButton
      active={activeTab === 'total'}
      onPress={() => setActiveTab('total')}
    >
      🏆 総杯数
    </TabButton>
    <TabButton
      active={activeTab === 'alcohol'}
      onPress={() => setActiveTab('alcohol')}
    >
      ⚗️ 純アルコール
    </TabButton>
    <TabButton
      active={activeTab === 'pace'}
      onPress={() => setActiveTab('pace')}
    >
      ⚡ ペース
    </TabButton>
  </View>

  <ScrollView className="flex-1">
    {rankings.map((ranking, index) => (
      <RankingCard
        key={ranking.userId}
        rank={index + 1}
        user={ranking.user}
        value={ranking.value}
        maxValue={rankings[0].value}
        type={activeTab}
      />
    ))}

    {/* 統計情報 */}
    <View className="p-4 bg-gray-50 mt-4">
      <Text className="text-lg font-bold mb-3">📊 統計情報</Text>
      <StatRow label="平均" value={`${stats.average}杯/人`} />
      <StatRow label="合計" value={`${stats.total}杯`} />
      <StatRow label="最多ドリンク" value={stats.mostPopularDrink} />
    </View>
  </ScrollView>
</View>
```

**ランキング計算:**
```typescript
const calculateRankings = (type: 'total' | 'alcohol' | 'pace') => {
  return members.map((member) => {
    const logs = drinkLogs.filter(log =>
      log.userId === member.userId && log.status === 'approved'
    );

    let value: number;
    if (type === 'total') {
      value = logs.reduce((sum, log) => sum + log.count, 0);
    } else if (type === 'alcohol') {
      value = logs.reduce((sum, log) => sum + log.pureAlcoholG, 0);
    } else {
      const hours = (Date.now() - new Date(event.startedAt).getTime()) / (1000 * 60 * 60);
      value = logs.reduce((sum, log) => sum + log.count, 0) / hours;
    }

    return { user: member.user, value };
  }).sort((a, b) => b.value - a.value);
};
```

---

## 共通コンポーネント

### 1. EventCard

```tsx
interface EventCardProps {
  event: Event;
  members: EventMember[];
  topUser?: { name: string; count: number };
  onPress: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  members,
  topUser,
  onPress,
}) => {
  const isOngoing = !event.endedAt;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-xl font-bold">{event.title}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            📊 {getRecordingRuleLabel(event.recordingRule)}
          </Text>
        </View>
        {isOngoing && (
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 text-xs font-semibold">開催中</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center mt-2">
        <Text className="text-gray-600 text-sm">
          👥 {members.length}人参加
        </Text>
        <Text className="text-gray-400 mx-2">•</Text>
        <Text className="text-gray-600 text-sm">
          ⏱ {formatRelativeTime(event.startedAt)}
        </Text>
      </View>

      {topUser && (
        <View className="bg-sky-50 p-3 rounded-xl mt-3">
          <Text className="text-sky-700 font-semibold">
            🥇 1位: {topUser.name} ({topUser.count}杯)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

### 2. DrinkLogCard

```tsx
interface DrinkLogCardProps {
  drinkLog: DrinkLog;
  showApprovalStatus?: boolean;
  compact?: boolean;
}

export const DrinkLogCard: React.FC<DrinkLogCardProps> = ({
  drinkLog,
  showApprovalStatus,
  compact,
}) => {
  const drink = getDefaultDrinkById(drinkLog.drinkId);

  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-2xl mr-2">{drink?.emoji || '🍺'}</Text>
            <Text className="text-lg font-semibold">
              {drinkLog.user.displayName}
            </Text>
          </View>

          <Text className="text-gray-700">
            {drinkLog.drinkName} x{drinkLog.count}
          </Text>

          {drinkLog.memo && (
            <View className="bg-gray-50 p-2 rounded-lg mt-2">
              <Text className="text-gray-600 text-sm">
                💬 「{drinkLog.memo}」
              </Text>
            </View>
          )}
        </View>

        <View className="items-end">
          {showApprovalStatus && drinkLog.status === 'pending' && (
            <View className="bg-yellow-100 px-2 py-1 rounded-full mb-1">
              <Text className="text-yellow-700 text-xs">
                ⏳ 承認待ち ({drinkLog.approvals?.length || 0}/{drinkLog.event.requiredApprovals})
              </Text>
            </View>
          )}
          <Text className="text-gray-400 text-xs">
            {formatTime(drinkLog.recordedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
};
```

### 3. ParticipantRow

```tsx
interface ParticipantRowProps {
  user: User;
  rank: number;
  stats: { count: number; alcoholG: number };
  role?: EventMemberRole;
}

export const ParticipantRow: React.FC<ParticipantRowProps> = ({
  user,
  rank,
  stats,
  role,
}) => {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = rank <= 3 ? medals[rank - 1] : '';

  return (
    <View className="flex-row items-center py-3 border-b border-gray-100">
      <Text className="text-2xl w-10">{medal || rank}</Text>
      <Text className="text-2xl mr-3">{user.avatar || '👤'}</Text>

      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold">{user.displayName}</Text>
          {role === 'host' && (
            <View className="bg-sky-100 px-2 py-0.5 rounded ml-2">
              <Text className="text-sky-700 text-xs">ホスト</Text>
            </View>
          )}
          {role === 'manager' && (
            <View className="bg-purple-100 px-2 py-0.5 rounded ml-2">
              <Text className="text-purple-700 text-xs">管理者</Text>
            </View>
          )}
        </View>
        <Text className="text-gray-500 text-sm">
          📊 {stats.count}杯 ({stats.alcoholG.toFixed(1)}g)
        </Text>
      </View>
    </View>
  );
};
```

### 4. ApprovalCard

```tsx
interface ApprovalCardProps {
  drinkLog: DrinkLog;
  requiredApprovals: number;
  currentApprovals: number;
  onApprove: () => void;
  onReject: () => void;
  canApprove: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  drinkLog,
  requiredApprovals,
  currentApprovals,
  onApprove,
  onReject,
  canApprove,
}) => {
  const remaining = requiredApprovals - currentApprovals;

  return (
    <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold mb-1">
            👤 {drinkLog.user.displayName}
          </Text>
          <Text className="text-gray-700">
            {drinkLog.drinkName} x{drinkLog.count}
          </Text>
          {drinkLog.memo && (
            <Text className="text-gray-600 text-sm mt-1">
              💬 「{drinkLog.memo}」
            </Text>
          )}
        </View>
        <Text className="text-gray-400 text-xs">
          {formatTime(drinkLog.recordedAt)}
        </Text>
      </View>

      <View className="bg-white p-3 rounded-lg mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">承認状況</Text>
          <Text className="text-lg font-bold text-yellow-600">
            {currentApprovals}/{requiredApprovals}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mt-1">
          {remaining === 0 ? '✅ 承認完了！' : `あと${remaining}人の承認が必要`}
        </Text>
      </View>

      {canApprove && (
        <View className="flex-row gap-2">
          <Button
            onPress={onApprove}
            className="flex-1"
            variant="primary"
          >
            ✅ 承認する
          </Button>
          <Button
            onPress={onReject}
            className="flex-1"
            variant="danger"
          >
            ❌ 却下
          </Button>
        </View>
      )}

      {!canApprove && (
        <Text className="text-center text-gray-500 text-sm">
          自分の記録は承認できません
        </Text>
      )}
    </View>
  );
};
```

### 5. RankingCard

```tsx
interface RankingCardProps {
  rank: number;
  user: User;
  value: number;
  maxValue: number;
  type: 'total' | 'alcohol' | 'pace';
}

export const RankingCard: React.FC<RankingCardProps> = ({
  rank,
  user,
  value,
  maxValue,
  type,
}) => {
  const medals = ['🥇', '🥈', '🥉'];
  const percentage = (value / maxValue) * 100;

  const formatValue = () => {
    if (type === 'total') return `${value}杯`;
    if (type === 'alcohol') return `${value.toFixed(1)}g`;
    return `${value.toFixed(1)}杯/時間`;
  };

  return (
    <View className="p-4 border-b border-gray-100">
      <View className="flex-row items-center mb-2">
        <Text className="text-3xl w-12">
          {rank <= 3 ? medals[rank - 1] : `${rank}位`}
        </Text>
        <Text className="text-2xl mr-2">{user.avatar || '👤'}</Text>
        <Text className="flex-1 text-lg font-semibold">{user.displayName}</Text>
        <Text className="text-xl font-bold text-sky-600">
          {formatValue()}
        </Text>
      </View>

      {/* プログレスバー */}
      <View className="bg-gray-200 h-2 rounded-full overflow-hidden">
        <Animated.View
          className="bg-sky-500 h-full"
          style={{ width: `${percentage}%` }}
        />
      </View>

      {/* ドリンク絵文字の視覚化 */}
      {type === 'total' && (
        <View className="flex-row flex-wrap mt-2">
          {Array.from({ length: Math.min(value, 10) }).map((_, i) => (
            <Text key={i} className="text-2xl">🍺</Text>
          ))}
          {value > 10 && (
            <Text className="text-gray-500 ml-1">+{value - 10}</Text>
          )}
        </View>
      )}
    </View>
  );
};
```

---

## 実装の優先順位

### Phase 1: 基礎実装（1週間）
1. ✅ DB設計完了
2. ⬜ Zustandストアの拡張
3. ⬜ Supabase API関数の実装
4. ⬜ 共通コンポーネントの実装

### Phase 2: コア機能（2週間）
5. ⬜ イベント一覧画面の拡張
6. ⬜ イベント作成画面
7. ⬜ イベント詳細画面
8. ⬜ 飲酒記録追加画面（3つのルール対応）

### Phase 3: 招待機能（1週間）
9. ⬜ 招待画面（QR・LINE共有）
10. ⬜ 参加確認画面
11. ⬜ ディープリンクの処理

### Phase 4: 承認・ランキング（1週間）
12. ⬜ 承認待ち一覧画面（consensusのみ）
13. ⬜ ランキング画面（3種類）

### Phase 5: リアルタイム（1週間）
14. ⬜ Supabase Realtimeの統合
15. ⬜ 自動更新の実装

### Phase 6: 改善（随時）
16. ⬜ アニメーション強化
17. ⬜ エラーハンドリング
18. ⬜ ローディング状態
19. ⬜ 最適化

---

## 次のステップ

まず**Phase 1**から着手します：

1. Zustandストアの拡張
2. Supabase API関数の実装
3. 共通コンポーネントの実装

準備ができたら実装を開始しましょう！
