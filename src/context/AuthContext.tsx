import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { saveAuthUser, clearAuth, getSavedUser, authFetch } from '../hooks/useAuth';
import { compressImage } from '../utils/imageUtils';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loginPhone: string;
  setLoginPhone: (phone: string) => void;
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
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPasswordStr, setLoginPasswordStr] = useState('');
  const [regData, setRegData] = useState({ firstName: '', phone: '', password: '', selfie: '' });
  const [regStep, setRegStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Auto load user from localStorage if exists
  useEffect(() => {
    const savedUser = getSavedUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const res = await authFetch('/api/users/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        // Save user JSON but keep token intact in storage
        const token = localStorage.getItem('tontine_pro_token') || '';
        const phone = localStorage.getItem('tontine_pro_userPhone') || '';
        saveAuthUser({ token, phone, user: userData });
      }
    } catch (e) {
      console.error("Error fetching current user profile:", e);
    }
  };

  const handleLogin = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPasswordStr }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Erreur de connexion' };
      }

      // Save credentials using saveAuthUser helper
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
          password: regData.password,
          selfieUrl: finalSelfie,
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
      setRegData({ firstName: '', phone: '', password: '', selfie: '' });
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
      loginPhone,
      setLoginPhone,
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
