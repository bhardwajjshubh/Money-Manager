import { createContext, useState, useContext, useCallback } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <DataContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within DataProvider');
  }
  return context;
}
