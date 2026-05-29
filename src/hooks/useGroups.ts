import { useState } from 'react';
import { authFetch } from './useAuth';

export const useGroups = () => {
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Available groups are public/protected depending on your API. Let's make it secure
      const res = await authFetch('/api/groups');
      const data = await res.json();
      if (res.ok) {
        setAvailableGroups(data);
      } else {
        setError(data.error || "Erreur de chargement des groupes");
      }
    } catch (e: any) {
      setError(e.message || "Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/users/me/groups');
      const data = await res.json();
      if (res.ok) {
        setUserGroups(data);
      } else {
        setError(data.error || "Erreur de chargement de vos tontines");
      }
    } catch (e: any) {
      setError(e.message || "Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const joinGroup = async (groupId: string, positions: number) => {
    setError(null);
    try {
      const res = await authFetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, positions }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchUserGroups();
        await fetchAvailableGroups();
        return { success: true };
      } else {
        setError(data.error || "Erreur lors de l'inscription");
        return { success: false, error: data.error };
      }
    } catch (e: any) {
      setError(e.message || "Erreur serveur");
      return { success: false, error: e.message };
    }
  };

  return {
    availableGroups,
    userGroups,
    isLoading,
    error,
    fetchAvailableGroups,
    fetchUserGroups,
    joinGroup,
  };
};
