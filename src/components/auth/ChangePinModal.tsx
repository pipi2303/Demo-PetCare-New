import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ModalPortal } from '../common/ModalPortal';

interface ChangePinModalProps {
  onClose: () => void;
}

/**
 * Modal untuk mengganti PIN 4-digit akun yang sedang login sendiri.
 * Digerbang oleh password (bukan PIN lama) — server yang menentukan
 * email target dari sesi aktif, jadi tidak mungkin mengganti PIN akun lain.
 */
export const ChangePinModal: React.FC<ChangePinModalProps> = ({ onClose }) => {
  const { changePin, user } = useAuth();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Masukkan kata sandi saat ini untuk verifikasi.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setErrorMessage('PIN baru harus tepat 4 digit angka.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('Konfirmasi PIN tidak cocok dengan PIN baru.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePin(currentPassword, newPin);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Gagal mengganti PIN.');
      return;
    }

    addToast('PIN berhasil diganti! Gunakan PIN baru untuk shift login & unlock aplikasi berikutnya.', 'success');
    onClose();
  };

  // Portaled into #modal-root (inside .content-area): ChangePinModal is only
  // ever opened from the Header, which sits outside .content-area in the
  // DOM, so without this it would cover the Sidebar/Header instead of being
  // confined to the main content area like every other modal.
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xl p-6 space-y-4 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
          <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#B8905A]" />
            Ganti PIN Saya
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#6B6656]">
          PIN 4-digit dipakai untuk shift login cepat & membuka Lock Aplikasi. Akun:{' '}
          <strong className="text-[#1B2A45]">{user?.name}</strong> ({user?.email}).
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-[#1B2A45] block mb-1">Kata Sandi Saat Ini</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Verifikasi identitas Anda"
                className="w-full p-2.5 pr-9 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6656] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">PIN Baru (4 digit)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-center text-lg tracking-[0.4em] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Konfirmasi PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-center text-lg tracking-[0.4em] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-[10px] text-sky-900 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>PIN baru tidak boleh sama dengan PIN akun staf lain (supaya login PIN cepat tetap unik per orang).</span>
          </div>

          <div className="pt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold rounded-xl hover:bg-[#E1D6BE] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] disabled:opacity-50 disabled:cursor-not-allowed text-[#101A2C] font-extrabold rounded-xl shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Memproses...' : 'Simpan PIN Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};
