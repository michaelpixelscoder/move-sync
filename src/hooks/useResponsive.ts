import { Platform, useWindowDimensions } from 'react-native';
import { theme } from '../theme/tokens';
export type Viewport = 'mobile' | 'tablet' | 'desktop' | 'wide';
/** The single responsive contract used by every screen and the app shell. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const viewport: Viewport =
    width >= theme.breakpoint.wide
      ? 'wide'
      : width >= theme.breakpoint.desktop
        ? 'desktop'
        : width >= theme.breakpoint.tablet
          ? 'tablet'
          : 'mobile';
  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';
  const isDesktop = viewport === 'desktop' || viewport === 'wide';
  return {
    width,
    height,
    viewport,
    isMobile,
    isTablet,
    isDesktop,
    isWide: viewport === 'wide',
    platformRole:
      Platform.OS === 'web' && !isMobile
        ? ('web' as const)
        : ('mobile' as const),
    columns: isMobile ? 2 : isTablet ? 3 : 4,
  };
}
