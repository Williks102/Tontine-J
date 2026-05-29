import React, { useEffect, useState } from 'react';
import { Users, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useGroups } from '../hooks/useGroups';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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

  return (
    <div className="p-4 space-y-6 font-sans">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#3B0764] rounded-xl flex items-center justify-center text-white">
          <Users size={24} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Groupes Ouverts</h2>
      </div>

      <div className="space-y-4">
        {availableGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Aucun groupe ouvert pour le moment.</p>
          </div>
        ) : (
          availableGroups.map((g, i) => (
            <Card key={i} className="space-y-4 shadow-sm border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-gray-800">{g.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase">Mise: {g.stake.toLocaleString()} F</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-[#6D28D9]">{(g.stake * 1.1).toLocaleString()} F</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total avec com.</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-gray-50 font-sans">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 font-black uppercase">Places</span>
                  <span className="text-xs font-bold text-gray-700">{g.currentMembersCount}/{g.maxMembers}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 font-black uppercase">Chaque</span>
                  <span className="text-xs font-bold text-gray-700">{g.durationDays} jours</span>
                </div>
                <Button 
                  className="ml-auto px-4 py-2 text-xs" 
                  onClick={() => {
                    setIsJoiningGroup(g);
                    setPositionsToJoin(1);
                  }}
                >
                  Rejoindre
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

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
              <p className="text-xs text-gray-500 font-medium">Combien de positions (bras) ?</p>
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
                <span>Contribution</span>
                <span className="text-gray-800">{(isJoiningGroup.stake * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Commission (10%)</span>
                <span className="text-gray-800">{((isJoiningGroup.stake * 0.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#6D28D9] pt-2 border-t border-gray-100">
                <span className="uppercase">Total à payer</span>
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
                {loading ? 'Chargement...' : 'Confirmer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
