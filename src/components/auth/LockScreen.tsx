import React, { useState } from 'react';
import { Lock, LogOut, ShieldCheck, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type UnlockMode = 'pin' | 'password';

/**
 * Overlay fullscreen saat aplikasi terkunci (idle timeout / kunci manual).
 * Berbeda dari LoginScreen: TIDAK mengganti seluruh aplikasi, cuma
 * menutupinya sampai user memverifikasi identitasnya sendiri lewat PIN
 * (unlockApp) atau kata sandi akun (unlockAppWithPassword) — AuthContext
 * yang menjamin verifikasi selalu ditarget ke sesi aktif, bukan akun lain.
 */
export const LockScreen: React.FC = () => {
  const { user, unlockApp, unlockAppWithPassword, logout } = useAuth();
  const [mode, setMode] = useState<UnlockMode>('pin');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!user) return null;

  const switchMode = (next: UnlockMode) => {
    if (isVerifying || next === mode) return;
    setMode(next);
    setErrorMessage('');
    setPin('');
    setPassword('');
  };

  const handleSubmitPin = async (value: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMessage('');
    const result = await unlockApp(value);
    if (!result.success) {
      setErrorMessage(result.message || 'PIN tidak sesuai. Coba lagi.');
      setPin('');
    }
    setIsVerifying(false);
  };

  const handleNumpadPress = (digit: string) => {
    if (isVerifying) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) handleSubmitPin(next);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));
  const handleClear = () => setPin('');

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || !password) return;
    setIsVerifying(true);
    setErrorMessage('');
    const result = await unlockAppWithPassword(password);
    if (!result.success) {
      setErrorMessage(result.message || 'Kata sandi tidak sesuai. Coba lagi.');
      setPassword('');
    }
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#070C16]/97 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#0B1322] border border-[#1E293B] rounded-3xl shadow-2xl p-7 space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#1E293B] border border-[#B8905A]/40 flex items-center justify-center">
          <Lock className="w-7 h-7 text-[#D9B98A]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#FFFDF9] font-display">Aplikasi Terkunci</h2>
          <p className="text-xs text-[#EDE6D6]/70">
            Sesi <strong className="text-[#D9B98A]">{user.name}</strong> ({user.role}) dijeda karena tidak ada aktivitas.
          </p>
          <p className="text-[11px] text-[#EDE6D6]/50">
            {mode === 'pin' ? 'Masukkan PIN Anda untuk melanjutkan.' : 'Masukkan kata sandi akun Anda untuk melanjutkan.'}
          </p>
        </div>

        {/* Mode Toggle: PIN vs Password */}
        <div className="flex p-1 bg-[#070C16] border border-[#1E293B] rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => switchMode('pin')}
            disabled={isVerifying}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
              mode === 'pin' ? 'bg-[#1E293B] text-[#D9B98A] shadow-inner' : 'text-[#EDE6D6]/50 hover:text-[#EDE6D6]/80'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> PIN
          </button>
          <button
            type="button"
            onClick={() => switchMode('password')}
            disabled={isVerifying}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
              mode === 'password' ? 'bg-[#1E293B] text-[#D9B98A] shadow-inner' : 'text-[#EDE6D6]/50 hover:text-[#EDE6D6]/80'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Kata Sandi
          </button>
        </div>

        {mode === 'pin' ? (
          <>
            {/* Visual 4-Digit Box Indicators */}
            <div className="flex justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin[index] !== undefined;
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

            {errorMessage && (
              <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Tactile On-Screen Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadPress(num)}
                  disabled={isVerifying}
                  className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-[#FFFDF9] font-mono text-base font-bold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={isVerifying}
                className="h-11 rounded-xl bg-[#070C16] hover:bg-rose-950/40 border border-[#1E293B] text-rose-400 font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                disabled={isVerifying}
                className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-[#FFFDF9] font-mono text-base font-bold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isVerifying}
                className="h-11 rounded-xl bg-[#070C16] hover:bg-[#1E2B44] border border-[#1E293B] text-slate-300 font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                ⌫
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmitPassword} className="space-y-3 text-left">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi akun Anda"
                disabled={isVerifying}
                autoFocus
                className="w-full p-2.5 pr-9 bg-[#070C16] rounded-xl border border-[#1E293B] text-[#FFFDF9] text-sm focus:outline-hidden focus:border-[#B8905A] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#EDE6D6]/50 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full h-11 rounded-xl bg-[#B8905A] hover:bg-[#9E7848] disabled:opacity-50 disabled:cursor-not-allowed text-[#101A2C] font-extrabold text-sm transition-all active:scale-95 shadow-md cursor-pointer"
            >
              {isVerifying ? 'Memverifikasi...' : 'Buka Kunci'}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-[#EDE6D6]/40">
            <ShieldCheck className="w-3.5 h-3.5" /> Sesi & data Anda tetap aman
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Bukan Anda? Keluar
          </button>
        </div>
      </div>
    </div>
  );
};
