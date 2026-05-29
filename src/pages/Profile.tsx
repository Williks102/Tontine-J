import React from 'react';
import { Camera, Banknote, History, Bell, Heart, Share2, LogOut, ChevronRight } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { Card } from '../components/ui/Card';

export const Profile: React.FC = () => {
  const { user, logout } = useAuthContext();
  const { setActiveTab } = useNavigation();

  return (
    <div className="p-4 pb-24 space-y-6 font-sans">
      <Card className="text-center space-y-4 py-8">
        <div className="relative inline-block">
          <img 
            src={user?.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"} 
            className="w-32 h-32 rounded-full mx-auto border-4 border-violet-100 object-cover shadow-lg" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute bottom-0 right-0 bg-[#3B0764] text-white p-2 rounded-full border-2 border-white shadow-md">
            <Camera size={16} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">{user?.firstName} Kouassi</h2>
          <p className="text-xs font-bold text-gray-400">Position 7 • Groupe Espoir • {user?.phone}</p>
        </div>
      </Card>

      <div className="space-y-3 font-sans">
        {[
          { icon: Banknote, label: 'Gérer mon portefeuille', color: 'text-violet-600' },
          { icon: History, label: 'Historique des transactions', color: 'text-green-600' },
          { icon: Bell, label: 'Paramètres des notifications', color: 'text-orange-600' },
          { icon: Heart, label: 'Tontines préférées', color: 'text-red-500' },
          { icon: Share2, label: 'Parrainer un ami', color: 'text-[#D97706]', onClick: () => setActiveTab('parrainage') },
          { icon: LogOut, label: 'Se déconnecter', color: 'text-gray-400', onClick: logout },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={item.onClick}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <item.icon size={20} className={item.color} />
              <span className="text-sm font-bold text-gray-700">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
};
