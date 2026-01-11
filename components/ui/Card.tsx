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
  const variantStyles = {
    default: 'bg-white',
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-white border border-gray-200',
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
