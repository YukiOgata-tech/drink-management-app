import { useWindowDimensions } from 'react-native';

// Breakpoints (based on common device widths)
export const BREAKPOINTS = {
  sm: 640,   // Small phones
  md: 768,   // Large phones / Small tablets
  lg: 1024,  // Tablets
  xl: 1280,  // Large tablets / Desktop
} as const;

// Max content width for centered layouts
export const MAX_CONTENT_WIDTH = {
  sm: 640,
  md: 720,
  lg: 960,
  form: 480,  // For forms and auth screens
} as const;

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
  // Breakpoint checks
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  // For grid layouts
  numColumns: number;
  // Content width
  contentWidth: number;
  formWidth: number;
}

/**
 * Hook to get responsive information based on screen dimensions
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isPhone = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.xl;
  const isDesktop = width >= BREAKPOINTS.xl;

  const deviceType: DeviceType = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'phone';

  // Breakpoint checks
  const isSm = width >= BREAKPOINTS.sm;
  const isMd = width >= BREAKPOINTS.md;
  const isLg = width >= BREAKPOINTS.lg;
  const isXl = width >= BREAKPOINTS.xl;

  // Calculate number of columns for grid layouts
  let numColumns = 1;
  if (isXl) {
    numColumns = 3;
  } else if (isLg) {
    numColumns = 3;
  } else if (isMd) {
    numColumns = 2;
  }

  // Calculate content width (with max constraint)
  const contentWidth = Math.min(
    width - 48, // Subtract padding
    isLg ? MAX_CONTENT_WIDTH.lg : isMd ? MAX_CONTENT_WIDTH.md : width - 48
  );

  // Form width (narrower for better UX)
  const formWidth = Math.min(width - 48, MAX_CONTENT_WIDTH.form);

  return {
    width,
    height,
    isPhone,
    isTablet,
    isDesktop,
    deviceType,
    isSm,
    isMd,
    isLg,
    isXl,
    numColumns,
    contentWidth,
    formWidth,
  };
}

/**
 * Get responsive padding based on screen width
 */
export function getResponsivePadding(width: number): number {
  if (width >= BREAKPOINTS.lg) return 48;
  if (width >= BREAKPOINTS.md) return 32;
  return 24;
}

/**
 * Calculate centered container style
 */
export function getCenteredContainerStyle(width: number, maxWidth?: number) {
  const padding = getResponsivePadding(width);
  const effectiveMaxWidth = maxWidth || MAX_CONTENT_WIDTH.lg;
  const contentWidth = Math.min(width - padding * 2, effectiveMaxWidth);
  const marginHorizontal = (width - contentWidth) / 2;

  return {
    paddingHorizontal: marginHorizontal > padding ? marginHorizontal : padding,
    maxWidth: effectiveMaxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
  };
}
