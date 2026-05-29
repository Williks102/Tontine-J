import React from 'react';
import { Settings, Banknote, Wallet, CreditCard, UserPlus, History, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6 font-sans p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-white">
          <Settings size={24} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Paramètres</h2>
      </div>

      <div className="space-y-3 font-sans">
        {[
          { label: 'Configuration des formules', desc: 'Editer les montants et durées', icon: Banknote },
          { label: 'Limites de retrait', desc: 'Gestion des plafonds journaliers', icon: Wallet },
          { label: 'Frais de service', desc: 'Paramétrage des commissions app', icon: CreditCard },
          { label: 'Gestion des droits', desc: 'Ajouter ou modifier des admins', icon: UserPlus },
          { label: 'Logs système', desc: 'Audit des actions administratives', icon: History },
        ].map((s, i) => (
          <button key={i} className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm active:scale-95 transition-all text-left cursor-pointer">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
              <s.icon size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-800">{s.label}</p>
              <p className="text-[10px] text-gray-400 font-bold">{s.desc}</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        ))}
      </div>

      <div className="pt-4 font-sans">
        <Button variant="secondary" className="w-full border-red-100 text-red-500 hover:bg-red-50" icon={LogOut}>
          Maintenance Système
        </Button>
      </div>
    </div>
  );
};
