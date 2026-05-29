import React, { useState } from 'react';
import { ArrowLeft, Users, MessageSquare, UserPlus, Banknote, Clock, Share2, Plus, PiggyBank, BarChart3 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Referral: React.FC = () => {
  const { user } = useAuthContext();
  const { setActiveTab } = useNavigation();
  const [internalReferrals, setInternalReferrals] = useState(5);
  const [externalReferrals, setExternalReferrals] = useState(3);
  const [isCopied, setIsCopied] = useState(false);

  const referralCode = user?.referralCode || 'PRO-KOFFI';
  const inviteLink = `https://tontine.pro/app/invite/${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 font-sans">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setActiveTab('tableaudebord')} className="p-2 bg-white rounded-full shadow-sm cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex gap-4">
          <button className="flex-1 text-[#3B0764] font-black text-sm border-b-2 border-[#3B0764] pb-2">Parrainages</button>
          <button className="flex-1 text-gray-400 font-bold text-sm pb-2">Historique</button>
        </div>
      </div>

      <div className="bg-[#3B0764] rounded-3xl p-6 text-white space-y-4 shadow-xl">
        <div className="flex justify-between items-start">
          <div className="bg-white/20 p-2 rounded-xl">
            <Users size={32} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase opacity-70">Gains Estimés</p>
            <p className="text-2xl font-black">{((internalReferrals * 2500) + (externalReferrals * 1500)).toLocaleString()} FCFA</p>
          </div>
        </div>
        <h2 className="text-xl font-black">Invitez vos proches</h2>
        <p className="text-xs text-white/80 leading-relaxed">Gagnez des commissions en parrainant de nouveaux membres dans Tontine Pro. Plus vous parrainez, plus vous gagnez !</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Invitations envoyées', value: '12', sub: 'Ce mois-ci', icon: MessageSquare, growth: true },
          { label: 'Inscriptions réussies', value: '8', sub: 'Taux: 66%', icon: UserPlus, growth: true },
          { label: 'Commissions totales', value: '18 500 F', sub: 'Depuis le début', icon: Banknote, growth: true },
          { label: 'En attente', value: '3 500 FCFA', sub: 'À recevoir', icon: Clock, growth: false },
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
              onClick={() => {}}
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
              <span>Parrainages internes</span>
              <span className="bg-violet-100 text-[#3B0764] px-2 py-0.5 rounded-full">{internalReferrals}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={internalReferrals} 
              onChange={e => setInternalReferrals(parseInt(e.target.value) || 0)}
              className="w-full accent-[#3B0764]" 
            />
            <p className="text-[9px] text-gray-400 italic">2 500 FCFA par parrainage</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span>Parrainages externes</span>
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{externalReferrals}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={externalReferrals} 
              onChange={e => setExternalReferrals(parseInt(e.target.value) || 0)}
              className="w-full accent-orange-500" 
            />
            <p className="text-[9px] text-gray-400 italic">1 500 FCFA par parrainage</p>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
          <p className="text-[10px] text-green-600 font-black uppercase">Gains estimés</p>
          <p className="text-2xl font-black text-green-700">{((internalReferrals * 2500) + (externalReferrals * 1500)).toLocaleString()} FCFA</p>
        </div>
      </Card>
    </div>
  );
};
