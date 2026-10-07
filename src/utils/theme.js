// marketOS theme — mirrors the web app's CSS variables (web/src/index.css)
// exactly so both platforms feel like the same product.

export const gold = '#F5C518';
export const goldLight = '#FDE047';
export const goldDark = '#D97706';

export const lightTheme = {
  name: 'light',
  background: '#f6f7fa',
  foreground: '#09090b',
  card: '#ffffff',
  cardForeground: '#09090b',
  surface: '#f1f3f7',
  surfaceHover: '#e5e8ee',
  border: '#eceef3',
  accent: '#f1f3f7',
  accentForeground: '#09090b',
  muted: '#f1f3f7',
  mutedForeground: '#6b7280',
  primary: gold,
  primaryForeground: '#000000',
  gold,
  goldLight,
  goldDark,
  green: '#16a34a',
  red: '#ef4444',
  amber: '#d97706',
  emerald: '#059669',
  sky: '#0284c7',
  rose: '#e11d48',
  overlay: 'rgba(0,0,0,0.45)',
  // legacy alias kept so any unmigrated screen still renders safely
  indigo: gold,
};

export const darkTheme = {
  name: 'dark',
  background: '#09090b',
  foreground: '#f4f4f5',
  card: '#121215',
  cardForeground: '#ffffff',
  surface: '#1a1a20',
  surfaceHover: '#22222a',
  border: 'rgba(255, 255, 255, 0.05)',
  accent: '#191920',
  accentForeground: '#ffffff',
  muted: '#17171d',
  mutedForeground: '#8a8a93',
  primary: gold,
  primaryForeground: '#000000',
  gold,
  goldLight,
  goldDark,
  green: '#22c55e',
  red: '#ef4444',
  amber: '#fbbf24',
  emerald: '#34d399',
  sky: '#38bdf8',
  rose: '#fb7185',
  overlay: 'rgba(0,0,0,0.6)',
  // legacy alias kept so any unmigrated screen still renders safely
  indigo: gold,
};

export const getTheme = (isDarkMode) => (isDarkMode ? darkTheme : lightTheme);
