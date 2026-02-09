import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '@/stores/theme';

interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  className?: string;
}

const parseClassName = (className?: string): ViewStyle => {
  if (!className) return {};

  const style: ViewStyle = {};

  // マージン
  if (className.includes('mb-4')) style.marginBottom = 16;
  if (className.includes('mb-6')) style.marginBottom = 24;
  if (className.includes('mt-4')) style.marginTop = 16;
  if (className.includes('mt-6')) style.marginTop = 24;
  if (className.includes('ml-2')) style.marginLeft = 8;
  if (className.includes('mr-2')) style.marginRight = 8;

  // パディング
  if (className.includes('py-8')) style.paddingVertical = 32;
  if (className.includes('p-4')) style.padding = 16;

  // 背景色
  if (className.includes('bg-primary-50')) style.backgroundColor = '#f0f9ff';
  if (className.includes('bg-amber-50')) style.backgroundColor = '#fffbeb';
  if (className.includes('bg-green-50')) style.backgroundColor = '#f0fdf4';
  if (className.includes('bg-red-50')) style.backgroundColor = '#fef2f2';
  if (className.includes('bg-gray-50')) style.backgroundColor = '#f9fafb';
  if (className.includes('bg-white')) style.backgroundColor = '#ffffff';

  // ボーダー
  if (className.includes('border-primary-500')) {
    style.borderColor = '#0ea5e9';
    style.borderWidth = 1;
  }
  if (className.includes('border-amber-200')) {
    style.borderColor = '#fde68a';
    style.borderWidth = 1;
  }

  // フレックス
  if (className.includes('items-center')) style.alignItems = 'center';
  if (className.includes('justify-center')) style.justifyContent = 'center';

  // 透明度
  if (className.includes('opacity-50')) style.opacity = 0.5;

  return style;
};

export function Card({
  variant = 'default',
  children,
  style,
  className,
  ...props
}: CardProps) {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return isDark ? darkStyles.elevated : lightStyles.elevated;
      case 'outlined':
        return isDark ? darkStyles.outlined : lightStyles.outlined;
      default:
        return isDark ? darkStyles.default : lightStyles.default;
    }
  };

  const classNameStyle = parseClassName(className);

  return (
    <View
      style={[styles.base, getVariantStyle(), classNameStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
  },
});

const lightStyles = StyleSheet.create({
  default: {
    backgroundColor: '#ffffff',
  },
  elevated: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

const darkStyles = StyleSheet.create({
  default: {
    backgroundColor: '#1f2937',
  },
  elevated: {
    backgroundColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
});
