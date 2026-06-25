import React from 'react';
import { ArrowLeft, Home, Menu } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

export const Header: React.FC<{ viewingMember?: any; setViewingMember?: (val: any) => void }> = ({ viewingMember, setViewingMember }) => {
  const { user } = useAuthContext();
  const { activeTab, setActiveTab, currentPage, setCurrentPage, goBack, isMenuOpen, setIsMenuOpen } = useNavigation();

  const isMainTab = activeTab === (user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
  const showBack = !isMainTab || viewingMember || currentPage !== 'main';

  const handleGoBack = () => {
    if (viewingMember) {
      if (setViewingMember) setViewingMember(null);
    } else {
      goBack();
    }
  };

  const navigateHome = () => {
    setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
    setCurrentPage('main');
    if (setViewingMember) setViewingMember(null);
  };

  const getTitle = () => {
    if (viewingMember) return 'Profil Membre';
    if (activeTab === 'accueil') return 'Accueil';
    if (activeTab === 'admin_activite') return 'Tableau de bord';
    if (activeTab === 'admin_utilisateurs') return 'Membres';
    if (activeTab === 'admin_tontines') return 'Groupes';
    if (activeTab === 'macarte') return 'Ma Carte';
    if (activeTab === 'support') return 'Support';
    if (activeTab === 'paiements') return 'Paiements';
    if (activeTab === 'groupes') return 'Groupes';
    return 'TontinePro';
  };

  return (
    <div className="lg:hidden bg-[#3B0764] text-white border-b-4 border-amber-400 px-4 py-4 flex justify-between items-center sticky top-0 z-40 shadow-md font-sans">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={handleGoBack} className="p-2 -ml-2 text-white hover:text-amber-400 transition-colors cursor-pointer">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <button onClick={navigateHome} className="p-2 -ml-2 text-white hover:text-amber-400 transition-colors cursor-pointer">
            <Home size={22} />
          </button>
        )}
        <span 
          className="font-black text-white hover:text-amber-300 cursor-pointer transition-colors text-base uppercase tracking-wider"
          onClick={navigateHome}
        >
          {getTitle()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {!isMainTab && (
          <button
            onClick={navigateHome}
            className="p-2 text-purple-200 hover:text-amber-400 transition-colors cursor-pointer"
            title="Page d'accueil"
          >
            <Home size={20} />
          </button>
        )}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
};
