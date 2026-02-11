import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { hasClaimedEventXP } from '@/lib/storage/eventXpClaimed';
import { Event } from '@/types';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface EndedEventBannerProps {
  onDismiss?: () => void;
}

/**
 * 終了したイベントの結果確認を促すバナー
 * ホーム画面やイベント一覧画面に表示
 */
export function EndedEventBanner({ onDismiss }: EndedEventBannerProps) {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const events = useEventsStore((state) => state.events);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  const [unclaimedEvents, setUnclaimedEvents] = useState<Event[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkUnclaimedEvents();
  }, [user, events]);

  const checkUnclaimedEvents = async () => {
    if (!user || isGuest) {
      setUnclaimedEvents([]);
      return;
    }

    // 終了済みイベントをフィルタリング
    const endedEvents = events.filter((e) => e.endedAt);

    // XP未受取のイベントをチェック
    const unclaimed: Event[] = [];
    for (const event of endedEvents) {
      const claimed = await hasClaimedEventXP(user.id, event.id);
      if (!claimed) {
        unclaimed.push(event);
      }
    }

    setUnclaimedEvents(unclaimed);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (unclaimedEvents.length === 1) {
      // 1件の場合は直接そのイベントへ
      router.push(`/(tabs)/events/${unclaimedEvents[0].id}`);
    } else {
      // 複数の場合はイベント一覧へ
      router.push('/(tabs)/events');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // 表示しない条件
  if (dismissed || unclaimedEvents.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(300)}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        className={`mx-4 mb-4 rounded-xl overflow-hidden ${
          isDark ? 'bg-secondary-900' : 'bg-secondary-50'
        }`}
      >
        <View className={`p-4 border-2 rounded-xl ${
          isDark ? 'border-secondary-700' : 'border-secondary-200'
        }`}>
          <View className="flex-row items-start">
            {/* アイコン */}
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
              isDark ? 'bg-secondary-800' : 'bg-secondary-100'
            }`}>
              <Feather name="award" size={24} color="#f97316" />
            </View>

            {/* コンテンツ */}
            <View className="flex-1">
              <Text className={`text-base font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {unclaimedEvents.length === 1
                  ? '「' + unclaimedEvents[0].title + '」が終了しました'
                  : `${unclaimedEvents.length}件のイベントが終了しました`}
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                タップして結果を確認し、XPを獲得しましょう！
              </Text>
            </View>

            {/* 閉じるボタン */}
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-1"
            >
              <Feather name="x" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          {/* アクションヒント */}
          <View className="flex-row items-center justify-end mt-2">
            <Text className="text-secondary-600 text-sm font-semibold mr-1">
              結果を見る
            </Text>
            <Feather name="chevron-right" size={16} color="#f97316" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
