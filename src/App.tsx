import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, Banknote, Baby, Home, Map, Plane, PiggyBank, 
  Camera, Phone, User as UserIcon, CheckCircle, ChevronRight, 
  ArrowLeft, Share2, MessageSquare, Mic, Play, Trophy, 
  Settings, Users, BarChart3, LogOut, Plus, Wallet, Heart,
  CreditCard, History, Headset, UserPlus, Bell, Calendar, Clock,
  LayoutDashboard, UserCircle, ShieldCheck, Menu, Search, Trash2,
  LayoutGrid, CheckCircle2, ChevronDown, Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Category, Formula, UserTontine, Bubble, SupportMessage } from './types';
import { CATEGORIES, INITIAL_FORMULAS, COLORS } from './constants';
import GuestView from './components/GuestView';

// --- Types Expansion ---
interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'payment' | 'info' | 'alert';
}

const DUMMY_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Paiement confirmé', description: 'Votre paiement de 5 500 FCFA a été confirmé avec succès.', time: '2h', type: 'payment' },
  { id: '2', title: 'Nouveau bénéficiaire', description: 'Akissi sera la prochaine bénéficiaire du cycle.', time: '5h', type: 'info' },
  { id: '3', title: 'Rappel de paiement', description: "N'oubliez pas votre paiement dans 3 jours.", time: '1j', type: 'alert' }
];

const CHART_DATA = [
  { name: 'Jan', value: 30000 },
  { name: 'Fév', value: 45000 },
  { name: 'Mar', value: 35000 },
  { name: 'Avr', value: 55000 },
  { name: 'Mai', value: 48000 },
  { name: 'Juin', value: 75000 },
];

const MEMBERS = [
  { name: 'Aminata', status: 'paid', initial: 'A' },
  { name: 'Fatou', status: 'paid', initial: 'F' },
  { name: 'Koffi', status: 'paid', initial: 'K' },
  { name: 'Adjoa', status: 'paid', initial: 'A' },
  { name: 'Yao', status: 'paid', initial: 'Y' },
  { name: 'Akissi', status: 'current', initial: 'A', position: 6 },
  { name: 'Marie', status: 'pending', initial: 'M' },
  { name: 'Konan', status: 'pending', initial: 'K' },
  { name: 'Aya', status: 'pending', initial: 'A' },
  { name: 'Brou', status: 'pending', initial: 'B' },
  { name: 'Adjoua', status: 'pending', initial: 'A' },
  { name: 'Kouame', status: 'pending', initial: 'K' },
];

// --- Utilities ---

