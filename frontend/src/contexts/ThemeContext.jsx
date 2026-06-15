import { createContext, useContext, useEffect, useState } from 'react';

// JSX version (no TypeScript types)
const ThemeContext = createContext(undefined);

/** Build-time default (Vite define); Docker image often lacks backend/.env during build — server overrides via /api/ui-config. */
function parseBuildDarkModeToggle() {
  try {
    const v = import.meta.env.VITE_DARK_MODE_TOGGLE;
    if (v === undefined || v === '') return true;
    return String(v).toLowerCase() !== 'false' && String(v) !== '0';
  } catch {
    return true;
  }
}

export const ThemeProvider = ({ children }) => {
  const [darkModeToggleEnabled, setDarkModeToggleEnabled] = useState(parseBuildDarkModeToggle);
  /** After first /api/ui-config response (or failure) — avoids showing the toggle when build baked true but server says false. */
  const [uiConfigHydrated, setUiConfigHydrated] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (!parseBuildDarkModeToggle()) return 'light';
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ui-config', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.darkModeToggle === 'boolean') {
          setDarkModeToggleEnabled(data.darkModeToggle);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUiConfigHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!darkModeToggleEnabled && theme !== 'light') {
      setTheme('light');
      return;
    }
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, darkModeToggleEnabled]);

  const toggleTheme = () => {
    if (!darkModeToggleEnabled) return;
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, darkModeToggleEnabled, uiConfigHydrated }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

