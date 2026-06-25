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
  const [regData, setRegData] = useState({ firstName: '', phone: '', password: '', selfie: '', referredByCode: '' });
  const [regStep, setRegStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Helper to save credentials for self-healing
  const saveCredentialsHelper = (creds: { phone: string; password?: string; firstName?: string; selfieUrl?: string }) => {
    try {
      const existing = localStorage.getItem('tontine_pro_credentials');
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...creds };
      localStorage.setItem('tontine_pro_credentials', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save credentials for recovery:", e);
    }
  };

  // Helper to attempt silent session recovery or re-registration
  const attemptRecovery = async (): Promise<boolean> => {
    const credsStr = localStorage.getItem('tontine_pro_credentials');
    if (!credsStr) return false;
    try {
      const creds = JSON.parse(credsStr);
      if (creds.phone && creds.password) {
        setIsLoading(true);
        console.log("Auto-recovery: Restoring session...");
        
        // 1. Try silent login
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: creds.phone, password: creds.password })
        });
        
        if (loginRes.ok) {
          const data = await loginRes.json();
          saveAuthUser({ token: data.token, phone: data.phone, user: data.user });
          setUser(data.user);
          console.log("Auto-recovery: Restored successfully (Login).");
          setIsLoading(false);
          return true;
        } else {
          const errData = await loginRes.json();
          // 2. If user not found (SQLite restart wipe), silently register again
          if (errData.error && (
            errData.error.includes("trouv") || 
            errData.error.includes("not found") || 
            loginRes.status === 404
          ) && creds.firstName) {
            console.log("Auto-recovery: Re-registering wiped profile...");
            const regRes = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: creds.firstName,
                phone: creds.phone,
                password: creds.password,
                selfieUrl: creds.selfieUrl || ''
              })
            });
            
            if (regRes.ok) {
              const data = await regRes.json();
              saveAuthUser({ token: data.token, phone: data.phone, user: data.user });
              setUser(data.user);
              console.log("Auto-recovery: Restored successfully (Silent Registration).");
              setIsLoading(false);
              return true;
            }
          }
        }
      }
    } catch (recoveryErr) {
      console.error("Auto-recovery process failed:", recoveryErr);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  // Auto load user and silently recover session if SQLite DB was wiped/reset on server restart
  useEffect(() => {
    const initAuth = async () => {
      // Detect /invite/:code in URL and extract the referral code
      const inviteMatch = window.location.pathname.match(/^\/invite\/([A-Za-z0-9_-]+)/);
      const inviteCode = inviteMatch ? inviteMatch[1] : null;
      if (inviteCode) {
        window.history.replaceState({}, '', '/');
      }

      const savedUser = getSavedUser();
      const token = localStorage.getItem('tontine_pro_token');

      if (savedUser && token) {
        setUser(savedUser);
        // Verify with backend
        await fetchMe();
      } else {
        // No active user, check if we have offline credentials to auto-recover/register!
        const recovered = await attemptRecovery();
        if (!recovered && inviteCode) {
          setRegData(prev => ({ ...prev, referredByCode: inviteCode }));
          setIsRegistering(true);
        }
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
        // Save user JSON but keep token intact in storage
        const token = localStorage.getItem('tontine_pro_token') || '';
        const phone = localStorage.getItem('tontine_pro_userPhone') || '';
        saveAuthUser({ token, phone, user: userData });
      } else {
        console.warn("fetchMe failed with status:", res.status, "- triggering auto-healing...");
        const recovered = await attemptRecovery();
        if (!recovered) {
          // If recovery fails, clear auth state to keep frontend consistent
          clearAuth();
          setUser(null);
        }
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
        body: JSON.stringify({ phone: loginPhone, password: loginPasswordStr }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Erreur de connexion' };
      }

      // Save credentials for self-healing and recovery
      saveCredentialsHelper({ phone: loginPhone, password: loginPasswordStr, firstName: data.user.firstName, selfieUrl: data.user.selfieUrl });

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
          referredByCode: regData.referredByCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || "Erreur lors de l'inscription" };
      }

      // Save credentials for self-healing and recovery
      saveCredentialsHelper({
        phone: regData.phone,
        password: regData.password,
        firstName: regData.firstName,
        selfieUrl: finalSelfie,
      });

      saveAuthUser({
        token: data.token,
        phone: data.phone,
        user: data.user,
      });

      setUser(data.user);
      setIsRegistering(false);
      setRegStep(1);
      setRegData({ firstName: '', phone: '', password: '', selfie: '', referredByCode: '' });
      setIsLoading(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || "Erreur de communication avec le serveur" };
    }
  };

  const logout = () => {
    clearAuth();
    localStorage.removeItem('tontine_pro_credentials'); // Wipe saved credentials on deliberate logout
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
