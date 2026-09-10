import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Users,
  Calendar,
  DollarSign,
  Award,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  UserCheck,
  Plus,
  Printer,
  FileText,
  X,
  Building2,
  Phone,
  Mail,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import * as Types from '../../types';

const EMPLOYEE_ROLES: Types.Employee['role'][] = [
  'Dokter Hewan',
  'Paramedik',
  'Groomer',
  'Pet Hotel Staff',
  'Kasir',
  'Finance',
  'Admin'
];

export const HRMModule: React.FC = () => {
  const { addToast } = useToast();
  const { can } = usePermissions();
  const canProcessPayroll = can('hrm', 'approve');
  const {
    employees,
    addEmployee,
    branches,
    absenceRecords,
    addAbsenceRecord,
    leaveRequests,
    clinicVisits,
    surgicalProcedures,
    groomingSessions,
    services,
    addCashTransaction
  } = useData();

  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'commission'>('roster');
  const today = new Date().toISOString().slice(0, 10);

  // Modals state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedSlipStaff, setSelectedSlipStaff] = useState<any>(null);

  // New staff form state - persisted as a real Employee record via DataContext
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<Types.Employee['role']>('Dokter Hewan');
  const [newStaffSIP, setNewStaffSIP] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState('Medis');
  const [newStaffShift, setNewStaffShift] = useState('Pagi (08:00 - 16:00)');
  const [newStaffBranchId, setNewStaffBranchId] = useState(branches[0]?.id || '');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffBaseSalary, setNewStaffBaseSalary] = useState(4500000);
  const [newStaffCommissionRate, setNewStaffCommissionRate] = useState(5);

  // ---------------------------------------------------------------------------
  // Attendance helpers - backed by the shared absenceRecords / leaveRequests data
  // (previously HRM kept its own fake, always-"Hadir" staff list)
  // ---------------------------------------------------------------------------
  const todaysAttendanceByEmployee = new Map<string, Types.AbsenceRecord>();
  absenceRecords.forEach((rec) => {
    if (rec.date === today) todaysAttendanceByEmployee.set(rec.employeeId, rec);
  });

  const activeLeaveByEmployee = new Map<string, Types.LeaveRequest>();
  leaveRequests.forEach((lr) => {
    if (lr.status === 'Disetujui' && lr.startDate <= today && today <= lr.endDate) {
      activeLeaveByEmployee.set(lr.employeeId, lr);
    }
  });

  const hadirTodayCount = employees.filter((e) => {
    const rec = todaysAttendanceByEmployee.get(e.id);
    return rec && (rec.status === 'Hadir' || rec.status === 'Terlambat');
  }).length;
  const izinSakitTodayCount = employees.filter((e) => {
    const rec = todaysAttendanceByEmployee.get(e.id);
    return rec && (rec.status === 'Izin' || rec.status === 'Sakit');
  }).length;
  const cutiAktifCount = employees.filter((e) => activeLeaveByEmployee.has(e.id)).length;

  const handleCheckIn = (emp: Types.Employee) => {
    if (todaysAttendanceByEmployee.has(emp.id)) {
      addToast(`${emp.name} sudah tercatat presensi hari ini.`, 'info');
      return;
    }
    const now = new Date();
    const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    addAbsenceRecord({
      employeeId: emp.id,
      employeeName: emp.name,
      date: today,
      checkIn: checkInTime,
      status: 'Hadir'
    });
    addToast(`Presensi masuk ${emp.name} tercatat pukul ${checkInTime} WIB.`, 'success');
  };

  // ---------------------------------------------------------------------------
  // Add staff - writes straight into the shared Master Data employee list so
  // Roster, Booking (dokter/groomer picker) & Commission all see the same person
  // ---------------------------------------------------------------------------
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) {
      addToast('Harap isi nama dan nomor telepon staf!', 'error');
      return;
    }

    addEmployee({
      name: newStaffName,
      role: newStaffRole,
      department: newStaffDepartment,
      branchId: newStaffBranchId || undefined,
      shift: newStaffShift,
      sipNumber: newStaffSIP || undefined,
      phone: newStaffPhone,
      email: newStaffEmail || `${newStaffName.toLowerCase().replace(/\s+/g, '.')}@petcare.co.id`,
      hireDate: today,
      baseSalary: newStaffBaseSalary,
      commissionRatePercent: newStaffCommissionRate,
      status: 'Aktif'
    });

    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffSIP('');
    setNewStaffEmail('');
    addToast(`Staf baru ${newStaffName} (${newStaffRole}) berhasil ditambahkan ke Master Data!`, 'success');
  };

  // ---------------------------------------------------------------------------
  // Commission - derived from real clinical/grooming activity + the master
  // service price list, instead of hand-typed numbers per staff member
  // ---------------------------------------------------------------------------
  const avgPriceByCategory = (category: Types.ServiceItem['category']) => {
    const matching = services.filter((s) => s.category === category && s.isActive);
    if (matching.length === 0) return 0;
    return matching.reduce((sum, s) => sum + s.price, 0) / matching.length;
  };
  const avgConsultPrice = avgPriceByCategory('Konsultasi');
  const avgSurgeryPrice = avgPriceByCategory('Bedah & Tindakan');

  const staffPayroll = employees.map((emp) => {
    const consultsCount = clinicVisits.filter((v) => v.doctorName === emp.name && v.status === 'Selesai').length;
    const surgeryCount = surgicalProcedures.filter((sp) => sp.leadSurgeon === emp.name && sp.status === 'Selesai').length;
    const groomingDone = groomingSessions.filter((g) => g.groomerName === emp.name && g.stage === 'Selesai');
    const groomingRevenue = groomingDone.reduce((sum, g) => sum + g.price, 0);

    const rate = emp.commissionRatePercent / 100;
    const consultCommission = Math.round(consultsCount * avgConsultPrice * rate);
    const surgeryCommission = Math.round(surgeryCount * avgSurgeryPrice * rate);
    const groomingCommission = Math.round(groomingRevenue * rate);
    const totalCommission = consultCommission + surgeryCommission + groomingCommission;

    const allowance = Math.round(emp.baseSalary * 0.1);
    const grossPay = emp.baseSalary + totalCommission + allowance;
    const deductions = Math.round(grossPay * 0.05); // estimasi BPJS + PPh21
    const totalPayout = grossPay - deductions;

    return {
      staffId: emp.id,
      employee: emp,
      name: emp.name,
      role: emp.role,
      sip: emp.sipNumber || '-',
      baseSalary: emp.baseSalary,
      consultsCount,
      consultCommission,
      surgeryCount,
      surgeryCommission,
      groomingCount: groomingDone.length,
      groomingCommission,
      allowance,
      deductions,
      totalPayout
    };
  });

  const handleViewPaySlip = (sc: any) => {
    setSelectedSlipStaff(sc);
    setShowSlipModal(true);
  };

  const handleSimulatePayout = (sc: any) => {
    if (!canProcessPayroll) {
      addToast('Akun Anda tidak memiliki hak akses untuk mencairkan gaji/komisi staf.', 'error');
      return;
    }
    // Payout beneran dicatat sebagai pengeluaran kas di modul Finance
    addCashTransaction({
      type: 'Keluar',
      category: 'Payroll & Komisi Staff',
      amount: sc.totalPayout,
      description: `Pencairan gaji & komisi ${sc.name} (${sc.role}) - periode ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
    });
    addToast(`Penggajian & komisi bulan ini untuk ${sc.name} senilai Rp ${sc.totalPayout.toLocaleString('id-ID')} berhasil diproses & dicatat di Buku Kas Finance!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Users}
        title="Penjadwalan Shift Kerja, Presensi & Komisi Dokter/Groomer"
        description="Pengaturan roster shift kerja medis, log absensi, serta kalkulasi payroll komisi otomatis berdasarkan jumlah tindakan medis & grooming."
        badges={[
          { label: `${employees.length} Staf Terdaftar`, variant: 'gold' },
          { label: `${hadirTodayCount} Hadir Hari Ini`, variant: 'emerald' },
          { label: 'Payroll Terintegrasi Master Data', variant: 'blue' }
        ]}
        tabs={[
          { id: 'roster', label: 'Shift & Roster', icon: Calendar, count: employees.length },
          { id: 'attendance', label: 'Absensi & Presensi', icon: Clock },
          { id: 'commission', label: 'Komisi & Slip Gaji', icon: DollarSign }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: SHIFT ROSTER & STAFF DIRECTORY (sumber data: employees @ Master Data) */}
      {activeTab === 'roster' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1D6BE] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-[#B8905A]" /> Roster Penjadwalan Shift Kerja
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Data staf & dokter diambil langsung dari Master Data Dokter & Staff (satu sumber data untuk seluruh modul)
              </p>
            </div>

            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-3.5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 w-fit"
            >
              <Plus className="w-4 h-4 text-[#D9B98A]" /> Tambah Staf / Dokter Baru
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#22242B]">
              <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Nama Staf / Dokter</th>
                  <th className="p-3">Jabatan & No. SIP</th>
                  <th className="p-3">Shift Kerja</th>
                  <th className="p-3">Cabang Klinik</th>
                  <th className="p-3">Kontak WA</th>
                  <th className="p-3">Status Presensi Hari Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]">
                {employees.map((emp) => {
                  const branchName = branches.find((b) => b.id === emp.branchId)?.name;
                  const attendance = todaysAttendanceByEmployee.get(emp.id);
                  const onLeave = activeLeaveByEmployee.has(emp.id);
                  return (
                    <tr key={emp.id}>
                      <td className="p-3 font-bold text-[#1B2A45]">
                        <div>{emp.name}</div>
                        <div className="text-[10px] text-[#6B6656] font-normal">{emp.email}</div>
                      </td>
                      <td className="p-3 font-medium">
                        <div>{emp.role}</div>
                        {emp.sipNumber && (
                          <div className="text-[10px] text-[#B8905A] font-mono font-bold">SIP: {emp.sipNumber}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded bg-[#E1D6BE]/40 text-[#1B2A45] font-bold text-[11px] flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-[#B8905A]" /> {emp.shift || 'Belum diatur'}
                        </span>
                      </td>
                      <td className="p-3">{branchName || '—'}</td>
                      <td className="p-3 font-mono">{emp.phone}</td>
                      <td className="p-3">
                        {onLeave ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Cuti / Izin
                          </span>
                        ) : attendance ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {attendance.status} ({attendance.checkIn})
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(emp)}
                            className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <AlertCircle className="w-3 h-3" /> Belum Presensi - Check-In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#6B6656]">
                      Belum ada staf terdaftar. Tambahkan lewat tombol di atas atau tab "Dokter & Staff" di Master Data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE & PRESENCE LOGS (sumber data: absenceRecords & leaveRequests) */}
      {activeTab === 'attendance' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B8905A]" /> Log Presensi Masuk & Keluar Hari Ini
            </h3>
            <span className="text-xs text-[#6B6656] font-bold">
              Tanggal: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#F6F1E6] p-4 rounded-xl border border-[#E1D6BE] text-center space-y-1">
              <span className="text-[11px] text-[#6B6656] font-bold block uppercase">Total Dokter / Staf</span>
              <span className="text-2xl font-extrabold text-[#1B2A45]">{employees.length} Orang</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center space-y-1">
              <span className="text-[11px] text-emerald-800 font-bold block uppercase">Hadir Hari Ini</span>
              <span className="text-2xl font-extrabold text-emerald-700">{hadirTodayCount} Orang</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center space-y-1">
              <span className="text-[11px] text-amber-800 font-bold block uppercase">Terlambat / Izin / Sakit</span>
              <span className="text-2xl font-extrabold text-amber-700">{izinSakitTodayCount} Orang</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center space-y-1">
              <span className="text-[11px] text-blue-800 font-bold block uppercase">Cuti Disetujui (Aktif)</span>
              <span className="text-2xl font-extrabold text-blue-700">{cutiAktifCount} Orang</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#22242B]">
              <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Nama Staf</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Jam Masuk (Check-In)</th>
                  <th className="p-3">Cabang</th>
                  <th className="p-3">Keterangan Presensi</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]">
                {employees.map((emp) => {
                  const rec = todaysAttendanceByEmployee.get(emp.id);
                  const onLeave = activeLeaveByEmployee.has(emp.id);
                  const branchName = branches.find((b) => b.id === emp.branchId)?.name || '—';
                  return (
                    <tr key={emp.id}>
                      <td className="p-3 font-bold text-[#1B2A45]">{emp.name}</td>
                      <td className="p-3">{emp.role}</td>
                      <td className="p-3 font-mono font-bold text-[#1B2A45]">{rec?.checkIn || '-'}</td>
                      <td className="p-3">{branchName}</td>
                      <td className="p-3">
                        {onLeave ? (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Cuti / Izin</span>
                        ) : rec ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              rec.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status}{rec.notes ? ` - ${rec.notes}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">Belum Presensi</span>
                        )}
                      </td>
                      <td className="p-3">
                        {!rec && !onLeave && (
                          <button
                            onClick={() => handleCheckIn(emp)}
                            className="px-3 py-1 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[#D9B98A]" /> Check-In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COMMISSION & PAYROLL (dihitung dari clinicVisits, surgicalProcedures, groomingSessions & katalog tarif Master Data) */}
      {activeTab === 'commission' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffPayroll.map((sc) => (
              <div key={sc.staffId} className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-start border-b border-[#E1D6BE] pb-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#1B2A45]">{sc.name}</h4>
                    <p className="text-xs text-[#6B6656]">{sc.role}</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-[#1B2A45] text-[#D9B98A] text-[10px] font-bold rounded">
                    Periode {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Gaji Pokok:</span>
                    <span className="font-bold text-[#1B2A45]">Rp {sc.baseSalary.toLocaleString('id-ID')}</span>
                  </div>
                  {sc.consultsCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6656]">Komisi Konsultasi Selesai ({sc.consultsCount}x):</span>
                      <span className="font-semibold text-emerald-700">+ Rp {sc.consultCommission.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {sc.surgeryCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6656]">Komisi Tindakan Operasi ({sc.surgeryCount}x):</span>
                      <span className="font-semibold text-emerald-700">+ Rp {sc.surgeryCommission.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {sc.groomingCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6656]">Komisi Grooming Selesai ({sc.groomingCount}x):</span>
                      <span className="font-semibold text-emerald-700">+ Rp {sc.groomingCommission.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Tunjangan Jabatan & Transport:</span>
                    <span className="font-semibold text-emerald-700">+ Rp {sc.allowance.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span className="text-[#6B6656]">Potongan (Estimasi BPJS / PPh21):</span>
                    <span>- Rp {sc.deductions.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E1D6BE] text-sm">
                    <span className="font-bold text-[#1B2A45]">Take Home Pay (THP):</span>
                    <span className="font-extrabold text-[#1B2A45]">Rp {sc.totalPayout.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleViewPaySlip(sc)}
                    className="py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-bold text-xs rounded-lg border border-[#E1D6BE] transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-[#B8905A]" /> Rincian Slip Gaji
                  </button>
                  <button
                    onClick={() => handleSimulatePayout(sc)}
                    disabled={!canProcessPayroll}
                    title={canProcessPayroll ? undefined : 'Hanya owner/admin yang dapat mencairkan gaji'}
                    className="py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#1B2A45]"
                  >
                    <DollarSign className="w-4 h-4 text-[#D9B98A]" /> Cairkan Gaji
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddStaffModal(false);
          }}
        >
          <div
            className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B] cursor-default max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display">Tambah Staf / Dokter Baru</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-[#6B6656] hover:text-[#1B2A45]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-[#6B6656] -mt-2">
              Staf yang ditambahkan di sini otomatis muncul juga di Master Data &amp; pilihan dokter/groomer saat booking.
            </p>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Contoh: drh. Ananda Putri"
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Jabatan / Role:</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as Types.Employee['role'])}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  >
                    {EMPLOYEE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Departemen:</label>
                  <input
                    type="text"
                    value={newStaffDepartment}
                    onChange={(e) => setNewStaffDepartment(e.target.value)}
                    placeholder="Medis, Grooming, Front Office..."
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Nomor SIP/STRV (Khusus Medis):</label>
                <input
                  type="text"
                  value={newStaffSIP}
                  onChange={(e) => setNewStaffSIP(e.target.value)}
                  placeholder="503/SIPVET/..."
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Shift Kerja:</label>
                  <select
                    value={newStaffShift}
                    onChange={(e) => setNewStaffShift(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  >
                    <option value="Pagi (08:00 - 16:00)">Pagi (08:00 - 16:00)</option>
                    <option value="Siang (13:00 - 21:00)">Siang (13:00 - 21:00)</option>
                    <option value="Malam / Full Care">Malam / Full Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Cabang Penempatan:</label>
                  <select
                    value={newStaffBranchId}
                    onChange={(e) => setNewStaffBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  >
                    {branches.length === 0 && <option value="">Belum ada cabang</option>}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Gaji Pokok (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    value={newStaffBaseSalary}
                    onChange={(e) => setNewStaffBaseSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Rate Komisi (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newStaffCommissionRate}
                    onChange={(e) => setNewStaffCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Nomor WA / Telepon:</label>
                <input
                  type="text"
                  required
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Email:</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="nama@petcare.co.id"
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1D6BE]">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE]/50 text-[#1B2A45] font-bold text-xs rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-md"
                >
                  Simpan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Slip Modal */}
      {showSlipModal && selectedSlipStaff && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSlipModal(false);
          }}
        >
          <div
            className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-[#1B2A45] pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-sm text-[#1B2A45] font-display">SLIP GAJI RESMI PETCARE ERP</h3>
                <p className="text-[11px] text-[#6B6656]">
                  Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-[#1B2A45]" />
            </div>

            <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#6B6656]">Nama Karyawan:</span>
                <span className="font-bold text-[#1B2A45]">{selectedSlipStaff.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6656]">Jabatan:</span>
                <span>{selectedSlipStaff.role}</span>
              </div>
              {selectedSlipStaff.sip && selectedSlipStaff.sip !== '-' && (
                <div className="flex justify-between font-mono text-[10px] text-[#B8905A]">
                  <span>No. SIP:</span>
                  <span>{selectedSlipStaff.sip}</span>
                </div>
              )}
            </div>

            <div className="text-xs space-y-2 border-t border-b border-[#E1D6BE] py-3">
              <div className="flex justify-between font-bold text-[#1B2A45]">
                <span>Penerimaan (Earnings):</span>
                <span></span>
              </div>
              <div className="flex justify-between pl-3 text-[#6B6656]">
                <span>• Gaji Pokok</span>
                <span>Rp {selectedSlipStaff.baseSalary.toLocaleString('id-ID')}</span>
              </div>
              {selectedSlipStaff.consultsCount > 0 && (
                <div className="flex justify-between pl-3 text-[#6B6656]">
                  <span>• Komisi Konsultasi Medis ({selectedSlipStaff.consultsCount}x)</span>
                  <span>Rp {selectedSlipStaff.consultCommission.toLocaleString('id-ID')}</span>
                </div>
              )}
              {selectedSlipStaff.surgeryCount > 0 && (
                <div className="flex justify-between pl-3 text-[#6B6656]">
                  <span>• Komisi Tindakan Operasi ({selectedSlipStaff.surgeryCount}x)</span>
                  <span>Rp {selectedSlipStaff.surgeryCommission.toLocaleString('id-ID')}</span>
                </div>
              )}
              {selectedSlipStaff.groomingCount > 0 && (
                <div className="flex justify-between pl-3 text-[#6B6656]">
                  <span>• Komisi Grooming ({selectedSlipStaff.groomingCount}x)</span>
                  <span>Rp {selectedSlipStaff.groomingCommission.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between pl-3 text-[#6B6656]">
                <span>• Tunjangan Jabatan & Transport</span>
                <span>Rp {selectedSlipStaff.allowance.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between font-bold text-rose-800 pt-2 border-t border-dashed border-[#E1D6BE]">
                <span>Potongan (Deductions):</span>
                <span></span>
              </div>
              <div className="flex justify-between pl-3 text-rose-700">
                <span>• PPh21 & BPJS Ketenagakerjaan (estimasi)</span>
                <span>- Rp {selectedSlipStaff.deductions.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-[#1B2A45] pt-3 border-t border-[#1B2A45]">
                <span>TAKE HOME PAY (NET):</span>
                <span>Rp {selectedSlipStaff.totalPayout.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE]/50 text-[#1B2A45] font-bold text-xs rounded-lg border border-[#E1D6BE]"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowSlipModal(false);
                }}
                className="px-5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#D9B98A]" /> Cetak Slip Gaji
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
