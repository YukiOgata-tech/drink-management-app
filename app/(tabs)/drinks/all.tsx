import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Card, ResponsiveContainer } from '@/components/ui';
import { PersonalLogCard } from '@/components/PersonalLogCard';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { PersonalDrinkLog } from '@/types';
import Animated, { FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

const UNDO_TIMEOUT = 5000;

export default function AllPersonalLogsScreen() {
  const personalLogs = usePersonalLogsStore((state) => state.logs);
  const loadPersonalLogs = usePersonalLogsStore((state) => state.loadLogs);
  const softDeleteLog = usePersonalLogsStore((state) => state.softDeleteLog);
  const restoreLog = usePersonalLogsStore((state) => state.restoreLog);
  const permanentlyDeleteLog = usePersonalLogsStore((state) => state.permanentlyDeleteLog);
  const isGuest = useUserStore((state) => state.isGuest);

  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';
  const { isMd } = useResponsive();

  const [deletedLogInfo, setDeletedLogInfo] = useState<{ id: string; name: string } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPersonalLogs();
  }, []);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleDeleteLog = useCallback(
    async (log: PersonalDrinkLog) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);

      await softDeleteLog(log.id);
      setDeletedLogInfo({ id: log.id, name: log.drinkName });

      deleteTimerRef.current = setTimeout(async () => {
        await permanentlyDeleteLog(log.id);
        setDeletedLogInfo(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, UNDO_TIMEOUT);
    },
    [softDeleteLog, permanentlyDeleteLog]
  );

  const handleUndo = useCallback(async () => {
    if (!deletedLogInfo) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    await restoreLog(deletedLogInfo.id);
    setDeletedLogInfo(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [deletedLogInfo, restoreLog]);

  // 日付ごとにグループ化（新しい順）
  const groupedLogs = useMemo(() => {
    const sorted = [...personalLogs].sort((a, b) =>
      dayjs(b.recordedAt).valueOf() - dayjs(a.recordedAt).valueOf()
    );
    const groups: { date: string; label: string; logs: PersonalDrinkLog[] }[] = [];
    const map = new Map<string, PersonalDrinkLog[]>();

    for (const log of sorted) {
      const dateKey = dayjs(log.recordedAt).format('YYYY-MM-DD');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
        groups.push({
          date: dateKey,
          label: dayjs(log.recordedAt).format('M月D日(ddd)'),
          logs: map.get(dateKey)!,
        });
      }
      map.get(dateKey)!.push(log);
    }
    return groups;
  }, [personalLogs]);

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-4 py-4 border-b flex-row items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} className="flex-row items-center mr-2">
            <Feather name="arrow-left" size={22} color="#0ea5e9" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              すべての記録
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {personalLogs.filter((l) => !l.deletedAt).length}件 • 長押しで削除
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, alignItems: isMd ? 'center' : undefined }}>
          <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-4xl' : ''}`}>
            {groupedLogs.length > 0 ? (
              groupedLogs.map((group, gIndex) => (
                <Animated.View
                  key={group.date}
                  entering={FadeInDown.delay(gIndex * 40).duration(500)}
                  className="mb-5"
                >
                  <Text className={`text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {group.label}
                  </Text>
                  <View className="gap-y-3">
                    {group.logs.map((log) => (
                      <Animated.View key={log.id} exiting={FadeOut.duration(300)}>
                        <PersonalLogCard
                          log={log}
                          allLogs={personalLogs}
                          onLongPress={handleDeleteLog}
                        />
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              ))
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="archive" size={32} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </View>
                  <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>記録がありません</Text>
                </View>
              </Card>
            )}
          </ResponsiveContainer>
        </ScrollView>
      </View>

      {/* Undo Toast */}
      {deletedLogInfo && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(300)}
          className="absolute bottom-8 left-4 right-4"
        >
          <View className="bg-gray-800 rounded-xl px-4 py-3 flex-row items-center justify-between shadow-lg">
            <View className="flex-1 mr-3">
              <Text className="text-white font-medium" numberOfLines={1}>
                「{deletedLogInfo.name}」を削除しました
              </Text>
              {!isGuest && (
                <Text className="text-gray-400 text-xs mt-0.5">XPが借金として記録されます</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleUndo} className="bg-primary-500 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">元に戻す</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
