import React from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Payments: React.FC = () => {
  return (
    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-sans animate-in fade-in duration-300">
      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 mb-4">
        <CreditCard size={40} />
      </div>
      <h2 className="text-2xl font-black text-gray-800">Section Paiements</h2>
      <p className="text-gray-500 max-w-[250px]">Gérez vos paiements et consultez votre historique complet ici.</p>
      <Button className="mt-4">Nouveau Paiement</Button>
    </div>
  );
};
