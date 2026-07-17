import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

/**
 * ThemeProvider — locked to light mode.
 * Dark mode will be re-introduced with a new theme system in a future release.
 */
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Always enforce light mode — remove any previously stored dark class
    document.documentElement.classList.remove('dark');
    localStorage.setItem('aura-theme', 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme — always returns light mode until new dark theme is implemented.
 * @returns {{ theme: 'light', toggleTheme: () => void, isDark: false }}
 */
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
