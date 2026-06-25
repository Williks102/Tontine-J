import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, Award, TrendingUp, DollarSign, Search, CheckCircle2, ShieldAlert, ArrowUpRight, HelpCircle } from 'lucide-react';
import { authFetch } from '../../hooks/useAuth';

export const AdminReferrals: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    relations: Array<{
      childId: string;
      childName: string;
      childPhone: string;
      childSelfie: string | null;
      parentId: string;
      parentName: string;
      parentPhone: string;
      childGroupCount: number;
    }>;
    topReferrers: Array<{
      id: string;
      firstName: string;
      phone: string;
      referralCode: string;
      referralCount: number;
      rewardsEarned: number;
    }>;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchReferrals = async () => {
    try {
      const res = await authFetch('/api/admin/referrals');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error loading admin referrals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 font-bold animate-pulse">
        Chargement de l'administration des parrainages...
      </div>
    );
  }

  const relations = data?.relations || [];
  const topReferrers = data?.topReferrers || [];

  const totalCommissions = relations.reduce((sum, r) => {
    return sum + 500 + (r.childGroupCount > 0 ? 1500 : 0);
  }, 0);

  const filteredRelations = relations.filter(r => 
    r.childName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.childPhone?.includes(searchTerm) ||
    r.parentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Award className="text-[#3B0764]" size={32} />
            Gestion des Parrainages
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1">Suivez les affiliations, les meilleurs ambassadeurs et validez les commissions distribuées.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Inscriptions', value: `${relations.length}`, sub: 'Membres parrainés', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-150' },
          { label: 'Taux conversion', value: `${relations.length > 0 ? Math.round((relations.filter(r => r.childGroupCount > 0).length / relations.length) * 100) : 0}%`, sub: 'Filleuls devenus actifs', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-150' },
          { label: 'Primes Distribuées', value: `${totalCommissions.toLocaleString()} F`, sub: 'Créditées sur les soldes', icon: DollarSign, color: 'text-amber-600 bg-amber-50 border-amber-150' },
          { label: 'Ambassadeurs Actifs', value: `${topReferrers.length}`, sub: 'Membres parrains', icon: Award, color: 'text-[#3B0764] bg-purple-50 border-purple-150' },
        ].map((stat, i) => (
          <Card key={i} className={`p-6 border-b-4 ${stat.color} space-y-3`}>
            <div className="flex justify-between items-center text-gray-400">
              <stat.icon size={24} />
              <ArrowUpRight size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-400 font-bold">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-black text-gray-800">Journal des Affiliations Récentes</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher parrain ou filleul..." 
                  className="bg-gray-50 border border-gray-100 pl-10 pr-4 py-2 rounded-2xl outline-none text-xs font-bold focus:ring-4 focus:ring-[#3B0764]/10 w-full sm:w-60"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredRelations.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs font-bold">
                Aucune relation de parrainage trouvée correspondant à votre recherche.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="py-3 px-2">Filleul</th>
                      <th className="py-3 px-2">Recommandé Par</th>
                      <th className="py-3 px-2 uppercase">Statut Filleul</th>
                      <th className="py-3 px-2 text-right">Commissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredRelations.map((rel, idx) => {
                      const bonus = 500 + (rel.childGroupCount > 0 ? 1500 : 0);
                      return (
                        <tr key={rel.childId || idx} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-2">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={rel.childSelfie || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=40&q=80"} 
                                className="w-8 h-8 rounded-full border border-gray-100 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-black text-gray-800">{rel.childName}</p>
                                <p className="font-mono text-[9px] text-gray-400">{rel.childPhone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2">
                            {rel.parentId ? (
                              <div>
                                <p className="font-bold text-gray-700">{rel.parentName}</p>
                                <p className="font-mono text-[9px] text-gray-400">{rel.parentPhone}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-bold italic">Inconnu</span>
                            )}
                          </td>
                          <td className="py-3.5 px-2">
                            {rel.childGroupCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-700 bg-emerald-50">
                                <CheckCircle2 size={12} />
                                Actif ({rel.childGroupCount} grp)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-600 bg-amber-50">
                                <ShieldAlert size={12} />
                                Simple Inscription
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-right font-black text-emerald-600">
                            +{bonus.toLocaleString()} FCFA
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-lg font-black text-gray-800">Top Ambassadeurs (Parrains)</h3>
            <p className="text-xs text-gray-400">Membres ayant recruté le plus grand nombre d'adhérents à Tontine Pro :</p>

            {topReferrers.length === 0 ? (
              <div className="py-8 text-center text-gray-300 text-xs font-bold">Aucun parrain actif actuellement.</div>
            ) : (
              <div className="space-y-3.5">
                {topReferrers.map((referrer, idx) => (
                  <div key={referrer.id || idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-[#3B0764]/10 text-[#3B0764] text-[10px] font-black rounded-full flex items-center justify-center">#{idx + 1}</span>
                        <p className="text-xs font-black text-gray-800">{referrer.firstName}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono pl-6 mt-0.5">{referrer.phone} • code <strong>{referrer.referralCode}</strong></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#3B0764]">{referrer.referralCount} filleul{referrer.referralCount > 1 ? 's' : ''}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{referrer.rewardsEarned.toLocaleString()} FCFA gagnés</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-gradient-to-br from-[#3B0764] to-[#24043D] text-white p-6 space-y-4 rounded-3xl relative overflow-hidden shadow-xl shadow-purple-950/20 text-xs leading-relaxed">
            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-white/5" />
            <h3 className="text-base font-black flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400" />
              Règle de Rétribution
            </h3>
            <div className="space-y-2.5 text-white/95">
              <p>Le système de parrainage de Tontine Pro est automatisé de la façon suivante :</p>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="font-black text-amber-400 block mb-0.5">Inscription Recommandée (+500 FCFA)</span>
                Le parrain reçoit instantanément un crédit de 500 F sur sa cagnotte dès le selfie validé de son filleul.
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="font-black text-amber-400 block mb-0.5 font-sans">Activité de Groupe (+1 500 FCFA)</span>
                Le parrain reçoit un bonus additionnel de 1 500 FCFA dès que le filleul effectue son premier versement tontine.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
