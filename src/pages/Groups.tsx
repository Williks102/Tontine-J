import React, { useEffect, useState } from 'react';
import { Users, User as UserIcon, Flame, ShoppingBag, Clock, Heart, ShieldCheck, CheckCircle2, History, TrendingUp, CalendarDays, Layers, CreditCard, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGroups } from '../hooks/useGroups';
import { Button } from '../components/ui/Button';
import { WalletRechargeModal } from '../components/WalletRechargeModal';

const getGroupImage = (name: string, id: string): string => {
  const query = (name + " " + id).toLowerCase();
  if (query.includes('alimentaire')) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  if (query.includes('cash') || query.includes('argent')) return 'https://images.unsplash.com/photo-1593526492327-b071f3d5333e?auto=format&fit=crop&w=600&q=80';
  if (query.includes('baby') || query.includes('mama')) return 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=600&q=80';
  if (query.includes('school') || query.includes('école')) return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80';
  return 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80';
};

const statusLabel: Record<string, { label: string; className: string }> = {
  open:      { label: 'Ouvert',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  active:    { label: 'En cours',  className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Terminé',   className: 'bg-gray-100 text-gray-500 border-gray-200' },
  deleted:   { label: 'Clôturé',   className: 'bg-red-50 text-red-400 border-red-100' },
};

type Tab = 'boutique' | 'mes-tontines';

export const Groups: React.FC = () => {
  const { availableGroups, userGroups, fetchAvailableGroups, fetchUserGroups, joinGroup, payGroupPeriod } = useGroups();
  const [activeTab, setActiveTab] = useState<Tab>('boutique');
  const [isJoiningGroup, setIsJoiningGroup] = useState<any>(null);
  const [positionsToJoin, setPositionsToJoin] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [payingGroupId, setPayingGroupId] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    fetchAvailableGroups();
    fetchUserGroups();
  }, []);

  const handleConfirmJoin = async () => {
    if (!isJoiningGroup) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await joinGroup(isJoiningGroup.id, positionsToJoin);
      if (res.success) {
        setIsJoiningGroup(null);
        setActiveTab('mes-tontines');
      } else if (res.code === 'INSUFFICIENT_BALANCE') {
        setIsJoiningGroup(null);
        setShowRechargeModal(true);
      } else {
        setMessage(res.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setMessage(e.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayPeriod = async (groupId: string) => {
    setPayingGroupId(groupId);
    setPaySuccess(null);
    const res = await payGroupPeriod(groupId);
    setPayingGroupId(null);
    if (res.success) {
      setPaySuccess(groupId);
      fetchUserGroups();
      setTimeout(() => setPaySuccess(null), 3000);
    } else if (res.code === 'INSUFFICIENT_BALANCE') {
      setShowRechargeModal(true);
    } else {
      alert(res.error || "Erreur lors du paiement.");
    }
  };

  const defaultGroupIds = ['group-alimentaire-01', 'group-cash-01', 'group-babymama-01', 'group-school-01'];
  const hasCustomGroups = availableGroups.some(g => !defaultGroupIds.includes(g.id));
  const displayedGroups = hasCustomGroups
    ? availableGroups.filter(g => !defaultGroupIds.includes(g.id))
    : availableGroups;

  // Séparer groupes actifs et historique
  const activeUserGroups = userGroups.filter(g => g.status === 'open' || g.status === 'active');
  const historyGroups    = userGroups.filter(g => g.status === 'completed' || g.status === 'deleted');

  return (
    <div className="p-4 space-y-6 font-sans">

      <AnimatePresence>
        {showRechargeModal && (
          <WalletRechargeModal
            onClose={() => setShowRechargeModal(false)}
            onSuccess={() => setShowRechargeModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#3B0764] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#3B0764]/25">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-none">Tontines</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Épargne collective et suivi de vos groupes</p>
          </div>
        </div>
        <div className="bg-violet-50 text-[#3B0764] text-xs font-black uppercase px-3 py-1.5 rounded-full border border-violet-200 inline-flex items-center gap-1.5 self-start sm:self-center">
          <ShieldCheck size={14} />
          Fonds 100% Assurés
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('boutique')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
            activeTab === 'boutique'
              ? 'bg-white text-[#3B0764] shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ShoppingBag size={14} />
          Boutique
        </button>
        <button
          onClick={() => setActiveTab('mes-tontines')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all relative ${
            activeTab === 'mes-tontines'
              ? 'bg-white text-[#3B0764] shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Layers size={14} />
          Mes Tontines
          {activeUserGroups.length > 0 && (
            <span className="absolute top-1.5 right-3 w-4 h-4 bg-[#3B0764] text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {activeUserGroups.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── BOUTIQUE ─── */}
      {activeTab === 'boutique' && (
        <>
          {displayedGroups.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-8 space-y-4">
              <ShoppingBag size={48} className="text-gray-300 mx-auto" />
              <p className="text-gray-500 font-black text-sm uppercase">Vitrine vide pour l'instant</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto font-medium">Aucun groupe actif. Revenez prochainement !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedGroups.map((g, i) => {
                const spacesLeft = g.maxMembers - g.currentMembersCount;
                const sizePercent = Math.round((g.currentMembersCount / g.maxMembers) * 100);
                const totalPayout = g.stake * g.maxMembers;

                let promoBadge = "Populaire";
                let promoColor = "bg-amber-100 text-amber-800 border-amber-200";
                if (g.status === 'active') { promoBadge = "En cours / Complet"; promoColor = "bg-emerald-100 text-emerald-800 border-emerald-200"; }
                else if (g.stake >= 5000) { promoBadge = "Élite Pro"; promoColor = "bg-purple-100 text-[#3B0764] border-purple-200"; }
                else if (spacesLeft <= 3) { promoBadge = "Quasi complet"; promoColor = "bg-rose-100 text-rose-800 border-rose-200"; }

                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative group"
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#1C0032] overflow-hidden">
                      <img src={getGroupImage(g.name, g.id)} alt={g.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${promoColor} shadow-md`}>{promoBadge}</span>
                        <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/35 transition-all border border-white/10">
                          <Heart size={14} />
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 text-white z-10 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] text-[#D8B4FE] uppercase font-black tracking-widest leading-none mb-1">Cagnotte Globale</p>
                          <p className="text-xl font-black text-amber-300 drop-shadow-md leading-none">{totalPayout.toLocaleString()} FCFA</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-right">
                          <p className="text-[8px] text-gray-300 font-bold uppercase leading-none">Com. Pro</p>
                          <p className="text-[10px] font-black text-emerald-400 mt-0.5">10%</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-black text-gray-800 line-clamp-1 group-hover:text-[#3B0764] transition-all">{g.name}</h3>
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-lg font-black text-[#3B0764]">{g.stake.toLocaleString()} F</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">/ cycle</span>
                          <div className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock size={10} /> Chaque {g.durationDays} j
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          {spacesLeft <= 3 ? (
                            <span className="text-rose-600 flex items-center gap-1 uppercase font-black animate-pulse"><Flame size={12} />Plus que {spacesLeft} places !</span>
                          ) : (
                            <span className="text-gray-500 uppercase">Places restantes</span>
                          )}
                          <span className="text-gray-800 font-mono font-black">{g.currentMembersCount} / {g.maxMembers}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${spacesLeft <= 3 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-[#3B0764]'}`}
                            style={{ width: `${sizePercent}%` }} />
                        </div>
                      </div>

                      <div className="pt-2">
                        {g.status === 'active' || spacesLeft <= 0 ? (
                          <Button className="w-full py-3.5 text-xs font-black uppercase rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" disabled>
                            <ShieldCheck size={14} className="mr-1" /> Tontine Active & Complète
                          </Button>
                        ) : (
                          <Button className="w-full py-3.5 text-xs font-black uppercase rounded-xl flex justify-center items-center gap-1.5"
                            onClick={() => { setIsJoiningGroup(g); setPositionsToJoin(1); }}>
                            <UserIcon size={14} strokeWidth={2.5} /> Acheter une place
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── MES TONTINES ─── */}
      {activeTab === 'mes-tontines' && (
        <div className="space-y-8">

          {/* Groupes actifs / en cours */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Groupes adhérés</h3>
              <span className="ml-auto text-xs font-bold text-gray-400">{activeUserGroups.length} groupe{activeUserGroups.length !== 1 ? 's' : ''}</span>
            </div>

            {activeUserGroups.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 space-y-3">
                <Users size={36} className="text-gray-300 mx-auto" />
                <p className="text-xs font-black text-gray-400 uppercase">Vous n'avez rejoint aucun groupe</p>
                <button onClick={() => setActiveTab('boutique')}
                  className="text-xs text-[#3B0764] font-black underline underline-offset-2">
                  Parcourir la boutique →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeUserGroups.map((g, i) => {
                  const s = statusLabel[g.status] || statusLabel.open;
                  const totalContributed = g.stake * (g.positions || 1);
                  const isPaying = payingGroupId === g.id;
                  const justPaid = paySuccess === g.id;
                  const isActive = g.status === 'active';
                  return (
                    <motion.div key={g.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-[#3B0764]/10 flex items-center justify-center shrink-0">
                          <Users size={22} className="text-[#3B0764]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-gray-800 text-sm truncate">{g.name}</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${s.className}`}>{s.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Layers size={11} /> {g.positions || 1} bras · {g.stake?.toLocaleString()} F/cycle
                            </span>
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                              <CalendarDays size={11} /> Rejoint le {g.joinedAt ? new Date(g.joinedAt).toLocaleDateString('fr-FR') : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-[#3B0764]">{totalContributed.toLocaleString()} F</p>
                          <p className="text-[10px] text-gray-400 font-medium">investi</p>
                        </div>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                          {justPaid ? (
                            <div className="flex-1 flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2">
                              <CheckCircle2 size={14} />
                              <span className="text-xs font-black">Cotisation enregistrée !</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePayPeriod(g.id)}
                              disabled={isPaying}
                              className="flex-1 flex items-center justify-center gap-2 bg-[#3B0764] text-white rounded-xl px-4 py-2.5 text-xs font-black hover:bg-[#2C054D] active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                            >
                              <CreditCard size={14} />
                              {isPaying ? 'Traitement...' : `Payer ma cotisation — ${totalContributed.toLocaleString()} F`}
                            </button>
                          )}
                          <button
                            onClick={() => setShowRechargeModal(true)}
                            className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Recharger mon compte"
                          >
                            <Wallet size={16} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Historique */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <History size={16} className="text-gray-400" />
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Historique</h3>
              <span className="ml-auto text-xs font-bold text-gray-400">{historyGroups.length} groupe{historyGroups.length !== 1 ? 's' : ''}</span>
            </div>

            {historyGroups.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 space-y-2">
                <History size={28} className="text-gray-300 mx-auto" />
                <p className="text-xs font-medium text-gray-400">Aucun groupe terminé pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyGroups.map((g, i) => {
                  const s = statusLabel[g.status] || statusLabel.completed;
                  const totalContributed = g.stake * (g.positions || 1);
                  return (
                    <motion.div key={g.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex gap-4 items-center opacity-80">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-gray-600 text-sm truncate">{g.name}</p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${s.className}`}>{s.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Layers size={11} /> {g.positions || 1} bras · {g.stake?.toLocaleString()} F/cycle
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <CalendarDays size={11} /> Rejoint le {g.joinedAt ? new Date(g.joinedAt).toLocaleDateString('fr-FR') : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-gray-500">{totalContributed.toLocaleString()} F</p>
                        <p className="text-[10px] text-gray-400 font-medium">contribué</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal rejoindre */}
      {isJoiningGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800">Rejoindre {isJoiningGroup.name}</h3>
              <p className="text-xs text-gray-500 font-medium">Combien de positions (bras) acheter ?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(num => (
                <button key={num} onClick={() => setPositionsToJoin(num)} disabled={loading}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    positionsToJoin === num ? 'border-[#3B0764] bg-violet-50 text-[#3B0764]' : 'border-gray-100 text-gray-400'
                  }`}>
                  <UserIcon size={24} />
                  <span className="font-bold text-sm uppercase">{num} bras</span>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Prix de la place</span>
                <span>{(isJoiningGroup.stake * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Commission (10%)</span>
                <span>{((isJoiningGroup.stake * 0.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#6D28D9] pt-2 border-t border-gray-100">
                <span className="uppercase">Total</span>
                <span>{((isJoiningGroup.stake * 1.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
            </div>

            {message && <p className="text-xs text-red-500 text-center font-bold">{message}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 rounded-xl" disabled={loading} onClick={() => setIsJoiningGroup(null)}>
                Fermer
              </Button>
              <Button className="flex-1 rounded-xl" disabled={loading} onClick={handleConfirmJoin}>
                {loading ? 'Achat...' : 'Confirmer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
