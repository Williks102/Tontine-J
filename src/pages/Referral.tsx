import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageSquare, UserPlus, Banknote, Clock, Share2, Plus, PiggyBank, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { authFetch } from '../hooks/useAuth';

export const Referral: React.FC = () => {
  const { user } = useAuthContext();
  const { setActiveTab } = useNavigation();
  const [isCopied, setIsCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'invite' | 'history'>('invite');
  const [loading, setLoading] = useState(true);
  const [dynamicData, setDynamicData] = useState<{
    referralCode: string;
    totalEarned: number;
    referrals: Array<{ id: string; firstName: string; phone: string; status: 'actif' | 'inscrit'; date: string; bonus: number }>;
  } | null>(null);

  // État indépendant pour le simulateur uniquement
  const [simActive, setSimActive] = useState(0);
  const [simInscrit, setSimInscrit] = useState(0);

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        const res = await authFetch('/api/referrals');
        if (res.ok) {
          const data = await res.json();
          setDynamicData(data);
        }
      } catch (e) {
        console.error("Failed to load referrals", e);
      } finally {
        setLoading(false);
      }
    };
    loadReferrals();
  }, []);

  const referralCode = dynamicData?.referralCode || user?.referralCode || '';
  const inviteLink = `${window.location.origin}/invite/${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Stats réelles depuis l'API
  const totalEarned     = dynamicData?.totalEarned ?? 0;
  const itemsCount      = dynamicData?.referrals?.length ?? 0;
  const activeCount     = dynamicData?.referrals?.filter(r => r.status === 'actif').length ?? 0;
  const inscritCount    = dynamicData?.referrals?.filter(r => r.status === 'inscrit').length ?? 0;

  // Simulation indépendante (calculateur)
  const simTotal = (simActive * 2000) + (simInscrit * 500);

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 font-sans">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setActiveTab('tableaudebord')} className="p-2 bg-white rounded-full shadow-sm cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex gap-4">
          <button 
            onClick={() => setActiveSubTab('invite')} 
            className={`flex-1 font-black text-sm pb-2 transition-all ${activeSubTab === 'invite' ? 'text-[#3B0764] border-b-2 border-[#3B0764]' : 'text-gray-400'}`}
          >
            Parrainages
          </button>
          <button 
            onClick={() => setActiveSubTab('history')} 
            className={`flex-1 font-bold text-sm pb-2 transition-all relative ${activeSubTab === 'history' ? 'text-[#3B0764] border-b-2 border-[#3B0764]' : 'text-gray-400'}`}
          >
            Historique ({itemsCount})
          </button>
        </div>
      </div>

      {activeSubTab === 'invite' ? (
        <>
          <div className="bg-[#3B0764] rounded-3xl p-6 text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl">
                <Users size={32} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-70">Commissions gagnées</p>
                <p className="text-2xl font-black">{totalEarned.toLocaleString()} FCFA</p>
              </div>
            </div>
            <h2 className="text-xl font-black">Invitez vos proches</h2>
            <p className="text-xs text-white/80 leading-relaxed">Gagnez des commissions en parrainant de nouveaux membres dans Tontine Pro. Plus vous parrainez, plus vous gagnez !</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Filleuls inscrits', value: `${itemsCount}`, sub: 'Total', icon: MessageSquare, growth: itemsCount > 0 },
              { label: 'Filleuls actifs', value: `${activeCount}`, sub: 'Dans des tontines', icon: UserPlus, growth: activeCount > 0 },
              { label: 'Commissions gagnées', value: `${totalEarned.toLocaleString()} F`, sub: 'Cumulé', icon: Banknote, growth: totalEarned > 0 },
              { label: 'En attente', value: `${inscritCount}`, sub: 'Pas encore actifs', icon: Clock, growth: false },
            ].map((stat, i) => (
              <Card key={i} className="space-y-2">
                <div className="flex justify-between items-center text-gray-400">
                  <stat.icon size={16} />
                  {stat.growth && <BarChart3 size={12} className="text-green-500" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase leading-none mb-1">{stat.label}</p>
                  <p className="text-lg font-black text-gray-800">{stat.value}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{stat.sub}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-gray-800 underline flex items-center gap-2">
              <Share2 size={18} className="text-[#3B0764]" />
              Votre lien d'invitation unique
            </h3>
            <div className="bg-violet-50 p-4 rounded-2xl border-2 border-dashed border-violet-200 text-center space-y-4">
              <p className="text-xs font-mono font-bold text-[#3B0764] break-all">{inviteLink}</p>
              <div className="flex gap-3">
                <Button 
                  variant="primary" 
                  className="flex-1 py-3 text-xs" 
                  icon={Plus} 
                  onClick={copyToClipboard}
                >
                  {isCopied ? 'Copié !' : 'Copier le lien'}
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 py-3 text-xs" 
                  icon={Share2} 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Tontine Pro',
                        text: 'Rejoins-moi sur Tontine Pro avec mon code de parrainage !',
                        url: inviteLink
                      }).catch(() => {});
                    } else {
                      copyToClipboard();
                    }
                  }}
                >
                  Partager
                </Button>
              </div>
            </div>
          </div>

          <Card className="space-y-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2">
              <PiggyBank size={18} className="text-orange-500" />
              Calculateur de commissions
            </h3>
            <div className="space-y-6 px-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Inscriptions simples <span className="text-orange-500">(+500 F chacune)</span></span>
                  <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{simInscrit}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  value={simInscrit} 
                  onChange={e => setSimInscrit(parseInt(e.target.value) || 0)}
                  className="w-full accent-orange-500" 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Filleuls actifs en tontine <span className="text-[#3B0764]">(+2 000 F chacun)</span></span>
                  <span className="bg-violet-100 text-[#3B0764] px-2 py-0.5 rounded-full">{simActive}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  value={simActive} 
                  onChange={e => setSimActive(parseInt(e.target.value) || 0)}
                  className="w-full accent-[#3B0764]" 
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] text-green-600 font-black uppercase">Gains simulés</p>
              <p className="text-2xl font-black text-green-700">{simTotal.toLocaleString()} FCFA</p>
            </div>
          </Card>
        </>
      ) : (
        <Card className="space-y-4">
          <h3 className="font-black text-gray-800 text-base">Vos filleuls enregistrés</h3>
          <p className="text-xs text-gray-500">Liste des utilisateurs qui se sont inscrits en utilisant votre code unique <strong>{referralCode}</strong>.</p>
          
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400 font-bold animate-pulse">Chargement de votre historique...</div>
          ) : !dynamicData || dynamicData.referrals.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-3">
              <Users size={40} className="mx-auto text-gray-200" />
              <p className="text-xs font-bold">Aucun filleul actif détecté pour le moment.</p>
              <p className="text-[10px] text-gray-400">Partagez votre lien d'invitation pour commencer à gagner des commissions !</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {dynamicData.referrals.map((filleul, idx) => (
                <div key={filleul.id || idx} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black text-gray-800">{filleul.firstName}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{filleul.phone}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {filleul.status === 'actif' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={10} />
                          Tontines Actives (+2 000 F)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <AlertCircle size={10} />
                          Inscrit (+500 F)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600">+{filleul.bonus.toLocaleString()} FCFA</p>
                    <p className="text-[9px] text-gray-400 font-medium">{filleul.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
