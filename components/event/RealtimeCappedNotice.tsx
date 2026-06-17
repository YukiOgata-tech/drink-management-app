import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * リアルタイム上限（開催中イベントが多すぎる）に達したときに出すユーモア通知。
 * 画面操作・記録は通常どおり可能で、自動更新だけが休止していることを伝える。
 */
export function RealtimeCappedNotice({ isDark }: { isDark: boolean }) {
  return (
    <View
      className="flex-row items-start rounded-2xl px-4 py-3 mb-4"
      style={{
        backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a',
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 8 }}>🎉</Text>
      <View className="flex-1">
        <Text className={`text-sm font-bold mb-0.5 ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
          ただいま大人気につき混雑中！
        </Text>
        <Text className={`text-xs leading-5 ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
          全国で飲み会が同時多発しすぎて、自動更新を一時お休み中です🍻{'\n'}
          画面を下に引っ張ると最新の記録に更新できます。
        </Text>
        <View className="flex-row items-center mt-1.5">
          <Feather name="refresh-cw" size={11} color={isDark ? '#fbbf24' : '#b45309'} />
          <Text className={`text-[11px] font-semibold ml-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            手動更新モード
          </Text>
        </View>
      </View>
    </View>
  );
}
