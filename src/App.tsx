import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';

import { AuthProvider, useAuthContext } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';

import GuestView from './components/GuestView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Groups } from './pages/Groups';
import { MyCard } from './pages/MyCard';
import { Profile } from './pages/Profile';
import { Support } from './pages/Support';
import { Referral } from './pages/Referral';
import { Payments } from './pages/Payments';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTontines } from './pages/admin/AdminTontines';
import { AdminSettings } from './pages/admin/AdminSettings';

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

function InnerApp() {
  const { 
    user, 
    isRegistering, 
    setIsRegistering, 
    isLoggingIn, 
    setIsLoggingIn, 
    regStep, 
    setRegStep, 
    regData, 
    setRegData, 
    loginPhone, 
    setLoginPhone,
    loginPasswordStr,
    setLoginPasswordStr,
    handleLogin: authLogin,
    handleRegister: authRegister
  } = useAuthContext();

  const { activeTab, setActiveTab, currentPage, setCurrentPage } = useNavigation();

  // --- Landing & Auth specific local UI states ---
  const [smsCode, setSmsCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [selectedLandingCategory, setSelectedLandingCategory] = useState<any>(null);
  const [showLandingBellNotification, setShowLandingBellNotification] = useState(false);
  const [showLandingSupport, setShowLandingSupport] = useState(false);
  const [landingSupportChat, setLandingSupportChat] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [landingSupportCustomText, setLandingSupportCustomText] = useState("");

  const [isLoggingInAction, setIsLoggingInAction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin and profile states
  const [viewingMember, setViewingMember] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (regStep === 2 && !regData.selfie && isRegistering) {
      startCamera();
    }
  }, [regStep, regData.selfie, isRegistering]);

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
        setCameraError("L'accès à la caméra a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
      } else {
        setCameraError("Impossible d'accéder à la caméra. Veuillez sélectionner l'option d'importation manuelle.");
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

  const executeLogin = async () => {
    if (!loginPhone.trim() || !loginPasswordStr.trim()) return;
    setIsLoggingInAction(true);
    const res = await authLogin();
    setIsLoggingInAction(false);
    if (!res.success) {
      alert(res.error || "Identifiants de connexion invalides.");
    }
  };

  const executeRegister = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let finalSelfie = regData.selfie;
    if (finalSelfie && finalSelfie.startsWith('data:image')) {
      finalSelfie = await compressImage(finalSelfie);
    }
    const res = await authRegister();
    setIsSubmitting(false);
    if (!res.success) {
      alert(res.error || "Erreur d'inscription.");
    } else {
      setSmsCode('');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tableaudebord':
        return <Dashboard />;
      case 'groupes':
        return <Groups />;
      case 'macarte':
        return <MyCard />;
      case 'profil':
        return <Profile />;
      case 'support':
        return <Support />;
      case 'parrainage':
        return <Referral />;
      case 'paiements':
        return <Payments />;
      case 'admin_activite':
        return <AdminDashboard setViewingMember={setViewingMember} />;
      case 'admin_utilisateurs':
        return <AdminUsers viewingMember={viewingMember} setViewingMember={setViewingMember} />;
      case 'admin_tontines':
        return <AdminTontines />;
      case 'admin_parametres':
        return <AdminSettings />;
      default:
        return user?.role === 'admin' ? <AdminDashboard setViewingMember={setViewingMember} /> : <Dashboard />;
    }
  };

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
        loginPasswordStr={loginPasswordStr}
        setLoginPasswordStr={setLoginPasswordStr}
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
        handleLogin={executeLogin}
        isLoggingInAction={isLoggingInAction}
        handleRegister={executeRegister}
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
        <Header viewingMember={viewingMember} setViewingMember={setViewingMember} />
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {user?.role === 'user' && activeTab === 'tableaudebord' && (
        <button 
          onClick={() => setActiveTab('groupes')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#3B0764] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 lg:hidden border-4 border-amber-400 cursor-pointer"
        >
          <Plus size={32} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return <InnerApp />;
}
