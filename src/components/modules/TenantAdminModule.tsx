import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  HardDrive,
  CreditCard,
  Plus,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Server,
  Activity,
  Layers,
  Lock,
  Globe,
  DollarSign,
  TrendingUp,
  Cpu,
  Database
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Tenant } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';

export const TenantAdminModule: React.FC = () => {
  const { tenants = [], addTenant } = useData();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<Tenant | null>(null);

  // New Tenant Form State
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantOwnerName, setTenantOwnerName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantPlan, setTenantPlan] = useState<'trial' | 'basic' | 'pro' | 'enterprise'>('pro');

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantCode || !tenantOwnerName) {
      addToast('Nama Organisasi, Kode, dan Nama Owner wajib diisi!', 'warning');
      return;
    }

    try {
      const created = await addTenant({
        name: tenantName,
        code: tenantCode.toUpperCase(),
        plan: tenantPlan,
        status: 'active',
        ownerName: tenantOwnerName,
        phone: tenantPhone || '+62 812-0000-0000',
        email: tenantEmail || 'admin@clinic.id',
        expiresAt: '2027-12-31'
      });

      setShowAddTenantModal(false);
      setTenantName('');
      setTenantCode('');
      setTenantOwnerName('');
      setTenantEmail('');
      setTenantPhone('');
      addToast(`Tenant Baru "${created.name}" (${created.code}) berhasil didaftarkan di SaaS Cloud!`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal mendaftarkan tenant baru.', 'error');
    }
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/15 text-purple-700 border-purple-500/30 font-extrabold';
      case 'pro':
        return 'bg-blue-500/15 text-blue-700 border-blue-500/30 font-bold';
      case 'basic':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
      default:
        return 'bg-amber-500/15 text-amber-800 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={ShieldCheck}
        title="SaaS Superadmin & Multi-Tenant Manager"
        description="Pusat kontrol multi-tenant, alokasi kuota penyimpanan database, lisensi cabang, dan billing langganan."
        badges={[
          (
            <span key="sla" className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SLA 99.98%
            </span>
          ),
          { label: `${tenants.length} Tenant Terisolasi`, variant: 'purple' },
          { label: 'Latency 18ms', variant: 'gold' }
        ]}
        actions={
          <button
            onClick={() => setShowAddTenantModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Daftarkan Tenant</span>
          </button>
        }
        stats={[
          { label: 'Total Tenant', value: `${tenants.length} Klinik`, variant: 'default' },
          { label: 'Enterprise', value: `${tenants.filter((t) => t.plan === 'enterprise').length} Hospital`, variant: 'purple' },
          { label: 'MRR SaaS', value: 'Rp 14.5M/bln', variant: 'emerald' },
          { label: 'DB Latency', value: '18 ms', variant: 'blue' }
        ]}
      />

      {/* Main Tenant Table */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1D6BE]">
          <div>
            <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#B8905A]" />
              Daftar Organisasi / Tenant Klinik Terdaftar
            </h3>
            <p className="text-xs text-[#6B6656] mt-0.5">
              Setiap tenant memiliki isolasi data, konfigurasi cabang, dan hak akses staf tersendiri.
            </p>
          </div>
          <input
            type="text"
            placeholder="Cari tenant, kode, atau owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 text-xs bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E1D6BE]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase border-b border-[#E1D6BE]">
              <tr>
                <th className="p-3">Kode Tenant</th>
                <th className="p-3">Nama Organisasi Klinik</th>
                <th className="p-3">Pemilik / Penanggung Jawab</th>
                <th className="p-3 text-center">Paket Langganan</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Berlaku Hingga</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BE] bg-white">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-[#F6F1E6]/40">
                  <td className="p-3 font-mono font-bold text-[#1B2A45]">{t.code}</td>
                  <td className="p-3 font-bold text-[#1B2A45]">{t.name}</td>
                  <td className="p-3 text-[#6B6656]">
                    <div className="font-semibold text-[#1B2A45]">{t.ownerName}</div>
                    <span className="text-[10px]">{t.phone}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] border uppercase ${getPlanBadge(t.plan)}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-[#6B6656]">{t.expiresAt}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => addToast(`Mengakses sesi diagnosa cloud untuk tenant ${t.name}`, 'info')}
                      className="px-2.5 py-1 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-[10px] rounded-lg border border-[#E1D6BE] cursor-pointer"
                    >
                      Kelola Kuota
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Tenant */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#B8905A]" />
                Registrasi Tenant Klinik SaaS
              </h3>
              <button
                onClick={() => setShowAddTenantModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Rumah Sakit / Klinik</label>
                <input
                  type="text"
                  placeholder="Contoh: Smile Vet Clinic Surabaya"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Kode Unik Tenant</label>
                  <input
                    type="text"
                    placeholder="SMILE-VET"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono font-bold text-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Paket Langganan</label>
                  <select
                    value={tenantPlan}
                    onChange={(e) => setTenantPlan(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                  >
                    <option value="trial">Trial (30 Hari)</option>
                    <option value="basic">Basic Clinic</option>
                    <option value="pro">Pro Clinic (1-3 Cabang)</option>
                    <option value="enterprise">Enterprise Hospital Group</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Pemilik / Dokter Penanggung Jawab</label>
                <input
                  type="text"
                  placeholder="Drh. ..."
                  value={tenantOwnerName}
                  onChange={(e) => setTenantOwnerName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Telepon</label>
                  <input
                    type="text"
                    placeholder="+62 812-..."
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Email Owner</label>
                  <input
                    type="email"
                    placeholder="owner@clinic.id"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTenantModal(false)}
                  className="px-4 py-2.5 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold rounded-xl hover:bg-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md"
                >
                  Daftarkan Organisasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
