/**
 * Runtime theming. The backend serves a resolved palette per surface
 * (public / admin) as HSL channel strings; we write them onto :root as CSS
 * variables, so the same components re-skin instantly when staff change the
 * palette in Settings.
 */
export interface ThemeTokens {
  [token: string]: string;
}

export interface ResolvedTheme {
  palette: string;
  label?: string;
  mode?: 'light' | 'dark' | 'system';
  tokens: ThemeTokens;
}

/** Apply palette tokens (and optional light/dark mode) to the document root. */
export function applyTheme(theme: ResolvedTheme | null | undefined): void {
  if (!theme?.tokens) return;
  const root = document.documentElement;

  for (const [token, value] of Object.entries(theme.tokens)) {
    if (token === 'radius') {
      root.style.setProperty('--radius', value);
    } else {
      root.style.setProperty(`--${token}`, value);
    }
  }
  // card-foreground / input mirror foreground / border unless the palette overrides them.
  if (!theme.tokens['card-foreground'] && theme.tokens.foreground) {
    root.style.setProperty('--card-foreground', theme.tokens.foreground);
  }
  if (!theme.tokens.input && theme.tokens.border) {
    root.style.setProperty('--input', theme.tokens.border);
  }

  resolveMode(theme.mode);
}

function resolveMode(mode: ResolvedTheme['mode']): void {
  const root = document.documentElement;
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', Boolean(dark));
}
