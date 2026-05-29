import React, { createContext, useContext, useState } from 'react';

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  goBack: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>('tableaudebord');
  const [currentPage, setCurrentPage] = useState<string>('main');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>(['main']);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setCurrentPage('main');
    setHistory(['main']);
  };

  const navigateToPage = (page: string) => {
    setCurrentPage(page);
    setHistory((prev) => [...prev, page]);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevPage = newHistory[newHistory.length - 1];
      setCurrentPage(prevPage);
      setHistory(newHistory);
    } else {
      setCurrentPage('main');
    }
  };

  return (
    <NavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      currentPage, 
      setCurrentPage: navigateToPage, 
      goBack,
      isMenuOpen,
      setIsMenuOpen
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
