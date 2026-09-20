import React, { useState } from 'react';
import { KeyRound, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ModalPortal } from '../common/ModalPortal';

interface PinConfirmModalProps {
  targetLabel: string;
  targetEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Small PIN gate used whenever the UI wants to switch the active session to
 * a different demo persona/account. Nothing switches until the TARGET
 * account's own PIN is verified server-side via AuthContext.switchAccount.
 */
export const PinConfirmModal: React.FC<PinConfirmModalProps> = ({ targetLabel, targetEmail, onSuccess, onCancel }) => {
  const { switchAccount } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (candidatePin: string) => {
    if (candidatePin.length !== 4) return;
    setIsSubmitting(true);
    setError('');
    const result = await switchAccount(targetEmail, candidatePin);
    setIsSubmitting(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || 'PIN tidak sesuai.');
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4 || isSubmitting) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  // Portaled into #modal-root (inside .content-area) so this modal is
  // always confined to the main content area even when it's opened from
  // the persistent Sidebar or Header, both of which sit outside
  // .content-area in the DOM.
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-xs w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 space-y-4 shadow-2xl text-[#22242B]">
        <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
          <h3 className="font-extrabold text-sm text-[#1B2A45] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#B8905A]" /> Konfirmasi PIN
          </h3>
          <button onClick={onCancel} className="text-gray-400 font-bold" aria-label="Batal">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#1B2A45]/70">
          Masukkan PIN 4-digit milik <strong>{targetLabel}</strong> untuk beralih ke akun tersebut.
        </p>

        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-10 h-12 rounded-lg border flex items-center justify-center text-lg font-bold ${
                pin.length > i ? 'border-[#B8905A] bg-[#F6F1E6]' : 'border-[#E1D6BE] bg-white'
              }`}
            >
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-700 flex items-center gap-1.5 justify-center">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(d)}
              className="py-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] font-bold text-[#1B2A45] disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin('');
              setError('');
            }}
            className="py-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] font-bold text-[11px] text-[#1B2A45]"
          >
            Hapus
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            className="py-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] font-bold text-[#1B2A45] disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] font-bold text-[11px] text-[#1B2A45]"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
