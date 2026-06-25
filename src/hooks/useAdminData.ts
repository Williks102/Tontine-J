import { useState } from 'react';
import { authFetch } from './useAuth';

export const useAdminData = () => {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalTontines: number;
    totalMoney: number;
    cardComTotal?: number;
    tontineComTotal?: number;
    commissionsHistory?: any[];
  }>({
    totalUsers: 0,
    totalTontines: 0,
    totalMoney: 0,
    cardComTotal: 0,
    tontineComTotal: 0,
    commissionsHistory: []
  });
  const [users, setUsers] = useState<any[]>([]);
  const [tontines, setTontines] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTontines = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/tontines');
      if (res.ok) {
        const data = await res.json();
        setTontines(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const banUser = async (userId: string, isBanned: boolean) => {
    try {
      const res = await authFetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned }),
      });
      if (res.ok) {
        fetchUsers();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const createGroup = async (groupData: { name: string; stake: number; maxMembers: number; durationDays: number }) => {
    try {
      const res = await authFetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
      if (res.ok) {
        fetchTontines();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const res = await authFetch(`/api/admin/groups/${groupId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTontines();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return {
    stats,
    users,
    tontines,
    messages,
    isLoading,
    error,
    fetchStats,
    fetchUsers,
    fetchTontines,
    fetchAllMessages,
    banUser,
    createGroup,
    deleteGroup,
  };
};