const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // JPEG 70% quality
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// --- Components ---

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false, icon: Icon }: any) => {
  const baseStyles = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md";
  const variants: any = {
    primary: "bg-[#3B0764] text-white hover:bg-[#2C054D] active:bg-[#1E0336] shadow-[#3B0764]/10",
    secondary: "bg-amber-400 text-[#3B0764] hover:bg-amber-500 active:bg-amber-600 shadow-amber-400/15",
    gold: "bg-amber-400 text-[#3B0764] hover:bg-amber-500 active:bg-[#1E0336] shadow-amber-400/10",
    ghost: "bg-transparent text-[#3B0764] hover:bg-gray-50 active:bg-gray-100 border border-gray-100 shadow-none"
  };

  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`} disabled={disabled}>
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }: any) => {
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-');
  return (
    <div 
      onClick={onClick}
      className={`${hasBg ? '' : 'bg-white'} ${hasBorder ? '' : 'border border-gray-100'} rounded-2xl shadow-sm p-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('tableaudebord');
  const [currentPage, setCurrentPage] = useState<string>('main');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [userTontines, setUserTontines] = useState<UserTontine[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>(INITIAL_FORMULAS);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [regStep, setRegStep] = useState(1);
  const [regData, setRegData] = useState({ firstName: '', phone: '', selfie: '' });
  const [smsCode, setSmsCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReferralDetailVisible, setIsReferralDetailVisible] = useState(false);

  // --- Landing Page States ---
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [selectedLandingCategory, setSelectedLandingCategory] = useState<any>(null);
  const [showLandingBellNotification, setShowLandingBellNotification] = useState(false);
  const [showLandingSupport, setShowLandingSupport] = useState(false);
  const [landingSupportChat, setLandingSupportChat] = useState<{sender: 'user' | 'bot', text: string}[]>([]);
  const [landingSupportCustomText, setLandingSupportCustomText] = useState("");

  useEffect(() => {
    if (regStep === 2 && !regData.selfie) {
      startCamera();
    }
  }, [regStep, regData.selfie]);

  useEffect(() => {
    if (regStep !== 2 || !isRegistering) {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
      }
    }
  }, [regStep, isRegistering]);

  const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalTontines: 0, totalMoney: 0 });
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [userJoinedGroups, setUserJoinedGroups] = useState<any[]>([]);
  const [adminSubTab, setAdminSubTab] = useState('activite');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ stake: 5000, name: '', maxMembers: 10, durationDays: 30 });
  const [isJoiningGroup, setIsJoiningGroup] = useState<any>(null); // For Join Modal
  const [positionsToJoin, setPositionsToJoin] = useState(1);

  const [userCards, setUserCards] = useState<any[]>([]);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });
  const [internalReferrals, setInternalReferrals] = useState(5);
  const [externalReferrals, setExternalReferrals] = useState(3);

  const fetchUserCards = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/my-cards', {
        headers: { 'user-id': user.id }
      });
      const data = await res.json();
      setUserCards(data);
    } catch (e) {
      console.error("Error fetching cards:", e);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!activeTab.startsWith('admin_') || user?.role !== 'admin') return;
      
      try {
        const [statsRes, usersRes, groupsRes, msgsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/users'),
          fetch('/api/admin/tontines'),
          fetch('/api/admin/messages')
        ]);
        
        if (statsRes.ok) setAdminStats(await statsRes.json());
        if (usersRes.ok) setAdminUsers(await usersRes.json());
        if (groupsRes.ok) setAdminGroups(await groupsRes.json());
        if (msgsRes.ok) setAdminMessages(await msgsRes.json());
      } catch (err) {
        console.error("Error fetching admin data:", err);
      }
    };

    fetchAdminData();

    if (activeTab === 'groupes' && user) {
      fetch('/api/groups')
        .then(res => res.json())
        .then(data => setAvailableGroups(data))
        .catch(err => console.error("Error fetching groups:", err));
    }
    if (activeTab === 'macarte' && user) {
      fetchUserCards();
    }
  }, [activeTab, user]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('tontine_pro_userId');
    const savedPhone = localStorage.getItem('tontine_pro_userPhone');
    
    if (savedUserId && savedPhone) {
      const attemptLogin = async (retries = 3) => {
        try {
          const res = await fetch(`/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: savedPhone })
          });
          
          if (res.status === 404) {
            localStorage.removeItem('tontine_pro_userId');
            localStorage.removeItem('tontine_pro_userPhone');
            return;
          }

          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          
          const data = await res.json();
          if (!data.error) {
            setUser(data);
            if (data.role === 'admin') setActiveTab('admin_activite');
            else setActiveTab('tableaudebord');
            fetchTontines(data.id);
            fetchMessages(data.id);
          }
        } catch (err) {
          console.error("Login fetch attempt failed:", err);
          if (retries > 0) {
            console.log(`Retrying login... (${retries} left)`);
            setTimeout(() => attemptLogin(retries - 1), 2000);
          }
        }
      };
      
      attemptLogin();
    }
  }, []);

  const fetchTontines = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/groups`);
    const data = await res.json();
    setUserJoinedGroups(data);
  };

  const fetchMessages = async (userId: string) => {
    const res = await fetch(`/api/messages/${userId}`);
    const data = await res.json();
    setMessages(data);
  };

  const saveUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('tontine_pro_userId', userData.id);
    localStorage.setItem('tontine_pro_userPhone', userData.phone);
  };

  const handleLogout = () => {
    localStorage.removeItem('tontine_pro_userId');
    localStorage.removeItem('tontine_pro_userPhone');
    setUser(null);
    setIsRegistering(false);
    setIsLoggingIn(false);
    setActiveTab('tableaudebord');
    setCurrentPage('main');
    window.location.reload();
  };

  // --- Camera Logic ---

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("L'accès à la caméra a été refusé. Veuillez cliquer sur l'icône de caméra/cadenas dans la barre d'adresse de votre navigateur pour autoriser l'accès, puis réessayez.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError("Aucune caméra n'a été détectée. Veuillez brancher une caméra ou utiliser l'option d'importation de photo.");
      } else {
        setCameraError("Impossible d'accéder à la caméra. Erreur: " + (err.message || 'Inconnue'));
      }
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setRegData({ ...regData, selfie: dataUrl });
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  // --- Registration Logic ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalSelfie = regData.selfie;
      if (finalSelfie.startsWith('data:image')) {
        finalSelfie = await compressImage(finalSelfie);
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regData.firstName,
          phone: regData.phone,
          selfieUrl: finalSelfie
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      if (!data.error) {
        saveUser(data);
        if (data.role === 'admin') setActiveTab('admin_activite');
        else setActiveTab('tableaudebord');
        setIsRegistering(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      alert("Erreur lors de l'inscription : " + (err.message || "Problème de connexion au serveur"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isLoggingInAction, setIsLoggingInAction] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    if (!loginPhone || isLoggingInAction) return;
    setIsLoggingInAction(true);
    try {
      const trimmedPhone = loginPhone.trim();
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedPhone })
      });
      
      if (res.status === 404) {
        throw new Error("NOT_FOUND");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      if (!data.error) {
        saveUser(data);
        if (data.role === 'admin') setActiveTab('admin_activite');
        else setActiveTab('tableaudebord');
        setIsLoggingIn(false);
        fetchTontines(data.id);
        fetchMessages(data.id);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Login handle error:", err);
      if (err.message === "NOT_FOUND") {
        if (confirm("Ce numéro n'est pas encore enregistré. Souhaitez-vous créer un compte maintenant ?")) {
          setIsLoggingIn(false);
          setIsRegistering(true);
          setRegData({ ...regData, phone: loginPhone });
          setRegStep(3); // Go straight to phone step or start from begin? Start from begin but with phone pre-filled
        }
      } else {
        alert("Erreur lors de la connexion : " + (err.message || "Impossible de contacter le serveur"));
      }
    } finally {
      setIsLoggingInAction(false);
    }
  };

  // Member Profile Tooltip (Basic info)
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [previousTab, setPreviousTab] = useState<string | null>(null);

  const navigateToTab = (tabId: string) => {
    setPreviousTab(activeTab);
    setActiveTab(tabId);
    setCurrentPage('main');
    setViewingMember(null);
  };

  const goBack = () => {
    if (viewingMember) {
      setViewingMember(null);
      return;
    }
    if (currentPage !== 'main') {
      setCurrentPage('main');
      return;
    }
    if (previousTab) {
      setActiveTab(previousTab);
      setPreviousTab(null);
    } else {
      setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
    }
  };

  const handleJoinGroup = async () => {
    if (!isJoiningGroup || !user) return;
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: isJoiningGroup.id,
          userId: user.id,
          positions: positionsToJoin
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Vous avez rejoint le groupe avec succès !");
        setIsJoiningGroup(null);
        fetchTontines(user.id);
        fetch('/api/groups').then(res => res.json()).then(data => setAvailableGroups(data));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Erreur lors de l'adhésion au groupe.");
    }
  };

  const handleBanUser = async (userId: string, currentStatus: number) => {
    if (!confirm(`Êtes-vous sûr de vouloir ${currentStatus ? 'débannir' : 'bannir'} cet utilisateur ?`)) return;
    try {
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !currentStatus })
      });
      fetch('/api/admin/users').then(res => res.json()).then(data => setAdminUsers(data));
    } catch (err) {
      alert("Erreur lors de l'action Admin.");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupData.name || !newGroupData.stake) return;
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroupData)
      });
      if (res.ok) {
        setIsCreatingGroup(false);
        setNewGroupData({ stake: 5000, name: '', maxMembers: 10, durationDays: 30 });
        fetch('/api/groups').then(res => res.json()).then(data => setAdminGroups(data));
        fetch('/api/admin/stats').then(res => res.json()).then(data => setAdminStats(data));
      }
    } catch (err) {
      alert("Erreur lors de la création du groupe.");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce groupe ? Cette action est irréversible.")) return;
    try {
      await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
      fetch('/api/groups').then(res => res.json()).then(data => setAdminGroups(data));
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  // --- Sidebar Component ---

  const Sidebar = () => {
    const userTabs = [
      { id: 'tableaudebord', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'macarte', label: 'Ma Carte', icon: LayoutGrid },
      { id: 'paiements', label: 'Paiements', icon: CreditCard },
      { id: 'groupes', label: 'Mes Groupes', icon: Users },
      { id: 'profil', label: 'Profil', icon: UserCircle },
      { id: 'support', label: 'Support', icon: Headset },
    ];

    const adminTabs = [
      { id: 'admin_activite', label: 'Aperçu', icon: BarChart3 },
      { id: 'macarte', label: 'Ma Carte', icon: LayoutGrid },
      { id: 'admin_tontines', label: 'Groupes', icon: PiggyBank },
      { id: 'admin_utilisateurs', label: 'Utilisateurs', icon: Users },
      { id: 'admin_parametres', label: 'Réglages', icon: Settings },
    ];

    const tabs = user?.role === 'admin' ? adminTabs : userTabs;

    return (
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#3B0764] text-white border-r border-[#3B0764]/20 transform transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div 
            className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
              setCurrentPage('main');
              setViewingMember(null);
              setIsReferralDetailVisible(false);
            }}
          >
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-[#3B0764] shadow-lg shadow-amber-400/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">Tontine<span className="text-amber-400">Pro</span></h1>
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">{user?.role === 'admin' ? 'Administration' : 'Espace Client'}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage('main');
                  setIsMenuOpen(false);
                  setIsReferralDetailVisible(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-amber-400 text-[#3B0764] shadow-xl shadow-amber-400/15 scale-[1.02]' 
                    : 'text-purple-200 hover:bg-white/5'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-purple-900/40">
             <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl mb-4">
               <img src={user?.selfieUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"} className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
               <div className="flex-1 overflow-hidden">
                 <p className="text-xs font-bold text-white truncate">{user?.firstName}</p>
                 <p className="text-[10px] text-purple-300 truncate">{user?.phone}</p>
               </div>
             </div>
             <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-white/5 transition-all text-left"
             >
               <LogOut size={20} />
               Déconnexion
             </button>
          </div>
        </div>
      </div>
    );
  };


  // --- Header Component (Mobile) ---
  const Header = () => {
    const isMainTab = activeTab === (user?.role === 'admin' ? 'admin_activite' : 'tableaudebord') && !isReferralDetailVisible;
    const showBack = !isMainTab || viewingMember || currentPage !== 'main';

    return (
      <div className="lg:hidden bg-[#3B0764] text-white border-b-4 border-amber-400 px-4 py-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button onClick={goBack} className="p-2 -ml-2 text-white hover:text-amber-400 transition-colors">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <button 
              onClick={() => {
                setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
                setCurrentPage('main');
                setViewingMember(null);
                setIsReferralDetailVisible(false);
              }}
              className="p-2 -ml-2 text-white hover:text-amber-400 transition-colors"
            >
              <Home size={22} />
            </button>
          )}
          <span 
            className="font-black text-white hover:text-amber-300 cursor-pointer transition-colors text-base uppercase tracking-wider"
            onClick={() => {
              setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
              setCurrentPage('main');
              setViewingMember(null);
              setIsReferralDetailVisible(false);
            }}
          >
            {viewingMember ? 'Profil Membre' : 
             activeTab === 'admin_activite' ? 'Tableau de bord' :
             activeTab === 'admin_utilisateurs' ? 'Membres' :
             activeTab === 'admin_tontines' ? 'Groupes' : 
             'TontinePro'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isMainTab && (
            <button
              onClick={() => {
                setActiveTab(user?.role === 'admin' ? 'admin_activite' : 'tableaudebord');
                setCurrentPage('main');
                setViewingMember(null);
                setIsReferralDetailVisible(false);
              }}
              className="p-2 text-purple-200 hover:text-amber-400 transition-colors"
              title="Page d'accueil"
            >
              <Home size={20} />
            </button>
          )}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    );
  };

  // --- Pages ---

  const renderContent = () => {
    switch (activeTab) {
      case 'tableaudebord': return renderDashboard();
      case 'paiements': return renderPaiements();
      case 'groupes': return renderGroupes();
      case 'macarte': return renderMaCarte();
      case 'profil': return renderProfile();
      case 'support': return renderSupport();
      case 'admin_activite': return renderAdminActivite();
      case 'admin_tontines': return renderAdminTontines();
      case 'admin_utilisateurs': return renderAdminUsers();
      case 'admin_parametres': return renderAdminSettings();
      default: return user?.role === 'admin' ? renderAdminActivite() : renderDashboard();
    }
  };

  const renderAdminActivite = () => {
    if (user?.role !== 'admin') {
      return (
        <div className="p-10 text-center">
          <p className="text-red-500 font-bold">Accès non autorisé</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#6D28D9] text-white p-6" onClick={() => navigateToTab('admin_utilisateurs')}>
            <p className="text-[10px] font-bold uppercase opacity-80">Membres Totaux</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-black">{adminStats?.totalUsers || 0}</span>
              <Users size={20} className="opacity-50 mb-1" />
            </div>
          </Card>
          <Card className="bg-green-500 text-white p-6" onClick={() => navigateToTab('admin_tontines')}>
            <p className="text-[10px] font-bold uppercase opacity-80">Commissions Admin</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-xl font-black">{((adminStats?.totalMoney || 0)).toLocaleString()} F</span>
              <Wallet size={20} className="opacity-50 mb-1" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Membres récents</h3>
            <button onClick={() => navigateToTab('admin_utilisateurs')} className="text-[10px] font-black text-[#6D28D9] uppercase underline">Voir tout</button>
          </div>
          <div className="space-y-2">
            {(!Array.isArray(adminUsers) || adminUsers.length === 0) ? (
              <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-gray-100 flex flex-col items-center justify-center gap-2">
                 <Users size={24} className="text-gray-200" />
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Aucun utilisateur</p>
              </div>
            ) : (
              adminUsers.slice(0, 5).map((item: any, i: number) => (
                 <div key={item.id || i} 
                   className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center gap-4 text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                   onClick={() => {
                     setViewingMember(item);
                     setPreviousTab(activeTab);
                     setActiveTab('admin_utilisateurs');
                   }}
                 >
                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                      {item.selfieUrl ? (
                        <img src={item.selfieUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Clock size={16} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                       <p className="font-extrabold text-gray-800">{item.firstName} {item.lastName || ''}</p>
                       <p className="text-gray-400 text-[10px] font-bold">{item.phone}</p>
                    </div>
                    <div className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase">Actif</div>
                 </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminTontines = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center pr-2">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
             <PiggyBank size={24} />
           </div>
           <h2 className="text-xl font-black text-gray-800">Groupes</h2>
        </div>
        <Button onClick={() => setIsCreatingGroup(true)} icon={Plus}>Nouveau</Button>
      </div>

      <div className="space-y-4">
        {adminGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
             <p className="text-gray-400 font-bold uppercase text-xs">Aucun groupe créé</p>
          </div>
        ) : adminGroups.map((g) => (
          <Card key={g.id} className="relative shadow-sm border-gray-50 group hover:border-[#6D28D9]/30 transition-all">
             <div className="absolute top-0 right-0 bg-[#6D28D9] text-white text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase">
               {g.status === 'active' ? 'En cours' : 'Recrutement'}
             </div>
             <div className="flex justify-between items-start mb-4 pr-12">
                <div>
                  <h3 className="font-black text-gray-800">{g.name}</h3>
                  <p className="text-[9px] text-gray-400 font-black uppercase">Mise: {g.stake} F</p>
                </div>
                <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
             </div>
             <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-50">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-400 font-black uppercase">Membres</span>
                  <span className="text-xs font-bold text-gray-800">{g.currentMembersCount}/{g.maxMembers}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-400 font-black uppercase">Tour</span>
                  <span className="text-xs font-bold text-gray-800">{g.durationDays}j</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] text-gray-400 font-black uppercase">Com.</span>
                   <span className="text-xs font-bold text-green-600">{(g.stake * 0.1)} F</span>
                </div>
             </div>
          </Card>
        ))}
      </div>

      {isCreatingGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-black text-center text-gray-800">Ajouter un Groupe</h3>
            <div className="space-y-4">
              <input 
                placeholder="Nom du groupe" className="w-full bg-gray-50 p-4 rounded-xl text-sm"
                value={newGroupData.name} onChange={e => setNewGroupData({...newGroupData, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" placeholder="Mise" className="bg-gray-50 p-4 rounded-xl text-sm"
                  value={isNaN(newGroupData.stake) ? '' : newGroupData.stake} onChange={e => setNewGroupData({...newGroupData, stake: parseInt(e.target.value)})}
                />
                <input 
                  type="number" placeholder="Max Membres" className="bg-gray-50 p-4 rounded-xl text-sm"
                  value={isNaN(newGroupData.maxMembers) ? '' : newGroupData.maxMembers} onChange={e => setNewGroupData({...newGroupData, maxMembers: parseInt(e.target.value)})}
                />
              </div>
              <input 
                type="number" placeholder="Durée en jours" className="w-full bg-gray-50 p-4 rounded-xl text-sm"
                value={isNaN(newGroupData.durationDays) ? '' : newGroupData.durationDays} onChange={e => setNewGroupData({...newGroupData, durationDays: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex gap-4">
               <Button variant="secondary" className="flex-1" onClick={() => setIsCreatingGroup(false)}>Fermer</Button>
               <Button className="flex-1" onClick={handleCreateGroup}>Valider</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderAdminUsers = () => {
    if (viewingMember) {
      return (
        <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 pb-24">
          <div className="bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm border border-gray-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${viewingMember.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {viewingMember.isBanned ? 'Banni' : 'Compte Actif'}
              </span>
            </div>
            
            <div className="relative inline-block">
              <img 
                src={viewingMember.selfieUrl} 
                className="w-32 h-32 rounded-[3rem] mx-auto border-4 border-violet-50 object-cover shadow-xl" 
              />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-gray-800">{viewingMember.firstName} {viewingMember.lastName || ''}</h2>
              <p className="font-bold text-[#6D28D9]">{viewingMember.phone}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 px-4 py-1 bg-gray-50 inline-block rounded-full">Membre depuis {new Date(viewingMember.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Solde actuel</p>
                  <p className="text-lg font-black text-gray-800">{viewingMember.balance || 0} F</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tontines</p>
                  <p className="text-lg font-black text-gray-800">4</p>
               </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant={viewingMember.isBanned ? 'primary' : 'secondary'} 
                className={`flex-1 border-none shadow-md ${viewingMember.isBanned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                onClick={() => handleBanUser(viewingMember.id, viewingMember.isBanned)}
              >
                {viewingMember.isBanned ? 'Débannir' : 'Bannir le membre'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Historique Récent</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-50 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase">Paiement Tontine</p>
                      <p className="text-[10px] text-gray-400 font-bold">12 Mai 2026</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-green-600">+5 500 F</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            placeholder="Rechercher par numéro ou nom..." 
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
          />
        </div>

        <div className="space-y-3">
          {adminUsers.map((u) => (
            <Card key={u.id} className="p-4 shadow-sm border-gray-50 group transition-all hover:border-[#6D28D9]/30" onClick={() => setViewingMember(u)}>
              <div className="flex items-center gap-4">
                <img src={u.selfieUrl} className="w-12 h-12 rounded-full border border-gray-100 object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-gray-800">{u.firstName} {u.lastName || ''}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{u.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${u.isBanned ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                      {u.isBanned ? 'Banni' : 'Actif'}
                   </div>
                   <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderAdminSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-white">
          <Settings size={24} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Paramètres</h2>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Configuration des formules', desc: 'Editer les montants et durées', icon: Banknote },
          { label: 'Limites de retrait', desc: 'Gestion des plafonds journaliers', icon: Wallet },
          { label: 'Frais de service', desc: 'Paramétrage des commissions app', icon: CreditCard },
          { label: 'Gestion des droits', desc: 'Ajouter ou modifier des admins', icon: UserPlus },
          { label: 'Logs système', desc: 'Audit des actions administratives', icon: History },
        ].map((s, i) => (
          <button key={i} className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm active:scale-95 transition-all text-left">
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

      <div className="pt-4">
        <Button variant="secondary" className="w-full border-red-100 text-red-500 hover:bg-red-50" icon={LogOut}>
          Maintenance Système
        </Button>
      </div>
    </div>
  );

  const handleCardPayment = async (cardId: string, dayIndex: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/my-cards/${cardId}/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ dayIndex })
      });
      if (res.ok) {
        fetchUserCards();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCard = async () => {
    if (!user) return;
    try {
      const sanitizedData = {
        title: newCardData.title || 'Ma Tontine Journalière',
        dailyAmount: isNaN(newCardData.dailyAmount) || newCardData.dailyAmount <= 0 ? 5000 : newCardData.dailyAmount,
        totalDays: isNaN(newCardData.totalDays) || newCardData.totalDays <= 0 ? 31 : newCardData.totalDays,
      };
      const res = await fetch('/api/my-cards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify(sanitizedData)
      });
      if (res.ok) {
        setIsCreatingCard(false);
        setNewCardData({ title: 'Ma Tontine Journalière', dailyAmount: 5000, totalDays: 31 });
        fetchUserCards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderMaCarte = () => (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800">Ma Carte</h2>
          <p className="text-xs font-bold text-gray-400">Épargne journalière avec progression</p>
        </div>
        <Button 
          variant="outline" 
          className="border-[#6D28D9] text-[#6D28D9]"
          onClick={() => setIsCreatingCard(true)}
        >
          <Plus size={18} className="mr-2" /> Nouvelle Carte
        </Button>
      </div>

      {isCreatingCard && (
        <Card className="p-6 space-y-4 border-[#6D28D9]/20 bg-[#6D28D9]/5">
          <h3 className="text-sm font-black text-gray-800">Paramétrer ma nouvelle carte</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nom du projet</label>
              <input 
                type="text" 
                value={newCardData.title}
                onChange={e => setNewCardData({...newCardData, title: e.target.value})}
                className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-[#6D28D9]/20"
                placeholder="Ex: Voyage, Moto, Épargne..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Mise / Jour (FCFA)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.dailyAmount) ? '' : newCardData.dailyAmount}
                  onChange={e => setNewCardData({...newCardData, dailyAmount: parseInt(e.target.value)})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Durée (Jours)</label>
                <input 
                  type="number" 
                  value={isNaN(newCardData.totalDays) ? '' : newCardData.totalDays}
                  onChange={e => setNewCardData({...newCardData, totalDays: parseInt(e.target.value)})}
                  className="w-full bg-white p-3 rounded-xl border border-gray-100 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateCard}>Lancer ma carte</Button>
              <Button variant="ghost" onClick={() => setIsCreatingCard(false)}>Annuler</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6">
        {userCards.length === 0 && !isCreatingCard && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <LayoutGrid size={32} />
            </div>
            <p className="text-sm font-bold text-gray-500">Vous n'avez pas encore de carte active.</p>
          </div>
        )}

        {userCards.map(card => {
          const paidCount = card.payments ? card.payments.length : 0;
          const totalDays = card.totalDays && card.totalDays > 0 ? card.totalDays : 1;
          const progress = isNaN((paidCount / totalDays) * 100) ? 0 : (paidCount / totalDays) * 100;
          const totalAmount = paidCount * (card.dailyAmount || 0);
          
          return (
            <Card key={card.id} className="overflow-hidden border-none shadow-sm">
              <div className="bg-[#6D28D9]/5 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-800">{card.title}</h3>
                  <p className="text-[10px] font-bold text-[#6D28D9]">{card.dailyAmount || 0} F / jour • {totalDays} jours</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-800">{totalAmount.toLocaleString()} F</p>
                  <p className="text-[10px] font-bold text-gray-400">Total épargné</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#6D28D9]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-gray-500">{Math.round(progress)}%</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const payment = card.payments ? card.payments.find((p: any) => p.dayIndex === i) : null;
                    const isLastDay = i === totalDays - 1;
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => !payment && handleCardPayment(card.id, i)}
                        className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all border ${
                          payment 
                            ? (payment.isCommission ? 'bg-orange-500 border-orange-500 text-white' : 'bg-[#6D28D9] border-[#6D28D9] text-white') 
                            : 'bg-white border-gray-200 hover:border-[#6D28D9]/50'
                        }`}
                      >
                        {payment ? (
                          <Check size={14} />
                        ) : (
                          <span className={`text-[9px] font-black ${isLastDay ? 'text-orange-500' : 'text-gray-300'}`}>
                            {isLastDay ? 'C' : i + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <Trophy size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-700 leading-tight">
                    Commission Admin: Le dernier versement ({card.dailyAmount} F) sera prélevé comme frais de gestion.
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Profile */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
        <div className="relative">
          <img 
            src={user?.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"} 
            className="w-14 h-14 rounded-full border-2 border-violet-100 object-cover" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800">Bonjour, {user?.firstName}</h2>
          <p className="text-xs text-gray-500">{userJoinedGroups.length} tontine(s) active(s)</p>
        </div>
        <div className="text-right">
           <p className="text-[10px] text-gray-400 font-black uppercase">Solde</p>
           <p className="text-sm font-black text-[#6D28D9]">{user?.balance || 0} F</p>
        </div>
      </div>

      {userJoinedGroups.length === 0 ? (
        <Card className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <PiggyBank size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-800 font-bold">Aucune tontine active</p>
            <p className="text-xs text-gray-400">Rejoignez un groupe pour commencer à épargner.</p>
          </div>
          <Button onClick={() => navigateToTab('groupes')}>Explorer les groupes</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
            <Trophy size={18} className="text-orange-500" />
            Vos Tontines Actuelles
          </h3>
          {userJoinedGroups.map((g, i) => (
            <Card key={i} className="space-y-4 relative overflow-hidden" onClick={() => navigateToTab('groupes')}>
              {g.status === 'active' && <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase">En cours</div>}
              
              <div className="flex justify-between items-center pr-12">
                <h3 className="font-bold text-gray-800">{g.name}</h3>
                <span className="text-[10px] text-gray-400 font-bold">{g.positions} bras</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[8px] text-gray-400 font-black uppercase">Mise + Commission</p>
                  <p className="text-xs font-black text-gray-800">{(g.stake * 1.1).toLocaleString()} F</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl text-right">
                  <p className="text-[8px] text-gray-400 font-black uppercase">Places</p>
                  <p className="text-xs font-black text-gray-800">{g.currentMembersCount}/{g.maxMembers}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: CreditCard, label: 'Paiements', color: 'bg-violet-50 text-violet-600', onClick: () => navigateToTab('paiements') },
          { icon: History, label: 'Historique', color: 'bg-green-50 text-green-600', onClick: () => {} },
          { icon: ShieldCheck, label: 'Ma Sécurité', color: 'bg-orange-50 text-orange-600', onClick: () => {} },
          { icon: UserPlus, label: 'Parrainer', color: 'bg-blue-50 text-blue-600', onClick: () => setIsReferralDetailVisible(true) },
        ].map((action, i) => (
          <button 
            key={i} 
            onClick={action.onClick}
            className={`${action.color} p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95 transition-all text-left`}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50">
              <action.icon size={18} />
            </div>
            <span className="text-[10px] font-bold leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderPaiements = () => (
    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 mb-4">
        <CreditCard size={40} />
      </div>
      <h2 className="text-2xl font-black text-gray-800">Section Paiements</h2>
      <p className="text-gray-500 max-w-[250px]">Gérez vos paiements et consultez votre historique complet ici.</p>
      <Button className="mt-4">Nouveau Paiement</Button>
    </div>
  );

  const renderGroupes = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#6D28D9] rounded-xl flex items-center justify-center text-white">
          <Users size={24} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Groupes Ouverts</h2>
      </div>

      <div className="space-y-4">
        {availableGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Aucun groupe ouvert pour le moment.</p>
          </div>
        ) : availableGroups.map((g, i) => (
          <Card key={i} className="space-y-4 shadow-sm border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-gray-800">{g.name}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase">Mise: {g.stake.toLocaleString()} F</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#6D28D9]">{(g.stake * 1.1).toLocaleString()} F</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Total avec com.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase">Places</span>
                <span className="text-xs font-bold text-gray-700">{g.currentMembersCount}/{g.maxMembers}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase">Chaque</span>
                <span className="text-xs font-bold text-gray-700">{g.durationDays} jours</span>
              </div>
              <Button 
                className="ml-auto px-4 py-2 text-xs" 
                onClick={() => {
                  setIsJoiningGroup(g);
                  setPositionsToJoin(1);
                }}
              >
                Rejoindre
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Join Modal Overlay */}
      {isJoiningGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800">Rejoindre {isJoiningGroup.name}</h3>
              <p className="text-xs text-gray-500 font-medium">Combien de positions (bras) ?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(num => (
                <button
                  key={num}
                  onClick={() => setPositionsToJoin(num)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    positionsToJoin === num ? 'border-[#6D28D9] bg-violet-50 text-[#6D28D9]' : 'border-gray-100 text-gray-400'
                  }`}
                >
                  <UserIcon size={24} />
                  <span className="font-bold text-sm uppercase">{num} bras</span>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Contribution</span>
                <span className="text-gray-800">{(isJoiningGroup.stake * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                <span>Commission (10%)</span>
                <span className="text-gray-800">{((isJoiningGroup.stake * 0.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#6D28D9] pt-2 border-t border-gray-100">
                <span className="uppercase">Total à payer</span>
                <span>{((isJoiningGroup.stake * 1.1) * positionsToJoin).toLocaleString()} F</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsJoiningGroup(null)}>Fermer</Button>
              <Button className="flex-1 rounded-xl" onClick={handleJoinGroup}>Confirmer</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="p-4 pb-24 space-y-6">
      <Card className="text-center space-y-4 py-8">
        <div className="relative inline-block">
          <img 
            src={user?.selfieUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"} 
            className="w-32 h-32 rounded-full mx-auto border-4 border-violet-100 object-cover shadow-lg" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute bottom-0 right-0 bg-[#6D28D9] text-white p-2 rounded-full border-2 border-white shadow-md">
            <Camera size={16} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">{user?.firstName} Kouassi</h2>
          <p className="text-xs font-bold text-gray-400">Position 7 • Groupe Espoir</p>
        </div>
        
        <div className="flex justify-center gap-4 pt-2">
          <Button variant="secondary" className="px-4 py-2 text-xs">Vérification d'Identité</Button>
          <Button variant="secondary" className="px-4 py-2 text-xs">Module Fête Saisonnière</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {[
          { icon: Banknote, label: 'Gérer mon portefeuille', color: 'text-violet-600' },
          { icon: History, label: 'Historique des transactions', color: 'text-green-600' },
          { icon: Bell, label: 'Paramètres des notifications', color: 'text-orange-600' },
          { icon: Heart, label: 'Tontines préférées', color: 'text-red-500' },
          { icon: Share2, label: 'Parrainer un ami', color: 'text-[#D97706]', onClick: () => setIsReferralDetailVisible(true) },
          { icon: LogOut, label: 'Se déconnecter', color: 'text-gray-400', onClick: handleLogout },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={item.onClick}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98] transition-all"
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

  const renderSupport = () => (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#6D28D9]/10 text-[#6D28D9] rounded-xl flex items-center justify-center">
          <Headset size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-800">Support Client</h2>
          <p className="text-xs font-bold text-gray-400">Nous sommes là pour vous aider 24k/7</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center text-center p-6 space-y-3 cursor-pointer hover:border-[#6D28D9]/30 transition-all active:scale-95">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <Phone size={24} />
          </div>
          <p className="text-xs font-black text-gray-800">WhatsApp</p>
          <p className="text-[10px] text-gray-500">Réponse instantanée</p>
        </Card>

        <Card className="flex flex-col items-center text-center p-6 space-y-3 cursor-pointer hover:border-[#6D28D9]/30 transition-all active:scale-95">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
             <MessageSquare size={24} />
          </div>
          <p className="text-xs font-black text-gray-800">Chat Live</p>
          <p className="text-[10px] text-gray-500">Agent en ligne</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-black text-gray-800">Envoyer un message</h3>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Sujet de votre demande" 
            className="w-full bg-gray-50 p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#6D28D9]/20"
          />
          <textarea 
            placeholder="Décrivez votre problème..." 
            rows={4}
            className="w-full bg-gray-50 p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#6D28D9]/20 resize-none"
          ></textarea>
          <Button className="w-full py-4 shadow-lg shadow-[#6D28D9]/20">Envoyer le Message</Button>
        </div>
      </Card>

      <div className="space-y-3">
         <h3 className="text-sm font-black text-gray-800">Questions fréquentes</h3>
         {[
           "Comment retirer mon argent ?",
           "Qu'est-ce que le parrainage ?",
           "Sécurité de mes données"
         ].map((q, i) => (
           <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 text-sm font-bold text-gray-700">
             {q}
             <ChevronRight size={18} className="text-gray-300" />
           </div>
         ))}
      </div>
    </div>
  );

  const renderReferralDetail = () => (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setIsReferralDetailVisible(false)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex gap-4">
          <button className="flex-1 text-[#6D28D9] font-black text-sm border-b-2 border-[#6D28D9] pb-2">Parrainages</button>
          <button className="flex-1 text-gray-400 font-bold text-sm pb-2">Historique</button>
        </div>
      </div>

      <div className="bg-[#6D28D9] rounded-3xl p-6 text-white space-y-4 shadow-xl">
        <div className="flex justify-between items-start">
          <div className="bg-white/20 p-2 rounded-xl">
            <Users size={32} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase opacity-70">Gains Estimés</p>
            <p className="text-2xl font-black">17 000 FCFA</p>
          </div>
        </div>
        <h2 className="text-xl font-black">Invitez vos proches</h2>
        <p className="text-xs text-white/80 leading-relaxed">Gagnez des commissions en parrainant de nouveaux membres dans Tontine Pro. Plus vous parrainez, plus vous gagnez !</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Invitations envoyées', value: '12', sub: 'Ce mois-ci', icon: MessageSquare, growth: true },
          { label: 'Inscriptions réussies', value: '8', sub: 'Taux: 66%', icon: UserPlus, growth: true },
          { label: 'Commissions totales', value: '18 500 F', sub: 'Depuis le début', icon: Banknote, growth: true },
          { label: 'En attente', value: '3 500 FCFA', sub: 'À recevoir', icon: Clock, growth: false },
        ].map((stat, i) => (
          <Card key={i} className="space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <stat.icon size={16} />
              {stat.growth && <BarChart3 size={12} className="text-green-500" />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase leading-none mb-1">{stat.label}</p>
              <p className="text-lg font-black text-gray-800">{stat.value}</p>
              <p className="text-[9px] text-gray-400 font-bold">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-gray-800 underline flex items-center gap-2">
          <Share2 size={18} className="text-[#6D28D9]" />
          Votre lien d'invitation unique
        </h3>
        <div className="bg-violet-50 p-4 rounded-2xl border-2 border-dashed border-violet-200 text-center space-y-4">
          <p className="text-xs font-mono font-bold text-[#6D28D9] break-all">https://tontine.pro/app/invite/TPRO2025-USER123</p>
          <div className="flex gap-3">
            <Button variant="primary" className="flex-1 py-3 text-xs" icon={Plus} onClick={() => {}}>Copier le lien</Button>
            <Button variant="secondary" className="flex-1 py-3 text-xs" icon={Share2} onClick={() => {}}>Partager</Button>
          </div>
        </div>
      </div>

      <Card className="space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2">
          <PiggyBank size={18} className="text-orange-500" />
          Calculateur de commissions
        </h3>
        <div className="space-y-6 px-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span>Parrainages internes</span>
              <span className="bg-violet-100 text-[#3B0764] px-2 py-0.5 rounded-full">{internalReferrals}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={internalReferrals} 
              onChange={e => setInternalReferrals(parseInt(e.target.value) || 0)}
              className="w-full accent-[#3B0764]" 
            />
            <p className="text-[9px] text-gray-400 italic">2 500 FCFA par parrainage</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span>Parrainages externes</span>
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{externalReferrals}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={externalReferrals} 
              onChange={e => setExternalReferrals(parseInt(e.target.value) || 0)}
              className="w-full accent-orange-500" 
            />
            <p className="text-[9px] text-gray-400 italic">1 500 FCFA par parrainage</p>
          </div>
        </div>
        <div className="mt-4 bg-green-50 p-4 rounded-2xl text-center border border-green-100">
          <p className="text-[10px] text-green-600 font-black uppercase">Gains estimés</p>
          <p className="text-2xl font-black text-green-700">{((internalReferrals * 2500) + (externalReferrals * 1500)).toLocaleString()} FCFA</p>
        </div>
      </Card>

      <Button className="w-full py-4 text-sm" variant="secondary" icon={Trophy} onClick={() => {}}>Générer le code QR de parrainage</Button>
      
      <div className="h-10" />
    </div>
  );

  // --- Render Logic ---

  if (!user) {
    return (
      <GuestView
        user={user}
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        isLoggingIn={isLoggingIn}
        setIsLoggingIn={setIsLoggingIn}
        regStep={regStep}
        setRegStep={setRegStep}
        regData={regData}
        setRegData={setRegData}
        smsCode={smsCode}
        setSmsCode={setSmsCode}
        cameraError={cameraError}
        setCameraError={setCameraError}
        loginPhone={loginPhone}
        setLoginPhone={setLoginPhone}
        isLandingMenuOpen={isLandingMenuOpen}
        setIsLandingMenuOpen={setIsLandingMenuOpen}
        selectedLandingCategory={selectedLandingCategory}
        setSelectedLandingCategory={setSelectedLandingCategory}
        showLandingBellNotification={showLandingBellNotification}
        setShowLandingBellNotification={setShowLandingBellNotification}
        showLandingSupport={showLandingSupport}
        setShowLandingSupport={setShowLandingSupport}
        landingSupportChat={landingSupportChat}
        setLandingSupportChat={setLandingSupportChat}
        landingSupportCustomText={landingSupportCustomText}
        setLandingSupportCustomText={setLandingSupportCustomText}
        handleLogin={handleLogin}
        isLoggingInAction={isLoggingInAction}
        handleRegister={handleRegister}
        isSubmitting={isSubmitting}
        videoRef={videoRef}
        canvasRef={canvasRef}
        startCamera={startCamera}
        captureSelfie={captureSelfie}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-gray-900 selection:bg-[#3B0764]/10">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={isReferralDetailVisible ? 'referral' : activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isReferralDetailVisible ? renderReferralDetail() : renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Floating Plus Button - only for users on dashboard */}
      {user?.role === 'user' && activeTab === 'tableaudebord' && !isReferralDetailVisible && (
        <button 
          onClick={() => alert("Rechercher un groupe ou créer une formule ?")}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#3B0764] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 lg:hidden border-4 border-amber-400"
        >
          <Plus size={32} />
        </button>
      )}
    </div>
  );
}
