import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useResponsive, MAX_CONTENT_WIDTH } from '@/lib/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'form' | 'full';
  /** Additional className for NativeWind */
  className?: string;
  /** Additional style */
  style?: ViewStyle;
  /** Center content horizontally */
  centered?: boolean;
}

/**
 * A container component that constrains content width on larger screens
 * while allowing full width on phones
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'lg',
  className = '',
  style,
  centered = true,
}: ResponsiveContainerProps) {
  const { width, isPhone } = useResponsive();

  // On phones, use full width with standard padding
  if (isPhone || maxWidth === 'full') {
    return (
      <View className={`w-full ${className}`} style={style}>
        {children}
      </View>
    );
  }

  // On tablets/desktop, constrain width
  const maxWidthValue = MAX_CONTENT_WIDTH[maxWidth] || MAX_CONTENT_WIDTH.lg;
  const containerStyle: ViewStyle = {
    width: '100%',
    maxWidth: maxWidthValue,
    ...(centered && { alignSelf: 'center' }),
  };

  return (
    <View style={[containerStyle, style]} className={className}>
      {children}
    </View>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Minimum width of each item */
  minItemWidth?: number;
  /** Gap between items */
  gap?: number;
  /** Additional className */
  className?: string;
}

/**
 * A responsive grid component that automatically adjusts columns based on screen width
 */
export function ResponsiveGrid({
  children,
  minItemWidth = 300,
  gap = 16,
  className = '',
}: ResponsiveGridProps) {
  const { width, numColumns, isPhone } = useResponsive();

  // Calculate actual number of columns based on available width
  const availableWidth = width - 48; // Account for padding
  const calculatedColumns = Math.max(1, Math.floor(availableWidth / minItemWidth));
  const columns = isPhone ? 1 : Math.min(calculatedColumns, numColumns);

  const childArray = React.Children.toArray(children);

  if (columns === 1) {
    return (
      <View className={className} style={{ gap }}>
        {children}
      </View>
    );
  }

  // Create rows for multi-column layout
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < childArray.length; i += columns) {
    rows.push(childArray.slice(i, i + columns));
  }

  return (
    <View className={className} style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            gap,
          }}
        >
          {row.map((child, colIndex) => (
            <View key={colIndex} style={{ flex: 1 }}>
              {child}
            </View>
          ))}
          {/* Fill empty columns in last row */}
          {row.length < columns &&
            Array(columns - row.length)
              .fill(null)
              .map((_, i) => <View key={`empty-${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/**
 * A wrapper for form layouts with appropriate max-width
 */
export function ResponsiveFormContainer({
  children,
  className = '',
  style,
}: Omit<ResponsiveContainerProps, 'maxWidth'>) {
  return (
    <ResponsiveContainer maxWidth="form" className={className} style={style}>
      {children}
    </ResponsiveContainer>
  );
}
