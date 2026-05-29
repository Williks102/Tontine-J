import React, { useEffect } from 'react';
import { Users, Wallet, Clock } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';

export const AdminDashboard: React.FC<{ setViewingMember?: (val: any) => void }> = ({ setViewingMember }) => {
  const { user } = useAuthContext();
  const { setActiveTab } = useNavigation();
  const { stats, users, fetchStats, fetchUsers } = useAdminData();

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
        <Card className="bg-green-500 text-white p-6 cursor-pointer" onClick={() => setActiveTab('admin_tontines')}>
          <p className="text-[10px] font-bold uppercase opacity-80">Commissions Admin</p>
          <div className="flex items-end justify-between mt-1 font-sans">
            <span className="text-xl font-black">{stats.totalMoney.toLocaleString()} F</span>
            <Wallet size={20} className="opacity-50 mb-1" />
          </div>
        </Card>
      </div>

      <div className="space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Membres récents</h3>
          <button onClick={() => setActiveTab('admin_utilisateurs')} className="text-[10px] font-black text-[#3B0764] uppercase underline cursor-pointer">Voir tout</button>
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
                      <img src={item.selfieUrl} alt="" className="w-full h-full object-cover" />
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
