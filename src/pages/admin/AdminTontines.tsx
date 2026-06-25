import React, { useEffect, useState } from 'react';
import { 
  PiggyBank, Plus, Trash2, Users, Check, Calendar, 
  TrendingUp, Coins, Search, Filter, UserMinus, UserPlus, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthContext } from '../../context/AuthContext';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { authFetch } from '../../hooks/useAuth';

export const AdminTontines: React.FC = () => {
  const { user } = useAuthContext();
  const { tontines, fetchTontines, createGroup, deleteGroup } = useAdminData();
  
  // Custom view states
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [formData, setFormData] = useState({ name: '', stake: 5000, maxMembers: 10, durationDays: 30 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'active' | 'completed'>('all');

  // Enrollment state
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [enrollingGroupId, setEnrollingGroupId] = useState<string | null>(null);
  const [enrollUserId, setEnrollUserId] = useState('');
  const [enrollPositions, setEnrollPositions] = useState(1);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isEnrollingLoading, setIsEnrollingLoading] = useState(false);

  // Fetch all registered users in the system to enable direct administrative enrollment
  const fetchSystemUsers = async () => {
    try {
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        // Exclude admins to make selection fast
        setSystemUsers(data.filter((u: any) => u.role !== 'admin'));
      }
    } catch (e) {
      console.error("Error loading system users:", e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTontines();
      fetchSystemUsers();
    }
  }, [user]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      const ok = await createGroup(formData);
      if (ok) {
        setIsCreatingGroup(false);
        setFormData({ name: '', stake: 5000, maxMembers: 10, durationDays: 30 });
        fetchTontines();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id: string, groupName: string) => {
    if (!confirm(`ATTENTION : Voulez-vous vraiment supprimer définitivement le groupe de tontine "${groupName}" ? Toutes les adhésions et l'historique des payments associés seront perdus.`)) {
      return;
    }
    try {
      const ok = await deleteGroup(id);
      if (ok) {
        fetchTontines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Administrative Enrollment
  const handleEnrollMember = async (groupId: string) => {
    if (!enrollUserId) {
      setEnrollError("Veuillez choisir un membre à inscrire.");
      return;
    }
    setIsEnrollingLoading(true);
    setEnrollError(null);
    try {
      const res = await authFetch(`/api/admin/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: enrollUserId,
          positions: enrollPositions
        })
      });

      if (res.ok) {
        setEnrollingGroupId(null);
        setEnrollUserId('');
        setEnrollPositions(1);
        fetchTontines();
      } else {
        const errorData = await res.json();
        setEnrollError(errorData.error || "Erreur lors de l'inscription administrative.");
      }
    } catch (e: any) {
      setEnrollError(e.message || "Problème serveur.");
    } finally {
      setIsEnrollingLoading(false);
    }
  };

  // Administrative Exclude / Remove from group member
  const handleExcludeMember = async (groupId: string, memberRecordId: string, memberName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer de manière administrative "${memberName}" de ce groupe de tontine ? ` +
      `Ses contributions de bras associées et l'historique financier de ce groupe seront supprimés.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/groups/${groupId}/members/${memberRecordId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTontines();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Impossible d'exclure le membre.");
      }
    } catch (e: any) {
      alert("Erreur de connexion : " + e.message);
    }
  };

  // Status toggle administrative bypass query
  const handleStatusChange = async (groupId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'open' ? 'active' : currentStatus === 'active' ? 'completed' : 'open';
    const frenchStatus = nextStatus === 'open' ? 'Recrutement' : nextStatus === 'active' ? 'En cours' : 'Clôturé';
    
    if (!confirm(`Bascule d'état : Voulez-vous changer administrativement le statut de ce groupe à "${frenchStatus}" ?`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/groups/${groupId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchTontines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic calculations for Group Stats Row
  const totalOpenGroups = tontines.filter(g => g.status === 'open').length;
  const totalActiveGroups = tontines.filter(g => g.status === 'active').length;
  
  // Total members enrolled across all groups
  const totalSlotsEnrolled = tontines.reduce((sum, g) => sum + (g.currentMembersCount || 0), 0);
  
  // Admin commissions accumulated from payments record list inside groups
  const totalCommissionsGroup = tontines.reduce((sum, g) => {
    const groupPayments = g.payments || [];
    const groupCom = groupPayments.reduce((s: number, p: any) => s + (p.commission || 0), 0);
    return sum + groupCom;
  }, 0);

  // Filters groups based on search input and state filters matching tabs
  const filteredTontines = tontines.filter(group => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      (group.name || '').toLowerCase().includes(query) ||
      (group.members || []).some((m: any) => 
        (m.firstName || '').toLowerCase().includes(query) || 
        (m.phone || '').includes(query)
      );

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && group.status === statusFilter;
  });

  return (
    <div className="p-4 pb-24 space-y-6 font-sans text-gray-800">
      
      {/* Upper Navigation & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <Users className="text-[#3B0764] stroke-[2.5]" size={26} />
            Gestion des Tontines de Groupe
          </h2>
          <p className="text-xs font-bold text-gray-400">
            Créez des groupes, inscrivez ou excluez des membres directs, gérez l&apos;évolution des tours et suivez les frais de service.
          </p>
        </div>
        
        <Button 
          variant="primary" 
          className="self-start md:self-auto bg-[#3B0764] hover:bg-[#2C054D] text-white"
          onClick={() => setIsCreatingGroup(true)}
        >
          <Plus size={18} className="mr-2" /> Créer un Groupe
        </Button>
      </div>

      {/* Summary Group Performance Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-[#3B0764] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400">Recrutements</span>
            <div className="p-2 rounded-xl bg-violet-100 text-[#3B0764]">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-gray-900">{totalOpenGroups}</h4>
            <p className="text-[10px] font-bold text-gray-400">Groupes ouverts aux membres</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500 flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-800">Groupes Actifs</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-amber-950">{totalActiveGroups}</h4>
            <p className="text-[10px] font-bold text-amber-600">Tours en cours de virement</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400">Bras Souscrits</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-gray-900">{totalSlotsEnrolled}</h4>
            <p className="text-[10px] font-bold text-gray-400">Positions totales occupées</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400">Frais Cumulés</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <Coins size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-black text-emerald-950">{totalCommissionsGroup.toLocaleString()} F</h4>
            <p className="text-[10px] font-bold text-emerald-500">10% d&apos;inscription par bras</p>
          </div>
        </Card>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par groupe, membre adhérent ou numéro..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-150 bg-white text-xs font-bold shadow-sm focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-150 shadow-sm self-start">
          <Filter size={14} className="text-gray-400" />
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'open', label: 'Recrutement' },
              { id: 'active', label: 'En cours' },
              { id: 'completed', label: 'Clôturés' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                  statusFilter === tab.id 
                    ? 'bg-[#3B0764] text-white' 
                    : 'text-gray-400 hover:text-gray-900 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Groups List Grid */}
      <div className="space-y-6">
        {filteredTontines.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-3xl space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <PiggyBank size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-500">Aucun groupe de tontine ne correspond à votre filtre.</p>
              <p className="text-xs text-gray-400">Cliquez sur &quot;Créer un Groupe&quot; pour ouvrir une tontine.</p>
            </div>
          </div>
        ) : (
          filteredTontines.map(group => {
            const hasJoined = group.members || [];
            const isGroupFull = group.currentMembersCount >= group.maxMembers;
            const recruitmentPct = Math.round((group.currentMembersCount / group.maxMembers) * 100);

            return (
              <Card key={group.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow relative">
                
                {/* Header Section of Group Card */}
                <div className="bg-[#3B0764]/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-gray-950">{group.name}</h3>
                      
                      {/* Interactive toggle status badge */}
                      <button 
                        onClick={() => handleStatusChange(group.id, group.status)}
                        className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                          group.status === 'open' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' :
                          group.status === 'active' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                          group.status === 'completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                          'bg-gray-100 text-gray-650'
                        }`}
                        title="Cliquez pour forcer administrativement un changement de statut"
                      >
                        {group.status === 'open' ? 'Recrutement' :
                         group.status === 'active' ? 'En cours' :
                         group.status === 'completed' ? 'Clôturé' : 'Inactif'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-500">
                      <span>Mise unitaire : <span className="text-[#3B0764] font-extrabold">{group.stake.toLocaleString()} FCFA</span></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden sm:inline" />
                      <span>Tour : <span className="text-gray-800 font-extrabold">{group.durationDays} Jours</span></span>
                    </div>
                  </div>

                  {/* Right Header Controls */}
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-950">{(group.stake * group.maxMembers).toLocaleString()} F</p>
                      <p className="text-[10px] font-bold text-gray-400">Montant de la caisse du tour</p>
                    </div>

                    {/* Delete group totally */}
                    <button 
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-100 bg-white shadow-sm"
                      title="Supprimer totalement le groupe"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-5">
                  
                  {/* Progress Tracker of recruitment */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                      <span>Adhésion des bras de tontine</span>
                      <span className="text-[#3B0764] font-black">{group.currentMembersCount} / {group.maxMembers} ({recruitmentPct}%)</span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-3 bg-gray-150 rounded-full overflow-hidden p-[2px] border border-gray-100">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-700 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${recruitmentPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* List of Registered Participants / Members (Who y participe) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Users size={12} />
                        Membres participants ({hasJoined.length} inscrits)
                      </h4>

                      {/* Enroll button to slide context */}
                      {group.status !== 'completed' && !isGroupFull && (
                        <button 
                          onClick={() => {
                            setEnrollError(null);
                            setEnrollUserId(systemUsers[0]?.id || '');
                            setEnrollingGroupId(enrollingGroupId === group.id ? null : group.id);
                          }}
                          className="text-[10px] font-black text-[#3B0764] hover:text-[#2C054D] flex items-center gap-1 cursor-pointer bg-white border border-gray-100 px-2.5 py-1 rounded-lg shadow-sm"
                        >
                          <UserPlus size={11} />
                          Inscrire un membre
                        </button>
                      )}
                    </div>

                    {/* Admin Enrollment Form block drawer (Inside specific card context) */}
                    <AnimatePresence>
                      {enrollingGroupId === group.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden bg-[#3B0764]/5 border border-[#3B0764]/10 rounded-2xl p-4 space-y-3 relative font-sans"
                        >
                          <h5 className="text-xs font-black text-gray-900">Formulaire d&apos;inscription directe :</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Member Dropdown select */}
                            <div className="md:col-span-2">
                              <label className="text-[9px] font-black text-gray-400 block mb-1">Choisir le membre adhérent</label>
                              <select
                                value={enrollUserId}
                                onChange={e => setEnrollUserId(e.target.value)}
                                className="w-full bg-white px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                              >
                                <option value="">-- Choisir un membre --</option>
                                {systemUsers.map(u => {
                                  // Check check if they are already in group or have space
                                  return (
                                    <option key={u.id} value={u.id}>
                                      {u.firstName} ({u.phone})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Positions (Bras) */}
                            <div>
                              <label className="text-[9px] font-black text-gray-400 block mb-1">Nombre d&apos;emplacements (Bras)</label>
                              <select
                                value={enrollPositions}
                                onChange={e => setEnrollPositions(parseInt(e.target.value) || 1)}
                                className="w-full bg-white px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                              >
                                <option value={1}>1 Bras (mise simple)</option>
                                <option value={2}>2 Bras (mise double)</option>
                              </select>
                            </div>
                          </div>

                          {enrollError && (
                            <p className="text-[10px] text-red-500 font-bold">{enrollError}</p>
                          )}

                          <div className="flex gap-2 justify-end pt-1">
                            <Button 
                              variant="ghost" 
                              className="text-[10px] h-8 px-3 rounded-xl border-gray-100 bg-white" 
                              onClick={() => setEnrollingGroupId(null)}
                            >
                              Annuler
                            </Button>
                            <Button 
                              className="text-[10px] h-8 px-4 bg-[#3B0764] text-white rounded-xl"
                              onClick={() => handleEnrollMember(group.id)}
                              disabled={isEnrollingLoading}
                            >
                              {isEnrollingLoading ? "Inscription..." : "Confirmer l'adhésion"}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Members List Representation */}
                    {hasJoined.length === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center space-y-1">
                        <HelpCircle size={16} className="text-gray-300 mx-auto" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Aucun participant inscrit</p>
                        <p className="text-[9px] text-gray-400 font-bold">Inscrivez un participant ou laissez les membres rejoindre par eux-mêmes.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {hasJoined.map((member: any) => {
                          return (
                            <div 
                              key={member.id} 
                              className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between text-xs hover:border-[#3B0764]/20 transition-all shadow-sm"
                            >
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={member.selfieUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} 
                                  className="w-8 h-8 rounded-full object-cover border border-gray-100"
                                  referrerPolicy="no-referrer"
                                  alt={member.firstName}
                                />
                                <div>
                                  <p className="font-extrabold text-gray-900">{member.firstName}</p>
                                  <p className="text-[9px] font-bold text-gray-400">
                                    {member.phone} • <span className="text-[#3B0764] font-black uppercase">{member.positions} bras</span>
                                  </p>
                                </div>
                              </div>

                              {/* Administrative cancellation query button */}
                              <button 
                                onClick={() => handleExcludeMember(group.id, member.id, member.firstName)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                                title="Exclure administrativement ce membre"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom info banner tracking commission */}
                  <div className="pt-2.5 border-t border-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-gray-500">
                    <p className="font-bold">
                      Date de création : <span className="text-gray-900 font-extrabold">
                        {new Date(group.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </p>

                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 self-start sm:self-auto">
                      <Coins size={14} className="text-emerald-600" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wide">
                        Commission acquise (10% par bras) : +{(group.stake * 0.1 * (group.currentMembersCount || 0)).toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>

                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Group Creator Modal Overlay */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl font-sans"
          >
            <h3 className="text-xl font-black text-center text-gray-900 flex items-center justify-center gap-2">
              <PiggyBank className="text-[#3B0764]" size={24} />
              Nouveau Groupe de Tontine
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nom du groupe</label>
                <input 
                  placeholder="Ex: Tontine Solidaire, Coeur d'Or" 
                  className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Mise unitaire (F)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 5000" 
                    className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                    value={isNaN(formData.stake) ? '' : formData.stake} 
                    onChange={e => setFormData({...formData, stake: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nbre places max</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 10" 
                    className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                    value={isNaN(formData.maxMembers) ? '' : formData.maxMembers} 
                    onChange={e => setFormData({...formData, maxMembers: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Durée d&apos;un tour (jours)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 30" 
                  className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-[#3B0764]/20"
                  value={isNaN(formData.durationDays) ? '' : formData.durationDays} 
                  onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="flex gap-3">
               <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setIsCreatingGroup(false)}>Fermer</Button>
               <Button className="flex-1 bg-[#3B0764] text-white rounded-xl" disabled={loading} onClick={handleCreate}>Valider</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
