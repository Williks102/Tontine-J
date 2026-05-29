import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, Trophy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthContext } from '../context/AuthContext';
import { authFetch } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const MyCard: React.FC = () => {
  const { user } = useAuthContext();
  const [userCards, setUserCards] = useState<any[]>([]);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });

  const fetchUserCards = async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/my-cards');
      if (res.ok) {
        const data = await res.json();
        setUserCards(data);
      }
    } catch (e) {
      console.error("Error fetching cards:", e);
    }
  };

  useEffect(() => {
    fetchUserCards();
  }, [user]);

  const handleCreateCard = async () => {
    if (!user) return;
    try {
      const sanitizedData = {
        title: newCardData.title || 'Ma Tontine Journalière',
        dailyAmount: isNaN(newCardData.dailyAmount) || newCardData.dailyAmount <= 0 ? 5000 : newCardData.dailyAmount,
        totalDays: isNaN(newCardData.totalDays) || newCardData.totalDays <= 0 ? 31 : newCardData.totalDays,
      };

      const res = await authFetch('/api/my-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData)
      });

      if (res.ok) {
        setIsCreatingCard(false);
        setNewCardData({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });
        fetchUserCards();
      }
    } catch (e) {
      console.error(e);
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
        fetchUserCards();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors du paiement");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800">Ma Carte</h2>
          <p className="text-xs font-bold text-gray-400">Épargne journalière avec progression</p>
        </div>
        <Button 
          variant="ghost" 
          className="border-[#3B0764] text-[#3B0764] hover:bg-violet-50"
          onClick={() => setIsCreatingCard(true)}
        >
          <Plus size={18} className="mr-2" /> Nouvelle Carte
        </Button>
      </div>

      {isCreatingCard && (
        <Card className="p-6 space-y-4 border-[#3B0764]/20 bg-[#3B0764]/5">
          <h3 className="text-sm font-black text-gray-800">Paramétrer ma nouvelle carte</h3>
          <div className="space-y-3 font-sans">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nom du projet</label>
              <input 
                type="text" 
                value={newCardData.title}
                onChange={e => setNewCardData({...newCardData, title: e.target.value})}
                className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
                placeholder="Ex: Voyage, Moto, Épargne..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Mise / Jour (FCFA)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.dailyAmount) ? '' : newCardData.dailyAmount}
                  onChange={e => setNewCardData({...newCardData, dailyAmount: parseInt(e.target.value) || 0})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Durée (Jours)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.totalDays) ? '' : newCardData.totalDays}
                  onChange={e => setNewCardData({...newCardData, totalDays: parseInt(e.target.value) || 0})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm outline-none"
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
            <p className="text-sm font-bold text-gray-500">Vous n'avez pas encore de carte active.</p>
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
                <div className="text-right">
                  <p className="text-sm font-black text-gray-800">{totalAmount.toLocaleString()} F</p>
                  <p className="text-[10px] font-bold text-gray-400">Total épargné</p>
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
                            ? (payment.isCommission ? 'bg-orange-500 border-orange-500 text-white' : 'bg-[#3B0764] border-[#3B0764] text-white') 
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
                    Commission Admin: Le dernier versement ({card.dailyAmount} F) sera prélevé comme frais de gestion.
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
