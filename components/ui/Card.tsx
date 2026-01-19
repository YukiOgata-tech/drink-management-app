import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  children,
  className,
  ...props
}: CardProps) {
  // カスタム背景色が指定されているかチェック
  const hasCustomBg = className?.includes('bg-');

  const variantStyles = {
    default: hasCustomBg ? '' : 'bg-white',
    elevated: hasCustomBg ? 'shadow-lg' : 'bg-white shadow-lg',
    outlined: hasCustomBg ? 'border border-gray-200' : 'bg-white border border-gray-200',
  };

  return (
    <View
      className={`${variantStyles[variant]} rounded-2xl p-4 ${className || ''}`}
      {...props}
    >
      {children}
    </View>
  );
}
