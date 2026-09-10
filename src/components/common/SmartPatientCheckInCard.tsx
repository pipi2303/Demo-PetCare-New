import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Pet, Customer } from '../../types';
import { SmartPatientCheckInModal } from './SmartPatientCheckInModal';
import {
  QrCode,
  Camera,
  Search,
  CheckCircle2,
  Clock,
  Dog,
  Cat,
  Stethoscope,
  Ticket,
  Sparkles,
  Zap,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Activity,
  Printer
} from 'lucide-react';

interface SmartPatientCheckInCardProps {
  setActiveModule: (moduleName: any) => void;
}

export const SmartPatientCheckInCard: React.FC<SmartPatientCheckInCardProps> = ({ setActiveModule }) => {
  const { pets = [], customers = [], clinicVisits = [] } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInitialPetId, setSelectedInitialPetId] = useState<string | undefined>(undefined);

  const waitingCount = clinicVisits.filter((v) => v.status === 'Menunggu').length;
  const inExamCount = clinicVisits.filter((v) => v.status === 'Sedang Diperiksa' || v.status === 'Dipanggil').length;

  const handleOpenModal = (petId?: string) => {
    setSelectedInitialPetId(petId);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md transition-all duration-200 space-y-4">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1D6BE]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-xs shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-[#1B2A45] tracking-tight">
                  Smart Patient Check-in (QR Code / Pasien Lama)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  EMR & Antrean Auto-Sync
                </span>
              </div>
              <p className="text-xs text-[#1B2A45]/70">
                Pindai QR Digital Passport pasien lama atau pilih dari database untuk langsung memicu status <span className="font-bold text-[#1B2A45]">'Menunggu Dokter'</span> di EMR & Antrean Poli.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-105 text-[#101A2C] font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#101A2C]" />
              <span>Scan QR Pasien</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('booking')}
              className="px-3 py-2 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-[#D9B98A]" />
              <span>Kiosk Mandiri</span>
            </button>
          </div>
        </div>

        {/* Live Counters & Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1B2A45]/70">
              <span className="text-[11px] font-bold">Menunggu Dokter</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-[#1B2A45] mt-1 font-mono">{waitingCount} Pasien</p>
            <span className="text-[9px] text-amber-800 font-bold">Status: 'Menunggu'</span>
          </div>

          <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1B2A45]/70">
              <span className="text-[11px] font-bold">Sedang Diperiksa</span>
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-[#1B2A45] mt-1 font-mono">{inExamCount} Pasien</p>
            <span className="text-[9px] text-emerald-800 font-bold">Di Ruang Poli Dokter</span>
          </div>

          <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1B2A45]/70">
              <span className="text-[11px] font-bold">Total Pasien Terdaftar</span>
              <Dog className="w-3.5 h-3.5 text-[#1B2A45]" />
            </div>
            <p className="text-xl font-black text-[#1B2A45] mt-1 font-mono">{pets.length} Anabul</p>
            <span className="text-[9px] text-[#1B2A45]/60">Tersedia QR Passport</span>
          </div>

          <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1B2A45]/70">
              <span className="text-[11px] font-bold">Pet Owner Terdaftar</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-black text-[#1B2A45] mt-1 font-mono">{customers.length} Klien</p>
            <span className="text-[9px] text-blue-800 font-bold">Sinkronisasi EMR</span>
          </div>
        </div>

        {/* Quick Fast Check-In Ribbon for Returning Patients */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#B8905A]" />
              Fast 1-Click Check-In Pasien Lama Terdaftar:
            </span>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="text-[11px] text-[#1B2A45] hover:text-[#B8905A] font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Lihat Semua Pasien ({pets.length}) <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {pets.slice(0, 6).map((p) => {
              const owner = customers.find((c) => c.id === p.customerId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleOpenModal(p.id)}
                  className="p-2 bg-[#F6F1E6] hover:bg-white text-left rounded-xl border border-[#E1D6BE] hover:border-[#B8905A] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {p.species.toLowerCase().includes('kucing') ? (
                        <Cat className="w-3 h-3" />
                      ) : (
                        <Dog className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#1B2A45] truncate group-hover:text-[#B8905A]">
                      {p.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#1B2A45]/60">
                    <span className="truncate">{owner?.name?.split(' ')[0] || 'Klien'}</span>
                    <span className="font-bold text-[#B8905A] group-hover:underline">Check-in ⚡</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Patient Check-in Modal */}
      <SmartPatientCheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPetId={selectedInitialPetId}
        setActiveModule={setActiveModule}
      />
    </>
  );
};
