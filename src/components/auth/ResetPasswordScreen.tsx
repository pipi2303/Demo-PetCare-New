import React, { useState } from 'react';
import { Shield, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResetPasswordScreenProps {
  token: string;
  onDone: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ token, onDone }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(data.message || 'Tautan reset tidak valid atau sudah kedaluwarsa.');
      }
    } catch (err) {
      setErrorMessage('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101A2C] text-[#EDE6D6] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B2A45] border border-[#B8905A]/40 text-[#D9B98A] shadow-lg mb-1">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#FFFDF9] tracking-tight font-display">
            Atur Kata Sandi Baru
          </h1>
          <p className="text-xs text-[#EDE6D6]/70">PetCare Cloud ERP</p>
        </div>

        <div className="bg-[#1B2A45] rounded-2xl border border-[#B8905A]/30 p-6 sm:p-7 shadow-2xl space-y-5">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-[#EDE6D6]">
                Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru Anda.
              </p>
              <button
                type="button"
                onClick={onDone}
                className="w-full py-2.5 rounded-xl bg-[#B8905A] text-[#101A2C] font-bold text-sm cursor-pointer hover:bg-[#D9B98A] transition-all"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#D9B98A] block">Kata Sandi Baru</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#D9B98A]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-sm text-[#FFFDF9] focus:outline-none focus:border-[#B8905A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#D9B98A]/70 hover:text-[#D9B98A] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#D9B98A] block">Konfirmasi Kata Sandi</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2C] border border-[#B8905A]/40 text-sm text-[#FFFDF9] focus:outline-none focus:border-[#B8905A]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#B8905A] text-[#101A2C] font-bold text-sm cursor-pointer hover:bg-[#D9B98A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
