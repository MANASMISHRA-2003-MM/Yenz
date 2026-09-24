import React, { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('krawing_mode') || 'cravings';
  });

  useEffect(() => {
    localStorage.setItem('krawing_mode', activeMode);
  }, [activeMode]);

  const switchMode = (mode) => {
    if (!mode) return;
    const normalized = mode.toString().toLowerCase();
    if (normalized === 'cravings' || normalized === 'fresh') {
      setActiveMode(normalized);
    }
  };

  const isFresh = activeMode === 'fresh';
  const isCravings = activeMode === 'cravings';

  return (
    <ModeContext.Provider value={{ activeMode, mode: activeMode, switchMode, isFresh, isCravings }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
