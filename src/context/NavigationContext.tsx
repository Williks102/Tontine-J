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
  const [history, setHistory] = useState<{ tab: string; page: string }[]>([
    { tab: 'tableaudebord', page: 'main' }
  ]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setCurrentPage('main');
    
    // Push tab change onto history, or reset if it's the home tabs to avoid memory leak or circular backs
    const isHome = tab === 'tableaudebord' || tab === 'admin_activite';
    if (isHome) {
      setHistory([{ tab, page: 'main' }]);
    } else {
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.tab === tab && last.page === 'main') {
          return prev;
        }
        return [...prev, { tab, page: 'main' }];
      });
    }
  };

  const navigateToPage = (page: string) => {
    setCurrentPage(page);
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const currentTab = last ? last.tab : activeTab;
      return [...prev, { tab: currentTab, page }];
    });
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove the current state
      const prevState = newHistory[newHistory.length - 1];
      
      setActiveTabState(prevState.tab);
      setCurrentPage(prevState.page);
      setHistory(newHistory);
    } else {
      // Determine default home screen
      const defaultTab = activeTab.startsWith('admin_') || activeTab === 'admin_activite' ? 'admin_activite' : 'tableaudebord';
      setActiveTabState(defaultTab);
      setCurrentPage('main');
      setHistory([{ tab: defaultTab, page: 'main' }]);
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
