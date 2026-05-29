import { useState } from 'react';
import { authFetch } from './useAuth';
import { SupportMessage } from '../types';

export const useMessages = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/messages/me');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        const data = await res.json();
        setError(data.error || "Erreur de chargement des messages");
      }
    } catch (e: any) {
      setError(e.message || "Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, type: 'text' | 'voice' = 'text', isAdmin = false, userId?: string) => {
    try {
      const payload: any = { content, type, isAdmin };
      if (userId) {
        payload.userId = userId;
      }
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchMessages();
        return true;
      }
    } catch (e) {
      console.error("Error sending message:", e);
    }
    return false;
  };

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
  };
};
