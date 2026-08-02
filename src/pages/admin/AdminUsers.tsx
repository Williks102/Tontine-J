import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, CreditCard, Pencil, Trash2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useAdminData } from '../../hooks/useAdminData';
import { authFetch } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface AdminUsersProps {
  viewingMember: any;
  setViewingMember: (val: any) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ viewingMember, setViewingMember }) => {
  const { user } = useAuthContext();
  const { users, fetchUsers, banUser, updateUser, deleteUser } = useAdminData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', phone: '', email: '', balance: 0 });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!viewingMember) return;
    setHistoryLoading(true);
    authFetch(`/api/admin/users/${viewingMember.id}/history`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setMemberHistory(Array.isArray(data) ? data : []))
      .catch(() => setMemberHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [viewingMember?.id]);

  const handleBanToggle = async () => {
    if (!viewingMember) return;
    const nextBanState = !viewingMember.isBanned;
    const ok = await banUser(viewingMember.id, nextBanState);
    if (ok) {
      setViewingMember({ ...viewingMember, isBanned: nextBanState });
    }
  };

  const openEdit = () => {
    setEditError(null);
    setEditData({
      firstName: viewingMember.firstName || '',
      phone: viewingMember.phone || '',
      email: viewingMember.email || '',
      balance: viewingMember.balance || 0,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!viewingMember) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await updateUser(viewingMember.id, editData);
      if (res.success) {
        setViewingMember({ ...viewingMember, ...editData });
        setIsEditing(false);
      } else {
        setEditError(res.error || "Erreur lors de la modification.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!viewingMember) return;
    if (!confirm(`Supprimer définitivement le compte de "${viewingMember.firstName}" ? Cette action est irréversible.`)) return;
    setDeleteLoading(true);
    try {
      const res = await deleteUser(viewingMember.id);
      if (res.success) {
        setViewingMember(null);
      } else {
        alert(res.error || "Suppression impossible.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    const term = searchTerm.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      u.phone.includes(term)
    );
  });

  if (viewingMember) {
    return (
      <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 pb-24 font-sans">
        <div className="bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm border border-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${viewingMember.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {viewingMember.isBanned ? 'Banni' : 'Compte Actif'}
            </span>
          </div>
          
          <div className="relative inline-block">
            <img
              src={viewingMember.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"}
              className="w-32 h-32 rounded-[3rem] mx-auto border-4 border-violet-50 object-cover shadow-xl"
            />
          </div>

          {isEditing ? (
            <div className="space-y-3 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Prénom</label>
                <input
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={editData.firstName}
                  onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Téléphone</label>
                <input
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={editData.phone}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">E-mail</label>
                <input
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={editData.email}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Solde (FCFA)</label>
                <input
                  type="number"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={editData.balance}
                  onChange={e => setEditData({ ...editData, balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {editError && <p className="text-xs text-red-500 font-bold">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="ghost" className="flex-1" disabled={editLoading} onClick={() => setIsEditing(false)}>Annuler</Button>
                <Button className="flex-1" disabled={editLoading} onClick={handleSaveEdit}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-black text-gray-800">{viewingMember.firstName}</h2>
                <p className="font-bold text-[#3B0764]">{viewingMember.phone || viewingMember.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-4 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Solde actuel</p>
                    <p className="text-lg font-black text-gray-800">{viewingMember.balance || 0} F</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Rôle</p>
                    <p className="text-lg font-black text-gray-800 capitalize">{viewingMember.role || 'user'}</p>
                 </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 border border-gray-100"
                  onClick={openEdit}
                >
                  <Pencil size={14} className="mr-1.5" /> Éditer
                </Button>
                <Button
                  variant={viewingMember.isBanned ? 'primary' : 'secondary'}
                  className={`flex-1 border-none shadow-md ${viewingMember.isBanned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                  onClick={handleBanToggle}
                >
                  {viewingMember.isBanned ? 'Débannir' : 'Bannir'}
                </Button>
              </div>
              {viewingMember.role !== 'admin' && (
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="w-full flex items-center justify-center gap-2 text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-wide cursor-pointer bg-transparent border-none py-1"
                >
                  <Trash2 size={13} /> {deleteLoading ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="space-y-4 font-sans">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Historique des cotisations</h3>
          <div className="space-y-2">
            {historyLoading ? (
              <div className="text-center py-8 text-xs font-bold text-gray-400">Chargement...</div>
            ) : memberHistory.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100 text-xs font-bold text-gray-400">
                Aucune cotisation de tontine enregistrée pour ce membre.
              </div>
            ) : (
              memberHistory.map((p: any) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-50 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase">{p.groupName || 'Tontine'}</p>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {new Date(p.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-green-600">+{(p.amount || 0).toLocaleString()} F</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 font-sans animate-in fade-in duration-300">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          placeholder="Rechercher par numéro ou nom..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#3B0764]/20"
        />
      </div>

      <div className="space-y-3 font-sans">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Aucun membre trouvé
          </div>
        ) : (
          filteredUsers.map((u: any) => (
            <Card 
              key={u.id} 
              className="p-4 shadow-sm border-gray-50 group transition-all hover:border-[#3B0764]/30 cursor-pointer" 
              onClick={() => setViewingMember(u)}
            >
              <div className="flex items-center gap-4">
                <img 
                  src={u.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"} 
                  className="w-12 h-12 rounded-full border border-gray-100 object-cover" 
                />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-gray-800">{u.firstName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{u.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${u.isBanned ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                      {u.isBanned ? 'Banni' : 'Actif'}
                   </div>
                   <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
