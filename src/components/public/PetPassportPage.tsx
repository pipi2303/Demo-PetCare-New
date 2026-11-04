import React, { useEffect, useState } from 'react';
import { ShieldCheck, Syringe, Bug, Calendar, AlertCircle, Loader2 } from 'lucide-react';

interface PassportData {
  pet: {
    id: string; name: string; species: string; breed: string; gender: string;
    birth_date: string; microchip_no: string; photo_url: string; customer_name: string; sterilized: boolean;
  };
  vacHistories: { vaccine_name: string; given_date: string; next_due_date: string; doctor_name: string; batch_number: string; certificate_no: string }[];
  dewormingRecords: { medicine_name: string; date: string; dosage: string; given_by: string; next_due_date: string }[];
  upcomingVaccines: { vaccine_name: string; due_date: string; status: string }[];
}

export const PetPassportPage: React.FC<{ petId: string }> = ({ petId }) => {
  const [data, setData] = useState<PassportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/pet/${petId}`)
      .then((r) => r.json())
      .then((j) => j.success ? setData(j.data) : setError(j.message))
      .catch(() => setError('Gagal memuat data. Coba lagi.'));
  }, [petId]);

  if (error) return (
    <div className="min-h-screen bg-[#F6F1E6] flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="font-bold text-[#1B2A45]">{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[#F6F1E6] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#B8905A]" />
    </div>
  );

  const { pet, vacHistories, dewormingRecords, upcomingVaccines } = data;

  return (
    <div className="min-h-screen bg-[#F6F1E6] pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B2A45] to-[#3A5A8C] text-[#FFFDF9] px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-[#D9B98A]" />
          <span className="text-xs font-bold tracking-widest text-[#D9B98A] uppercase">PetCare — Paspor Digital Resmi</span>
        </div>
        <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#D9B98A] overflow-hidden bg-[#101A2C] mb-3">
          <img
            src={pet.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80'}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-extrabold">{pet.name}</h1>
        <p className="text-sm text-[#D9B98A]">{pet.species} · {pet.breed}</p>
        <p className="text-xs text-[#EDE6D6]/70 mt-1">Pemilik: {pet.customer_name}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-5">
        {/* Pet info */}
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-sm">
          <h2 className="text-xs font-bold text-[#6B6656] uppercase tracking-wider mb-3">Identitas Hewan</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {[
              ['Microchip', pet.microchip_no || '—'],
              ['Gender', pet.gender || '—'],
              ['Lahir', pet.birth_date ? new Date(pet.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
              ['Steril', pet.sterilized ? 'Ya' : 'Belum'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[#6B6656]">{k}</dt>
                <dd className="font-bold text-[#1B2A45]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Upcoming vaccines */}
        {upcomingVaccines.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Calendar className="w-3.5 h-3.5" /> Vaksinasi Mendatang
            </h2>
            <div className="space-y-2">
              {upcomingVaccines.map((v, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-semibold text-amber-900">{v.vaccine_name}</span>
                  <span className="text-amber-700 font-bold">{new Date(v.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vac history */}
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-sm">
          <h2 className="text-xs font-bold text-[#6B6656] uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Syringe className="w-3.5 h-3.5 text-[#B8905A]" /> Riwayat Vaksinasi ({vacHistories.length})
          </h2>
          {vacHistories.length === 0 ? (
            <p className="text-xs text-[#6B6656]">Belum ada riwayat vaksinasi.</p>
          ) : (
            <div className="space-y-3">
              {vacHistories.map((v, i) => (
                <div key={i} className="bg-[#F6F1E6] rounded-lg p-3 text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#1B2A45]">{v.vaccine_name}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">#{v.certificate_no}</span>
                  </div>
                  <p className="text-[#6B6656]">Diberikan: {v.given_date} · oleh {v.doctor_name}</p>
                  <p className="text-[#B8905A] font-semibold">Booster berikutnya: {v.next_due_date}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deworming */}
        {dewormingRecords.length > 0 && (
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-sm">
            <h2 className="text-xs font-bold text-[#6B6656] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Bug className="w-3.5 h-3.5 text-[#B8905A]" /> Riwayat Obat Cacing & Anti-Parasit
            </h2>
            <div className="space-y-2">
              {dewormingRecords.map((d, i) => (
                <div key={i} className="text-xs flex justify-between items-center border-b border-[#E1D6BE] pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-[#1B2A45]">{d.medicine_name}</p>
                    <p className="text-[#6B6656]">{d.date} · {d.dosage}</p>
                  </div>
                  <span className="text-[10px] text-[#B8905A] font-bold">Ulang: {d.next_due_date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-[#B8A98A]">
          Dokumen digital ini diterbitkan oleh PetCare ERP · Terverifikasi
        </p>
      </div>
    </div>
  );
};
