import React from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export function Input({
  label,
  error,
  icon,
  helperText,
  className,
  style,
  ...props
}: InputProps) {
  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>}
      <View
        className={`
          flex-row items-center
          bg-gray-50 border rounded-xl px-4 py-3
          ${error ? 'border-red-500' : 'border-gray-200'}
        `}
      >
        {icon && <View className="mr-2">{icon}</View>}
        <TextInput
          className={`flex-1 text-base text-gray-900 ${className || ''}`}
          style={[
            {
              minHeight: Platform.OS === 'ios' ? 20 : undefined,
              paddingVertical: 0,
            },
            style,
          ]}
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          spellCheck={false}
          {...props}
        />
      </View>
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-1">{helperText}</Text>
      )}
    </View>
  );
}
