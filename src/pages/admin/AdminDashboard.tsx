import React, { useEffect, useState } from 'react';
import {
  Users, Wallet, ArrowLeft, Search, LayoutGrid, DollarSign, Calendar, Filter,
  TrendingUp, CreditCard, ShieldAlert, UserPlus, PiggyBank, Activity
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';

const activityIcon = (type: string) => {
  switch (type) {
    case 'group_join': return UserPlus;
    case 'group_created': return PiggyBank;
    case 'card_created': return LayoutGrid;
    case 'card_payment': return CreditCard;
    default: return Activity;
  }
};

const activityLabel = (item: any) => {
  const who = item.userFirstName || 'Un membre';
  switch (item.type) {
    case 'group_join':
      return `${who} a rejoint "${item.detail}"${item.positions ? ` (${item.positions} bras)` : ''}`;
    case 'group_created':
      return `Nouveau groupe de tontine créé : "${item.detail}"`;
    case 'card_created':
      return `${who} a ouvert la carte "${item.detail}"`;
    case 'card_payment':
      return `${who} a coté sur la carte "${item.detail}"`;
    default:
      return item.detail || 'Activité';
  }
};

export const AdminDashboard: React.FC<{ setViewingMember?: (val: any) => void }> = ({ setViewingMember }) => {
  const { user } = useAuthContext();
  const { setActiveTab } = useNavigation();
  const { stats, fetchStats } = useAdminData();
  const [showCommissions, setShowCommissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'card' | 'group'>('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
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

  const s = stats as any;
  const recentActivity: any[] = s.recentActivity || [];

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

      {/* KPI Tontines */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tontines de Groupe</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setActiveTab('admin_tontines')} className="text-left bg-gradient-to-br from-[#FEFBE8] to-[#FEF08A] border border-[#FEF08A] p-3.5 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider leading-none">Complètes</span>
              <TrendingUp size={14} className="text-amber-600" />
            </div>
            <p className="text-lg font-black text-[#713F12] mt-1.5">{s.activeGroupsCount || 0}</p>
          </button>
          <button onClick={() => setActiveTab('admin_tontines')} className="text-left bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] p-3.5 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider leading-none">En Recrutement</span>
              <Calendar size={14} className="text-purple-600" />
            </div>
            <p className="text-lg font-black text-purple-950 mt-1.5">{s.openGroupsCount || 0}</p>
          </button>
        </div>
      </div>

      {/* KPI Cartes */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cartes d&apos;épargne</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setActiveTab('macarte')} className="text-left bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-blue-700 tracking-wider leading-none">Ouvertes</span>
              <LayoutGrid size={14} className="text-blue-600" />
            </div>
            <p className="text-lg font-black text-blue-950 mt-1.5">{s.activeCardsCount || 0}</p>
          </button>
          <button onClick={() => setActiveTab('macarte')} className="text-left bg-gradient-to-br from-[#ECFDF5] to-[#A7F3D0] border border-[#A7F3D0] p-3.5 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider leading-none">Complétées</span>
              <CreditCard size={14} className="text-emerald-600" />
            </div>
            <p className="text-lg font-black text-emerald-950 mt-1.5">{s.completedCardsCount || 0}</p>
          </button>
        </div>
      </div>

      {/* KPI Financier & Modération */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider leading-none">Mises Sûres</span>
            <DollarSign size={14} className="text-gray-400" />
          </div>
          <p className="text-sm font-black text-gray-800 mt-1.5">{(s.totalVolumeCirculating || 0).toLocaleString()} F</p>
        </div>
        <button onClick={() => setActiveTab('admin_utilisateurs')} className="text-left bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider leading-none">Membres Bannis</span>
            <ShieldAlert size={14} className="text-rose-500" />
          </div>
          <p className="text-lg font-black text-rose-900 mt-1.5">{s.bannedUsersCount || 0}</p>
        </button>
      </div>

      {/* Activités récentes (tontines, cartes, adhésions — pas seulement les utilisateurs) */}
      <div className="space-y-4 font-sans">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#3B0764]" />
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Activités récentes</h3>
        </div>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-gray-100 flex flex-col items-center justify-center gap-2">
               <Activity size={24} className="text-gray-200" />
               <p className="text-[10px] font-bold text-gray-400 uppercase">Aucune activité pour l&apos;instant</p>
            </div>
          ) : (
            recentActivity.map((item: any, i: number) => {
              const Icon = activityIcon(item.type);
              return (
                <div key={item.id || i} className="bg-white p-4 rounded-2xl border border-gray-50 flex items-center gap-3 text-xs shadow-sm">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                    {item.userSelfie ? (
                      <img src={item.userSelfie} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Icon size={15} className="text-[#3B0764]/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 leading-snug">{activityLabel(item)}</p>
                    <p className="text-gray-400 text-[10px] font-bold mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
