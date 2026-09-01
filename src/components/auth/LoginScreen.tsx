import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Store,
  Stethoscope,
  Scissors,
  UserCheck,
  Zap,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

interface LoginScreenProps {
  onSuccessfulLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccessfulLogin }) => {
  const { login, loginAsUser, loginWithPin, users, activeBranchId, setActiveBranchId, activeOwnership, setActiveOwnership } = useAuth();
  const { branches = [] } = useData();
  const { addToast } = useToast();

  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');
  const [emailOrPhone, setEmailOrPhone] = useState('owner.klinik@petcare.id');
  const [password, setPassword] = useState('petcare123');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Selected ownership profile
  const selectedOwnership = activeOwnership || 'owner_klinik';
  const selectedBranch = activeBranchId || 'b1';

  // Handle change of ownership model with matching default email
  const handleOwnershipChange = (newOwnership: string) => {
    setActiveOwnership(newOwnership);
    if (newOwnership === 'owner_petshop') {
      setEmailOrPhone('owner.petshop@petcare.id');
    } else if (newOwnership === 'owner_petcare') {
      setEmailOrPhone('owner.petcare@petcare.id');
    } else if (newOwnership === 'superadmin') {
      setEmailOrPhone('admin@petcare.id');
    } else if (newOwnership === 'pemilik') {
      setEmailOrPhone('budi@gmail.com');
    } else {
      setEmailOrPhone('owner.klinik@petcare.id');
    }
  };

  // Handle standard credential login
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const result = await login(emailOrPhone, password, {
      branchId: selectedBranch,
      ownershipType: selectedOwnership
    });

    setIsLoading(false);
    if (result.success) {
      addToast('Berhasil masuk ke portal sistem.', 'success');
      if (onSuccessfulLogin) onSuccessfulLogin();
    } else {
      setErrorMessage(result.message || 'Email atau kata sandi tidak valid.');
    }
  };

  // Handle PIN fast login
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMessage('PIN harus berupa 4 digit angka.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const result = loginWithPin(pin, selectedBranch);
      setIsLoading(false);
      if (result.success) {
        addToast('Login shift cepat via PIN berhasil.', 'success');
        if (onSuccessfulLogin) onSuccessfulLogin();
      } else {
        setErrorMessage(result.message || 'PIN yang dimasukkan salah.');
      }
    }, 200);
  };

  // Handle 1-click quick demo login
  const handleQuickDemo = (role: UserRole) => {
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      let targetOwnership = selectedOwnership;
      if (role === 'owner_klinik' || role === 'owner_petshop' || role === 'owner_petcare') {
        targetOwnership = role;
        setActiveOwnership(role);
      }

      // Find matching user from users list
      const targetUser =
        users.find((u) => u.role === role) ||
        users.find((u) => u.ownershipType === role) ||
        users[0];

      loginAsUser(targetUser, {
        branchId: selectedBranch,
        ownershipType: targetOwnership
      });
      setIsLoading(false);
      addToast(`Masuk sebagai ${targetUser.name}`, 'success');
      if (onSuccessfulLogin) onSuccessfulLogin();
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#101A2C] text-[#EDE6D6] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#B8905A] selection:text-[#101A2C]">
      
      {/* Centered Minimalist Login Container */}
      <div className="w-full max-w-md space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B2A45] border border-[#B8905A]/40 text-[#D9B98A] shadow-lg mb-1">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#FFFDF9] tracking-tight font-display">
            PetCare Cloud ERP
          </h1>
          <p className="text-xs text-[#EDE6D6]/70">
            Sistem Manajemen Klinik Hewan, Retail POS & Salon Terpadu
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1B2A45] rounded-2xl border border-[#B8905A]/30 p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-md">
          
          {/* Business Model & Branch Selectors (Compact Dropdowns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Profil Usaha */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#D9B98A] block">
                Model Usaha
              </label>
              <div className="relative">
                <select
                  value={selectedOwnership}
                  onChange={(e) => handleOwnershipChange(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-xs font-semibold text-[#FFFDF9] focus:outline-none focus:border-[#B8905A] appearance-none cursor-pointer"
                >
                  <option value="owner_klinik">🏥 Klinik & RS Hewan</option>
                  <option value="owner_petshop">🛒 Pet Shop Retail</option>
                  <option value="owner_petcare">🐾 One-Stop PetCare</option>
                  <option value="superadmin">👑 SaaS Superadmin</option>
                  <option value="pemilik">🐕 Portal Klien</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#D9B98A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Cabang Operasional */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#D9B98A] block">
                Cabang Outlet
              </label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-xs font-semibold text-[#FFFDF9] focus:outline-none focus:border-[#B8905A] appearance-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="all">Konsolidasi (Semua Cabang)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#D9B98A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Auth Tab Switcher (Credentials vs PIN) */}
          <div className="flex bg-[#101A2C] p-1 rounded-xl border border-[#B8905A]/20">
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'credentials'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-xs'
                  : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Kredensial Akun</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'pin'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-xs'
                  : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PIN Shift Cepat</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Form 1: Kredensial Email & Password */}
          {authMode === 'credentials' && (
            <form onSubmit={handleCredentialSubmit} className="space-y-3.5">
              
              {/* Email / ID Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#D9B98A] block">
                  Email atau ID Pengguna
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#D9B98A]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                    placeholder="nama@petcare.id"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-xs text-[#FFFDF9] placeholder-[#EDE6D6]/40 focus:outline-none focus:border-[#B8905A]"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#D9B98A]">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-[#D9B98A]/80 hover:text-[#D9B98A] hover:underline cursor-pointer"
                  >
                    Lupa Sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D9B98A]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-xs text-[#FFFDF9] placeholder-[#EDE6D6]/40 focus:outline-none focus:border-[#B8905A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#EDE6D6]/60 hover:text-[#FFFDF9] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#B8905A] hover:bg-[#D9B98A] text-[#101A2C] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* Form 2: PIN Shift Cepat */}
          {authMode === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              
              <div className="text-center space-y-1">
                <p className="text-xs text-[#EDE6D6]/80">
                  Masukkan 4 digit PIN kasir / staff bertugas:
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    autoFocus
                    className="w-36 text-center tracking-[0.6em] text-2xl font-mono py-2.5 rounded-xl bg-[#101A2C] border border-[#B8905A]/60 text-[#FFFDF9] focus:outline-none focus:border-[#B8905A]"
                  />
                </div>
                <p className="text-[10px] text-[#EDE6D6]/50 pt-1">
                  Demo PIN default: <span className="font-mono text-[#D9B98A]">1234</span>
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full py-2.5 rounded-xl bg-[#B8905A] hover:bg-[#D9B98A] text-[#101A2C] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <span>Memverifikasi PIN...</span> : <span>Masuk Shift</span>}
              </button>

            </form>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#B8905A]/20" />
            </div>
            <span className="relative px-3 bg-[#1B2A45] text-[10px] font-bold uppercase tracking-wider text-[#EDE6D6]/50">
              atau masuk instan sebagai
            </span>
          </div>

          {/* Quick Demo Chips (Minimalist & Compact) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('owner_klinik')}
                className="py-1.5 px-2 rounded-lg bg-[#101A2C] hover:bg-[#101A2C]/80 border border-[#B8905A]/40 text-[11px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                🏥 Owner Klinik
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner_petshop')}
                className="py-1.5 px-2 rounded-lg bg-[#101A2C] hover:bg-[#101A2C]/80 border border-[#B8905A]/40 text-[11px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                🛒 Owner PetShop
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner_petcare')}
                className="py-1.5 px-2 rounded-lg bg-[#101A2C] hover:bg-[#101A2C]/80 border border-[#B8905A]/40 text-[11px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                🐾 Owner PetCare
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('dokter')}
                className="py-1 px-1.5 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] border border-[#B8905A]/25 text-[10px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                🩺 Dokter
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('kasir')}
                className="py-1 px-1.5 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] border border-[#B8905A]/25 text-[10px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                💳 Kasir
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('groomer')}
                className="py-1 px-1.5 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] border border-[#B8905A]/25 text-[10px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                ✂️ Groomer
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-1 px-1.5 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] border border-[#B8905A]/25 text-[10px] font-semibold text-[#EDE6D6] hover:text-[#FFFDF9] text-center transition-colors cursor-pointer"
              >
                🛠️ Admin
              </button>
            </div>
          </div>

        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[11px] text-[#EDE6D6]/50">
          PetCare Cloud ERP v2.4 • Keamanan Terenkripsi SSL 256-bit
        </p>

      </div>

      {/* Minimalist Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="max-w-sm w-full bg-[#1B2A45] border border-[#B8905A]/40 rounded-2xl p-5 space-y-3.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-[#FFFDF9] font-bold text-sm">
              <KeyRound className="w-4 h-4 text-[#D9B98A]" />
              <span>Pemulihan Kata Sandi</span>
            </div>

            <p className="text-xs text-[#EDE6D6]/70 leading-relaxed">
              Masukkan email terdaftar untuk menerima tautan pemulihan sandi.
            </p>

            <input
              type="email"
              value={forgotInput}
              onChange={(e) => setForgotInput(e.target.value)}
              placeholder="nama@petcare.id"
              disabled={isSendingReset}
              className="w-full px-3.5 py-2 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-[#FFFDF9] text-xs focus:outline-none focus:border-[#B8905A] disabled:opacity-50"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                disabled={isSendingReset}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] text-xs font-semibold text-[#EDE6D6] cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSendingReset || !forgotInput.trim()}
                onClick={async () => {
                  setIsSendingReset(true);
                  try {
                    const res = await fetch('/api/auth/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: forgotInput.trim() })
                    });
                    const data = await res.json();
                    addToast(data.message || 'Petunjuk pemulihan sandi telah dikirim ke kontak Anda.', 'success');
                  } catch (err) {
                    addToast('Gagal menghubungi server. Coba lagi nanti.', 'error');
                  } finally {
                    setIsSendingReset(false);
                    setShowForgotModal(false);
                    setForgotInput('');
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#B8905A] text-[#101A2C] font-bold text-xs cursor-pointer hover:bg-[#D9B98A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingReset ? 'Mengirim...' : 'Kirim Tautan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
