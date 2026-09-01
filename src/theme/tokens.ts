import { Platform } from 'react-native';

/** Move Sync's shared visual language. Components consume semantic roles. */
export const theme = {
  color: {
    canvas: '#0A0F17', surface: '#111821', surfaceElevated: '#161E2B', surfacePressed: '#1D2838', surfaceSelected: '#12294B',
    textPrimary: '#FFFFFF', textSecondary: '#9BA5B1', textTertiary: '#748093', accent: '#2F7BFF', accentPressed: '#2363D4', accentSubtle: '#11294D',
    success: '#22C55E', successSubtle: '#0D2A1B', warning: '#F59E0B', warningSubtle: '#34240A', danger: '#EF4444', dangerSubtle: '#351419',
    overlay: 'rgba(2, 6, 12, 0.74)', mediaOverlay: 'rgba(0, 0, 0, 0.72)', mediaCanvas: '#000000', divider: 'rgba(155, 165, 177, 0.16)', focus: '#8DB5FF', white: '#FFFFFF',
  },
  type: {
    family: Platform.select({ web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', ios: 'System', android: 'sans-serif', default: 'System' }),
    pageTitle: { fontSize: 32, lineHeight: 39, fontWeight: '700' as const, letterSpacing: -0.7 }, sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.3 },
    cardTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const }, body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const }, meta: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const }, status: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const }, button: { fontSize: 15, lineHeight: 20, fontWeight: '700' as const },
  },
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 }, radius: { xs: 6, sm: 10, md: 14, lg: 20, pill: 999 }, elevation: { none: 0, raised: 4, floating: 12 },
  breakpoint: { mobile: 0, tablet: 600, desktop: 900, wide: 1280 }, content: { compact: 760, default: 1040, wide: 1400 }, size: { touch: 44, touchCompact: 40, bottomNavigation: 72, sidebar: 244, icon: 20 }, motion: { fast: 150, standard: 200, slow: 250 },
} as const;

/** @deprecated Prefer theme.color semantic names in new components. */
export const colors = { background: theme.color.canvas, surface: theme.color.surface, raised: theme.color.surfaceElevated, border: theme.color.divider, text: theme.color.textPrimary, muted: theme.color.textSecondary, primary: theme.color.accent, primaryDark: theme.color.accentPressed, danger: theme.color.danger, success: theme.color.success, warning: theme.color.warning };

export const textStyles = {
  pageTitle: { ...theme.type.pageTitle, color: theme.color.textPrimary, fontFamily: theme.type.family }, sectionTitle: { ...theme.type.sectionTitle, color: theme.color.textPrimary, fontFamily: theme.type.family }, cardTitle: { ...theme.type.cardTitle, color: theme.color.textPrimary, fontFamily: theme.type.family }, body: { ...theme.type.body, color: theme.color.textPrimary, fontFamily: theme.type.family }, meta: { ...theme.type.meta, color: theme.color.textSecondary, fontFamily: theme.type.family }, status: { ...theme.type.status, color: theme.color.textSecondary, fontFamily: theme.type.family },
};
