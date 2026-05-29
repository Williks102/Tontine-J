import React, { useEffect, useState } from 'react';
import { PiggyBank, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthContext } from '../../context/AuthContext';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const AdminTontines: React.FC = () => {
  const { user } = useAuthContext();
  const { tontines, fetchTontines, createGroup, deleteGroup } = useAdminData();
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [formData, setFormData] = useState({ name: '', stake: 5000, maxMembers: 10, durationDays: 30 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTontines();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce groupe ?")) return;
    try {
      const ok = await deleteGroup(id);
      if (ok) {
        fetchTontines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 space-y-6 font-sans">
      <div className="flex justify-between items-center pr-2">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-[#3B0764] rounded-xl flex items-center justify-center text-white">
             <PiggyBank size={24} />
           </div>
           <h2 className="text-xl font-black text-gray-800">Groupes de Tontine</h2>
        </div>
        <Button onClick={() => setIsCreatingGroup(true)}>Nouveau</Button>
      </div>

      <div className="space-y-4 font-sans">
        {tontines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
             <p className="text-gray-400 font-bold uppercase text-xs">Aucun groupe créé</p>
          </div>
        ) : (
          tontines.map((g) => (
            <Card key={g.id} className="relative shadow-sm border-gray-50 group hover:border-[#3B0764]/30 transition-all">
               <div className="absolute top-0 right-0 bg-[#3B0764] text-white text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase">
                 {g.status === 'active' ? 'En cours' : 'Recrutement'}
               </div>
               <div className="flex justify-between items-start mb-4 pr-12">
                  <div>
                    <h3 className="font-black text-gray-800">{g.name}</h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase">Mise: {g.stake} F</p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none">
                    <Trash2 size={16} />
                  </button>
               </div>
               <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-50 font-sans">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-black uppercase">Membres</span>
                    <span className="text-xs font-bold text-gray-800">{g.currentMembersCount}/{g.maxMembers}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-black uppercase">Tour</span>
                    <span className="text-xs font-bold text-gray-800">{g.durationDays}j</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] text-gray-400 font-black uppercase">Com.</span>
                     <span className="text-xs font-bold text-green-600">{(g.stake * 0.1)} F</span>
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>

      {isCreatingGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl font-sans">
            <h3 className="text-xl font-black text-center text-gray-800">Ajouter un Groupe</h3>
            <div className="space-y-4">
              <input 
                placeholder="Nom du groupe" className="w-full bg-gray-50 p-4 rounded-xl text-sm outline-none"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" placeholder="Mise" className="bg-gray-50 p-4 rounded-xl text-sm outline-none"
                  value={isNaN(formData.stake) ? '' : formData.stake} onChange={e => setFormData({...formData, stake: parseInt(e.target.value) || 0})}
                />
                <input 
                  type="number" placeholder="Max Membres" className="bg-gray-50 p-4 rounded-xl text-sm outline-none"
                  value={isNaN(formData.maxMembers) ? '' : formData.maxMembers} onChange={e => setFormData({...formData, maxMembers: parseInt(e.target.value) || 0})}
                />
              </div>
              <input 
                type="number" placeholder="Durée en jours" className="w-full bg-gray-50 p-4 rounded-xl text-sm outline-none"
                value={isNaN(formData.durationDays) ? '' : formData.durationDays} onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex gap-4">
               <Button variant="ghost" className="flex-1" onClick={() => setIsCreatingGroup(false)}>Fermer</Button>
               <Button className="flex-1" disabled={loading} onClick={handleCreate}>Valider</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
