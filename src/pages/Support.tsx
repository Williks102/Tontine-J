import React, { useState, useEffect } from 'react';
import { Headset, Phone, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Support: React.FC = () => {
  const { user } = useAuthContext();
  const { messages, fetchMessages, sendMessage } = useMessages();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setNotif(null);
    try {
      const fullText = subject ? `[${subject}] ${content}` : content;
      const ok = await sendMessage(fullText, 'text');
      if (ok) {
        setSubject('');
        setContent('');
        setNotif("Votre message de support a été transmis avec succès.");
      } else {
        setNotif("Erreur lors de la transmission.");
      }
    } catch (e: any) {
      setNotif(e.message || "Erreur de connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 font-sans animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#3B0764]/10 text-[#3B0764] rounded-xl flex items-center justify-center">
          <Headset size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-800">Support Client</h2>
          <p className="text-xs font-bold text-gray-400">Nous sommes là pour vous aider 24j/7</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center text-center p-6 space-y-3 cursor-pointer hover:border-[#3B0764]/30 transition-all active:scale-95">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <Phone size={24} />
          </div>
          <p className="text-xs font-black text-gray-800">WhatsApp</p>
          <p className="text-[10px] text-gray-500">Réponse instantanée</p>
        </Card>

        <Card className="flex flex-col items-center text-center p-6 space-y-3 cursor-pointer hover:border-[#3B0764]/30 transition-all active:scale-95">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
             <MessageSquare size={24} />
          </div>
          <p className="text-xs font-black text-gray-800">Chat Live</p>
          <p className="text-[10px] text-gray-500">Agent en ligne</p>
        </Card>
      </div>

      {messages && messages.length > 0 && (
        <Card className="p-4 space-y-3 max-h-60 overflow-y-auto">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b pb-2">Historique des échanges</h3>
          <div className="space-y-3">
            {messages.map((m: any, i: number) => (
              <div key={i} className={`p-3 rounded-xl max-w-[85%] ${m.isAdmin ? 'bg-gray-100 mr-auto' : 'bg-purple-100 text-[#3B0764] ml-auto'}`}>
                <p className="text-xs">{m.content}</p>
                <p className="text-[8px] opacity-70 mt-1 text-right">{new Date(m.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-4 font-sans">
        <h3 className="text-sm font-black text-gray-800">Envoyer un message</h3>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Sujet de votre demande" 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={submitting}
            className="w-full bg-gray-50 p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#3B0764]/20 outline-none"
          />
          <textarea 
            placeholder="Décrivez votre problème..." 
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={submitting}
            className="w-full bg-gray-50 p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#3B0764]/20 resize-none outline-none"
          ></textarea>

          {notif && (
            <p className="text-xs font-bold text-center text-green-600 bg-green-50 p-2 rounded-xl">{notif}</p>
          )}

          <Button 
            className="w-full py-4 shadow-lg shadow-[#3B0764]/20" 
            disabled={submitting || !content.trim()}
            onClick={handleSend}
          >
            {submitting ? 'Transmission...' : 'Envoyer le Message'}
          </Button>
        </div>
      </Card>

      <div className="space-y-3 font-sans">
         <h3 className="text-sm font-black text-gray-800">Questions fréquentes</h3>
         {[
           "Comment retirer mon argent ?",
           "Qu'est-ce que le parrainage ?",
           "Sécurité de mes données"
         ].map((q, i) => (
           <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
             {q}
             <ChevronRight size={18} className="text-gray-300" />
           </div>
         ))}
      </div>
    </div>
  );
};
