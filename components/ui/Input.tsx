import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Platform,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useThemeStore } from '@/stores/theme';

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
  style,
  ...props
}: InputProps) {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, isDark && darkStyles.label]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          isDark && darkStyles.inputWrapper,
          error && styles.inputWrapperError,
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, isDark && darkStyles.input, style as TextStyle]}
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          autoCorrect={false}
          spellCheck={false}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && (
        <Text style={[styles.helperText, isDark && darkStyles.helperText]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  iconWrapper: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    minHeight: Platform.OS === 'ios' ? 20 : undefined,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});

const darkStyles = StyleSheet.create({
  label: {
    color: '#e5e7eb',
  },
  inputWrapper: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  input: {
    color: '#f9fafb',
  },
  helperText: {
    color: '#9ca3af',
  },
});
