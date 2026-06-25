import React, { useEffect, useState } from 'react';
import { Users, User as UserIcon, Flame, Sparkles, TrendingUp, ShoppingBag, Clock, Heart, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useGroups } from '../hooks/useGroups';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Helper to resolve a professional product image based on the group's category or name
const getGroupImage = (name: string, id: string): string => {
  const query = (name + " " + id).toLowerCase();
  if (query.includes('alimentaire')) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  }
  if (query.includes('cash') || query.includes('argent') || query.includes('cache') || query.includes('réserve')) {
    return 'https://images.unsplash.com/photo-1593526492327-b071f3d5333e?auto=format&fit=crop&w=600&q=80';
  }
  if (query.includes('baby') || query.includes('mama') || query.includes('maternité') || query.includes('maman')) {
    return 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=600&q=80';
  }
  if (query.includes('school') || query.includes('école') || query.includes('scolaire') || query.includes('classe')) {
    return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80';
  }
  if (query.includes('immobilier') || query.includes('maison') || query.includes('terrain') || query.includes('villa') || query.includes('construction')) {
    return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80';
  }
  // Fallback high-quality finance/team image
  return 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80';
};

export const Groups: React.FC = () => {
  const { availableGroups, fetchAvailableGroups, joinGroup } = useGroups();
  const [isJoiningGroup, setIsJoiningGroup] = useState<any>(null);
  const [positionsToJoin, setPositionsToJoin] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableGroups();
  }, []);

  const handleConfirmJoin = async () => {
    if (!isJoiningGroup) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await joinGroup(isJoiningGroup.id, positionsToJoin);
      if (res.success) {
        setIsJoiningGroup(null);
        alert("Félicitations ! Vous avez rejoint ce groupe.");
      } else {
        setMessage(res.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setMessage(e.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  // Filter groups: default seeded IDs are replaced entirely once any custom group is created
  const defaultGroupIds = ['group-alimentaire-01', 'group-cash-01', 'group-babymama-01', 'group-school-01'];
  const hasCustomGroups = availableGroups.some(g => !defaultGroupIds.includes(g.id));
  const displayedGroups = hasCustomGroups
    ? availableGroups.filter(g => !defaultGroupIds.includes(g.id))
    : availableGroups;

  return (
    <div className="p-4 space-y-6 font-sans">
      {/* Title & E-Commerce Subtext */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#3B0764] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#3B0764]/25">
            <ShoppingBag size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-905 leading-none">Boutique de Tontines</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Trouvez le groupe idéal pour votre épargne</p>
          </div>
        </div>
        <div className="bg-violet-50 text-[#3B0764] text-xs font-black uppercase px-3 py-1.5 rounded-full border border-violet-150 inline-flex items-center gap-1.5 self-start sm:self-center">
          <ShieldCheck size={14} />
          Fonds 100% Retirables et Assurés
        </div>
      </div>

      {/* Main E-Commerce Product Cards Grid */}
      {displayedGroups.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-8 space-y-4">
          <ShoppingBag size={48} className="text-gray-300 mx-auto" />
          <p className="text-gray-500 font-black text-sm uppercase">Vitrine vide pour l'instant</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto font-medium">Les administrateurs n'ont publié aucun groupe de cotisation actif. Revenez prochainement !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedGroups.map((g, i) => {
            const spacesLeft = g.maxMembers - g.currentMembersCount;
            const sizePercent = Math.round((g.currentMembersCount / g.maxMembers) * 100);
            const totalPayout = g.stake * g.maxMembers;
            const productImage = getGroupImage(g.name, g.id);

            // Badges to reinforce premium e-commerce vibe
            let promoBadge = "Populaire";
            let promoColor = "bg-amber-100 text-amber-850 border-amber-200";
            if (g.status === 'active') {
              promoBadge = "En cours / Complet";
              promoColor = "bg-emerald-100 text-emerald-800 border-emerald-250 font-black";
            } else if (g.stake >= 5000) {
              promoBadge = "élite pro";
              promoColor = "bg-purple-100 text-[#3B0764] border-purple-200";
            } else if (spacesLeft <= 3) {
              promoBadge = "Quasi complet";
              promoColor = "bg-rose-100 text-rose-800 border-rose-200";
            }

            return (
              <motion.div
                key={g.id || i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-white rounded-[2rem] overflow-hidden border border-gray-150/80 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 flex flex-col relative group"
              >
                {/* Image & Badges top block */}
                <div className="relative aspect-[4/3] w-full bg-[#1C0032] overflow-hidden">
                  <img
                    src={productImage}
                    alt={g.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  
                  {/* Top floating badge row */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${promoColor} shadow-md`}>
                      {promoBadge}
                    </span>
                    <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/35 active:scale-90 transition-all border border-white/10">
                      <Heart size={14} className="fill-transparent stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Absolute Payout overlay */}
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

                {/* Card Content details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-gray-800 line-clamp-1 group-hover:text-[#3B0764] transition-all">{g.name}</h3>
                    
                    {/* Price structure styled like e-commerce discount labels */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-lg font-black text-[#3B0764]">{g.stake.toLocaleString()} F</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">/ cycle</span>
                      <div className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Clock size={10} />
                        Chaque {g.durationDays} j
                      </div>
                    </div>
                  </div>

                  {/* Stock progress indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      {spacesLeft <= 3 ? (
                        <span className="text-rose-600 flex items-center gap-1 uppercase font-black animate-pulse">
                          <Flame size={12} />
                          Plus que {spacesLeft} places en stock !
                        </span>
                      ) : (
                        <span className="text-gray-505 uppercase">Stock de places restant</span>
                      )}
                      <span className="text-gray-800 font-mono font-black">{g.currentMembersCount} / {g.maxMembers}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${spacesLeft <= 3 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-[#3B0764]'}`}
                        style={{ width: `${sizePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Buy/Subscribe Button */}
                  <div className="pt-2">
                    {g.status === 'active' || spacesLeft <= 0 ? (
                      <Button 
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex justify-center items-center gap-1.5 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        disabled
                      >
                        <ShieldCheck size={14} />
                        Tontine Active & Complète
                      </Button>
                    ) : (
                      <Button 
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex justify-center items-center gap-1.5"
                        onClick={() => {
                          setIsJoiningGroup(g);
                          setPositionsToJoin(1);
                        }}
                      >
                        <UserIcon size={14} strokeWidth={2.5} />
                        Acheter une place
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Join Modal Overlay */}
      {isJoiningGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl font-sans"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800">Rejoindre {isJoiningGroup.name}</h3>
              <p className="text-xs text-gray-500 font-medium font-sans">Combien de positions (bras) acheter ?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(num => (
                <button
                  key={num}
                  onClick={() => setPositionsToJoin(num)}
                  disabled={loading}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                    positionsToJoin === num ? 'border-[#3B0764] bg-violet-50 text-[#3B0764]' : 'border-gray-100 text-gray-400'
                  }`}
                >
                  <UserIcon size={24} />
                  <span className="font-bold text-sm uppercase">{num} bras</span>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Prix de la place</span>
                <span className="text-gray-805">{(isJoiningGroup.stake * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Commission (10%)</span>
                <span className="text-gray-805">{((isJoiningGroup.stake * 0.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#6D28D9] pt-2 border-t border-gray-105">
                <span className="uppercase">Total réclamé</span>
                <span>{((isJoiningGroup.stake * 1.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
            </div>

            {message && (
              <p className="text-xs text-red-500 text-center font-bold font-sans">{message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl" 
                disabled={loading}
                onClick={() => setIsJoiningGroup(null)}
              >
                Fermer
              </Button>
              <Button 
                className="flex-1 rounded-xl" 
                disabled={loading}
                onClick={handleConfirmJoin}
              >
                {loading ? 'Achat...' : 'Confirmer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
