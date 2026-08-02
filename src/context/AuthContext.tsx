import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { saveAuthUser, clearAuth, getSavedUser, getToken, authFetch } from '../hooks/useAuth';
import { compressImage } from '../utils/imageUtils';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loginIdentifier: string;
  setLoginIdentifier: (identifier: string) => void;
  loginPasswordStr: string;
  setLoginPasswordStr: (pwd: string) => void;
  regData: any;
  setRegData: (data: any) => void;
  regStep: number;
  setRegStep: (step: number) => void;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  isLoggingIn: boolean;
  setIsLoggingIn: (val: boolean) => void;
  isLoading: boolean;
  handleLogin: () => Promise<{ success: boolean; error?: string }>;
  handleRegister: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPasswordStr, setLoginPasswordStr] = useState('');
  const [regData, setRegData] = useState({ firstName: '', phone: '', email: '', password: '', selfie: '', referredByCode: '' });
  const [regStep, setRegStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Au chargement : restaure la session à partir du jeton stocké et vérifie
  // sa validité auprès du serveur. Aucune ré-inscription silencieuse.
  useEffect(() => {
    const initAuth = async () => {
      // Detect /invite/:code in URL and extract the referral code
      const inviteMatch = window.location.pathname.match(/^\/invite\/([A-Za-z0-9_-]+)/);
      const inviteCode = inviteMatch ? inviteMatch[1] : null;
      if (inviteCode) {
        window.history.replaceState({}, '', '/');
      }

      const savedUser = getSavedUser();
      const token = getToken();

      if (savedUser && token) {
        setUser(savedUser);
        await fetchMe();
      } else if (inviteCode) {
        setRegData(prev => ({ ...prev, referredByCode: inviteCode }));
        setIsRegistering(true);
      }
    };

    initAuth();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await authFetch('/api/users/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        const token = getToken() || '';
        const phone = userData.phone || '';
        saveAuthUser({ token, phone, user: userData });
      } else {
        clearAuth();
        setUser(null);
      }
    } catch (e) {
      console.error("Error fetching current user profile, will retry on reload:", e);
    }
  };

  const handleLogin = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPasswordStr }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Erreur de connexion' };
      }

      saveAuthUser({
        token: data.token,
        phone: data.phone,
        user: data.user,
      });

      setUser(data.user);
      setIsLoggingIn(false);
      setLoginPasswordStr('');
      setIsLoading(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || "Erreur serveur" };
    }
  };

  const handleRegister = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      let finalSelfie = regData.selfie;
      if (finalSelfie && finalSelfie.startsWith('data:image')) {
        try {
          finalSelfie = await compressImage(finalSelfie);
        } catch (compressErr) {
          console.error("Selfie compression failed, using original size", compressErr);
        }
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regData.firstName,
          phone: regData.phone,
          email: regData.email,
          password: regData.password,
          selfieUrl: finalSelfie,
          referredByCode: regData.referredByCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || "Erreur lors de l'inscription" };
      }

      saveAuthUser({
        token: data.token,
        phone: data.phone,
        user: data.user,
      });

      setUser(data.user);
      setIsRegistering(false);
      setRegStep(1);
      setRegData({ firstName: '', phone: '', email: '', password: '', selfie: '', referredByCode: '' });
      setIsLoading(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || "Erreur de communication avec le serveur" };
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loginIdentifier,
      setLoginIdentifier,
      loginPasswordStr,
      setLoginPasswordStr,
      regData,
      setRegData,
      regStep,
      setRegStep,
      isRegistering,
      setIsRegistering,
      isLoggingIn,
      setIsLoggingIn,
      isLoading,
      handleLogin,
      handleRegister,
      logout,
      fetchMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
