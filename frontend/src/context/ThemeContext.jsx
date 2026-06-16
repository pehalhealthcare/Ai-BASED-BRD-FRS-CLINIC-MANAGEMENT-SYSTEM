import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: /** @type {'light' | 'dark'} */ ('light'),
  toggleTheme: () => {},
  isDark: false,
});

/**
 * ThemeProvider — wraps the app and manages dark/light mode.
 * Persists the preference to localStorage and applies the `dark` class to <html>.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('aura-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    // Respect OS preference as default
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aura-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme — access the current theme and toggle function.
 * @returns {{ theme: 'light' | 'dark', toggleTheme: () => void, isDark: boolean }}
 */
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
