import React, { useEffect, useState } from 'react';
import { Users, Wallet, Clock, ArrowLeft, Search, LayoutGrid, DollarSign, Calendar, Filter } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';

export const AdminDashboard: React.FC<{ setViewingMember?: (val: any) => void }> = ({ setViewingMember }) => {
  const { user } = useAuthContext();
  const { setActiveTab } = useNavigation();
  const { stats, users, fetchStats, fetchUsers } = useAdminData();
  const [showCommissions, setShowCommissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'card' | 'group'>('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
      fetchUsers();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-10 text-center font-sans">
        <p className="text-red-500 font-bold">Accès non autorisé</p>
      </div>
    );
  }

  // Filter commissions list based on query and type
  const commissionsHistory = stats.commissionsHistory || [];
  const filteredCommissions = commissionsHistory.filter((item: any) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = 
      (item.userFirstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.userPhone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sourceName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (showCommissions) {
    return (
      <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 font-sans">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCommissions(false)}
            className="w-10 h-10 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer border-none outline-none"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-800">Suivi des Commissions</h2>
            <p className="text-xs font-bold text-gray-400">Détails des gains générés par l'application</p>
          </div>
        </div>

        {/* Breakdown stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-violet-50 border-violet-100 flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-black text-violet-500 uppercase">Cartes Épargne</p>
              <h4 className="text-sm font-black text-violet-950 mt-1">{(stats.cardComTotal || 0).toLocaleString()} F</h4>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[10px] font-black text-violet-400 bg-violet-100/50 px-1.5 py-0.5 rounded-md">100% Dernier jour</span>
            </div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-100 flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-black text-amber-600 uppercase">Tontines de Groupe</p>
              <h4 className="text-sm font-black text-amber-950 mt-1">{(stats.tontineComTotal || 0).toLocaleString()} F</h4>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[10px] font-black text-amber-500 bg-amber-100/50 px-1.5 py-0.5 rounded-md">10% à l'adhésion</span>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-110 flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-black text-emerald-600 uppercase">Gains Totaux</p>
              <h4 className="text-sm font-black text-emerald-950 mt-1">{(stats.totalMoney || 0).toLocaleString()} F</h4>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded-md">Solde Réel</span>
            </div>
          </Card>
        </div>

        {/* Filters and search bar */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex-1 relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Rechercher par membre, numéro ou projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs rounded-xl border border-transparent focus:border-purple-200 outline-none transition-all placeholder:text-gray-300 font-bold"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border outline-none cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-[#3B0764] text-white border-[#3B0764]' 
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterType('card')}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border outline-none cursor-pointer ${
                filterType === 'card' 
                  ? 'bg-[#3B0764] text-white border-[#3B0764]' 
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              Cartes
            </button>
            <button 
              onClick={() => setFilterType('group')}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border outline-none cursor-pointer ${
                filterType === 'group' 
                  ? 'bg-[#3B0764] text-white border-[#3B0764]' 
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              Groupes
            </button>
          </div>
        </div>

        {/* List representation of filtered entries */}
        <div className="space-y-2">
          {filteredCommissions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-100 text-center py-16 flex flex-col items-center justify-center gap-3">
              <DollarSign size={28} className="text-gray-200" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aucune commission correspondante</p>
            </div>
          ) : (
            filteredCommissions.map((item: any, i: number) => (
              <div key={item.id || i} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center justify-between text-xs shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                    {item.userSelfie ? (
                      <img src={item.userSelfie} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={16} className="text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-800">{item.userFirstName || 'Aucun nom'}</p>
                    <p className="text-gray-400 text-[9px] font-bold">
                      {item.userPhone || 'Sans numéro'} • <span className="font-black text-[#3B0764]/75 capitalize">{item.sourceName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600">+{item.amount?.toLocaleString()} FCFA</p>
                    <div className="flex items-center gap-1.5 justify-end text-[8px] font-bold text-gray-400 mt-0.5">
                      <Calendar size={10} />
                      <span>{new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                    item.type === 'card' ? 'text-violet-600 bg-violet-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {item.type === 'card' ? 'Carte' : 'Groupe'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#3B0764] text-white p-6 cursor-pointer" onClick={() => setActiveTab('admin_utilisateurs')}>
          <p className="text-[10px] font-bold uppercase opacity-80">Membres Totaux</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-black">{stats.totalUsers}</span>
            <Users size={20} className="opacity-50 mb-1" />
          </div>
        </Card>
        <Card className="bg-emerald-500 text-white p-6 cursor-pointer" onClick={() => setShowCommissions(true)}>
          <p className="text-[10px] font-bold uppercase opacity-80 font-sans">Commissions Admin</p>
          <div className="flex items-end justify-between mt-1 font-sans">
            <span className="text-xl font-black">{(stats.totalMoney || 0).toLocaleString()} F</span>
            <Wallet size={20} className="opacity-50 mb-1" />
          </div>
        </Card>
      </div>

      {/* Shared Platform Metrics Row - Unified SSOT */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[8px] font-black uppercase text-purple-700 tracking-wider leading-none">Tontines Actives</span>
          <p className="text-sm font-black text-purple-950 mt-1">{(stats as any).activeGroupsCount || 0} Grp</p>
        </div>
        <div className="bg-gradient-to-br from-[#FEFBE8] to-[#FEF08A] border border-[#FEF08A] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[8px] font-black uppercase text-amber-700 tracking-wider leading-none">Tontines Ouvertes</span>
          <p className="text-sm font-black text-[#713F12] mt-1">{(stats as any).openGroupsCount || 0} Grp</p>
        </div>
        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#A7F3D0] border border-[#A7F3D0] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[8px] font-black uppercase text-emerald-700 tracking-wider leading-none">Mises Sûres</span>
          <p className="text-[11px] font-black text-emerald-950 mt-1">{((stats as any).totalVolumeCirculating || 0).toLocaleString()} F</p>
        </div>
      </div>

      <div className="space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Membres récents</h3>
          <button onClick={() => setActiveTab('admin_utilisateurs')} className="text-[10px] font-black text-[#3B0764] uppercase underline cursor-pointer bg-transparent border-none">Voir tout</button>
        </div>
        <div className="space-y-2">
          {(!Array.isArray(users) || users.length === 0) ? (
            <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-gray-100 flex flex-col items-center justify-center gap-2">
               <Users size={24} className="text-gray-200" />
               <p className="text-[10px] font-bold text-gray-400 uppercase">Aucun utilisateur</p>
            </div>
          ) : (
            users.slice(0, 5).map((item: any, i: number) => (
               <div key={item.id || i} 
                 className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center gap-4 text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                 onClick={() => {
                   if (setViewingMember) setViewingMember(item);
                   setActiveTab('admin_utilisateurs');
                 }}
               >
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                    {item.selfieUrl ? (
                      <img src={item.selfieUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Clock size={16} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                     <p className="font-extrabold text-gray-800">{item.firstName}</p>
                     <p className="text-gray-400 text-[10px] font-bold">{item.phone}</p>
                  </div>
                  <div className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${item.isBanned ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50'}`}>
                    {item.isBanned ? 'Banni' : 'Actif'}
                  </div>
               </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
