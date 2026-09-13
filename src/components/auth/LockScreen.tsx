import React, { useState } from 'react';
import { Lock, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Overlay fullscreen saat aplikasi terkunci (idle timeout / kunci manual).
 * Berbeda dari LoginScreen: TIDAK mengganti seluruh aplikasi, cuma
 * menutupinya sampai user memasukkan PIN miliknya sendiri (lihat
 * unlockApp di AuthContext — PIN staf lain otomatis ditolak server).
 */
export const LockScreen: React.FC = () => {
  const { user, unlockApp, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!user) return null;

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
          <p className="text-[11px] text-[#EDE6D6]/50">Masukkan PIN Anda untuk melanjutkan.</p>
        </div>

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
