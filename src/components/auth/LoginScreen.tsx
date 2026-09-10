import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Building2,
  Sparkles,
  Clock,
  Activity,
  Smartphone,
  X,
  HelpCircle,
  RefreshCw,
  Fingerprint,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  Server,
  User as UserIcon,
  Crown,
  QrCode,
  CheckCheck,
  BadgeCheck,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, User } from '../../types';

interface LoginScreenProps {
  onSuccessfulLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccessfulLogin }) => {
  const {
    login,
    loginWithPin,
    users,
    activeBranchId,
    setActiveBranchId,
    activeOwnership,
    setActiveOwnership,
    user: currentUser,
    isLoginScreenOpen,
    closeLoginScreen
  } = useAuth();
  const { branches = [] } = useData();
  const { addToast } = useToast();

  const [authMode, setAuthMode] = useState<'credentials' | 'pin' | 'qr_biometric' | 'quick_profiles'>('credentials');
  const [emailOrPhone, setEmailOrPhone] = useState('owner.klinik@petcare.id');
  const [password, setPassword] = useState('petcare123');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotMethod, setForgotMethod] = useState<'email' | 'whatsapp'>('email');
  const [forgotInput, setForgotInput] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);

  // Selected ownership profile & branch
  const selectedOwnership = activeOwnership || 'owner_klinik';
  const selectedBranch = activeBranchId || 'b1';

  // Live real-time clock in WIB
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Business models metadata
  const businessModels = [
    {
      id: 'owner_klinik',
      title: 'Klinik & RS Hewan',
      shortLabel: 'Klinik Medis',
      icon: Stethoscope,
      badge: 'Medis & Rawat Inap',
      defaultEmail: 'owner.klinik@petcare.id',
      defaultRole: 'owner_klinik',
      color: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/40',
      activeGradient: 'from-amber-600 to-amber-700 text-slate-950',
      desc: 'Praktik poli rawat jalan, rekam medis EMR, radiologi digital, operasi & rawat inap.'
    },
    {
      id: 'owner_petshop',
      title: 'Pet Shop Retail',
      shortLabel: 'Pet Shop POS',
      icon: Store,
      badge: 'Retail & Gudang',
      defaultEmail: 'owner.petshop@petcare.id',
      defaultRole: 'owner_petshop',
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/40',
      activeGradient: 'from-emerald-600 to-teal-700 text-white',
      desc: 'Point of Sales barcode cepat, multi-gudang stok, expiry alert & purchasing.'
    },
    {
      id: 'owner_petcare',
      title: 'One-Stop PetCare',
      shortLabel: 'Holding Terpadu',
      icon: Scissors,
      badge: 'Holding & Grooming',
      defaultEmail: 'owner.petcare@petcare.id',
      defaultRole: 'owner_petcare',
      color: 'from-purple-500/20 to-purple-600/10 text-purple-300 border-purple-500/40',
      activeGradient: 'from-purple-600 to-indigo-700 text-white',
      desc: 'Integrasi lengkap poliklinik, salon grooming, pet hotel penitipan & konsolidasi holding.'
    },
    {
      id: 'superadmin',
      title: 'SaaS Superadmin',
      shortLabel: 'Superadmin',
      icon: Crown,
      badge: 'Master Tenant',
      defaultEmail: 'admin@petcare.id',
      defaultRole: 'superadmin',
      color: 'from-yellow-500/20 to-yellow-600/10 text-yellow-300 border-yellow-500/40',
      activeGradient: 'from-yellow-500 to-amber-600 text-slate-950',
      desc: 'Kendali master server multi-tenant, billing lisensi klinik & audit keamanan data.'
    },
    {
      id: 'pemilik',
      title: 'Portal Klien Mandiri',
      shortLabel: 'Pet Owner',
      icon: UserCheck,
      badge: 'Akses Klien',
      defaultEmail: 'budi@gmail.com',
      defaultRole: 'pemilik',
      color: 'from-sky-500/20 to-sky-600/10 text-sky-300 border-sky-500/40',
      activeGradient: 'from-sky-600 to-blue-700 text-white',
      desc: 'Akses riwayat vaksin hewan peliharaan, invoice digital & booking konsultasi.'
    }
  ];

  // Handle change of ownership model with matching default email
  const handleOwnershipChange = (newOwnership: string) => {
    setActiveOwnership(newOwnership);
    const matched = businessModels.find((m) => m.id === newOwnership);
    if (matched) {
      setEmailOrPhone(matched.defaultEmail);
    }
  };

  // Handle standard credential login
  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(async () => {
      const result = await login(emailOrPhone, password, {
        branchId: selectedBranch
      });

      setIsLoading(false);
      if (result.success) {
        addToast('Otentikasi berhasil. Selamat datang di PetCare Enterprise Cloud.', 'success');
        if (onSuccessfulLogin) onSuccessfulLogin();
      } else {
        setErrorMessage(result.message || 'Email atau kata sandi tidak sesuai dengan catatan sistem.');
      }
    }, 350);
  };

  // Handle PIN fast login
  const handlePinSubmit = (targetPin?: string) => {
    const pinToTest = targetPin || pin;
    if (pinToTest.length < 4) {
      setErrorMessage('PIN shift harus berupa 4 digit angka.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(async () => {
      const result = await loginWithPin(pinToTest, selectedBranch);
      setIsLoading(false);
      if (result.success) {
        addToast('Login shift cepat via PIN berhasil diverifikasi.', 'success');
        if (onSuccessfulLogin) onSuccessfulLogin();
      } else {
        setErrorMessage(result.message || 'PIN yang dimasukkan tidak terdaftar pada cabang ini.');
        setPin('');
      }
    }, 300);
  };

  // Numpad key press handler
  const handleNumpadPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleNumpadClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleNumpadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  // Simulate QR Shift Scan or Biometric verification. A "successful scan"
  // still requires the staff member's own PIN afterward — QR/biometric here
  // is a convenience shortcut to the PIN pad, not a bypass of it.
  const handleSimulateQrScan = (roleToLogin: string = 'kasir') => {
    setIsScanningQr(true);
    setQrScanSuccess(false);
    setErrorMessage('');

    setTimeout(() => {
      setIsScanningQr(false);
      setQrScanSuccess(true);

      setTimeout(() => {
        handleQuickDemo(roleToLogin as UserRole);
      }, 600);
    }, 1200);
  };

  // "Quick demo" persona shortcuts no longer log in with a single click —
  // that let anyone become any account (including superadmin) with zero
  // credentials. They now just jump to the PIN tab; the actual session
  // switch still goes through loginWithPin -> /api/auth/login-pin, which
  // verifies the PIN server-side.
  const handleQuickDemo = (roleOrUser: UserRole | User) => {
    const targetUser = typeof roleOrUser === 'string'
      ? users.find((u) => u.role === roleOrUser) || users.find((u) => u.ownershipType === roleOrUser)
      : roleOrUser;

    setErrorMessage('');
    setAuthMode('pin');
    setPin('');
    addToast(
      targetUser
        ? `Masukkan PIN milik ${targetUser.name} untuk masuk sebagai ${targetUser.role.replace('_', ' ')}.`
        : 'Masukkan PIN 4-digit untuk masuk.',
      'info'
    );
  };

  // Quick preset helper to fill default account
  const handleFillCredentials = (email: string, pass: string = 'petcare123') => {
    setEmailOrPhone(email);
    setPassword(pass);
    setErrorMessage('');
  };

  const activeModelMeta = businessModels.find((m) => m.id === selectedOwnership) || businessModels[0];
  const activeBranchObj = branches.find((b) => b.id === selectedBranch);
  const activeBranchName = activeBranchObj?.name || 'Semua Cabang (Konsolidasi)';

  return (
    <div className="min-h-screen bg-[#070C16] text-[#EDE6D6] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#B8905A] selection:text-[#101A2C]">
      
      {/* Background Subtle Luxury Grid & Ambient Spotlights */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(184, 144, 90, 0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#B8905A]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#1A3358]/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-[#B8905A]/8 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar: Brand Identity & Telemetry */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-3.5 border-b border-[#1E293B]/80 bg-[#0B1220]/85 backdrop-blur-md flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1B2A45] via-[#15233B] to-[#0D1627] border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A] shadow-md shrink-0 ring-1 ring-[#B8905A]/20">
            <Shield className="w-5 h-5 text-[#D9B98A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#FFFDF9] tracking-tight font-display">
                PetCare Enterprise Cloud
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B8905A]/15 border border-[#B8905A]/30 text-[#D9B98A] text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-[#D9B98A]" />
                v2.6 PRO
              </span>
            </div>
            <p className="text-[11px] text-[#EDE6D6]/60 hidden sm:block">
              Sistem Manajemen Rumah Sakit Hewan, Poliklinik, Farmasi & Retail Terpadu
            </p>
          </div>
        </div>

        {/* Real-time Status Indicators & Return Button */}
        <div className="flex items-center gap-3">
          {/* Live Clock & Node Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#101A2C] border border-[#1E293B] text-[11px] text-[#EDE6D6]/70 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold">{currentTime || '12:00:00'} WIB</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-300 font-medium">Cloud ID-JKT01 Aktif</span>
          </div>

          {/* Return to workspace button if already logged in */}
          {currentUser && isLoginScreenOpen && (
            <button
              type="button"
              onClick={closeLoginScreen}
              className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#FFFDF9] text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer shadow-xs"
              title="Kembali ke Aplikasi Workspace Aktif"
            >
              <X className="w-4 h-4 text-[#D9B98A]" />
              <span className="hidden sm:inline">Tutup & Kembali ke Workspace</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Body: Dual-Column Showcase & Modern Login Console */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 w-full items-center">
          
          {/* Left Hero & Enterprise Showcase Column */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block pr-2">
            
            {/* Tagline & Headline */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B8905A]/15 border border-[#B8905A]/30 text-[#D9B98A] text-xs font-semibold shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#D9B98A]" />
                <span>Otentikasi Multi-Peran & Keamanan Rekam Medis</span>
              </div>

              <h2 className="text-3xl xl:text-4xl font-extrabold text-[#FFFDF9] font-display leading-tight tracking-tight">
                Portal Otorisasi Praktik Klinik & Retail Hewan Modern.
              </h2>

              <p className="text-sm text-[#EDE6D6]/75 leading-relaxed max-w-xl">
                Arsitektur enterprise terintegrasi untuk dokter hewan, kasir pos, farmasis, dan manajemen holding. Dilengkapi pergantian shift kilat via PIN, audit trail kepatuhan medis, dan enkripsi data menyeluruh.
              </p>
            </div>

            {/* Visual Operational Architecture Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9B98A] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#D9B98A]" />
                Pilih Model Operasional Tenant:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {businessModels.slice(0, 4).map((model) => {
                  const Icon = model.icon;
                  const isSelected = selectedOwnership === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleOwnershipChange(model.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-[#15233B] border-[#B8905A] ring-1 ring-[#B8905A]/40 shadow-md'
                          : 'bg-[#0B1322]/80 border-[#1E293B] hover:border-[#B8905A]/40 hover:bg-[#101A2C]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                          isSelected ? 'bg-[#B8905A] text-[#101A2C]' : 'bg-[#1E293B] text-[#D9B98A]'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            Aktif
                          </span>
                        )}
                      </div>
                      <div>
                        <strong className={`text-xs font-bold block ${isSelected ? 'text-[#FFFDF9]' : 'text-slate-200'}`}>
                          {model.title}
                        </strong>
                        <span className="text-[11px] text-[#EDE6D6]/60 line-clamp-1 mt-0.5">
                          {model.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Security & Enterprise Metric Bar */}
            <div className="p-3.5 rounded-2xl bg-[#0E1626]/90 border border-[#1E293B] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FFFDF9]">Enkripsi SSL 256-Bit & ISO 27001</h4>
                  <p className="text-[11px] text-[#EDE6D6]/60">
                    Sistem multi-tenant terisolasi dengan perlindungan rekam medis pasien.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#152033] border border-[#B8905A]/30 text-[10px] font-mono text-[#D9B98A] font-bold">
                99.98% SLA
              </span>
            </div>

          </div>

          {/* Right Column: Sleek Authentication Console */}
          <div className="lg:col-span-6 w-full max-w-lg mx-auto">
            <div className="bg-[#0E1626]/95 border border-[#B8905A]/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative space-y-5">
              
              {/* Header inside Login Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B8905A] animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9B98A]">
                      Otentikasi Staf & Shift
                    </span>
                  </div>
                  <span className="text-[11px] text-[#EDE6D6]/60">
                    Cabang: <strong className="text-[#FFFDF9]">{activeBranchName}</strong>
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-[#FFFDF9] font-display tracking-tight">
                  Selamat Datang Kembali
                </h3>
                <p className="text-xs text-[#EDE6D6]/70">
                  Pilih metode otentikasi atau pergantian shift cepat untuk masuk.
                </p>
              </div>

              {/* Business Model & Outlet Context Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#070C16] border border-[#1E293B]">
                
                {/* 1. Model Operasional */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D9B98A] uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#D9B98A]" />
                    Model Operasional
                  </label>
                  <div className="relative">
                    <select
                      id="login-select-model"
                      value={selectedOwnership}
                      onChange={(e) => handleOwnershipChange(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#131E33] border border-[#B8905A]/35 text-xs font-semibold text-[#FFFDF9] focus:outline-none focus:border-[#B8905A] focus:ring-1 focus:ring-[#B8905A] appearance-none cursor-pointer transition-all"
                    >
                      {businessModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#D9B98A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Cabang Aktif */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D9B98A] uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#D9B98A]" />
                    Lokasi Cabang
                  </label>
                  <div className="relative">
                    <select
                      id="login-select-branch"
                      value={selectedBranch}
                      onChange={(e) => setActiveBranchId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#131E33] border border-[#B8905A]/35 text-xs font-semibold text-[#FFFDF9] focus:outline-none focus:border-[#B8905A] focus:ring-1 focus:ring-[#B8905A] appearance-none cursor-pointer transition-all"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                      <option value="all">Konsolidasi (Semua Cabang)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#D9B98A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Modern Auth Mode Segmented Control (4 Tab Options) */}
              <div className="grid grid-cols-4 bg-[#070C16] p-1 rounded-2xl border border-[#1E293B] gap-1">
                <button
                  id="tab-auth-credentials"
                  type="button"
                  onClick={() => {
                    setAuthMode('credentials');
                    setErrorMessage('');
                  }}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    authMode === 'credentials'
                      ? 'bg-gradient-to-r from-[#B8905A] to-[#D9B98A] text-[#101A2C] shadow-md font-extrabold'
                      : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9] hover:bg-[#152033]/50'
                  }`}
                  title="Masuk dengan Email & Kata Sandi"
                >
                  <KeyRound className="w-3 h-3" />
                  <span className="hidden sm:inline">Kredensial</span>
                  <span className="sm:hidden">Email</span>
                </button>

                <button
                  id="tab-auth-pin"
                  type="button"
                  onClick={() => {
                    setAuthMode('pin');
                    setErrorMessage('');
                  }}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    authMode === 'pin'
                      ? 'bg-gradient-to-r from-[#B8905A] to-[#D9B98A] text-[#101A2C] shadow-md font-extrabold'
                      : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9] hover:bg-[#152033]/50'
                  }`}
                  title="Otentikasi Cepat Shift via PIN 4-Digit"
                >
                  <Zap className="w-3 h-3" />
                  <span>PIN Shift</span>
                </button>

                <button
                  id="tab-auth-qr"
                  type="button"
                  onClick={() => {
                    setAuthMode('qr_biometric');
                    setErrorMessage('');
                  }}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    authMode === 'qr_biometric'
                      ? 'bg-gradient-to-r from-[#B8905A] to-[#D9B98A] text-[#101A2C] shadow-md font-extrabold'
                      : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9] hover:bg-[#152033]/50'
                  }`}
                  title="Scan QR Lencana Shift atau Fingerprint"
                >
                  <QrCode className="w-3 h-3" />
                  <span>QR Shift</span>
                </button>

                <button
                  id="tab-auth-profiles"
                  type="button"
                  onClick={() => {
                    setAuthMode('quick_profiles');
                    setErrorMessage('');
                  }}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    authMode === 'quick_profiles'
                      ? 'bg-gradient-to-r from-[#B8905A] to-[#D9B98A] text-[#101A2C] shadow-md font-extrabold'
                      : 'text-[#EDE6D6]/70 hover:text-[#FFFDF9] hover:bg-[#152033]/50'
                  }`}
                  title="Pilih Profil Role untuk Demo 1-Klik"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Profil</span>
                </button>
              </div>

              {/* Error Message Notification */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="flex-1 font-medium">{errorMessage}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 1: KREDENSIAL AKUN (Email & Password) */}
              {/* ======================================================== */}
              {authMode === 'credentials' && (
                <form onSubmit={handleCredentialSubmit} className="space-y-4">
                  
                  {/* Email / Username Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#D9B98A]">
                        Email Terdaftar / ID Pengguna
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials(activeModelMeta.defaultEmail)}
                        className="text-[11px] text-[#D9B98A]/80 hover:text-[#FFFDF9] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Gunakan Akun Default
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#D9B98A]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-input-email"
                        type="text"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        required
                        placeholder="contoh: owner.klinik@petcare.id"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070C16] border border-[#B8905A]/35 text-xs text-[#FFFDF9] placeholder-[#EDE6D6]/35 focus:outline-none focus:border-[#B8905A] focus:ring-1 focus:ring-[#B8905A] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#D9B98A]">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] text-[#D9B98A]/80 hover:text-[#FFFDF9] hover:underline cursor-pointer"
                      >
                        Lupa Sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#D9B98A]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-input-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070C16] border border-[#B8905A]/35 text-xs text-[#FFFDF9] placeholder-[#EDE6D6]/35 focus:outline-none focus:border-[#B8905A] focus:ring-1 focus:ring-[#B8905A] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#EDE6D6]/50 hover:text-[#FFFDF9] cursor-pointer"
                        title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Security Status */}
                  <div className="flex items-center justify-between text-xs text-[#EDE6D6]/70 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-[#B8905A]/40 text-[#B8905A] focus:ring-0 bg-[#070C16] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Ingat sesi di perangkat ini</span>
                    </label>
                    <span className="text-[10px] text-[#EDE6D6]/50 flex items-center gap-1 font-mono">
                      <Lock className="w-2.5 h-2.5 text-emerald-400" />
                      TLS 1.3 Terenkripsi
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8905A] via-[#D9B98A] to-[#B8905A] hover:brightness-110 text-[#101A2C] font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#101A2C]" />
                        <span>Memverifikasi Kredensial ERP...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Dashboard ERP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Quick Preset Credentials Pills */}
                  <div className="pt-2 border-t border-[#1E293B] space-y-1.5">
                    <span className="text-[10px] text-[#EDE6D6]/50 block">
                      Pilihan Akun Uji Coba Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('owner.klinik@petcare.id')}
                        className="px-2 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-amber-300 hover:border-amber-500/50 transition-colors cursor-pointer"
                      >
                        Klinik Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('owner.petshop@petcare.id')}
                        className="px-2 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-emerald-300 hover:border-emerald-500/50 transition-colors cursor-pointer"
                      >
                        PetShop Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('dokter@petcare.id')}
                        className="px-2 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-sky-300 hover:border-sky-500/50 transition-colors cursor-pointer"
                      >
                        Dokter Hewan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('kasir@petcare.id')}
                        className="px-2 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-purple-300 hover:border-purple-500/50 transition-colors cursor-pointer"
                      >
                        Kasir POS
                      </button>
                    </div>
                  </div>

                </form>
              )}

              {/* ======================================================== */}
              {/* TAB 2: PIN SHIFT CEPAT (Numpad) */}
              {/* ======================================================== */}
              {authMode === 'pin' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-[#EDE6D6]/80 font-medium">
                      Masukkan 4 digit PIN Shift Kasir / Staff:
                    </p>
                    
                    {/* Visual 4-Digit Box Indicators */}
                    <div className="flex justify-center gap-3 py-2">
                      {[0, 1, 2, 3].map((index) => {
                        const digit = pin[index];
                        const isFilled = digit !== undefined;
                        return (
                          <div
                            key={index}
                            className={`w-11 h-12 rounded-xl border flex items-center justify-center text-lg font-mono font-bold transition-all ${
                              isFilled
                                ? 'bg-[#152033] border-[#B8905A] text-[#D9B98A] shadow-inner ring-2 ring-[#B8905A]/40 scale-105'
                                : 'bg-[#070C16] border-[#1E293B] text-slate-700'
                            }`}
                          >
                            {isFilled ? '●' : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hidden input for physical keyboard entry */}
                    <input
                      id="login-input-pin-hidden"
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPin(val);
                        if (val.length === 4) {
                          handlePinSubmit(val);
                        }
                      }}
                      className="opacity-0 w-1 h-1 absolute pointer-events-none"
                      autoFocus
                    />
                  </div>

                  {/* Tactile On-Screen Numpad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumpadPress(num)}
                        className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-[#FFFDF9] font-mono text-base font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="h-11 rounded-xl bg-[#070C16] hover:bg-rose-950/40 border border-[#1E293B] text-rose-400 font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer"
                      title="Hapus Semua"
                    >
                      CLEAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-[#FFFDF9] font-mono text-base font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-slate-300 font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
                      title="Hapus Satu Digit"
                    >
                      ⌫
                    </button>
                  </div>

                  {/* Preset PIN Reference Chips */}
                  <div className="pt-1 text-center space-y-1.5">
                    <span className="text-[10px] text-[#EDE6D6]/50 block">
                      Pilihan PIN Cepat Shift Demo:
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPin('1234');
                          handlePinSubmit('1234');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-[#D9B98A] hover:border-[#B8905A] transition-colors cursor-pointer"
                      >
                        Owner: <strong className="font-mono">1234</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPin('2222');
                          handlePinSubmit('2222');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-sky-400 hover:border-sky-500 transition-colors cursor-pointer"
                      >
                        Dokter: <strong className="font-mono">2222</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPin('3333');
                          handlePinSubmit('3333');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-emerald-400 hover:border-emerald-500 transition-colors cursor-pointer"
                      >
                        Kasir: <strong className="font-mono">3333</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPin('4444');
                          handlePinSubmit('4444');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#070C16] border border-[#1E293B] text-[10px] text-purple-400 hover:border-purple-500 transition-colors cursor-pointer"
                      >
                        Groomer: <strong className="font-mono">4444</strong>
                      </button>
                    </div>
                  </div>

                  {/* PIN Submit Button */}
                  <button
                    type="button"
                    onClick={() => handlePinSubmit()}
                    disabled={isLoading || pin.length < 4}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8905A] via-[#D9B98A] to-[#B8905A] hover:brightness-110 text-[#101A2C] font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#101A2C]" />
                        <span>Memvalidasi PIN Shift...</span>
                      </>
                    ) : (
                      <>
                        <span>Verifikasi PIN & Mulai Shift</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: SCAN QR SHIFT & BIOMETRIK (Keren & Futuristik) */}
              {/* ======================================================== */}
              {authMode === 'qr_biometric' && (
                <div className="space-y-4 text-center">
                  <div className="p-5 rounded-2xl bg-[#070C16] border border-[#1E293B] relative overflow-hidden space-y-3">
                    
                    {/* Simulated QR Viewfinder Box */}
                    <div className="w-36 h-36 mx-auto rounded-2xl bg-[#0D1524] border-2 border-dashed border-[#B8905A]/50 relative flex items-center justify-center shadow-inner group">
                      {isScanningQr ? (
                        <div className="space-y-2">
                          <RefreshCw className="w-8 h-8 text-[#D9B98A] animate-spin mx-auto" />
                          <span className="text-[10px] text-amber-300 font-mono block">Memindai Lencana...</span>
                        </div>
                      ) : qrScanSuccess ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                          <span className="text-[10px] text-emerald-300 font-bold block">Terverifikasi!</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <QrCode className="w-16 h-16 text-[#D9B98A]/70 mx-auto" />
                          <span className="text-[10px] text-slate-400 block font-mono">Arahkan QR ID Staf</span>
                        </div>
                      )}

                      {/* Optical Scanning Line Effect */}
                      {isScanningQr && (
                        <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse shadow-md" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-[#FFFDF9]">
                        Presensi & Otentikasi Digital Lencana Staf
                      </h4>
                      <p className="text-[11px] text-[#EDE6D6]/60 mt-0.5">
                        Scan kartu ID fisik, lencana barcode digital, atau gunakan sensor Touch ID.
                      </p>
                    </div>

                    {/* Simulation Triggers */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSimulateQrScan('kasir')}
                        disabled={isScanningQr}
                        className="py-2 px-3 rounded-xl bg-[#131E33] hover:bg-[#1A2944] border border-[#B8905A]/30 text-xs font-bold text-[#D9B98A] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Simulasi QR Kasir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSimulateQrScan('dokter')}
                        disabled={isScanningQr}
                        className="py-2 px-3 rounded-xl bg-[#131E33] hover:bg-[#1A2944] border border-sky-500/30 text-xs font-bold text-sky-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>Touch ID Dokter</span>
                      </button>
                    </div>

                  </div>

                  <p className="text-[10px] text-[#EDE6D6]/50">
                    Mendukung pemindai barcode USB 2D (Honeywell, Zebra) & kamera depan tablet klinik.
                  </p>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: DIREKTORI PROFIL CEPAT (1-Click Instant Access) */}
              {/* ======================================================== */}
              {authMode === 'quick_profiles' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#EDE6D6]/70">
                    <span>Pilih profil peran untuk otorisasi instan:</span>
                    <span className="text-[10px] text-[#D9B98A] font-bold">1-Klik Langsung Masuk</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
                    {users.slice(0, 8).map((u) => {
                      const getRoleBadge = (role: UserRole) => {
                        switch (role) {
                          case 'owner_klinik':
                            return { icon: Stethoscope, label: 'Owner Klinik', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
                          case 'owner_petshop':
                            return { icon: Store, label: 'Owner PetShop', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
                          case 'owner_petcare':
                            return { icon: Scissors, label: 'Owner Holding', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' };
                          case 'dokter':
                            return { icon: Stethoscope, label: 'Dokter Hewan', color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' };
                          case 'kasir':
                            return { icon: Store, label: 'Kasir POS', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
                          case 'groomer':
                            return { icon: Scissors, label: 'Groomer', color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' };
                          case 'admin':
                            return { icon: Shield, label: 'Admin Sistem', color: 'text-slate-300 bg-slate-500/15 border-slate-500/30' };
                          case 'superadmin':
                            return { icon: Crown, label: 'Super Admin', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' };
                          default:
                            return { icon: UserIcon, label: role, color: 'text-slate-400 bg-slate-500/15 border-slate-500/30' };
                        }
                      };

                      const badge = getRoleBadge(u.role);
                      const BadgeIcon = badge.icon;

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleQuickDemo(u)}
                          className="p-3 rounded-xl bg-[#070C16] hover:bg-[#15233B] border border-[#1E293B] hover:border-[#B8905A]/50 text-left transition-all group cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 group-hover:text-[#D9B98A] transition-colors">
                              Perlu PIN
                            </span>
                          </div>

                          <div>
                            <strong className="text-xs font-bold text-[#FFFDF9] block line-clamp-1 group-hover:text-[#D9B98A] transition-colors">
                              {u.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {u.email}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Quick Switch Role Bar */}
              <div className="pt-2.5 border-t border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#EDE6D6]/50">
                  <span>Pintasan Cepat Peran Shift:</span>
                  <span className="text-emerald-400 font-medium">Aktif Instan</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('dokter')}
                    className="py-1.5 px-2 rounded-xl bg-[#070C16] hover:bg-[#15233B] border border-[#1E293B] hover:border-sky-500/40 text-[11px] font-semibold text-slate-300 hover:text-[#FFFDF9] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-3 h-3 text-sky-400" />
                    <span>Dokter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('kasir')}
                    className="py-1.5 px-2 rounded-xl bg-[#070C16] hover:bg-[#15233B] border border-[#1E293B] hover:border-emerald-500/40 text-[11px] font-semibold text-slate-300 hover:text-[#FFFDF9] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Store className="w-3 h-3 text-emerald-400" />
                    <span>Kasir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('groomer')}
                    className="py-1.5 px-2 rounded-xl bg-[#070C16] hover:bg-[#15233B] border border-[#1E293B] hover:border-pink-500/40 text-[11px] font-semibold text-slate-300 hover:text-[#FFFDF9] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Scissors className="w-3 h-3 text-pink-400" />
                    <span>Groomer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('superadmin')}
                    className="py-1.5 px-2 rounded-xl bg-[#070C16] hover:bg-[#15233B] border border-[#1E293B] hover:border-yellow-500/40 text-[11px] font-semibold text-slate-300 hover:text-[#FFFDF9] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Crown className="w-3 h-3 text-yellow-400" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* 3. Footer Bar: Compliance, Status & Help */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-3.5 border-t border-[#1E293B]/80 bg-[#0B1220]/80 backdrop-blur-md text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#EDE6D6]/50">
        <div className="flex items-center gap-3">
          <span>&copy; 2026 PetCare Cloud Enterprise. Seluruh Hak Cipta Dilindungi.</span>
          <span className="hidden md:inline">&bull;</span>
          <span className="hidden md:inline">Standar Praktik Medis Veteriner Indonesia</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => addToast('Pusat Dukungan Shift Operasional: WhatsApp +62 811-2233-4455', 'info')}
            className="hover:text-[#D9B98A] transition-colors cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Pusat Bantuan & SOP Shift</span>
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => addToast('Status Jaringan: Latensi 14ms • Database Cluster Jakarta (ID) Terhubung', 'info')}
            className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Server className="w-3 h-3 text-emerald-400" />
            <span>Sistem Operasional (100%)</span>
          </button>
        </div>
      </footer>

      {/* 4. Modal: Lupa Kata Sandi (Email / WhatsApp Dual Recovery) */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="max-w-md w-full bg-[#0E1626] border border-[#B8905A]/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#B8905A]/15 border border-[#B8905A]/30 flex items-center justify-center text-[#D9B98A]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#FFFDF9] font-display">
                    Pemulihan Kata Sandi Akun
                  </h3>
                  <p className="text-xs text-[#EDE6D6]/60">
                    Pilih kanal pengiriman kode instruksi pemulihan kredensial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kanal Switcher */}
            <div className="flex gap-2 bg-[#070C16] p-1 rounded-xl border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setForgotMethod('email')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  forgotMethod === 'email'
                    ? 'bg-[#B8905A] text-[#101A2C]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Kirim via Email</span>
              </button>
              <button
                type="button"
                onClick={() => setForgotMethod('whatsapp')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  forgotMethod === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Kirim via WhatsApp</span>
              </button>
            </div>

            <p className="text-xs text-[#EDE6D6]/70 leading-relaxed">
              {forgotMethod === 'email'
                ? 'Masukkan alamat email akun yang terdaftar di PetCare ERP. Sistem akan mengirimkan tautan reset kata sandi sementara yang berlaku 30 menit.'
                : 'Masukkan nomor WhatsApp resmi yang terdaftar untuk menerima 6 digit kode verifikasi OTP pemulihan sandi.'}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#D9B98A] block">
                {forgotMethod === 'email' ? 'Alamat Email Terdaftar' : 'Nomor WhatsApp Terdaftar'}
              </label>
              <input
                type="text"
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder={forgotMethod === 'email' ? 'dokter@petcare.id' : '081234567890'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070C16] border border-[#B8905A]/40 text-[#FFFDF9] text-xs focus:outline-none focus:border-[#B8905A]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = forgotInput.trim() || (forgotMethod === 'email' ? 'email terdaftar' : 'nomor WhatsApp');
                  addToast(
                    `Tautan instruksi pemulihan telah dikirimkan ke ${target}. Silakan periksa pesan Anda.`,
                    'success'
                  );
                  setShowForgotModal(false);
                  setForgotInput('');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B8905A] to-[#D9B98A] hover:brightness-110 text-[#101A2C] font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Kirimkan Tautan Pemulihan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
