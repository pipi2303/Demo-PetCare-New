import React from 'react';
import {
  Building2,
  Store,
  Stethoscope,
  Sparkles,
  QrCode,
  ShoppingCart,
  Package,
  Clock,
  Pill,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { UserRole } from '../../types';

interface ExecutiveManagementHeaderProps {
  effectiveRole: UserRole;
  onSwitchRole?: (role: UserRole) => void;
  activeBranchName: string;
  totalCustomers: number;
  totalPets: number;
  onOpenCheckIn: () => void;
  setActiveModule: (m: string) => void;
}

export const ExecutiveManagementHeader: React.FC<ExecutiveManagementHeaderProps> = ({
  effectiveRole,
  activeBranchName,
  totalCustomers,
  totalPets,
  onOpenCheckIn,
  setActiveModule
}) => {
  const isPetshop = effectiveRole === 'owner_petshop' || effectiveRole === 'kasir';
  const isClinic = effectiveRole === 'owner_klinik' || effectiveRole === 'dokter' || effectiveRole === 'perawat';
  const isPetcare = !isPetshop && !isClinic;

  return (
    <div className="bg-gradient-to-br from-[#101A2C] via-[#16233B] to-[#1E3050] text-white p-4 sm:p-5 rounded-2xl border border-[#B8905A]/40 shadow-lg space-y-3.5">
      {/* Top Row: Profile Identity & Quick Navigation Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Profile & Business Scope Info */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-2xl font-black shadow-md shrink-0 ring-2 ring-[#B8905A]/30">
            {isPetshop ? <Store className="w-6 h-6" /> : isClinic ? <Stethoscope className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-display">
                {isPetshop
                  ? 'Profil Kepemilikan • Owner PetShop & Retail'
                  : isClinic
                  ? 'Profil Kepemilikan • Owner Poliklinik & Medis Vet'
                  : 'Profil Kepemilikan • Owner PetCare (Konsolidasi Multi-Unit)'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B8905A]/25 text-[#D9B98A] border border-[#B8905A]/40 shadow-2xs">
                Live ERP Eksekutif
              </span>
            </div>
            <p className="text-xs text-[#E1D6BE]/85 mt-0.5 max-w-3xl leading-relaxed">
              {isPetshop
                ? 'Perspektif Penjualan Retail POS, Margin Laba Produk, Perputaran Stok Gudang Fast/Slow Moving & PO Supplier.'
                : isClinic
                ? 'Perspektif Rekam Medis EMR, Utilisasi Poli Dokter & Bedah, BOR Rawat Inap/ICU, Apotek Farmasi & Tindakan Medis.'
                : 'Perspektif Konsolidasi Ekosistem Terpadu: Poliklinik Medis Vet, Toko Pet Shop POS, Grooming Salon Spa & Pet Hotel.'}
            </p>
          </div>
        </div>

        {/* Quick Module Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#D9B98A] border border-[#B8905A]/40 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Pindai QR Pasien untuk Check-in Instan"
          >
            <QrCode className="w-4 h-4 text-[#D9B98A]" />
            <span>Smart QR Check-In</span>
          </button>

          {isPetshop ? (
            <>
              <button
                type="button"
                onClick={() => setActiveModule('petShop')}
                className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-black rounded-xl text-xs shadow-sm hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" /> Buka Kasir POS
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('purchasing')}
                className="px-3 py-2 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Package className="w-4 h-4 text-[#D9B98A]" /> Order PO Supplier
              </button>
            </>
          ) : isClinic ? (
            <>
              <button
                type="button"
                onClick={() => setActiveModule('booking')}
                className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-black rounded-xl text-xs shadow-sm hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Clock className="w-4 h-4" /> Antrian Poliklinik
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('pharmacy')}
                className="px-3 py-2 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Pill className="w-4 h-4 text-[#D9B98A]" /> Apotek Farmasi
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveModule('reports')}
                className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-black rounded-xl text-xs shadow-sm hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" /> Laporan Eksekutif
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('finance')}
                className="px-3 py-2 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <TrendingUp className="w-4 h-4 text-[#D9B98A]" /> Laba & Rugi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Operational Metadata Badges Strip */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-3 bg-black/20 p-2.5 rounded-xl border border-white/5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#E1D6BE]">
          <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-bold text-white flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#D9B98A]" />
            {activeBranchName || 'Cabang Utama'}
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
            👥 <strong>{totalCustomers}</strong> Klien Terdaftar
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
            🐾 <strong>{totalPets}</strong> Pasien Terdaftar
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/40 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tersimpan Otomatis (Lokal)
          </span>
        </div>
      </div>
    </div>
  );
};
