import React, { useEffect, useState } from 'react';
import { 
  Plus, LayoutGrid, Trophy, Check, Trash2, Users, 
  TrendingUp, Coins, Search, Filter, AlertCircle, Calendar 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthContext } from '../context/AuthContext';
import { authFetch } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const MyCard: React.FC = () => {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';

  // --- STANDARD USER STATES ---
  const [userCards, setUserCards] = useState<any[]>([]);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newCardData, setNewCardData] = useState({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });

  // --- ADMIN PANEL STATES ---
  const [adminCards, setAdminCards] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [adminSelectedUserId, setAdminSelectedUserId] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // ==========================================
  //         STANDARD USER FUNCTIONS
  // ==========================================

  const syncLocalCardsToBackend = async (localCards: any[]) => {
    if (!user) return;
    setIsSyncing(true);
    console.log("Auto-recovery: Synchronizing offline cards to persistent database...");
    
    for (const card of localCards) {
      try {
        const cardRes = await authFetch('/api/my-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: card.id,
            title: card.title,
            dailyAmount: card.dailyAmount,
            totalDays: card.totalDays
          })
        });

        if (cardRes.ok) {
          if (card.payments && card.payments.length > 0) {
            for (const payment of card.payments) {
              await authFetch(`/api/my-cards/${card.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dayIndex: payment.dayIndex })
              });
            }
          }
        }
      } catch (e) {
        console.error("Auto-recovery fail for card:", card.id, e);
      }
    }
    setIsSyncing(false);
  };

  const fetchUserCards = async () => {
    if (!user) return;
    
    const localCacheKey = `tontine_pro_cards_${user.id}`;
    const cachedCardsStr = localStorage.getItem(localCacheKey);
    let cachedCards: any[] = [];
    
    if (cachedCardsStr) {
      try {
        cachedCards = JSON.parse(cachedCardsStr);
        setUserCards(cachedCards);
      } catch (e) {}
    }

    try {
      const res = await authFetch('/api/my-cards');
      if (res.ok) {
        const backendCards = await res.json();
        
        if (backendCards.length > 0) {
          setUserCards(backendCards);
          localStorage.setItem(localCacheKey, JSON.stringify(backendCards));
        } else if (cachedCards.length > 0) {
          await syncLocalCardsToBackend(cachedCards);
          const retryRes = await authFetch('/api/my-cards');
          if (retryRes.ok) {
            const freshData = await retryRes.json();
            setUserCards(freshData);
            localStorage.setItem(localCacheKey, JSON.stringify(freshData));
          }
        } else {
          setUserCards([]);
          localStorage.removeItem(localCacheKey);
        }
      }
    } catch (e) {
      console.error("Error fetching cards from backend:", e);
      if (cachedCards.length > 0) {
        setUserCards(cachedCards);
      }
    }
  };

  const handleCreateCard = async () => {
    if (!user) return;
    try {
      const amountVal = parseInt(String(newCardData.dailyAmount));
      const daysVal = parseInt(String(newCardData.totalDays));
      const sanitizedData = {
        title: (newCardData.title || 'Ma Tontine Journalière').trim(),
        dailyAmount: isNaN(amountVal) || amountVal <= 0 ? 5000 : amountVal,
        totalDays: isNaN(daysVal) || daysVal <= 0 ? 31 : daysVal,
      };

      const res = await authFetch('/api/my-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData)
      });

      if (res.ok) {
        const createdCard = await res.json();
        const localCacheKey = `tontine_pro_cards_${user.id}`;
        const updated = [createdCard, ...userCards];
        setUserCards(updated);
        localStorage.setItem(localCacheKey, JSON.stringify(updated));

        setIsCreatingCard(false);
        setNewCardData({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });
        fetchUserCards();
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue lors de la création de la carte.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Erreur de connexion : " + (e.message || "Impossible de contacter le serveur"));
    }
  };

  const handleCardPayment = async (cardId: string, dayIndex: number) => {
    if (!user) return;
    try {
      const res = await authFetch(`/api/my-cards/${cardId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex })
      });
      if (res.ok) {
        const localCacheKey = `tontine_pro_cards_${user.id}`;
        const updated = userCards.map(c => {
          if (c.id === cardId) {
            const currentPayments = c.payments || [];
            const isLastDay = dayIndex === (c.totalDays - 1);
            return {
              ...c,
              status: isLastDay ? 'completed' : c.status,
              payments: [...currentPayments, { cardId, dayIndex, amount: c.dailyAmount, isCommission: isLastDay ? 1 : 0 }]
            };
          }
          return c;
        });
        
        setUserCards(updated);
        localStorage.setItem(localCacheKey, JSON.stringify(updated));
        fetchUserCards();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors du paiement");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user) return;
    if (!confirm("Voulez-vous vraiment supprimer définitivement cette carte d'épargne ? Toutes vos cotisations enregistrées sur cette carte seront écrasées.")) return;

    try {
      const res = await authFetch(`/api/my-cards/${cardId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const localCacheKey = `tontine_pro_cards_${user.id}`;
        const updated = userCards.filter(c => c.id !== cardId);
        setUserCards(updated);
        localStorage.setItem(localCacheKey, JSON.stringify(updated));
        fetchUserCards();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression de la carte");
      }
    } catch (e) {
      console.error("Error deleting card:", e);
    }
  };

  // ==========================================
  //         ADMIN PANEL FUNCTIONS
  // ==========================================

  const fetchAdminCards = async () => {
    if (!user || user.role !== 'admin') return;
    setIsAdminLoading(true);
    try {
      const res = await authFetch('/api/admin/cards');
      if (res.ok) {
        const data = await res.json();
        setAdminCards(data);
      }
    } catch (e) {
      console.error("Error fetching admin cards:", e);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const fetchSystemUsers = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data.filter((u: any) => u.role !== 'admin'));
      }
    } catch (e) {
      console.error("Error fetching admin users:", e);
    }
  };

  const handleAdminCreateCardSubmit = async () => {
    if (!adminSelectedUserId) {
      alert("Veuillez sélectionner un membre.");
      return;
    }
    try {
      const amountVal = parseInt(String(newCardData.dailyAmount));
      const daysVal = parseInt(String(newCardData.totalDays));
      const sanitizedData = {
        userId: adminSelectedUserId,
        title: (newCardData.title || 'Ma Tontine Journalière').trim(),
        dailyAmount: isNaN(amountVal) || amountVal <= 0 ? 5000 : amountVal,
        totalDays: isNaN(daysVal) || daysVal <= 0 ? 31 : daysVal,
      };

      const res = await authFetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData)
      });

      if (res.ok) {
        setIsCreatingCard(false);
        setNewCardData({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });
        setAdminSelectedUserId('');
        fetchAdminCards();
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue lors de la création de la carte.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Erreur de connexion : " + (e.message || "Problème serveur"));
    }
  };

  const handleDeleteAdminCard = async (cardId: string, memberName: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la carte d'épargne de ${memberName} ? Cette action détruira également l'historique de tous ses paiements correspondants.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/admin/cards/${cardId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAdminCards(prev => prev.filter(c => c.id !== cardId));
        fetchAdminCards();
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue lors de la suppression.");
      }
    } catch (e) {
      console.error("Admin delete card error:", e);
    }
  };

  // Setup mounting effects
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        fetchAdminCards();
        fetchSystemUsers();
      } else {
        fetchUserCards();
      }
    }
  }, [user]);

  // ==========================================
  //               RENDER VIEW
  // ==========================================

  if (isAdmin) {
    // Statistics computations for Admin Dashboard header
    const totalActiveCards = adminCards.filter(c => c.status !== 'completed').length;
    const totalCompletedCards = adminCards.filter(c => c.status === 'completed').length;
    
    // Total deposits computed dynamically across all payment records
    const totalDeposited = adminCards.reduce((sum, card) => {
      const paymentsCount = card.payments ? card.payments.length : 0;
      return sum + (paymentsCount * (card.dailyAmount || 0));
    }, 0);

    // Total commissions collected (the final payment of 1 stake is retained per card completed/ongoing payment flag)
    const totalAdminCommissions = adminCards.reduce((sum, card) => {
      const comPayments = card.payments ? card.payments.filter((p: any) => p.isCommission === 1 || p.isCommission === true) : [];
      const cardComAmount = comPayments.reduce((s: number, p: any) => s + (p.amount || card.dailyAmount || 0), 0);
      return sum + cardComAmount;
    }, 0);

    // Filtered admin cards based on search input and status tabs
    const filteredAdminCards = adminCards.filter(card => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        (card.title || '').toLowerCase().includes(query) ||
        (card.userFirstName || '').toLowerCase().includes(query) ||
        (card.userPhone || '').toLowerCase().includes(query);

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'completed') return matchesSearch && card.status === 'completed';
      if (statusFilter === 'active') return matchesSearch && card.status !== 'completed';
      return matchesSearch;
    });

    return (
      <div className="p-4 pb-24 space-y-6 font-sans text-gray-800">
        
        {/* Admin Navigation & Panel Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-950 flex items-center gap-2">
              <LayoutGrid className="text-[#3B0764] stroke-[2.5]" size={26} />
              Gestion des Cartes Membres
            </h2>
            <p className="text-xs font-bold text-gray-400">
              Supervision des cartes d'épargne, suivi des versements et gestion des commissions d'intermédiation.
            </p>
          </div>
          
          <Button 
            variant="primary" 
            className="self-start md:self-auto bg-[#3B0764] hover:bg-[#2C054D] text-white"
            onClick={() => {
              setIsCreatingCard(true);
              // auto-select first member in system if not selected yet
              if (systemUsers.length > 0 && !adminSelectedUserId) {
                setAdminSelectedUserId(systemUsers[0].id);
              }
            }}
          >
            <Plus size={18} className="mr-2" /> Ouvrir une Carte
          </Button>
        </div>

        {/* Admin Metric Overview Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-l-4 border-l-[#3B0764] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400">Cartes Actives</span>
              <div className="p-2 rounded-xl bg-violet-100 text-[#3B0764]">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-gray-900">{totalActiveCards}</h4>
              <p className="text-[10px] font-bold text-gray-400">En cours de cotisation</p>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400">Épargnes Bouclées</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <Check size={16} />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-gray-900">{totalCompletedCards}</h4>
              <p className="text-[10px] font-bold text-gray-400">Totalement finalisées</p>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400">Épargne Globale</span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-black text-gray-900">{totalDeposited.toLocaleString()} F</h4>
              <p className="text-[10px] font-bold text-gray-400">Cumulé de l'ensemble d'épargne</p>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-amber-500 flex flex-col justify-between bg-amber-50/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-800">Commissions Acquises</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Coins size={16} />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-black text-amber-950">{totalAdminCommissions.toLocaleString()} F</h4>
              <p className="text-[10px] font-bold text-amber-600">Prélevées d'administration (Frais)</p>
            </div>
          </Card>
        </div>

        {/* Modal / Inline Creator for a Member's custom card */}
        <AnimatePresence>
          {isCreatingCard && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 space-y-4 border-[#3B0764]/20 bg-[#3B0764]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="text-[9px] font-black bg-[#3B0764] text-white px-2 py-1 rounded-md uppercase">Espace Admin</span>
                </div>
                
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Plus className="text-[#3B0764]" size={20} />
                  Paramétrer une nouvelle carte pour un membre
                </h3>
                
                <div className="space-y-4">
                  {/* Select Member dropdown */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Sélectionner le membre adhérent
                    </label>
                    {systemUsers.length === 0 ? (
                      <p className="text-xs font-bold text-red-500">Aucun membre disponible pour le moment. Créez un membre d'abord.</p>
                    ) : (
                      <select
                        value={adminSelectedUserId}
                        onChange={e => setAdminSelectedUserId(e.target.value)}
                        className="w-full bg-white p-3.5 rounded-xl border border-gray-100 text-sm font-bold focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
                      >
                        <option value="">-- Choisissez un membre dans la liste --</option>
                        {systemUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} ({u.phone})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nom ou type d'objectif de la carte</label>
                    <input 
                      type="text" 
                      value={newCardData.title}
                      onChange={e => setNewCardData({...newCardData, title: e.target.value})}
                      className="w-full bg-white p-3.5 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
                      placeholder="Ex: Tontine journalière, Épargne Moto, Compte Épargne"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Mise journalière (FCFA)</label>
                      <input 
                        type="number" 
                        value={isNaN(newCardData.dailyAmount) ? '' : newCardData.dailyAmount}
                        onChange={e => setNewCardData({...newCardData, dailyAmount: parseInt(e.target.value) || 0})}
                        className="w-full bg-white p-3.5 rounded-xl border border-gray-100 text-sm outline-none font-bold"
                        placeholder="Ex: 5000"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nombre de jours (Validité)</label>
                      <input 
                        type="number" 
                        value={isNaN(newCardData.totalDays) ? '' : newCardData.totalDays}
                        onChange={e => setNewCardData({...newCardData, totalDays: parseInt(e.target.value) || 0})}
                        className="w-full bg-white p-3.5 rounded-xl border border-gray-100 text-sm outline-none font-bold"
                        placeholder="Ex: 31"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-[#3B0764] text-white" 
                      onClick={handleAdminCreateCardSubmit}
                      disabled={!adminSelectedUserId}
                    >
                      Ouvrir la Carte du Membre
                    </Button>
                    <Button variant="ghost" className="border-gray-200" onClick={() => setIsCreatingCard(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Searching & Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par membre, numéro de téléphone, ou tontine..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-150 bg-white text-xs font-bold shadow-sm focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-150 shadow-sm self-start">
            <Filter size={14} className="text-gray-400" />
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'active', label: 'En cours' },
                { id: 'completed', label: 'Terminées' }
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

        {/* List of custom member cards representing progression/commissions */}
        <div className="space-y-6">
          {isAdminLoading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#3B0764] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-400">Chargement de toutes les cartes d'épargne...</p>
            </div>
          ) : filteredAdminCards.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-150 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <LayoutGrid size={32} />
              </div>
              <p className="text-sm font-bold text-gray-500">Aucune carte d'épargne ne correspond à vos filtres actuels.</p>
              {adminCards.length === 0 && (
                <p className="text-xs text-gray-400">Utilisez le bouton "Ouvrir une Carte" ci-dessus pour lancer la première carte membre.</p>
              )}
            </div>
          ) : (
            filteredAdminCards.map(card => {
              const paidCount = card.payments ? card.payments.length : 0;
              const totalDays = card.totalDays && card.totalDays > 0 ? card.totalDays : 1;
              const progress = isNaN((paidCount / totalDays) * 100) ? 0 : (paidCount / totalDays) * 100;
              const totalSaved = paidCount * (card.dailyAmount || 0);

              // Check if commission day (the final day) has been recorded/paid
              const commissionRecorded = card.payments ? card.payments.some((p: any) => p.isCommission === 1 || p.isCommission === true) : false;

              return (
                <Card key={card.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow relative">
                  
                  {/* Card Section Header: Owner details & Settings */}
                  <div className="bg-[#3B0764]/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={card.userSelfie || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                        referrerPolicy="no-referrer"
                        alt={card.userFirstName}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-950">{card.userFirstName || 'Membre Tontine'}</h4>
                          <span className="text-[9px] font-black text-gray-400 px-1.5 py-0.5 bg-white border border-gray-100 rounded">
                            {card.userPhone || '0000'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Projet: <span className="font-extrabold text-gray-800">{card.title}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{totalSaved.toLocaleString()} FCFA</p>
                        <p className="text-[10px] font-bold text-gray-400">Total cotisé ({paidCount}/{totalDays} j)</p>
                      </div>

                      {/* Supprimer la carte pour un membre */}
                      <button 
                        onClick={() => handleDeleteAdminCard(card.id, card.userFirstName || 'ce membre')}
                        className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-100 bg-white shadow-sm"
                        title="Supprimer la carte du membre"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Interactive visual progress bar and checklist overview */}
                  <div className="p-5 space-y-4">
                    
                    {/* Visual Progression statistics */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                      <span>Progression de la carte d'épargne</span>
                      <span className="text-xs font-black text-[#3B0764]">{Math.round(progress)}% complété</span>
                    </div>

                    <div className="relative">
                      <div className="flex h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-150">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-700 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Miniature calendar squares representing the days checklist */}
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Calendar size={12} />
                        Grille journalière ({totalDays} Jours configurés)
                      </p>
                      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-1.5">
                        {Array.from({ length: totalDays }).map((_, i) => {
                          const payment = card.payments ? card.payments.find((p: any) => p.dayIndex === i) : null;
                          const isLastDay = i === totalDays - 1;

                          return (
                            <div 
                              key={i}
                              className={`aspect-square rounded-lg flex items-center justify-center transition-all border text-[9px] font-black select-none ${
                                payment 
                                  ? (payment.isCommission ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10' : 'bg-[#3B0764] border-[#3B0764] text-white') 
                                  : 'bg-white border-gray-200 text-gray-300'
                              }`}
                              title={payment ? `Journée ${i+1} payée • ${card.dailyAmount} F` : `Journée ${i+1} en attente`}
                            >
                              {payment ? (
                                <Check size={11} strokeWidth={3} />
                              ) : (
                                <span className={isLastDay ? 'text-amber-500 font-extrabold' : ''}>
                                  {isLastDay ? 'C' : i + 1}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financial details: daily stake & commissions tracking info */}
                    <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                      <p className="font-bold text-gray-400">
                        Mise journalière fixée: <span className="text-gray-900 font-extrabold">{card.dailyAmount || 0} FCFA</span>
                      </p>

                      <div className={`p-2.5 rounded-xl flex items-center gap-2 ${commissionRecorded ? 'bg-amber-100/65 text-amber-800' : 'bg-gray-50 text-gray-500'}`}>
                        <Trophy size={14} className={commissionRecorded ? 'text-amber-600' : 'text-gray-450'} />
                        <span className="font-extrabold text-[10px] uppercase tracking-wide">
                          {commissionRecorded 
                            ? `Commission Récoltée: +${card.dailyAmount} F (Frais d'administration acquis)` 
                            : `Frais administratifs prévus (Dernier Jour): ${card.dailyAmount} F`}
                        </span>
                      </div>
                    </div>

                  </div>
                </Card>
              );
            })
          )}
        </div>

      </div>
    );
  }

  // ==========================================
  //          STANDARD USER INTERFACE
  // ==========================================

  return (
    <div className="p-4 pb-24 space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800">Ma Carte Épargne</h2>
          <p className="text-xs font-bold text-gray-400">Suivez vos cotisations quotidiennes au guichet de votre carte</p>
        </div>
        <Button 
          variant="ghost" 
          className="border-[#3B0764] text-[#3B0764] hover:bg-violet-50"
          onClick={() => setIsCreatingCard(true)}
        >
          <Plus size={18} className="mr-2" /> Nouvelle Carte
        </Button>
      </div>

      {isSyncing && (
        <div className="p-3 text-xs bg-violet-50 border border-violet-100 text-[#3B0764] rounded-xl flex items-center justify-between animate-pulse">
          <span className="font-bold">Restauration automatique de vos épargnes en cours...</span>
        </div>
      )}

      {isCreatingCard && (
        <Card className="p-6 space-y-4 border-[#3B0764]/20 bg-[#3B0764]/5">
          <h3 className="text-sm font-black text-gray-800">Paramétrer ma nouvelle carte</h3>
          <div className="space-y-3 font-sans">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nom de votre projet d'épargne</label>
              <input 
                type="text" 
                value={newCardData.title}
                onChange={e => setNewCardData({...newCardData, title: e.target.value})}
                className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
                placeholder="Ex: Voyage, Achat Moto, Epargne secours..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Mise / Jour (FCFA)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.dailyAmount) ? '' : newCardData.dailyAmount}
                  onChange={e => setNewCardData({...newCardData, dailyAmount: parseInt(e.target.value) || 0})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Durée de l'épargne (Jours)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.totalDays) ? '' : newCardData.totalDays}
                  onChange={e => setNewCardData({...newCardData, totalDays: parseInt(e.target.value) || 0})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm outline-none font-bold"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateCard}>Lancer ma carte</Button>
              <Button variant="ghost" onClick={() => setIsCreatingCard(false)}>Annuler</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6">
        {userCards.length === 0 && !isCreatingCard && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <LayoutGrid size={32} />
            </div>
            <p className="text-sm font-bold text-gray-500">Vous n'avez pas encore de carte d'épargne active.</p>
          </div>
        )}

        {userCards.map(card => {
          const paidCount = card.payments ? card.payments.length : 0;
          const totalDays = card.totalDays && card.totalDays > 0 ? card.totalDays : 1;
          const progress = isNaN((paidCount / totalDays) * 100) ? 0 : (paidCount / totalDays) * 100;
          const totalAmount = paidCount * (card.dailyAmount || 0);
          
          return (
            <Card key={card.id} className="overflow-hidden border-none shadow-sm">
              <div className="bg-[#3B0764]/5 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-800">{card.title}</h3>
                  <p className="text-[10px] font-bold text-[#3B0764]">{card.dailyAmount || 0} F / jour • {totalDays} jours</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-800">{totalAmount.toLocaleString()} F</p>
                    <p className="text-[10px] font-bold text-gray-400">Total épargné</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer la carte"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 font-sans">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#3B0764]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-gray-500">{Math.round(progress)}%</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const payment = card.payments ? card.payments.find((p: any) => p.dayIndex === i) : null;
                    const isLastDay = i === totalDays - 1;
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => !payment && handleCardPayment(card.id, i)}
                        className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all border ${
                          payment 
                            ? (payment.isCommission ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'bg-[#3B0764] border-[#3B0764] text-white') 
                            : 'bg-white border-gray-200 hover:border-[#3B0764]/55'
                        }`}
                      >
                        {payment ? (
                          <Check size={14} />
                        ) : (
                          <span className={`text-[9px] font-black ${isLastDay ? 'text-orange-500' : 'text-gray-300'}`}>
                            {isLastDay ? 'C' : i + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <Trophy size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-700 leading-tight">
                    Frais de gestion: Le dernier versement de votre carte ({card.dailyAmount} F) sera prélevé et reversé à l'administrateur comme commission de service.
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
