import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Camera, Phone, User as UserIcon, ChevronRight, 
  ArrowLeft, MessageSquare, Users, Bell, Headset, UserPlus, 
  Menu, Utensils, Banknote, Baby
} from 'lucide-react';

// Unified local Button matching main app style
const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false, icon: Icon }: any) => {
  const baseStyle = "flex items-center justify-center gap-2 font-black uppercase tracking-wider text-xs py-4 px-6 rounded-2xl active:scale-95 transition-all w-full shadow-md";
  const styles: any = {
    primary: "bg-[#3B0764] text-white hover:bg-[#2C054D] active:bg-[#1E0336] disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100 disabled:shadow-none shadow-[#3B0764]/10",
    secondary: "bg-amber-400 text-[#3B0764] hover:bg-amber-500 active:bg-amber-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:scale-100 disabled:shadow-none shadow-amber-400/15",
    ghost: "bg-transparent text-[#3B0764] hover:bg-gray-50 active:bg-gray-100 shadow-none border border-gray-100"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${styles[variant]} ${className}`}
    >
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {children}
    </button>
  );
};

interface GuestViewProps {
  user: any;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  isLoggingIn: boolean;
  setIsLoggingIn: (val: boolean) => void;
  regStep: number;
  setRegStep: (val: number | ((prev: number) => number)) => void;
  regData: { firstName: string; phone: string; password?: string; selfie: string };
  setRegData: (data: any) => void;
  smsCode: string;
  setSmsCode: (code: string) => void;
  cameraError: string | null;
  setCameraError: (err: string | null) => void;
  loginPhone: string;
  setLoginPhone: (phone: string) => void;
  loginPasswordStr: string;
  setLoginPasswordStr: (pwd: string) => void;
  isLandingMenuOpen: boolean;
  setIsLandingMenuOpen: (val: boolean) => void;
  selectedLandingCategory: any;
  setSelectedLandingCategory: (cat: any) => void;
  showLandingBellNotification: boolean;
  setShowLandingBellNotification: (val: boolean) => void;
  showLandingSupport: boolean;
  setShowLandingSupport: (val: boolean) => void;
  landingSupportChat: { sender: 'user' | 'bot'; text: string }[];
  setLandingSupportChat: (chat: any | ((prev: any) => any)) => void;
  landingSupportCustomText: string;
  setLandingSupportCustomText: (text: string) => void;
  
  // Handlers
  handleLogin: () => void;
  isLoggingInAction: boolean;
  handleRegister: () => void;
  isSubmitting: boolean;
  
  // Camera
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startCamera: () => void;
  captureSelfie: () => void;
}

export default function GuestView({
  user,
  isRegistering,
  setIsRegistering,
  isLoggingIn,
  setIsLoggingIn,
  regStep,
  setRegStep,
  regData,
  setRegData,
  smsCode,
  setSmsCode,
  cameraError,
  setCameraError,
  loginPhone,
  setLoginPhone,
  loginPasswordStr,
  setLoginPasswordStr,
  isLandingMenuOpen,
  setIsLandingMenuOpen,
  selectedLandingCategory,
  setSelectedLandingCategory,
  showLandingBellNotification,
  setShowLandingBellNotification,
  showLandingSupport,
  setShowLandingSupport,
  landingSupportChat,
  setLandingSupportChat,
  landingSupportCustomText,
  setLandingSupportCustomText,
  handleLogin,
  isLoggingInAction,
  handleRegister,
  isSubmitting,
  videoRef,
  canvasRef,
  startCamera,
  captureSelfie
}: GuestViewProps) {

  const LANDING_CATEGORIES = [
    {
      id: 'Alimentaire',
      title: 'TONTINE PRO ALIMENTAIRE',
      tagline: 'ALIMENTAIRE',
      description: 'Épargnez pour subvenir aux besoins de votre foyer.',
      details: 'Recevez à tour de rôle un colis alimentaire géant composé de sacs de riz, bidons d\'huile, poulets fermiers, légumes frais, pâtes et condiments indispensables pour nourrir votre famille pendant des mois.',
      mise: '5 000 FCFA / semaine ou mois',
      members: '10 à 15 membres par groupe',
      duration: '6 mois par cycle',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      icon: Utensils
    },
    {
      id: 'Cash',
      title: 'TONTINE PRO CACHE',
      tagline: 'CACHE',
      description: 'Épargnez en toute discrétion.',
      details: 'Une solution de groupe confidentielle pour vos imprévus. Dès que votre tour de rôle arrive, touchez l\'intégralité de la cagnotte liquide sur votre solde Mobile Money d\'un seul coup.',
      mise: 'À partir de 1 000 FCFA / jour ou semaine',
      members: '10 membres par groupe',
      duration: '30 jours ou 10 semaines',
      image: 'https://images.unsplash.com/photo-1593526492327-b071f3d5333e?auto=format&fit=crop&w=400&q=80',
      icon: Banknote
    },
    {
      id: 'Baby Mama',
      title: 'TONTINE PRO BABY MAMA',
      tagline: 'BABY MAMA',
      description: 'Préparez l\'arrivée de bébé sereinement.',
      details: 'La tontine idéale des futures mamans! Cotisez sereinement pour acquérir le trousseau complet de maternité, le berceau, le lait de marque, les couches en gros ou financer vos frais de retour de clinique.',
      mise: '5 000 FCFA / semaine',
      members: '12 membres par groupe',
      duration: '12 semaines',
      image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=400&q=80',
      icon: Baby
    },
    {
      id: 'School',
      title: 'TONTINE PRO SCHOOL',
      tagline: 'SCHOOL',
      description: 'Épargnez pour la réussite scolaire de vos enfants.',
      details: 'Évitez le stress financier de la rentrée des classes. Épargnez au fil des mois pour payer les scolarités privées, uniformes d\'écoles, fournitures d\'écriture et d\'apprentissage de vos enfants.',
      mise: 'À partir de 500 FCFA / jour ou 5 000 FCFA / mois',
      members: '10 à 20 membres par groupe',
      duration: '10 mois scolaires',
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
      icon: Home
    },
    {
      id: 'Immobilier',
      title: 'TONTINE PRO IMMOBILIER',
      tagline: 'IMMOBILIER',
      description: 'Épargnez pour acquérir votre maison.',
      details: 'Constituez votre capital briques, tôle ou votre apport initial d\'achat de terrain certifié ou villa moderne en cotisant solidairement au sein d\'un groupe de projet immobilier fiable.',
      mise: '50 000 FCFA ou 100 000 FCFA / mois',
      members: '10 membres par groupe',
      duration: '12 à 24 mois',
      image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80',
      icon: Home
    }
  ];

  const handleLandingSupportQuestion = (q: string) => {
    let answer = "";
    if (q.includes("Qu'est-ce")) {
      answer = "Tontine Pro est l'application Nº1 de tontine digitale en Afrique. Elle vous permet d'épargner de façon collaborative, sécurisée et totalement vérifiée.";
    } else if (q.includes("retirer")) {
      answer = "À votre tour de rôle, l'intégralité du pot de cotisation est versée immédiatement sur votre solde. Vous pouvez la retirer instantanément via Wave, Orange, MTN ou Moov Money en quelques secondes !";
    } else if (q.includes("sécurisé")) {
      answer = "Absolument. Tontine Pro est enregistrée et opère en synergie avec des banques accréditées. Chaque membre est authentifié avec sa pièce d'identité et son Selfie pour éliminer toute fraude.";
    } else {
      answer = "Le parrainage vous rapporte une prime de 1 500 FCFA créditée sur votre solde pour chaque ami actif parrainé !";
    }

    setLandingSupportChat((prev: any) => [
      ...prev,
      { sender: 'user', text: q },
      { sender: 'bot', text: answer }
    ]);
  };

  const handleLandingCustomMessageSend = () => {
    if (!landingSupportCustomText.trim()) return;
    const text = landingSupportCustomText;
    setLandingSupportCustomText("");
    setLandingSupportChat((prev: any) => [...prev, { sender: 'user', text }]);
    setTimeout(() => {
      setLandingSupportChat((prev: any) => [
        ...prev,
        { sender: 'bot', text: "Votre message a été transmis à notre service d'assistance. Pour une réponse immédiate, vous pouvez cliquer sur l'option de contact par WhatsApp ou nous joindre directement au +225 07 02 49 02 77." }
      ]);
    }, 800);
  };

  const guestTabs = [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'auth', label: 'Inscription / Connexion', icon: Camera },
  ];

  const GuestSidebar = () => {
    return (
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#3B0764] text-white border-r border-[#3B0764]/20 transform transition-transform duration-300 lg:translate-x-0 ${isLandingMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-[#3B0764] shadow-lg shadow-amber-400/20">
              <Users size={22} className="text-[#3B0764]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase leading-none">Tontine<span className="text-amber-400">Pro</span></h1>
              <p className="text-[9px] font-bold text-purple-300 uppercase tracking-widest mt-1">Épargne simple</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {guestTabs.map((tab) => {
              const isActive = (!isRegistering && !isLoggingIn && tab.id === 'accueil') || ((isRegistering || isLoggingIn) && tab.id === 'auth');
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'auth') {
                      setIsRegistering(true);
                      setIsLoggingIn(false);
                      setRegStep(1);
                    } else {
                      setIsRegistering(false);
                      setIsLoggingIn(false);
                    }
                    setIsLandingMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-amber-400 text-[#3B0764] shadow-xl shadow-amber-400/15 scale-[1.02]' 
                      : 'text-purple-200 hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-purple-900/20 text-center">
            <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">TontinePro v2.0</p>
          </div>
        </div>
      </div>
    );
  };

  // GuestBottomNav component removed to respect instructions

  const renderLandingContent = () => {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-24 overflow-x-hidden relative select-none font-sans">
        {/* HEADER BRAND BANNER */}
        <div className="w-full bg-[#3B0764] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] relative overflow-hidden shadow-2xl border-b-4 border-amber-400">
          <div className="absolute top-[-30%] left-[-20%] w-80 h-80 bg-[#6D28D9]/40 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-72 h-72 bg-amber-400/10 rounded-full blur-2xl" />
          
          <div className="flex justify-between items-center relative z-10">
            <button 
              onClick={() => setIsLandingMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all border border-white/10"
            >
              <Menu size={22} />
            </button>
            
            <div className="flex flex-col items-center flex-1 lg:items-start lg:pl-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#6D28D9] via-purple-500 to-amber-400 rounded-full flex items-center justify-center p-1.5 shadow-md">
                  <Users size={18} className="text-white" />
                </div>
                <span className="text-xl font-black tracking-wider uppercase">
                  Tontine<span className="text-amber-400">Pro</span>
                </span>
              </div>
            </div>

            <button 
              onClick={() => setShowLandingBellNotification(true)}
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all relative border border-white/10"
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>

          <div className="text-center mt-6 lg:text-left lg:pl-4 relative z-10 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-[0.2em] bg-white/10 px-4 py-1.5 rounded-full inline-block backdrop-blur-md border border-white/5 shadow-sm">
              Épargne simple, sécurisée, entre nous.
            </span>
          </div>
        </div>

        {/* CATALOGUE SECTION */}
        <div className="text-center py-8">
          <p className="text-xs font-black text-[#3B0764]/40 uppercase tracking-[0.3em] mb-1">Notre catalogue</p>
          <h2 className="text-xl font-black text-[#3B0764] uppercase tracking-wide relative inline-block">
            Choisissez votre tontine
            <span className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-16 h-1 w-20 bg-amber-400 rounded-full" />
          </h2>
        </div>

        {/* VERTICAL LIST */}
        <div className="w-full px-4 max-w-md space-y-4">
          {LANDING_CATEGORIES.map((cat, i) => (
            <div 
              key={cat.id}
              onClick={() => {
                setSelectedLandingCategory(cat);
                if (landingSupportChat.length === 0) {
                  setLandingSupportChat([{ sender: 'bot', text: "Bonjour ! Je suis l'assistant intelligent TontinePro. Des questions sur nos offres ou besoin d'aide pour débuter? Posez vos questions ci-dessous ou cliquez sur un sujet !" }]);
                }
              }}
              className="flex justify-between items-center text-left py-4 px-5 relative h-28 rounded-3xl overflow-hidden bg-gradient-to-r from-[#20013B] via-[#35035E] to-[#50088A] border border-purple-900/40 shadow-xl shadow-purple-950/5 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none" />
              
              <div className="flex-1 space-y-1.5 z-10 pr-2">
                <span className="text-[9px] font-black tracking-widest text-[#D8B4FE] uppercase">Tontine Pro</span>
                <h3 className="text-lg font-black tracking-tight text-amber-300 uppercase leading-none">{cat.tagline}</h3>
                <p className="text-[10px] text-gray-200/90 font-bold leading-normal max-w-[200px] line-clamp-2">{cat.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3 z-10">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/15 select-none shadow-md bg-purple-950">
                  <img src={cat.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-400 text-[#20013B] flex items-center justify-center font-bold shadow-md group-hover:scale-110 active:scale-90 transition-all">
                  <ChevronRight size={18} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ))}

          {/* LOWER ASSISTANCE FOOTER */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-lg shadow-gray-200/50 mt-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#3B0764]/10 text-[#3B0764] flex items-center justify-center shrink-0">
                <Headset size={24} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-gray-800 uppercase tracking-wide">Besoin d'aide ?</p>
                <p className="text-[10px] font-bold text-gray-400">Notre équipe est disponible pour vous accompagner pas-à-pas.</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setShowLandingSupport(true);
                if (landingSupportChat.length === 0) {
                  setLandingSupportChat([{ sender: 'bot', text: "Bonjour ! Je suis l'assistant intelligent Tontine Pro. Des questions sur nos offres ou besoin d'aide de notre service d'assistance? N'hésitez pas !" }]);
                }
              }}
              className="w-full bg-amber-400 hover:bg-amber-500 text-[#20013B] uppercase font-black tracking-wider text-xs py-4 px-4 rounded-2xl shadow-xl shadow-amber-400/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} strokeWidth={2.5} />
              Contacter le service client
            </button>
          </div>
        </div>

        {/* DRAWER SIDEBAR MOBILE BACKGROUND */}
        <AnimatePresence>
          {isLandingMenuOpen && (
            <div className="fixed inset-0 z-50 flex">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsLandingMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ translateX: "-100%" }} 
                animate={{ translateX: 0 }} 
                exit={{ translateX: "-100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-72 bg-[#3B0764] text-white h-full shadow-2xl flex flex-col p-6 z-10"
              >
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-[#3B0764]">
                      <Users size={16} />
                    </div>
                    <span className="text-lg font-black tracking-wider uppercase">Tontine<span className="text-amber-400">Pro</span></span>
                  </div>
                  <button onClick={() => setIsLandingMenuOpen(false)} className="text-white/60 hover:text-white">✕</button>
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Menu Principal</p>
                  
                  <button 
                    onClick={() => { setIsLandingMenuOpen(false); setIsLoggingIn(true); setIsRegistering(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left font-extrabold text-[#3B0764] bg-white hover:bg-gray-50 active:scale-95 transition-all shadow-md"
                  >
                    <UserIcon size={18} />
                    Se Connecter
                  </button>

                  <button 
                    onClick={() => { setIsLandingMenuOpen(false); setIsRegistering(true); setIsLoggingIn(false); setRegStep(1); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left font-extrabold bg-amber-400 hover:bg-amber-500 text-[#3B0764] active:scale-95 transition-all shadow-lg shadow-amber-400/10"
                  >
                    <UserPlus size={18} />
                    Créer un compte
                  </button>

                  <div className="h-4" />
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Assistance</p>

                  <button 
                    onClick={() => { setIsLandingMenuOpen(false); setShowLandingSupport(true); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left font-bold text-white/80 hover:bg-white/5 active:scale-95 transition-all"
                  >
                    <Headset size={18} />
                    Support Direct
                  </button>

                  <a 
                    href="https://wa.me/2250702490277" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left font-bold text-white/80 hover:bg-white/5 active:scale-95 transition-all"
                  >
                    <MessageSquare size={18} />
                    WhatsApp Direct
                  </a>
                </div>

                <div className="pt-6 border-t border-white/10 text-center">
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">TontinePro v2.0</p>
                  <p className="text-[8px] text-amber-400/50 font-medium">Secured and Legal Rotating Credit Association</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DETAILS MODAL */}
        <AnimatePresence>
          {selectedLandingCategory && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setSelectedLandingCategory(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ translateY: "100%" }} 
                animate={{ translateY: 0 }} 
                exit={{ translateY: "100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-md bg-white rounded-t-[2.5rem] shadow-2xl p-6 z-10 space-y-5"
              >
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto cursor-pointer" onClick={() => setSelectedLandingCategory(null)} />
                
                <div className="flex justify-between items-start pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Offre exclusive</span>
                    <h3 className="text-xl font-black text-[#3B0764] uppercase">{selectedLandingCategory.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedLandingCategory(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200 transition-all"
                  >
                    ✕
                  </button>
                </div>

                <div className="aspect-[16/9] w-full bg-purple-950 rounded-2xl overflow-hidden shadow-inner border border-gray-100">
                  <img src={selectedLandingCategory.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-600 leading-relaxed font-bold">{selectedLandingCategory.details}</p>

                  <div className="bg-gray-50 p-4 rounded-3xl space-y-3.5 border border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Mise Minimale</span>
                      <span className="font-black text-gray-800">{selectedLandingCategory.mise}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Membres admis</span>
                      <span className="font-black text-[#3B0764]">{selectedLandingCategory.members}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Durée Cycle</span>
                      <span className="font-black text-green-600">{selectedLandingCategory.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => { setSelectedLandingCategory(null); setIsLoggingIn(true); setIsRegistering(false); }}
                  >
                    Connexion
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => { setSelectedLandingCategory(null); setIsRegistering(true); setIsLoggingIn(false); setRegStep(1); }}
                  >
                    Rejoindre
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* NOTIFICATIONS */}
        <AnimatePresence>
          {showLandingBellNotification && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowLandingBellNotification(false)}
                className="fixed inset-0 bg-black/50"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="bg-white p-6 rounded-[2.5rem] w-full max-w-sm relative z-10 text-center space-y-4 border border-gray-100 shadow-2xl"
              >
                <div className="w-16 h-16 bg-[#3B0764]/10 rounded-3xl flex items-center justify-center text-[#3B0764] mx-auto">
                  <Bell size={28} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-800 uppercase tracking-tight">Activez vos alertes</h3>
                  <p className="text-xs text-gray-400 mt-1">Créez votre compte gratuit ou connectez-vous pour recevoir vos notifications de tour de table, validations de paiements et nouvelles offres !</p>
                </div>
                <div className="space-y-2">
                  <Button variant="primary" onClick={() => { setShowLandingBellNotification(false); setIsRegistering(true); setIsLoggingIn(false); setRegStep(1); }}>Créer mon compte</Button>
                  <button onClick={() => setShowLandingBellNotification(false)} className="text-xs font-black text-gray-400 uppercase underline hover:text-gray-600 py-1 inline-block">Plus tard</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CHAT SUPPORT */}
        <AnimatePresence>
          {showLandingSupport && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowLandingSupport(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ translateY: "100%" }} 
                animate={{ translateY: 0 }} 
                exit={{ translateY: "100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-md bg-white rounded-t-[2.5rem] shadow-2xl h-[80vh] flex flex-col z-10"
              >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#3B0764] text-white flex items-center justify-center">
                      <Headset size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-800">Assistance Client 24/7</h4>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-500 font-bold uppercase">En ligne</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowLandingSupport(false)}
                    className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {landingSupportChat.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-3xl max-w-[85%] text-xs font-bold shadow-sm leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-[#3B0764] text-white rounded-tr-sm' 
                          : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2 shrink-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1 font-sans">Sujets fréquents :</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Qu'est-ce que Tontine Pro ?",
                      "Comment de retirer mes sous ?",
                      "Est-ce sécurisé ?",
                      "Que rapporte le parrainage ?"
                    ].map((q, id) => (
                      <button 
                        key={id}
                        onClick={() => handleLandingSupportQuestion(q)}
                        className="text-[10px] font-black uppercase text-[#3B0764] bg-white border border-[#3B0764]/10 hover:border-[#3B0764]/30 px-3 py-1.5 rounded-full active:scale-95 transition-all shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-2 items-center bg-white shrink-0 pb-10">
                  <input 
                    type="text" 
                    placeholder="Écrivez votre message ici..." 
                    value={landingSupportCustomText}
                    onChange={(e) => setLandingSupportCustomText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLandingCustomMessageSend();
                    }}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs outline-none focus:ring-4 focus:ring-[#3B0764]/5 focus:border-[#3B0764]"
                  />
                  <Button 
                    variant="primary"
                    className="py-3 px-4 rounded-2xl min-w-0"
                    onClick={handleLandingCustomMessageSend}
                  >
                    Envoyer
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderLoginContent = () => {
    return (
      <div className="bg-gray-50 px-6 py-12 flex flex-col justify-center items-center min-h-[85vh] animate-in slide-in-from-top duration-300">
        <button 
          onClick={() => { setIsLoggingIn(false); setIsRegistering(false); }}
          className="mb-6 flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl border border-gray-100 text-xs font-black text-[#3B0764] hover:bg-gray-100 shadow-sm active:scale-95 transition-all uppercase tracking-wider"
        >
          <Home size={16} />
          Retour à l'accueil
        </button>

        <div className="space-y-10 max-w-md w-full bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-purple-950/5">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-gray-900 leading-tight">Bon retour ! 👋</h2>
            <p className="text-gray-500 text-xs px-4">Entrez votre numéro et mot de passe pour accéder à votre espace sécurisé.</p>
          </div>
          
          <div className="space-y-6">
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#3B0764] transition-all" size={24} />
              <input 
                type="tel" 
                placeholder="+225 07 00 00 00 00" 
                className="w-full bg-gray-50 p-5 pl-14 rounded-3xl border border-gray-100 outline-none focus:ring-4 focus:ring-[#3B0764]/10 focus:border-[#3B0764] transition-all text-lg font-bold"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <input 
                type="password" 
                placeholder="Votre mot de passe" 
                className="w-full bg-gray-50 p-5 rounded-3xl border border-gray-100 outline-none focus:ring-4 focus:ring-[#3B0764]/10 focus:border-[#3B0764] transition-all text-base font-bold"
                value={loginPasswordStr}
                onChange={(e) => setLoginPasswordStr(e.target.value)}
              />
            </div>

            <Button variant="primary" className="w-full py-5 text-lg" disabled={!loginPhone || !loginPasswordStr || isLoggingInAction} onClick={handleLogin}>
              {isLoggingInAction ? "Vérification..." : "Se connecter"}
            </Button>
            <p className="text-center text-xs font-bold text-gray-500">
              Pas encore de compte ? {" "}
              <button 
                onClick={() => { setIsLoggingIn(false); setIsRegistering(true); setRegStep(1); }}
                className="text-[#3B0764] font-black underline hover:text-[#2C054D]"
              >
                Inscrivez-vous ici
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderRegisterContent = () => {
    return (
      <div className="bg-gray-50 p-6 flex flex-col min-h-[85vh] justify-center items-center">
        <button 
          onClick={() => { setIsRegistering(false); setIsLoggingIn(false); }}
          className="mb-6 flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl border border-gray-100 text-xs font-black text-[#3B0764] hover:bg-gray-100 shadow-sm active:scale-95 transition-all uppercase tracking-wider"
        >
          <Home size={16} />
          Retour à l'accueil
        </button>

        <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-purple-950/5 space-y-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (regStep === 1) {
                  setIsRegistering(false);
                } else {
                  setRegStep(Math.max(1, regStep - 1));
                }
              }} 
              className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#3B0764] transition-all duration-700 ease-out" style={{ width: `${(regStep / 4) * 100}%` }} />
            </div>
            <span className="text-xs font-black text-[#3B0764]">{regStep}/4</span>
          </div>

          <AnimatePresence mode="wait">
            {regStep === 1 && (
              <motion.div key="st1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">C'est quoi votre prénom ?</h2>
                  <p className="text-xs text-gray-500">On veut juste savoir comment vous appeler.</p>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                  <input 
                    type="text" autoFocus
                    placeholder="Ex: Koffi"
                    className="w-full bg-gray-50 p-5 pl-14 rounded-3xl border border-gray-100 outline-none focus:ring-4 focus:ring-[#3B0764]/10 text-lg font-bold"
                    value={regData.firstName}
                    onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
                  />
                </div>
                <Button variant="primary" className="w-full py-5 text-lg" disabled={!regData.firstName} onClick={() => setRegStep(2)}>Suivant</Button>
              </motion.div>
            )}

            {regStep === 2 && (
              <motion.div key="st2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">Un petit Selfie ! 🤳</h2>
                  <p className="text-xs text-gray-500">Pour garantir que c'est bien vous, le BOSS.</p>
                </div>
                <div className="aspect-square bg-black rounded-[2.5rem] overflow-hidden relative shadow-inner ring-4 ring-gray-100">
                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-900 text-white space-y-4">
                      <Camera size={48} className="text-gray-700 animate-pulse" />
                      <p className="text-xs font-bold opacity-80">{cameraError}</p>
                      <div className="w-full space-y-2">
                        <Button variant="secondary" className="w-full text-xs" onClick={startCamera}>Réessayer la caméra</Button>
                        <div className="relative">
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setRegData({ ...regData, selfie: ev.target?.result as string });
                              reader.readAsDataURL(file);
                            }
                          }} />
                          <Button variant="ghost" className="w-full border border-white/20 text-white text-xs">Importer une photo</Button>
                        </div>
                      </div>
                    </div>
                  ) : !regData.selfie ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-8 border-white/20 rounded-[2.5rem] pointer-events-none m-3" />
                      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4">
                        <button onClick={captureSelfie} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border-4 border-[#3B0764]/30">
                          <Camera size={32} className="text-[#3B0764]" />
                        </button>
                        <div className="relative">
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setRegData({ ...regData, selfie: ev.target?.result as string });
                              reader.readAsDataURL(file);
                            }
                          }} />
                          <span className="text-white text-[10px] font-black bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">OU IMPORTER UN FICHIER</span>
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </>
                  ) : (
                    <div className="relative w-full h-full">
                      <img src={regData.selfie} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button onClick={() => { setRegData({ ...regData, selfie: '' }); startCamera(); }} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-6 py-2 rounded-full font-black border border-white/20 shadow-lg text-xs">REPRENDRE</button>
                    </div>
                  )}
                </div>
                <Button variant="primary" className="w-full py-5 text-lg" disabled={!regData.selfie} onClick={() => setRegStep(3)}>C'est parfait !</Button>
              </motion.div>
            )}

            {regStep === 3 && (
              <motion.div key="st3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">Votre Mobile 📱</h2>
                  <p className="text-xs text-gray-500">Pour recevoir votre code et gérer votre argent.</p>
                </div>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                  <input 
                    type="tel" autoFocus placeholder="+225 07..."
                    className="w-full bg-gray-50 p-5 pl-14 rounded-3xl border border-gray-100 outline-none focus:ring-4 focus:ring-[#3B0764]/10 text-lg font-bold"
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-bold">Définissez votre mot de passe :</p>
                  <input 
                    type="password" placeholder="Mot de passe"
                    className="w-full bg-gray-50 p-5 rounded-3xl border border-gray-100 outline-none focus:ring-4 focus:ring-[#3B0764]/10 text-base font-bold"
                    value={regData.password || ''}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  />
                </div>
                <Button variant="primary" className="w-full py-5 text-lg" disabled={!regData.phone || !regData.password} onClick={() => setRegStep(4)}>M'envoyer le code</Button>
              </motion.div>
            )}

            {regStep === 4 && (
              <motion.div key="st4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">Checkez vos SMS</h2>
                  <p className="text-xs text-gray-500">Tapez les 4 chiffres reçus (Astuce: 1234).</p>
                </div>
                <div className="flex justify-between gap-2.5 font-sans">
                  {[...Array(4)].map((_, i) => (
                    <input 
                      key={i} id={`sms-input-${i}`} type="text" inputMode="numeric" maxLength={1} value={smsCode[i] || ''}
                      className="w-full aspect-square bg-gray-50 text-center text-2xl font-black rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-[#3B0764]/10 focus:border-[#3B0764] transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !smsCode[i] && i > 0) {
                          const prev = document.getElementById(`sms-input-${i - 1}`) as HTMLInputElement;
                          if (prev) prev.focus();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (!val) {
                          const nc = smsCode.split(''); nc[i] = ''; setSmsCode(nc.join('')); return;
                        }
                        const nc = smsCode.split(''); nc[i] = val[val.length - 1]; setSmsCode(nc.join('').slice(0, 4));
                        if (i < 3) {
                          const next = document.getElementById(`sms-input-${i + 1}`) as HTMLInputElement;
                          if (next) next.focus();
                        }
                      }}
                    />
                  ))}
                </div>
                <Button variant="primary" className="w-full py-5 text-lg" disabled={smsCode.length < 4 || isSubmitting} onClick={handleRegister}>
                  {isSubmitting ? "Finalisation..." : "Valider l'inscription"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-center text-xs font-bold text-gray-500 pt-2">
            Déjà inscrit ? {" "}
            <button 
              onClick={() => { setIsRegistering(false); setIsLoggingIn(true); }}
              className="text-[#3B0764] font-black underline hover:text-purple-900"
            >
              Connectez-vous ici
            </button>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#3B0764]/10 relative">
      <GuestSidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col pb-10">
        <main className="flex-1 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={isRegistering ? 'register' : isLoggingIn ? 'login' : 'accueil'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {!isRegistering && !isLoggingIn ? renderLandingContent() : isRegistering ? renderRegisterContent() : renderLoginContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
