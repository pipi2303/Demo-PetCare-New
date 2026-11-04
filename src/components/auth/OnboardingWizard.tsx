import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Building2, Phone, Mail, MapPin, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export const OnboardingWizard: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { updateAppSettings } = useData();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clinicName: '',
    slogan: '',
    clinicPhone: '',
    clinicEmail: '',
    clinicAddress: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFinish = async () => {
    if (!form.clinicName.trim()) return;
    setSaving(true);
    try {
      await updateAppSettings(form);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1B2A45] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B2A45] to-[#3A5A8C] p-6 text-[#FFFDF9]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#D9B98A]" />
            <span className="text-xs font-bold text-[#D9B98A] uppercase tracking-widest">Setup Awal</span>
          </div>
          <h2 className="text-xl font-extrabold font-display">Selamat Datang di PetCare ERP</h2>
          <p className="text-xs text-[#EDE6D6]/80 mt-1">Lengkapi profil klinik Anda untuk memulai</p>
          {/* Progress */}
          <div className="flex gap-1 mt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-[#D9B98A]' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-xs font-bold text-[#6B6656] uppercase tracking-wider">Langkah 1 dari 2 — Identitas Klinik</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1 mb-1">
                    <Building2 className="w-3.5 h-3.5" /> Nama Klinik *
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={form.clinicName}
                    onChange={set('clinicName')}
                    placeholder="Contoh: Klinik Hewan Sehat Bersama"
                    className="w-full p-2.5 text-sm bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] font-semibold placeholder:font-normal placeholder:text-[#B8A98A]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#1B2A45] mb-1 block">Tagline / Slogan</span>
                  <input
                    type="text"
                    value={form.slogan}
                    onChange={set('slogan')}
                    placeholder="Contoh: Merawat dengan Hati, Menyembuhkan dengan Ilmu"
                    className="w-full p-2.5 text-sm bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] placeholder:text-[#B8A98A]"
                  />
                </label>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.clinicName.trim()}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] disabled:opacity-40 text-[#FFFDF9] font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs font-bold text-[#6B6656] uppercase tracking-wider">Langkah 2 dari 2 — Kontak & Lokasi</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5" /> No. Telepon
                  </span>
                  <input
                    autoFocus
                    type="tel"
                    value={form.clinicPhone}
                    onChange={set('clinicPhone')}
                    placeholder="Contoh: 021-5551234"
                    className="w-full p-2.5 text-sm bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] placeholder:text-[#B8A98A]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1 mb-1">
                    <Mail className="w-3.5 h-3.5" /> Email Klinik
                  </span>
                  <input
                    type="email"
                    value={form.clinicEmail}
                    onChange={set('clinicEmail')}
                    placeholder="klinik@example.com"
                    className="w-full p-2.5 text-sm bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] placeholder:text-[#B8A98A]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Alamat Lengkap
                  </span>
                  <textarea
                    value={form.clinicAddress}
                    onChange={set('clinicAddress')}
                    rows={2}
                    placeholder="Jl. Contoh No. 1, Kecamatan, Kota"
                    className="w-full p-2.5 text-sm bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] resize-none placeholder:text-[#B8A98A]"
                  />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-[#E1D6BE] hover:bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg transition-all text-sm"
                >
                  Kembali
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#B8905A] hover:bg-[#9E7848] disabled:opacity-60 text-[#FFFDF9] font-bold rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
                >
                  {saving ? 'Menyimpan...' : (<><CheckCircle2 className="w-4 h-4" /> Mulai Gunakan</>)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
