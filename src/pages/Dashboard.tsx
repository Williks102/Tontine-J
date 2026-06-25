import React, { useEffect, useState } from 'react';
import { PiggyBank, Trophy, CreditCard, History, ShieldCheck, UserPlus, Wallet } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { useGroups } from '../hooks/useGroups';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WalletRechargeModal } from '../components/WalletRechargeModal';

export const Dashboard: React.FC = () => {
  const { user, fetchMe } = useAuthContext();
  const { setActiveTab, setCurrentPage, setGroupNavTarget } = useNavigation();
  const { userGroups, fetchUserGroups } = useGroups();
  const [globalStats, setGlobalStats] = React.useState<any>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/global/stats')
      .then(res => res.json())
      .then(data => setGlobalStats(data))
      .catch(err => console.error("Error loading SSOT stats:", err));
  }, []);

  return (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 font-sans">

      <AnimatePresence>
        {showRechargeModal && (
          <WalletRechargeModal
            onClose={() => setShowRechargeModal(false)}
            onSuccess={() => { setShowRechargeModal(false); fetchMe(); }}
          />
        )}
      </AnimatePresence>

      {/* Wallet Banner */}
      <div className="bg-gradient-to-br from-[#3B0764] to-[#6D28D9] rounded-3xl p-5 flex items-center justify-between text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Mon Solde</p>
            <p className="text-2xl font-black">{(user?.balance || 0).toLocaleString()} <span className="text-sm font-bold text-white/70">FCFA</span></p>
          </div>
        </div>
        <button
          onClick={() => setShowRechargeModal(true)}
          className="bg-amber-400 text-[#3B0764] px-4 py-2.5 rounded-2xl text-xs font-black hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-md"
        >
          + Recharger
        </button>
      </div>

      {/* Header Profile */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
        <div className="relative">
          <img
            src={user?.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"}
            className="w-14 h-14 rounded-full border-2 border-violet-100 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800">Bonjour, {user?.firstName}</h2>
          <p className="text-xs text-gray-500">{userGroups.length} tontine(s) inscrite(s)</p>
        </div>
      </div>

      {/* Global SSOT Platform Metrics Widget (Dynamic and Shared) */}
      {globalStats && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase text-purple-700 tracking-wider leading-none">Actives</span>
            <p className="text-base font-black text-purple-950 mt-1">{globalStats.activeGroupsCount || 0} grp</p>
          </div>
          <div className="bg-gradient-to-br from-[#FEFBE8] to-[#FEF08A] border border-[#FEF08A] p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase text-amber-700 tracking-wider leading-none">Inscriptions</span>
            <p className="text-base font-black text-amber-950 mt-1">{globalStats.openGroupsCount || 0} grp</p>
          </div>
          <div className="bg-gradient-to-br from-[#ECFDF5] to-[#A7F3D0] border border-[#A7F3D0] p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase text-emerald-700 tracking-wider leading-none">Mises Sûres</span>
            <p className="text-[11px] font-black text-emerald-950 mt-1">{(globalStats.totalVolumeCirculating || 0).toLocaleString()} F</p>
          </div>
        </div>
      )}

      {userGroups.length === 0 ? (
        <Card className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <PiggyBank size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-800 font-bold">Aucune tontine active</p>
            <p className="text-xs text-gray-400">Rejoignez un groupe pour commencer à épargner.</p>
          </div>
          <Button onClick={() => setActiveTab('groupes')} className="w-full sm:w-auto mx-auto font-black cursor-pointer">Explorer les groupes</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
            <Trophy size={18} className="text-orange-500" />
            Vos Tontines Actuelles
          </h3>
          {userGroups.map((g, i) => (
            <Card key={i} className="space-y-4 relative overflow-hidden cursor-pointer" onClick={() => { setActiveTab('groupes'); setGroupNavTarget({ groupId: g.id, groupTab: 'mes-tontines' }); }}>
              {g.status === 'active' && <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase">En cours</div>}
              
              <div className="flex justify-between items-center pr-12">
                <h3 className="font-bold text-gray-800">{g.name}</h3>
                <span className="text-[10px] text-gray-400 font-bold">{g.positions} bras</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[8px] text-gray-400 font-black uppercase">Mise + Commission</p>
                  <p className="text-xs font-black text-gray-800">{(g.stake * 1.1).toLocaleString()} F</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl text-right">
                  <p className="text-[8px] text-gray-400 font-black uppercase">Places</p>
                  <p className="text-xs font-black text-gray-800">{g.currentMembersCount}/{g.maxMembers}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: CreditCard, label: 'Paiements', color: 'bg-violet-50 text-violet-600', onClick: () => setActiveTab('paiements') },
          { icon: History, label: 'Historique', color: 'bg-green-50 text-green-600', onClick: () => {} },
          { icon: ShieldCheck, label: 'Ma Sécurité', color: 'bg-orange-50 text-orange-600', onClick: () => {} },
          { icon: UserPlus, label: 'Parrainer', color: 'bg-blue-50 text-blue-600', onClick: () => setActiveTab('parrainage') },
        ].map((action, i) => (
          <button 
            key={i} 
            onClick={action.onClick}
            className={`${action.color} p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95 transition-all text-left cursor-pointer`}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50">
              <action.icon size={18} />
            </div>
            <span className="text-[10px] font-bold leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
