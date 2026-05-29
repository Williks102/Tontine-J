import React from 'react';
import { 
  LayoutDashboard, LayoutGrid, CreditCard, Users, 
  UserCircle, Headset, BarChart3, PiggyBank, Settings, 
  ShieldCheck, LogOut 
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthContext();
  const { activeTab, setActiveTab, isMenuOpen, setIsMenuOpen, setCurrentPage } = useNavigation();

  const userTabs = [
    { id: 'tableaudebord', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'macarte', label: 'Ma Carte', icon: LayoutGrid },
    { id: 'paiements', label: 'Paiements', icon: CreditCard },
    { id: 'groupes', label: 'Mes Groupes', icon: Users },
    { id: 'profil', label: 'Profil', icon: UserCircle },
    { id: 'support', label: 'Support', icon: Headset },
  ];

  const adminTabs = [
    { id: 'admin_activite', label: 'Aperçu', icon: BarChart3 },
    { id: 'macarte', label: 'Ma Carte', icon: LayoutGrid },
    { id: 'admin_tontines', label: 'Groupes', icon: PiggyBank },
    { id: 'admin_utilisateurs', label: 'Utilisateurs', icon: Users },
    { id: 'admin_parametres', label: 'Réglages', icon: Settings },
  ];

  const tabs = user?.role === 'admin' ? adminTabs : userTabs;

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#3B0764] text-white border-r border-[#3B0764]/20 transform transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full flex flex-col p-6 font-sans">
        <div 
          className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
            setCurrentPage('main');
          }}
        >
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-[#3B0764] shadow-lg shadow-amber-400/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">Tontine<span className="text-amber-400">Pro</span></h1>
            <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">{user?.role === 'admin' ? 'Administration' : 'Espace Client'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage('main');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left ${
                activeTab === tab.id 
                  ? 'bg-amber-400 text-[#3B0764] shadow-xl shadow-amber-400/15 scale-[1.02]' 
                  : 'text-purple-200 hover:bg-white/5'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-purple-900/40">
           <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl mb-4">
             <img src={user?.selfieUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-bold text-white truncate">{user?.firstName}</p>
               <p className="text-[10px] text-purple-300 truncate">{user?.phone}</p>
             </div>
           </div>
           <button 
             onClick={logout}
             className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-white/5 transition-all text-left cursor-pointer"
           >
             <LogOut size={20} />
             Déconnexion
           </button>
        </div>
      </div>
    </div>
  );
};
