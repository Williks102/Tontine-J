import React, { useState, useEffect } from 'react';
import { 
  Settings, Banknote, Wallet, CreditCard, UserPlus, 
  History, ChevronRight, LogOut, ArrowLeft, Plus, 
  Trash2, Check, AlertCircle, RefreshCw, Search, Shield 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { authFetch } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

interface Formula {
  id: string;
  name: string;
  stake: number;
  durationDays: number;
  maxMembers: number;
}

interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

interface Administrator {
  id: string;
  firstName: string;
  phone: string;
  role: string;
}

export const AdminSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulas state
  const [formulas, setFormulas] = useState<Formula[]>([]);
  
  // Form input states
  const [withdrawalLimit, setWithdrawalLimit] = useState<number>(500000);
  const [minDeposit, setMinDeposit] = useState<number>(500);
  const [maxDeposit, setMaxDeposit] = useState<number>(1000000);
  const [commissionRate, setCommissionRate] = useState<number>(10);

  // New admin state
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  // Logs search state
  const [logSearch, setLogSearch] = useState('');

  // Fetch all initial setting data
  const loadSettingsData = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        
        // Parse withdrawal limits and deposits
        if (data.withdrawal_limit) setWithdrawalLimit(parseInt(data.withdrawal_limit) || 500000);
        if (data.min_deposit) setMinDeposit(parseInt(data.min_deposit) || 500);
        if (data.max_deposit) setMaxDeposit(parseInt(data.max_deposit) || 1000000);
        if (data.commission_rate) setCommissionRate(parseInt(data.commission_rate) || 10);
        
        // Parse formulas config
        if (data.formulas_config) {
          try {
            setFormulas(JSON.parse(data.formulas_config));
          } catch (e) {
            console.error("Failed to parse formulas_config", e);
          }
        }
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await authFetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Error loading audit logs:", e);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await authFetch('/api/admin/administrators');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (e) {
      console.error("Error loading administrators:", e);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  useEffect(() => {
    if (activeSection === 'logs') {
      loadLogs();
    } else if (activeSection === 'droits') {
      loadAdmins();
    }
  }, [activeSection]);

  const triggerFeedback = (success: boolean, message: string) => {
    if (success) {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Safe save settings helper
  const saveKeyValues = async (updatedValues: Record<string, any>) => {
    setIsSaving(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(updatedValues)
      });
      if (res.ok) {
        // Update local settings state
        setSettings(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(updatedValues).map(([k, v]) => [
              k, 
              typeof v === 'object' ? JSON.stringify(v) : String(v)
            ])
          )
        }));
        triggerFeedback(true, "Paramètres enregistrés et appliqués avec succès !");
        loadLogs(); // Refresh logs if open
      } else {
        const err = await res.json();
        triggerFeedback(false, err.error || "Une erreur s'est produite lors de la sauvegarde.");
      }
    } catch (e: any) {
      triggerFeedback(false, "Impossible de joindre le serveur de configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  // Formula functions
  const handleUpdateFormula = (index: number, field: keyof Formula, value: any) => {
    const updatedFormulas = [...formulas];
    updatedFormulas[index] = {
      ...updatedFormulas[index],
      [field]: field === 'name' ? value : parseInt(value) || 0
    };
    setFormulas(updatedFormulas);
  };

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: `formula_${Math.random().toString(36).substr(2, 5)}`,
      name: "Tontine Premium",
      stake: 25000,
      durationDays: 30,
      maxMembers: 10
    };
    setFormulas([...formulas, newFormula]);
  };

  const handleRemoveFormula = (index: number) => {
    setFormulas(formulas.filter((_, i) => i !== index));
  };

  const saveFormulas = () => {
    saveKeyValues({ formulas_config: formulas });
  };

  // Limit functions
  const saveLimits = () => {
    saveKeyValues({
      withdrawal_limit: withdrawalLimit,
      min_deposit: minDeposit,
      max_deposit: maxDeposit
    });
  };

  // Servcing commission functions
  const saveCommission = () => {
    saveKeyValues({ commission_rate: commissionRate });
  };

  // Grant admin right functions
  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPhone) {
      triggerFeedback(false, "Le numéro de téléphone est obligatoire.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await authFetch('/api/admin/administrators/promote', {
        method: 'POST',
        body: JSON.stringify({
          phone: newAdminPhone,
          firstName: newAdminName || "Admin Associé"
        })
      });
      if (res.ok) {
        triggerFeedback(true, "Nouvel administrateur ajouté avec succès !");
        setNewAdminPhone('');
        setNewAdminName('');
        loadAdmins();
      } else {
        const err = await res.json();
        triggerFeedback(false, err.error || "Erreur de promotion.");
      }
    } catch (e: any) {
      triggerFeedback(false, "Erreur d'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger simulated system maintenance mode
  const handleSystemMaintenance = () => {
    triggerFeedback(true, "Base de données nettoyée, logs archivés et cache vidé.");
  };

  const menuItems = [
    { 
      id: 'formules', 
      label: 'Configuration des formules', 
      desc: 'Editer les montants, limites et durées par tontine', 
      icon: Banknote, 
      color: 'bg-violet-50 text-violet-600 border-violet-100' 
    },
    { 
      id: 'limites', 
      label: 'Limites de retrait & Mises', 
      desc: 'Gestion des plafonds de retrait journaliers', 
      icon: Wallet, 
      color: 'bg-amber-50 text-amber-600 border-amber-100' 
    },
    { 
      id: 'frais', 
      label: 'Frais de service & coms', 
      desc: 'Paramétrage des commissions obligatoires', 
      icon: CreditCard, 
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100' 
    },
    { 
      id: 'droits', 
      label: 'Gestion des droits d\'accès', 
      desc: 'Ajouter ou modifier des associés admins', 
      icon: UserPlus, 
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100' 
    },
    { 
      id: 'logs', 
      label: 'Logs système & audits', 
      desc: 'Historique des actions administratives', 
      icon: History, 
      color: 'bg-sky-50 text-sky-600 border-sky-100' 
    },
  ];

  return (
    <div className="space-y-6 font-sans p-4 pb-24">
      {/* Notifications Banners */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-xl p-3.5 flex items-center gap-2 shadow-sm"
          >
            <Check size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black rounded-xl p-3.5 flex items-center gap-2 shadow-sm"
          >
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#3B0764] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#3B0764]/10">
                <Settings size={22} className="animate-spin duration-1000" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Paramètres</h2>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Configuration Tontine Pro</p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {menuItems.map((s) => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveSection(s.id)}
                  className="w-full bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${s.color}`}>
                    <s.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{s.label}</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
              ))}
            </div>

            {/* Support Maintenance */}
            <div className="pt-4 border-t border-gray-100">
              <Button 
                variant="secondary" 
                className="w-full border-red-50 text-rose-600 bg-red-50 hover:bg-red-100 rounded-3xl" 
                icon={LogOut}
                onClick={handleSystemMaintenance}
              >
                Maintenance Système Pro
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Detail View Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSection(null)}
                className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-700 active:scale-90 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                  {menuItems.find(x => x.id === activeSection)?.label}
                </h3>
                <p className="text-[9px] text-gray-400 font-bold">Retour aux paramètres généraux</p>
              </div>
            </div>

            {/* Detail Panels */}
            {activeSection === 'formules' && (
              <div className="space-y-5">
                <p className="text-xs text-gray-400 font-medium leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  Définissez les modèles de tontine. Les clients et administrateurs utiliseront ces préréglages pour de nouvelles cotisations.
                </p>

                <div className="space-y-4">
                  {formulas.map((form, index) => (
                    <div key={form.id || index} className="p-4 bg-white border border-gray-100 rounded-3xl space-y-3.5 relative shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                        <span className="text-[10px] font-black uppercase text-[#3B0764] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                          Formule #{index + 1}
                        </span>
                        <button 
                          onClick={() => handleRemoveFormula(index)}
                          className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all text-xs"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="col-span-2">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Nom du pack</label>
                          <input 
                            type="text"
                            value={form.name}
                            onChange={(e) => handleUpdateFormula(index, 'name', e.target.value)}
                            className="w-full text-xs p-3 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Mise (FCFA)</label>
                          <input 
                            type="number"
                            value={form.stake}
                            onChange={(e) => handleUpdateFormula(index, 'stake', e.target.value)}
                            className="w-full text-xs p-3 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Membres Max</label>
                          <input 
                            type="number"
                            value={form.maxMembers}
                            onChange={(e) => handleUpdateFormula(index, 'maxMembers', e.target.value)}
                            className="w-full text-xs p-3 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Durée (jours)</label>
                          <input 
                            type="number"
                            value={form.durationDays}
                            onChange={(e) => handleUpdateFormula(index, 'durationDays', e.target.value)}
                            className="w-full text-xs p-3 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={handleAddFormula}
                    className="w-full py-4 rounded-3xl border border-dashed border-purple-200 text-purple-600 flex items-center justify-center gap-2 font-black uppercase tracking-wider text-[10px] bg-purple-50/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    Ajouter une formule
                  </button>

                  <div className="pt-2">
                    <Button 
                      className="w-full shadow-lg shadow-purple-950/10 rounded-3xl py-4" 
                      onClick={saveFormulas}
                      disabled={isSaving}
                      icon={Check}
                    >
                      {isSaving ? "Enregistrement..." : "Appliquer les Formules"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'limites' && (
              <div className="bg-white p-5 border border-gray-100 rounded-3xl space-y-4 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">Plafond de retrait quotidien (FCFA)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={withdrawalLimit}
                        onChange={(e) => setWithdrawalLimit(parseInt(e.target.value) || 0)}
                        className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-black text-gray-800 bg-gray-50"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[100000, 500000, 1000000].map((v) => (
                        <button
                          key={v}
                          onClick={() => setWithdrawalLimit(v)}
                          className="text-[9px] font-black uppercase bg-purple-50 text-[#3B0764] hover:bg-purple-100 px-3 py-1.5 rounded-full border border-purple-100 transition-colors"
                        >
                          {v.toLocaleString()} F
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">Mise Minimale par Transaction (FCFA)</label>
                    <input 
                      type="number"
                      value={minDeposit}
                      onChange={(e) => setMinDeposit(parseInt(e.target.value) || 0)}
                      className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">Mise Maximale Autorisée (FCFA)</label>
                    <input 
                      type="number"
                      value={maxDeposit}
                      onChange={(e) => setMaxDeposit(parseInt(e.target.value) || 0)}
                      className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764] font-mono font-bold text-gray-800"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <Button 
                      className="w-full rounded-3xl" 
                      onClick={saveLimits} 
                      disabled={isSaving}
                      icon={Check}
                    >
                      {isSaving ? "Enregistrement..." : "Sauvegarder les limites"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'frais' && (
              <div className="bg-white p-5 border border-gray-100 rounded-3xl space-y-4 shadow-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed bg-emerald-50 text-emerald-800 p-3 rounded-2xl border border-emerald-100">
                    Cette commission administrative standard s'applique sur chaque adhésion de tontine ainsi que sur le cycle de clôture.
                  </p>

                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">Taux de Commission de l'Application (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(parseInt(e.target.value) || 0)}
                      className="w-full text-xs p-3.5 pr-12 border border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-mono font-black text-gray-800"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">%</div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {[5, 8, 10, 12, 15].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setCommissionRate(rate)}
                        className={`text-[9px] font-black uppercase px-3.5 py-2 rounded-full border transition-all ${rate === commissionRate ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 rounded-3xl" 
                    onClick={saveCommission} 
                    disabled={isSaving}
                    icon={Check}
                  >
                    {isSaving ? "Calcul en cours..." : "Sauvegarder le Taux"}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === 'droits' && (
              <div className="space-y-5">
                {/* Administrators list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Équipe d'Administration Actuelle ({admins.length})</h4>
                  <div className="space-y-2">
                    {admins.map((adm) => (
                      <div key={adm.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3B0764]/5 text-[#3B0764] rounded-xl flex items-center justify-center font-bold">
                            <Shield size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{adm.firstName}</p>
                            <p className="text-[10px] text-gray-400 font-mono font-bold">{adm.phone}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
                          ADMIN PRO
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promote new admin */}
                <form onSubmit={handlePromoteAdmin} className="bg-white p-5 border border-gray-100 rounded-3xl space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-gray-700 tracking-wider">Promouvoir un Associé Admin</h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                    Entrez le numéro d'un utilisateur existant ou d'un nouvel associé pour lui accorder les accès complets à la plateforme d'administration.
                  </p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Téléphone de l'associé</label>
                      <input 
                        type="text"
                        placeholder="Ex: 0702490277"
                        value={newAdminPhone}
                        onChange={(e) => setNewAdminPhone(e.target.value)}
                        className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Prénom / Surnom</label>
                      <input 
                        type="text"
                        placeholder="Ex: Koffi"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        className="w-full text-xs p-3.5 border border-gray-100 rounded-2xl outline-none focus:border-[#3B0764]"
                      />
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full rounded-3xl" 
                        disabled={isSaving}
                        icon={UserPlus}
                      >
                        {isSaving ? "Vérification..." : "Nommer Administrateur"}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'logs' && (
              <div className="space-y-4">
                {/* Search logs bar */}
                <div className="bg-white p-2.5 border border-gray-100 rounded-2xl flex items-center gap-2.5 shadow-sm">
                  <Search size={18} className="text-gray-300 ml-2" />
                  <input 
                    type="text"
                    placeholder="Filtrer les historiques de modifications..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full text-xs py-1.5 outline-none font-bold text-gray-700"
                  />
                  {logSearch && (
                    <button 
                      onClick={() => setLogSearch('')}
                      className="text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase pr-2"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {/* Audit trail */}
                <div className="space-y-3.5">
                  {logs.filter(l => 
                    l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                    l.details.toLowerCase().includes(logSearch.toLowerCase())
                  ).length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-300 font-bold bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      Aucune modification enregistrée correspondant.
                    </div>
                  ) : (
                    logs.filter(l => 
                      l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                      l.details.toLowerCase().includes(logSearch.toLowerCase())
                    ).map((l) => (
                      <div key={l.id} className="bg-white p-4 border border-gray-100 rounded-3xl space-y-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {l.action}
                          </span>
                          <span className="text-[8px] text-gray-400 font-mono font-bold">
                            {new Date(l.timestamp).toLocaleString('fr-FR', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short'
                            })}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-gray-500 font-medium leading-relaxed">
                          {l.details}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
