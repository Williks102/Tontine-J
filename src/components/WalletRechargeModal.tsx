import React, { useState } from 'react';
import { X, Wallet, Phone, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { authFetch } from '../hooks/useAuth';

interface Props {
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

type Step = 'form' | 'loading' | 'success' | 'error';

export const WalletRechargeModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [newBalance, setNewBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const amountInt = parseInt(amount) || 0;
  const isValid = amountInt >= 500 && amountInt <= 1000000 && phone.length >= 8;

  const handleRecharge = async () => {
    if (!isValid) return;
    setStep('loading');
    try {
      const res = await authFetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInt, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors de la recharge');
        setStep('error');
        return;
      }
      setNewBalance(data.newBalance);
      setStep('success');
      onSuccess(data.newBalance);
    } catch {
      setErrorMsg('Erreur de connexion. Vérifiez votre réseau.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#3B0764] px-6 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">Recharger mon compte</h3>
              <p className="text-white/60 text-[10px] font-bold">Mobile Money — Simulation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <AnimatePresence mode="wait">

            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Montants rapides */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Montant rapide</p>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.map(q => (
                      <button
                        key={q}
                        onClick={() => setAmount(String(q))}
                        className={`py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                          amountInt === q
                            ? 'bg-[#3B0764] text-white border-[#3B0764]'
                            : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-[#3B0764]/30'
                        }`}
                      >
                        {q.toLocaleString()} F
                      </button>
                    ))}
                  </div>
                </div>

                {/* Montant personnalisé */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Montant (FCFA)</p>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Ex: 15 000"
                    className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-lg font-black outline-none focus:ring-4 focus:ring-[#3B0764]/10 focus:border-[#3B0764]/30"
                  />
                  {amountInt > 0 && amountInt < 500 && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">Minimum: 500 FCFA</p>
                  )}
                </div>

                {/* Numéro Mobile Money */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Numéro Mobile Money</p>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+225 07 XX XX XX XX"
                      className="w-full bg-gray-50 pl-10 pr-4 py-4 rounded-2xl border border-gray-100 text-sm font-bold outline-none focus:ring-4 focus:ring-[#3B0764]/10 focus:border-[#3B0764]/30"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full py-4"
                  disabled={!isValid}
                  onClick={handleRecharge}
                >
                  Recharger {amountInt >= 500 ? `${amountInt.toLocaleString()} F` : ''}
                </Button>

                <p className="text-center text-[10px] text-gray-400 font-bold">
                  Mode simulation — aucun débit réel effectué
                </p>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-[#3B0764]/10 rounded-full flex items-center justify-center">
                  <Loader size={28} className="text-[#3B0764] animate-spin" />
                </div>
                <p className="text-sm font-black text-gray-700">Traitement en cours...</p>
                <p className="text-xs text-gray-400 font-bold">Connexion à l'opérateur Mobile Money</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">Recharge réussie !</p>
                  <p className="text-sm font-bold text-gray-500 mt-1">
                    +{amountInt.toLocaleString()} FCFA ajoutés
                  </p>
                </div>
                <div className="w-full bg-emerald-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Nouveau solde</p>
                  <p className="text-2xl font-black text-emerald-800">{newBalance.toLocaleString()} <span className="text-sm">FCFA</span></p>
                </div>
                <Button variant="primary" className="w-full" onClick={onClose}>
                  Fermer
                </Button>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <div>
                  <p className="text-base font-black text-gray-900">Échec de la recharge</p>
                  <p className="text-sm font-bold text-red-500 mt-1">{errorMsg}</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" className="flex-1" onClick={() => setStep('form')}>Réessayer</Button>
                  <Button variant="primary" className="flex-1" onClick={onClose}>Fermer</Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
