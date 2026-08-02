import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GroupNavTarget {
  groupId: string;
  groupTab?: 'mes-tontines' | 'boutique';
}

interface NavState {
  tab: string;
  page: string;
}

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  goBack: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  groupNavTarget: GroupNavTarget | null;
  setGroupNavTarget: (target: GroupNavTarget | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const DEFAULT_STATE: NavState = { tab: 'tableaudebord', page: 'main' };

// Pousse un nouvel état dans l'historique réel du navigateur, sauf s'il est
// identique à l'état courant (évite d'empiler des doublons quand plusieurs
// composants déclenchent la même navigation, ex: clic sur un onglet qui
// appelle setActiveTab puis setCurrentPage('main')).
const pushIfChanged = (next: NavState) => {
  const current = window.history.state as NavState | null;
  if (current && current.tab === next.tab && current.page === next.page) return;
  window.history.pushState(next, '');
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>(DEFAULT_STATE.tab);
  const [currentPage, setCurrentPageState] = useState<string>(DEFAULT_STATE.page);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [groupNavTarget, setGroupNavTarget] = useState<GroupNavTarget | null>(null);

  // Ancre l'écran courant dans l'historique du navigateur, pour que le
  // bouton "retour" du téléphone navigue DANS l'application (via popstate)
  // au lieu d'en sortir directement.
  useEffect(() => {
    const existing = window.history.state as NavState | null;
    if (!existing || !existing.tab) {
      window.history.replaceState(DEFAULT_STATE, '');
    }

    const onPopState = (event: PopStateEvent) => {
      const state = (event.state as NavState) || DEFAULT_STATE;
      setActiveTabState(state.tab);
      setCurrentPageState(state.page);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    const next: NavState = { tab, page: 'main' };
    setActiveTabState(tab);
    setCurrentPageState('main');

    // Les onglets "maison" remplacent l'entrée courante pour éviter une
    // pile d'historique qui grossit sans fin quand on navigue d'onglet en
    // onglet ; les autres écrans s'empilent pour que "retour" les referme.
    const isHome = tab === 'tableaudebord' || tab === 'admin_activite';
    if (isHome) {
      window.history.replaceState(next, '');
    } else {
      pushIfChanged(next);
    }
  }, []);

  const setCurrentPage = useCallback((page: string) => {
    setCurrentPageState(page);
    // Lit l'onglet depuis l'historique du navigateur plutôt que depuis la
    // fermeture React (qui peut être périmée si setActiveTab vient d'être
    // appelé dans le même gestionnaire d'événement, avant le prochain rendu).
    const currentTab = (window.history.state as NavState | null)?.tab || activeTab;
    pushIfChanged({ tab: currentTab, page });
  }, [activeTab]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <NavigationContext.Provider value={{
      activeTab,
      setActiveTab,
      currentPage,
      setCurrentPage,
      goBack,
      isMenuOpen,
      setIsMenuOpen,
      groupNavTarget,
      setGroupNavTarget,
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
