import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  Users,
  Dog,
  Stethoscope,
  Hotel,
  Scissors,
  Video,
  Wallet,
  AlertTriangle,
  Syringe,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  UserCheck,
  Activity,
  PhoneCall,
  Briefcase,
  EyeOff,
  Calculator,
  Camera,
  Tv,
  Volume2,
  Maximize2,
  Pill,
  ExternalLink,
  ShieldCheck,
  Grid,
  Columns,
  Layers,
  Sliders,
  Zap,
  MousePointer,
  RotateCcw,
  ShoppingCart,
  Package,
  Receipt,
  Boxes,
  QrCode
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { DoseCalculator } from '../common/DoseCalculator';
import { CctvMonitor } from '../common/CctvMonitor';
import { QueueDisplay } from '../common/QueueDisplay';
import { PredictiveInventoryWidget } from '../common/PredictiveInventoryWidget';
import { PredictiveTrafficGrowthWidget } from '../common/PredictiveTrafficGrowthWidget';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { ExecutiveManagementHeader } from '../dashboard/ExecutiveManagementHeader';
import { RecentPatientHistoryCard } from '../common/RecentPatientHistoryCard';
import { SmartPatientCheckInCard } from '../common/SmartPatientCheckInCard';
import { SmartPatientCheckInModal } from '../common/SmartPatientCheckInModal';
import { UpcomingAppointmentsScheduler } from '../common/UpcomingAppointmentsScheduler';
import { callPatientQueueVoice } from '../../utils/audioVoiceUtils';
import {
  LayoutOptimizationAssistant,
  LayoutConfig,
  getStoredLayoutConfig,
  saveStoredLayoutConfig,
  recordWidgetTelemetry,
  WidgetId,
  LayoutMode
} from '../common/LayoutOptimizationAssistant';

export type StaffDutyStatus = 'Available' | 'In Surgery' | 'In Consultation' | 'On Break' | 'Off Duty';

export interface DoctorShiftItem {
  id: string;
  name: string;
  title: string;
  roleType: 'dokter' | 'paramedik';
  department: string;
  sipNumber?: string;
  shiftHours: string;
  status: StaffDutyStatus;
  location: string;
  currentPatient?: string;
  phone: string;
  avatar: string;
}

export const DashboardModule: React.FC<{ setActiveModule: (m: any) => void }> = ({ setActiveModule }) => {
  const { addToast } = useToast();
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const [doctorCategoryFilter, setDoctorCategoryFilter] = React.useState<'all' | 'dokter' | 'paramedik'>('all');
  const [hideOffDuty, setHideOffDuty] = React.useState<boolean>(false);

  const { user, switchRole, activeOwnership, setActiveOwnership } = useAuth();
  
  // Dynamic role resolution from activeOwnership or user role
  let effectiveRole: UserRole = 'owner_petcare';
  if (activeOwnership === 'owner_petshop' || user?.ownershipType === 'owner_petshop' || user?.role === 'owner_petshop' || user?.role === 'kasir') {
    effectiveRole = 'owner_petshop';
  } else if (activeOwnership === 'owner_klinik' || user?.ownershipType === 'owner_klinik' || user?.role === 'owner_klinik' || user?.role === 'dokter' || user?.role === 'perawat') {
    effectiveRole = 'owner_klinik';
  } else if (activeOwnership === 'owner_petcare' || user?.ownershipType === 'owner_petcare' || user?.role === 'owner_petcare' || user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'owner') {
    effectiveRole = 'owner_petcare';
  } else if (user?.role) {
    effectiveRole = user.role;
  }

  const isPetshop = effectiveRole === 'owner_petshop' || effectiveRole === 'kasir';
  const isClinic = effectiveRole === 'owner_klinik' || effectiveRole === 'dokter' || effectiveRole === 'perawat';
  const isPetcare = !isPetshop && !isClinic;

  const handleSwitchOwnership = (targetRole: UserRole) => {
    switchRole(targetRole);
    if (setActiveOwnership) {
      setActiveOwnership(targetRole);
    }
    const roleLabels: Record<string, string> = {
      owner_petcare: 'Owner PetCare (Konsolidasi Multi-Unit)',
      owner_petshop: 'Owner PetShop (Retail & POS)',
      owner_klinik: 'Owner Klinik (Praktik Medis Vet)'
    };
    addToast(`Perspektif Manajemen aktif: ${roleLabels[targetRole] || targetRole}`, 'success');
  };

  // Redesigned Clinical / Retail Utilities & Surveillance State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => getStoredLayoutConfig());
  const [showLayoutAssistantModal, setShowLayoutAssistantModal] = useState<boolean>(false);
  const [activeUtilityTab, setActiveUtilityTab] = useState<WidgetId>(() => layoutConfig.activeTab || layoutConfig.primaryWidget || 'kalkulator');
  const [showFullDoseModal, setShowFullDoseModal] = useState<boolean>(false);
  const [showFullCctvModal, setShowFullCctvModal] = useState<boolean>(false);
  const [showFullQueueModal, setShowFullQueueModal] = useState<boolean>(false);
  const [showSmartCheckInModal, setShowSmartCheckInModal] = useState<boolean>(false);
  const [isCallingAudio, setIsCallingAudio] = useState<boolean>(false);

  // Barcode / Price search state for Petshop mode
  const [searchBarcodeQuery, setSearchBarcodeQuery] = useState<string>('');
  const [foundBarcodeProduct, setFoundBarcodeProduct] = useState<any>(null);

  const handleSelectTab = (tab: WidgetId) => {
    setActiveUtilityTab(tab);
    recordWidgetTelemetry(tab, 'Beralih Tab');
  };

  const handleApplyLayoutConfig = (newCfg: LayoutConfig) => {
    setLayoutConfig(newCfg);
    setActiveUtilityTab(newCfg.primaryWidget);
    saveStoredLayoutConfig(newCfg);
  };

  // Staff Shift List (Includes Doctor shifts for Clinic/Petcare & Store/Cashier staff for Petshop)
  const [staffShiftList, setStaffShiftList] = React.useState<DoctorShiftItem[]>([
    {
      id: 'e1',
      name: 'drh. Ananda Putri',
      title: 'Dokter Hewan Utama',
      roleType: 'dokter',
      department: 'Poliklinik & Bedah Umum',
      sipNumber: 'SIP.503/VET/2023/0019',
      shiftHours: '08:00 - 16:00 (Pagi)',
      status: 'In Surgery',
      location: 'Ruang Operasi / Bedah 1',
      currentPatient: 'Milo (Anjing Golden)',
      phone: '081233445566',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'e5',
      name: 'drh. Budi Setiawan, Sp.NV',
      title: 'Spesialis Bedah & Saraf',
      roleType: 'dokter',
      department: 'Bedah Saraf & Khusus',
      sipNumber: 'SIP.503/VET/2022/0104',
      shiftHours: '08:00 - 16:00 (Pagi)',
      status: 'In Consultation',
      location: 'Poli Medis VET-1',
      currentPatient: 'Max (French Bulldog)',
      phone: '081298765432',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'e6',
      name: 'drh. Citra Prasetyo',
      title: 'Poli Feline & Exotics',
      roleType: 'dokter',
      department: 'Medis Kucing & Eksotik',
      sipNumber: 'SIP.503/VET/2024/0088',
      shiftHours: '12:00 - 20:00 (Siang)',
      status: 'Available',
      location: 'Poli Medis VET-2',
      currentPatient: '-',
      phone: '081377889900',
      avatar: 'https://images.unsplash.com/photo-1594824813566-78a933f2c69c?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'e7',
      name: 'drh. Eka Pratiwi',
      title: 'Dokter Rawat Jalan',
      roleType: 'dokter',
      department: 'Poli Umum',
      sipNumber: 'SIP.503/VET/2024/0099',
      shiftHours: '16:00 - 22:00 (Malam)',
      status: 'Off Duty',
      location: 'Standby / Luar Shift',
      currentPatient: '-',
      phone: '081211223344',
      avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'e4',
      name: 'Rahmat Hidayat',
      title: 'Paramedik & Asisten Bedah',
      roleType: 'paramedik',
      department: 'UGD & Rawat Inap ICU',
      sipNumber: '-',
      shiftHours: '08:00 - 16:00 (Pagi)',
      status: 'Available',
      location: 'Area ICU & Lab',
      currentPatient: 'Oreo (Rawat Inap)',
      phone: '081566778899',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'e3',
      name: 'Binta Amalia',
      title: 'Senior Pet Groomer',
      roleType: 'paramedik',
      department: 'Grooming & Pet Spa',
      sipNumber: '-',
      shiftHours: '09:00 - 17:00 (Pagi)',
      status: 'In Consultation',
      location: 'Area Salon & Spa',
      currentPatient: 'Mochi (Kucing Persi)',
      phone: '081455667788',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
    }
  ]);

  // Petshop Staff Shift Roster
  const [petshopStaffList, setPetshopStaffList] = React.useState<DoctorShiftItem[]>([
    {
      id: 'ps1',
      name: 'Siti Rahmawati',
      title: 'Kasir POS Utama',
      roleType: 'paramedik',
      department: 'Front Office & Kasir POS 1',
      shiftHours: '08:00 - 16:00 (Pagi)',
      status: 'Available',
      location: 'Counter Kasir 1',
      currentPatient: 'Transaksi Member #1092',
      phone: '081299887766',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'ps2',
      name: 'Dimas Wicaksono',
      title: 'Kasir & Customer Advisor',
      roleType: 'paramedik',
      department: 'Counter Kasir POS 2',
      shiftHours: '12:00 - 20:00 (Siang)',
      status: 'In Consultation',
      location: 'Counter Kasir 2',
      currentPatient: 'Konsultasi Pakan Anjing',
      phone: '081388776655',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'ps3',
      name: 'Hendra Gunawan',
      title: 'Kepala Gudang & Inventory',
      roleType: 'paramedik',
      department: 'Gudang & Receiving PO',
      shiftHours: '08:00 - 17:00 (Reguler)',
      status: 'Available',
      location: 'Gudang Utama Toko',
      currentPatient: 'Receiving PO Pakan RC',
      phone: '081511224433',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 'ps4',
      name: 'Dewi Lestari',
      title: 'Store Merchandiser',
      roleType: 'paramedik',
      department: 'Display Rak & Sanitasi',
      shiftHours: '14:00 - 22:00 (Malam)',
      status: 'Off Duty',
      location: 'Lantai Toko & Display',
      currentPatient: '-',
      phone: '081733445566',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    }
  ]);

  const updateStaffStatus = (id: string, newStatus: StaffDutyStatus) => {
    setStaffShiftList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };
  const {
    branches,
    activeBranchId,
    customers,
    pets,
    clinicVisits,
    hotelReservations,
    groomingSessions,
    telehealthSessions,
    invoices,
    drugs,
    vacSchedules,
    carePlans,
    stockItems,
    purchaseOrders
  } = useData();

  const activeBranch = (branches || []).find((b) => b.id === activeBranchId);
  const activeBranchName = activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'Klinik & Pet Shop Pusat';

  // KPIs calculations based on business profile
  const totalCustomers = (customers || []).length;
  const totalPets = (pets || []).length;
  const activeVisits = (clinicVisits || []).filter((v) => v?.status !== 'Selesai' && v?.status !== 'Batal').length;
  const activeBoarding = (hotelReservations || []).filter((h) => h?.status === 'Aktif').length;
  const activeGrooming = (groomingSessions || []).filter((g) => g?.stage !== 'Selesai').length;
  const activeTelehealth = (telehealthSessions || []).filter((t) => t?.status === 'Berlangsung' || t?.status === 'Menunggu').length;

  const todayStr = new Date().toISOString().substring(0, 10);
  const revenueToday = (invoices || [])
    .filter((i) => i?.status === 'Lunas' && i?.date === todayStr)
    .reduce((sum, i) => sum + (i?.totalAmount || 0), 0);

  const revenueMonth = (invoices || [])
    .filter((i) => i?.status === 'Lunas')
    .reduce((sum, i) => sum + (i?.totalAmount || 0), 0);

  // Retail / Petshop specific metrics
  const totalStockUnits = (stockItems || []).reduce((sum, s) => sum + (s?.stock || 0), 0);
  const totalStockAssetValue = (stockItems || []).reduce((sum, s) => sum + ((s?.stock || 0) * (s?.purchasePrice || 0)), 0);
  const lowStockRetailItems = (stockItems || []).filter((s) => (s?.stock || 0) <= (s?.minStock || 10));
  const posSalesTodayCount = (invoices || []).filter((i) => i?.date === todayStr).length;
  const avgBasketSize = posSalesTodayCount > 0 ? Math.round(revenueToday / posSalesTodayCount) : 0;
  const recentPosInvoices = (invoices || [])
    .filter((i) => i?.date === todayStr)
    .slice()
    .reverse()
    .slice(0, 5);
  const pendingOrdersCount = (purchaseOrders || []).filter((p) => p?.status === 'Menunggu Kirim' || p?.status === 'Draft').length;

  // Custom Chart Components for Theme Styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#F6F1E6] border border-[#E1D6BE] p-3 rounded-xl shadow-md text-[#1B2A45] text-xs space-y-1">
          <p className="font-bold text-xs text-[#1B2A45] border-b border-[#E1D6BE]/50 pb-1">
            Hari {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-extrabold text-[#1B2A45]">
                Rp {Number(entry.value).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-[11px] text-[#1B2A45]">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5 bg-[#F6F1E6] px-2 py-0.5 rounded-md border border-[#E1D6BE]/60 font-bold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Role-specific Revenue Datasets
  const petshopRevenueData = [
    { day: 'Sen', Pakan: 1400000, Pasir: 450000, Suplemen: 300000, Aksesoris: 250000, Total: 2400000, MingguLalu: 2100000 },
    { day: 'Sel', Pakan: 1600000, Pasir: 500000, Suplemen: 350000, Aksesoris: 300000, Total: 2750000, MingguLalu: 2300000 },
    { day: 'Rab', Pakan: 1900000, Pasir: 600000, Suplemen: 400000, Aksesoris: 350000, Total: 3250000, MingguLalu: 2900000 },
    { day: 'Kam', Pakan: 1300000, Pasir: 400000, Suplemen: 300000, Aksesoris: 200000, Total: 2200000, MingguLalu: 2500000 },
    { day: 'Jum', Pakan: 2400000, Pasir: 750000, Suplemen: 500000, Aksesoris: 450000, Total: 4100000, MingguLalu: 3600000 },
    { day: 'Sab', Pakan: 3800000, Pasir: 1200000, Suplemen: 800000, Aksesoris: 700000, Total: 6500000, MingguLalu: 5800000 },
    { day: 'Min', Pakan: 3400000, Pasir: 1100000, Suplemen: 750000, Aksesoris: 650000, Total: 5900000, MingguLalu: 5200000 },
  ];

  const clinicRevenueData = [
    { day: 'Sen', RawatJalan: 1200000, Bedah: 800000, Inpatient: 450000, ApotekLab: 350000, Total: 2800000, MingguLalu: 2400000 },
    { day: 'Sel', RawatJalan: 1400000, Bedah: 900000, Inpatient: 500000, ApotekLab: 400000, Total: 3200000, MingguLalu: 2700000 },
    { day: 'Rab', RawatJalan: 1600000, Bedah: 1200000, Inpatient: 600000, ApotekLab: 450000, Total: 3850000, MingguLalu: 3300000 },
    { day: 'Kam', RawatJalan: 1100000, Bedah: 700000, Inpatient: 400000, ApotekLab: 300000, Total: 2500000, MingguLalu: 2200000 },
    { day: 'Jum', RawatJalan: 1800000, Bedah: 1400000, Inpatient: 700000, ApotekLab: 600000, Total: 4500000, MingguLalu: 3900000 },
    { day: 'Sab', RawatJalan: 2600000, Bedah: 2000000, Inpatient: 900000, ApotekLab: 800000, Total: 6300000, MingguLalu: 5500000 },
    { day: 'Min', RawatJalan: 2400000, Bedah: 1800000, Inpatient: 850000, ApotekLab: 750000, Total: 5800000, MingguLalu: 5100000 },
  ];

  const petcareRevenueData = [
    { day: 'Sen', Klinik: 1200000, Grooming: 450000, Hotel: 300000, PetShop: 600000, Total: 2550000, MingguLalu: 2100000 },
    { day: 'Sel', Klinik: 1500000, Grooming: 600000, Hotel: 300000, PetShop: 450000, Total: 2850000, MingguLalu: 2400000 },
    { day: 'Rab', Klinik: 1800000, Grooming: 500000, Hotel: 450000, PetShop: 750000, Total: 3500000, MingguLalu: 3100000 },
    { day: 'Kam', Klinik: 1100000, Grooming: 350000, Hotel: 300000, PetShop: 500000, Total: 2250000, MingguLalu: 2600000 },
    { day: 'Jum', Klinik: 2100000, Grooming: 800000, Hotel: 600000, PetShop: 900000, Total: 4400000, MingguLalu: 3900000 },
    { day: 'Sab', Klinik: 3200000, Grooming: 1500000, Hotel: 900000, PetShop: 1400000, Total: 7000000, MingguLalu: 6200000 },
    { day: 'Min', Klinik: 2800000, Grooming: 1200000, Hotel: 900000, PetShop: 1100000, Total: 6000000, MingguLalu: 5400000 },
  ];

  const revenueData = isPetshop ? petshopRevenueData : isClinic ? clinicRevenueData : petcareRevenueData;

  const petshopPieData = [
    { name: 'Pakan Kucing/Anjing', value: 54, color: '#D97706' },
    { name: 'Pasir & Sanitasi', value: 22, color: '#1B2A45' },
    { name: 'Vitamin & Treats', value: 14, color: '#059669' },
    { name: 'Aksesoris & Mainan', value: 10, color: '#6366F1' },
  ];

  const clinicPieData = [
    { name: 'Rawat Jalan & Poli', value: 42, color: '#1B2A45' },
    { name: 'Tindakan Bedah', value: 30, color: '#B8905A' },
    { name: 'Rawat Inap & ICU', value: 16, color: '#101A2C' },
    { name: 'Apotek & Lab', value: 12, color: '#059669' },
  ];

  const petcarePieData = [
    { name: 'Klinik Medis', value: 45, color: '#1B2A45' },
    { name: 'Grooming Salon', value: 20, color: '#E1D6BE' },
    { name: 'Pet Hotel', value: 15, color: '#101A2C' },
    { name: 'Pet Shop POS', value: 20, color: '#3B5035' },
  ];

  const pieData = isPetshop ? petshopPieData : isClinic ? clinicPieData : petcarePieData;

  const lowStockDrugs = (drugs || []).filter((d) => d && d.stock <= d.minStock);
  const dueVaccines = (vacSchedules || []).filter((v) => v && (v.status === 'Jatuh Tempo' || v.status === 'Terlambat'));

  const currentServingVisit = (clinicVisits || []).find((v) => v.status === 'Sedang Diperiksa' || v.status === 'Dipanggil') || (clinicVisits || [])[0];
  const currentWaitingVisits = (clinicVisits || []).filter((v) => v.status === 'Menunggu');

  const playQueueChime = (ticketNo: string, patientName: string) => {
    setIsCallingAudio(true);
    callPatientQueueVoice({
      ticketNo,
      patientName,
      destination: 'ruang periksa dokter',
      onEnd: () => setIsCallingAudio(false),
      onError: () => setIsCallingAudio(false)
    });
    addToast(`Panggilan suara antrean ${ticketNo} (${patientName}) diumumkan ke pengeras suara (Suara Wanita Indonesia)!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Executive Management Header with Live Ownership Switcher */}
      <ExecutiveManagementHeader
        effectiveRole={effectiveRole}
        onSwitchRole={handleSwitchOwnership}
        activeBranchName={activeBranchName}
        totalCustomers={totalCustomers}
        totalPets={totalPets}
        onOpenCheckIn={() => setShowSmartCheckInModal(true)}
        setActiveModule={setActiveModule}
      />

      {/* 8 KPI Cards Grid - Customized per Ownership Profile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isPetshop ? (
          <>
            {/* 1. Transaksi Kasir POS */}
            <div
              onClick={() => setActiveModule('petShop')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Transaksi Kasir POS</span>
                <ShoppingCart className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{posSalesTodayCount} Struk</p>
              <p className="text-[10px] text-amber-800 font-bold mt-1 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-200">
                Lunas Kasir Hari Ini
              </p>
            </div>

            {/* 2. Total Item Terjual */}
            <div
              onClick={() => setActiveModule('petShop')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Item Terjual</span>
                <Package className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">38 pcs</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#E1D6BE]/30 inline-block px-1.5 py-0.5 rounded">
                Pakan, Pasir & Treats
              </p>
            </div>

            {/* 3. Rata-rata Keranjang (AOV) */}
            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Basket Size (AOV)</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {avgBasketSize.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-emerald-800 font-bold mt-1 bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-200">
                Rata-rata per Struk
              </p>
            </div>

            {/* 4. Nilai Aset Stok Toko */}
            <div
              onClick={() => setActiveModule('inventory')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Nilai Aset Stok</span>
                <Boxes className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {(totalStockAssetValue / 1000000).toFixed(1)} Juta
              </p>
              <p className="text-[10px] text-blue-800 font-bold mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-200">
                {totalStockUnits} unit di Gudang Toko
              </p>
            </div>

            {/* 5. Stok Menipis / Perlu PO */}
            <div
              onClick={() => setActiveModule('inventory')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Stok Menipis</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-600">{lowStockRetailItems.length} SKU</p>
              <p className="text-[10px] text-rose-800 font-bold mt-1 bg-rose-50 inline-block px-1.5 py-0.5 rounded border border-rose-200">
                Perlu Order Ulang (PO)
              </p>
            </div>

            {/* 6. Member Loyalitas Toko */}
            <div
              onClick={() => setActiveModule('masterData')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Member Toko Aktif</span>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{totalCustomers} Member</p>
              <p className="text-[10px] text-purple-800 font-bold mt-1 bg-purple-50 inline-block px-1.5 py-0.5 rounded border border-purple-200">
                Poin & Diskon Member
              </p>
            </div>

            {/* 7. Omzet Toko Hari Ini */}
            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Toko Hari Ini</span>
                <Wallet className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueToday.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#1B2A45]/60 mt-1">Lunas Kasir POS</p>
            </div>

            {/* 8. Omzet Toko Bulan Ini */}
            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Retail Bulan Ini</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueMonth.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-amber-800 font-bold mt-1 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-200">
                Akumulasi Penjualan
              </p>
            </div>
          </>
        ) : isClinic ? (
          <>
            {/* 1. Total Pelanggan */}
            <div
              onClick={() => setActiveModule('masterData')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Total Pet Owner</span>
                <Users className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{totalCustomers}</p>
              <p className="text-[10px] text-[#3B5035] font-bold mt-1 bg-[#F6F1E6] inline-block px-1.5 py-0.5 rounded">Terdaftar di Rekam Medis</p>
            </div>

            {/* 2. Total Pasien Hewan */}
            <div
              onClick={() => setActiveModule('masterData')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Pasien Hewan</span>
                <Dog className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{totalPets}</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#E1D6BE]/30 inline-block px-1.5 py-0.5 rounded">Anjing, Kucing & Eksotik</p>
            </div>

            {/* 3. Antrian Poliklinik */}
            <div
              onClick={() => setActiveModule('clinic')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Antrian Poliklinik</span>
                <Stethoscope className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{activeVisits}</p>
              <p className="text-[10px] text-emerald-800 font-bold mt-1 bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-200">
                Menunggu & Diperiksa
              </p>
            </div>

            {/* 5. Resep & Apotek Terlayani */}
            <div
              onClick={() => setActiveModule('pharmacy')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Resep & Apotek</span>
                <Pill className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">14 R/</p>
              <p className="text-[10px] text-blue-800 font-bold mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-200">
                Obat Racik & Paten
              </p>
            </div>

            {/* 6. Vaksinasi Due / Terlambat */}
            <div
              onClick={() => setActiveModule('vaccination')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Vaksin Due / Telat</span>
                <Syringe className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{dueVaccines.length}</p>
              <p className="text-[10px] text-amber-800 font-bold mt-1 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-200">
                Perlu Follow-up CRM
              </p>
            </div>

            {/* 7. Omzet Medis Hari Ini */}
            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Medis Hari Ini</span>
                <Wallet className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueToday.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#1B2A45]/60 mt-1">Lunas Poliklinik & Tindakan</p>
            </div>

            {/* 8. Omzet Medis Bulan Ini */}
            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Medis Bulan Ini</span>
                <TrendingUp className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueMonth.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#1B2A45]/60 mt-1">Akumulasi Klinik Vet</p>
            </div>
          </>
        ) : (
          <>
            {/* PetCare All-in-One Multi-Unit 8 Cards */}
            <div
              onClick={() => setActiveModule('masterData')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Total Pelanggan</span>
                <Users className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{totalCustomers}</p>
              <p className="text-[10px] text-[#3B5035] font-bold mt-1 bg-[#F6F1E6] inline-block px-1.5 py-0.5 rounded">Terdaftar di sistem</p>
            </div>

            <div
              onClick={() => setActiveModule('masterData')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Total Pasien Hewan</span>
                <Dog className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{totalPets}</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#E1D6BE]/30 inline-block px-1.5 py-0.5 rounded">Anjing & Kucing</p>
            </div>

            <div
              onClick={() => setActiveModule('clinic')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Antrian Klinik Active</span>
                <Stethoscope className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{activeVisits}</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#E1D6BE]/40 inline-block px-1.5 py-0.5 rounded">Menunggu & Diperiksa</p>
            </div>

            <div
              onClick={() => setActiveModule('petHotel')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Boarding Pet Hotel</span>
                <Hotel className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{activeBoarding}</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#F6F1E6] inline-block px-1.5 py-0.5 rounded">Kamar VIP/Regular terisi</p>
            </div>

            <div
              onClick={() => setActiveModule('grooming')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Grooming Berjalan</span>
                <Scissors className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{activeGrooming}</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#E1D6BE]/30 inline-block px-1.5 py-0.5 rounded">Sesi Salon</p>
            </div>

            <div
              onClick={() => setActiveModule('petShop')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Transaksi POS Toko</span>
                <ShoppingCart className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-2xl font-bold text-[#1B2A45]">{posSalesTodayCount} Struk</p>
              <p className="text-[10px] text-[#1B2A45] font-bold mt-1 bg-[#F6F1E6] inline-block px-1.5 py-0.5 rounded">Penjualan Retail</p>
            </div>

            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Hari Ini</span>
                <Wallet className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueToday.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#1B2A45]/60 mt-1">Lunas hari ini</p>
            </div>

            <div
              onClick={() => setActiveModule('finance')}
              className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#1B2A45]/70 mb-2">
                <span className="text-xs font-bold text-[#1B2A45]">Omzet Bulan Ini</span>
                <TrendingUp className="w-4 h-4 text-[#1B2A45]" />
              </div>
              <p className="text-xl font-bold text-[#1B2A45]">
                Rp {revenueMonth.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#1B2A45]/60 mt-1">Akumulasi pendapatan</p>
            </div>
          </>
        )}
      </div>

      {/* Analytics Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Chart with Line Chart & Stacked Bar Chart options */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45]">
                {isPetshop
                  ? 'Trend Pendapatan Harian Toko Pet Shop (POS Retail)'
                  : isClinic
                  ? 'Trend Pendapatan Harian Poliklinik & Medis Vet'
                  : 'Trend Pendapatan Harian Klinik & Unit Bisnis Terpadu'}
              </h3>
              <p className="text-xs text-[#1B2A45]/70">
                {isPetshop
                  ? 'Visualisasi omzet harian 7 hari terakhir kategori Pakan, Pasir, Suplemen & Aksesoris dibanding minggu lalu'
                  : isClinic
                  ? 'Visualisasi omzet harian 7 hari terakhir Rawat Jalan, Bedah, Inpatient & Apotek/Lab dibanding minggu lalu'
                  : 'Visualisasi omzet harian 7 hari terakhir dibanding minggu lalu (Klinik, Grooming, Hotel, Pet Shop)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#F6F1E6] p-1 rounded-lg border border-[#E1D6BE]">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    chartType === 'line'
                      ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                      : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
                  }`}
                >
                  Grafik Garis
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    chartType === 'bar'
                      ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                      : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
                  }`}
                >
                  Grafik Batang
                </button>
              </div>
              <button
                onClick={() => setActiveModule('reports')}
                className="text-xs text-[#1B2A45] font-bold flex items-center gap-1 hover:underline"
              >
                Detail <ChevronRight className="w-3.5 h-3.5 text-[#1B2A45]" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={revenueData as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" opacity={0.4} />
                  <XAxis dataKey="day" stroke="#1B2A45" fontSize={11} />
                  <YAxis stroke="#1B2A45" fontSize={11} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />

                  {isPetshop ? (
                    <>
                      <Line type="monotone" dataKey="Pakan" stroke="#D97706" strokeWidth={2} name="Pakan Kucing/Anjing" />
                      <Line type="monotone" dataKey="Pasir" stroke="#1B2A45" strokeWidth={2} name="Pasir & Sanitasi" />
                      <Line type="monotone" dataKey="Suplemen" stroke="#059669" strokeWidth={2} name="Vitamin & Treats" />
                      <Line type="monotone" dataKey="Aksesoris" stroke="#6366F1" strokeWidth={2} name="Aksesoris & Mainan" />
                      <Line type="monotone" dataKey="Total" stroke="#B8905A" strokeWidth={3} activeDot={{ r: 6 }} name="Total Minggu Ini" />
                      <Line type="monotone" dataKey="MingguLalu" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" activeDot={{ r: 5 }} name="Total Minggu Lalu" />
                    </>
                  ) : isClinic ? (
                    <>
                      <Line type="monotone" dataKey="RawatJalan" stroke="#1B2A45" strokeWidth={2} name="Rawat Jalan & Poli" />
                      <Line type="monotone" dataKey="Bedah" stroke="#B8905A" strokeWidth={2} name="Tindakan Bedah" />
                      <Line type="monotone" dataKey="Inpatient" stroke="#101A2C" strokeWidth={2} name="Rawat Inap & ICU" />
                      <Line type="monotone" dataKey="ApotekLab" stroke="#059669" strokeWidth={2} name="Apotek & Lab" />
                      <Line type="monotone" dataKey="Total" stroke="#D97706" strokeWidth={3} activeDot={{ r: 6 }} name="Total Minggu Ini" />
                      <Line type="monotone" dataKey="MingguLalu" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" activeDot={{ r: 5 }} name="Total Minggu Lalu" />
                    </>
                  ) : (
                    <>
                      <Line type="monotone" dataKey="Klinik" stroke="#1B2A45" strokeWidth={2} name="Klinik Medis" />
                      <Line type="monotone" dataKey="Grooming" stroke="#90A4AE" strokeWidth={2} name="Grooming" />
                      <Line type="monotone" dataKey="Hotel" stroke="#101A2C" strokeWidth={2} name="Pet Hotel" />
                      <Line type="monotone" dataKey="PetShop" stroke="#3B5035" strokeWidth={2} name="Pet Shop" />
                      <Line type="monotone" dataKey="Total" stroke="#D97706" strokeWidth={3} activeDot={{ r: 6 }} name="Total Minggu Ini" />
                      <Line type="monotone" dataKey="MingguLalu" stroke="#64748B" strokeWidth={2} strokeDasharray="4 4" activeDot={{ r: 5 }} name="Total Minggu Lalu" />
                    </>
                  )}
                </LineChart>
              ) : (
                <BarChart data={revenueData as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" opacity={0.4} />
                  <XAxis dataKey="day" stroke="#1B2A45" fontSize={11} />
                  <YAxis stroke="#1B2A45" fontSize={11} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />

                  {isPetshop ? (
                    <>
                      <Bar dataKey="Pakan" stackId="a" fill="#D97706" name="Pakan Kucing/Anjing" />
                      <Bar dataKey="Pasir" stackId="a" fill="#1B2A45" name="Pasir & Sanitasi" />
                      <Bar dataKey="Suplemen" stackId="a" fill="#059669" name="Vitamin & Treats" />
                      <Bar dataKey="Aksesoris" stackId="a" fill="#6366F1" name="Aksesoris & Mainan" />
                    </>
                  ) : isClinic ? (
                    <>
                      <Bar dataKey="RawatJalan" stackId="a" fill="#1B2A45" name="Rawat Jalan & Poli" />
                      <Bar dataKey="Bedah" stackId="a" fill="#B8905A" name="Tindakan Bedah" />
                      <Bar dataKey="Inpatient" stackId="a" fill="#101A2C" name="Rawat Inap & ICU" />
                      <Bar dataKey="ApotekLab" stackId="a" fill="#059669" name="Apotek & Lab" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="Klinik" stackId="a" fill="#1B2A45" name="Klinik Medis" />
                      <Bar dataKey="Grooming" stackId="a" fill="#E1D6BE" name="Grooming" />
                      <Bar dataKey="Hotel" stackId="a" fill="#101A2C" name="Pet Hotel" />
                      <Bar dataKey="PetShop" stackId="a" fill="#3B5035" name="Pet Shop" />
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Donut & Alerts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Donut Chart */}
          <div className="bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3">
            <h3 className="font-bold text-sm text-[#1B2A45]">
              {isPetshop
                ? 'Distribusi Kategori Penjualan Toko'
                : isClinic
                ? 'Distribusi Omzet Layanan Medis'
                : 'Distribusi Omzet Unit Bisnis'}
            </h3>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value">
                    {pieData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[#1B2A45] font-semibold truncate">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent Alerts Card */}
          <div className="bg-[#F6F1E6] p-4 rounded-xl border border-[#E1D6BE] hover:border-[#1B2A45]/30 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 space-y-3">
            <h4 className="font-bold text-xs text-[#1B2A45] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#1B2A45]" />
              {isPetshop
                ? 'Peringatan Stok Toko & Order Supplier'
                : isClinic
                ? 'Peringatan Farmasi Medis & Jadwal Vaksin'
                : 'Peringatan Stok & Vaksin Perlu Perhatian'}
            </h4>

            {isPetshop ? (
              <div className="space-y-2 text-xs text-[#1B2A45]">
                {lowStockRetailItems.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-700">
                      ⚠️ {lowStockRetailItems.length} SKU Toko di Bawah Stok Minimum:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {lowStockRetailItems.slice(0, 3).map((s) => (
                        <li key={s.id}>
                          {s.name} (Sisa {s.stock} {s.unit || 'pcs'} - Min: {s.minStock})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-[#3B5035] font-semibold">Semua stok barang retail dalam level optimal.</p>
                )}

                <div className="pt-2 border-t border-[#E1D6BE] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#1B2A45]/80">Status Purchase Order:</span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    {pendingOrdersCount} PO Menunggu Kirim
                  </span>
                </div>
              </div>
            ) : isClinic ? (
              <div className="space-y-2 text-xs text-[#1B2A45]">
                {lowStockDrugs.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-700">⚠️ {lowStockDrugs.length} Obat Stok Kritis/Menipis:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {lowStockDrugs.slice(0, 3).map((d) => (
                        <li key={d.id}>
                          {d.name} (Sisa {d.stock} {d.unit})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-[#3B5035] font-semibold">Stok obat & apotek dalam batas aman.</p>
                )}

                {dueVaccines.length > 0 && (
                  <div className="pt-2 border-t border-[#E1D6BE]">
                    <p className="font-semibold text-amber-800">
                      💉 {dueVaccines.length} Vaksinasi Jatuh Tempo / Terlambat
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[#1B2A45]">
                {lowStockDrugs.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-semibold">⚠️ {lowStockDrugs.length} Obat & Barang Stok Kritis:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {lowStockDrugs.slice(0, 3).map((d) => (
                        <li key={d.id}>
                          {d.name} (Sisa {d.stock} {d.unit})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-[#3B5035] font-semibold">Stok obat & apotek dalam batas aman.</p>
                )}

                {dueVaccines.length > 0 && (
                  <div className="pt-2 border-t border-[#E1D6BE]">
                    <p className="font-semibold">💉 {dueVaccines.length} Vaksinasi Jatuh Tempo / Terlambat</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PREDICTIVE TRAFFIC & BUSY HOURS GROWTH FORECASTER WIDGET (RECHARTS)       */}
      {/* ========================================================================= */}
      <PredictiveTrafficGrowthWidget setActiveModule={setActiveModule} />

      {/* ========================================================================= */}
      {/* PREDICTIVE INVENTORY WIDGET: 7-DAY CRITICAL SUPPLIES RUNOUT ALERT         */}
      {/* ========================================================================= */}
      <PredictiveInventoryWidget setActiveModule={setActiveModule} />

      {/* Staff Shift Overview Widget - Adaptive for Petshop vs Clinic vs Petcare */}
      <div className="bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1D6BE]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1B2A45] text-[#FFFDF9] rounded-lg shadow-xs">
              {isPetshop ? <ShoppingCart className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1B2A45]">
                  {isPetshop ? 'Pet Shop Cashier & Store Shift Overview' : 'Doctor & Medical Shift Overview'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#1B2A45]/10 text-[#1B2A45] text-[10px] font-extrabold border border-[#1B2A45]/20">
                  {isPetshop
                    ? `${petshopStaffList.filter((s) => s.status !== 'Off Duty').length} Staff Toko Bertugas`
                    : `${staffShiftList.filter((s) => s.status !== 'Off Duty').length} Jaga Hari Ini`}
                </span>
              </div>
              <p className="text-xs text-[#1B2A45]/70">
                {isPetshop
                  ? 'Daftar kasir POS barcode, kepala gudang, merchandiser display rak & status aktivitas toko real-time'
                  : 'Daftar dokter & tenaga medis bertugas, lokasi ruangan, serta status aktivitas real-time'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isPetshop && (
              <div className="flex items-center bg-[#F6F1E6] p-1 rounded-lg border border-[#E1D6BE]">
                <button
                  onClick={() => setDoctorCategoryFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    doctorCategoryFilter === 'all'
                      ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                      : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
                  }`}
                >
                  Semua Tim
                </button>
                <button
                  onClick={() => setDoctorCategoryFilter('dokter')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    doctorCategoryFilter === 'dokter'
                      ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                      : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
                  }`}
                >
                  Dokter Hewan
                </button>
                <button
                  onClick={() => setDoctorCategoryFilter('paramedik')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    doctorCategoryFilter === 'paramedik'
                      ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                      : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
                  }`}
                >
                  Paramedik & Groomer
                </button>
              </div>
            )}

            {/* Hide Off-Duty Toggle Button */}
            <button
              onClick={() => setHideOffDuty(!hideOffDuty)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                hideOffDuty
                  ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45] shadow-2xs'
                  : 'bg-white text-[#1B2A45]/80 border-[#E1D6BE] hover:text-[#1B2A45] hover:bg-[#F6F1E6]'
              }`}
              title="Sembunyikan staff dengan status Off-Duty"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{hideOffDuty ? 'Sembunyikan Off-Duty: ON' : 'Sembunyikan Off-Duty'}</span>
            </button>

            <button
              onClick={() => setActiveModule('masterData')}
              className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E5E7EB] text-[#1B2A45] border border-[#E1D6BE] rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              Kelola Jadwal →
            </button>
          </div>
        </div>

        {/* Quick Shift Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
          <div className="bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]/60 flex items-center justify-between">
            <span className="text-[#1B2A45]/70 font-semibold">Tersedia (Ready)</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] border border-emerald-300">
              {isPetshop
                ? petshopStaffList.filter((s) => s.status === 'Available').length
                : staffShiftList.filter((s) => s.status === 'Available').length} Staff
            </span>
          </div>
          <div className="bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]/60 flex items-center justify-between">
            <span className="text-[#1B2A45]/70 font-semibold">
              {isPetshop ? 'Melayani Kasir POS' : 'Sedang Operasi'}
            </span>
            <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px] border border-rose-300">
              {isPetshop
                ? petshopStaffList.filter((s) => s.status === 'In Surgery' || s.status === 'In Consultation').length
                : staffShiftList.filter((s) => s.status === 'In Surgery').length} Staff
            </span>
          </div>
          <div className="bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]/60 flex items-center justify-between">
            <span className="text-[#1B2A45]/70 font-semibold">
              {isPetshop ? 'Restock / Opname' : 'Konsultasi / Tindakan'}
            </span>
            <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] border border-amber-300">
              {isPetshop
                ? 1
                : staffShiftList.filter((s) => s.status === 'In Consultation').length} Staff
            </span>
          </div>
          <div className="bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]/60 flex items-center justify-between">
            <span className="text-[#1B2A45]/70 font-semibold">Istirahat / Off</span>
            <span className="font-extrabold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full text-[11px] border border-slate-300">
              {isPetshop
                ? petshopStaffList.filter((s) => s.status === 'On Break' || s.status === 'Off Duty').length
                : staffShiftList.filter((s) => s.status === 'On Break' || s.status === 'Off Duty').length} Staff
            </span>
          </div>
        </div>

        {/* Shift Roster Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {(() => {
            const currentList = isPetshop ? petshopStaffList : staffShiftList;
            const filteredList = currentList
              .filter((item) => isPetshop || doctorCategoryFilter === 'all' || item.roleType === doctorCategoryFilter)
              .filter((item) => !hideOffDuty || item.status !== 'Off Duty');

            if (filteredList.length === 0) {
              return (
                <div className="col-span-full p-8 text-center bg-[#F6F1E6] rounded-xl border border-dashed border-[#E1D6BE] text-[#1B2A45]/60 space-y-1.5">
                  <EyeOff className="w-6 h-6 mx-auto text-[#1B2A45]/40" />
                  <p className="font-bold text-xs text-[#1B2A45]">Tidak ada staff bertugas yang sesuai dengan filter saat ini.</p>
                  <p className="text-[11px] text-[#1B2A45]/70">Matikan toggle 'Sembunyikan Off-Duty' atau ubah kategori tim di atas.</p>
                </div>
              );
            }

            return filteredList.map((staff) => {
              const statusConfig = {
                'Available': {
                  label: 'Tersedia (Ready)',
                  badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                  dotClass: 'bg-emerald-500'
                },
                'In Surgery': {
                  label: isPetshop ? 'Melayani Kasir Aktif' : 'Sedang Operasi (In Surgery)',
                  badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
                  dotClass: 'bg-rose-600'
                },
                'In Consultation': {
                  label: isPetshop ? 'Restock / Opname' : 'Konsultasi Pasien',
                  badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
                  dotClass: 'bg-amber-500'
                },
                'On Break': {
                  label: 'Istirahat (On Break)',
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                  dotClass: 'bg-slate-400'
                },
                'Off Duty': {
                  label: 'Selesai Shift (Off)',
                  badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
                  dotClass: 'bg-gray-400'
                }
              }[staff.status];

              return (
                <div
                  key={staff.id}
                  className="p-3.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] hover:border-[#1B2A45]/50 hover:shadow-sm hover:-translate-y-1 transition-all duration-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header with Avatar & Live Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#1B2A45]"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusConfig.dotClass}`}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#1B2A45] leading-snug">{staff.name}</h4>
                          <p className="text-[10px] text-[#1B2A45]/70 font-semibold">{staff.title}</p>
                        </div>
                      </div>
                    </div>

                    {/* Department & Shift Info */}
                    <div className="space-y-1 text-[11px] bg-white p-2.5 rounded-lg border border-[#E1D6BE]/60">
                      <div className="flex items-center justify-between text-[#1B2A45]">
                        <span className="text-[#1B2A45]/60 font-medium">Departemen:</span>
                        <span className="font-bold">{staff.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#1B2A45]">
                        <span className="text-[#1B2A45]/60 font-medium">Shift Jaga:</span>
                        <span className="font-bold">{staff.shiftHours}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#1B2A45]">
                        <span className="text-[#1B2A45]/60 font-medium">Lokasi:</span>
                        <span className="font-bold text-[#1B2A45]">{staff.location}</span>
                      </div>
                      {staff.currentPatient && staff.currentPatient !== '-' && (
                        <div className="flex items-center justify-between text-[#1B2A45] pt-1 border-t border-[#E1D6BE]/40">
                          <span className="text-[#1B2A45]/60 font-medium">
                            {isPetshop ? 'Transaksi:' : 'Pasien Aktif:'}
                          </span>
                          <span className="font-extrabold text-[#1B2A45] truncate max-w-[120px]">
                            {staff.currentPatient}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Quick Toggle */}
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#E1D6BE]/40">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusConfig.badgeClass}`}>
                      ● {statusConfig.label}
                    </span>

                    <select
                      value={staff.status}
                      onChange={(e) => updateStaffStatus(staff.id, e.target.value as StaffDutyStatus)}
                      className="text-[10px] font-bold bg-white text-[#1B2A45] border border-[#E1D6BE] rounded-md px-1.5 py-1 focus:outline-none focus:border-[#1B2A45] cursor-pointer"
                    >
                      <option value="Available">Tersedia</option>
                      <option value="In Surgery">{isPetshop ? 'Layani Kasir' : 'Sedang Operasi'}</option>
                      <option value="In Consultation">{isPetshop ? 'Restock Barang' : 'Konsultasi'}</option>
                      <option value="On Break">Istirahat</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SMART PATIENT CHECK-IN (QR CODE / PASIEN LAMA) HUB                       */}
      {/* ========================================================================= */}
      <SmartPatientCheckInCard setActiveModule={setActiveModule} />

      {/* ========================================================================= */}
      {/* RECENT PATIENT HISTORY CARD: LAST 5 TREATED PATIENTS & DIRECT EMR ACCESS  */}
      {/* ========================================================================= */}
      <RecentPatientHistoryCard setActiveModule={setActiveModule} />

      {/* ========================================================================= */}
      {/* UPCOMING APPOINTMENTS & DRAG-AND-DROP RESCHEDULER WIDGET                  */}
      {/* ========================================================================= */}
      <UpcomingAppointmentsScheduler setActiveModule={setActiveModule} />

      {/* ========================================================================= */}
      {/* REDESIGNED SECTION: KALKULATOR DOSIS, CCTV MONITOR, DAN LAYAR ANTRIAN TV */}
      {/* CLEAR, SIMPLE, INFORMATIVE, & PROFESSIONAL VETERINARY ERP UTILITY HUB     */}
      {/* ========================================================================= */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-md overflow-hidden space-y-0 transition-all duration-200">
        {/* Section Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1B2A45] via-[#16233B] to-[#101A2C] text-[#FFFDF9] border-b border-[#B8905A]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-bold shadow-sm border border-amber-300/30 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#FFFDF9] font-display tracking-tight">
                  Pusat Utilitas Klinis & Pemantauan Operasional
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/20 text-[#D9B98A] border border-[#B8905A]/40 text-[10px] font-black uppercase">
                  Vet Hub Real-Time
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE] mt-0.5">
                Kalkulator dosis posologi Plumb's Vet, live surveillance CCTV multi-kandang & layar antrian TV digital.
              </p>
            </div>
          </div>

          {/* Quick Header Status Indicators */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/15 flex items-center gap-1.5 font-medium">
              <Pill className="w-3.5 h-3.5 text-[#D9B98A]" />
              <span>8 Protokol Obat</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/15 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4 CCTV Online</span>
            </span>
            <button
              onClick={() => setShowFullQueueModal(true)}
              className="px-3 py-1 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Buka Monitor TV Ruang Tunggu Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>TV Antrian Layar Penuh</span>
            </button>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <div className="bg-[#152238] px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto border-b border-white/10">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSelectTab('kalkulator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeUtilityTab === 'kalkulator'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm font-black'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>1. Kalkulator Dosis Obat</span>
            </button>

            <button
              onClick={() => handleSelectTab('cctv')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeUtilityTab === 'cctv'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm font-black'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>2. CCTV Monitor Kandang</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1" />
            </button>

            <button
              onClick={() => handleSelectTab('queueTv')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeUtilityTab === 'queueTv'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm font-black'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>3. Layar Antrian TV</span>
              {currentWaitingVisits.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                  {currentWaitingVisits.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeUtilityTab === 'queueTv' && currentServingVisit && (
              <button
                onClick={() => playQueueChime(`A-${String(currentServingVisit.queueNo).padStart(2, '0')}`, currentServingVisit.petName)}
                disabled={isCallingAudio}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isCallingAudio
                    ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Bunyikan Chime Panggilan Suara"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#D9B98A]" />
                <span>{isCallingAudio ? 'Sedang Memanggil...' : 'Panggil Suara Chime'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-6 bg-[#FCFAF6]">
          {/* TAB 1: KALKULATOR DOSIS OBAT */}
          {activeUtilityTab === 'kalkulator' && (
            <div className="space-y-4 animate-fade-in">
              <DoseCalculator />
            </div>
          )}

          {/* TAB 2: CCTV MONITOR KANDANG */}
          {activeUtilityTab === 'cctv' && (
            <div className="space-y-4 animate-fade-in">
              <CctvMonitor />
            </div>
          )}

          {/* TAB 3: LAYAR ANTRIAN TV DIGITAL */}
          {activeUtilityTab === 'queueTv' && (
            <div className="space-y-5 animate-fade-in">
              {/* Header Info & Actions */}
              <div className="bg-[#1B2A45] p-4 sm:p-5 rounded-2xl text-[#FFFDF9] border border-[#B8905A]/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#FFFDF9]/10 text-[#D9B98A] rounded-xl border border-white/10">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#FFFDF9] font-display">
                        Layar Antrian TV & Panggilan Suara Otomatis
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Ruang Tunggu
                      </span>
                    </div>
                    <p className="text-xs text-[#E1D6BE] mt-0.5">
                      Sistem antrian terintegrasi dengan pemanggilan suara otomatis (Web Audio Chime + Text-to-Speech).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowFullQueueModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-[#B8905A] hover:from-amber-300 hover:to-[#9E7848] text-[#101A2C] rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-[#101A2C]" />
                    <span>Layar Penuh TV (Fullscreen Display)</span>
                  </button>
                </div>
              </div>

              {/* 3 Quick Summary Metric Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-xl border border-[#E1D6BE] shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#6B6656] block">Pasien Sedang Diperiksa</span>
                  <p className="text-base font-black text-[#1B2A45] mt-1 truncate">
                    {currentServingVisit ? `A-${String(currentServingVisit.queueNo).padStart(2, '0')} (${currentServingVisit.petName})` : 'Tidak ada pasien aktif'}
                  </p>
                  <span className="text-[11px] text-[#B8905A] font-bold block mt-0.5">
                    {currentServingVisit ? `${currentServingVisit.vetName || 'Dokter belum ditugaskan'} • Poli VET-1` : 'Standby'}
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-[#E1D6BE] shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#6B6656] block">Antrian Menunggu</span>
                  <p className="text-xl font-black text-amber-600 mt-1">
                    {currentWaitingVisits.length} Pasien
                  </p>
                  <span className="text-[11px] text-[#6B6656] block mt-0.5">
                    Estimasi rata-rata tunggu: ~10-15 menit/pasien
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-[#E1D6BE] shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#6B6656] block">Pasien Selesai Hari Ini</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    {(clinicVisits || []).filter((v) => v?.status === 'Selesai').length} Pasien
                  </p>
                  <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                    Pemeriksaan rampung & resep terbit
                  </span>
                </div>
              </div>

              {/* Main TV Queue Grid: Serving Hero + Next Waiting List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column: Now Calling / Serving Hero */}
                <div className="lg:col-span-7 bg-[#1B2A45] text-[#FFFDF9] rounded-2xl p-5 border border-[#B8905A]/40 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A] text-[#101A2C] text-[10px] font-black uppercase tracking-wider">
                        SEDANG DIPERIKSA / DIPANGGIL
                      </span>
                      <span className="text-xs text-[#E1D6BE]">Poli Medis VET-1</span>
                    </div>

                    <span className="text-[11px] text-amber-300 font-mono">
                      Status: Aktif di Ruang Periksa
                    </span>
                  </div>

                  {currentServingVisit ? (
                    <div className="space-y-4">
                      {/* Ticket Large Display */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div>
                          <span className="text-xs text-[#E1D6BE] uppercase font-bold tracking-wider">Nomor Antrian</span>
                          <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono tracking-tight">
                            A-{String(currentServingVisit.queueNo).padStart(2, '0')}
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <span className="text-xs text-[#E1D6BE] uppercase font-bold">Nama Pasien & Spesies</span>
                          <div className="text-lg sm:text-xl font-bold text-white">
                            {currentServingVisit.petName} <span className="text-xs text-amber-300 font-normal">({currentServingVisit.petSpecies})</span>
                          </div>
                          <p className="text-xs text-[#E1D6BE] mt-0.5">
                            Pemilik: <span className="text-white font-bold">{currentServingVisit.ownerName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-[10px] text-[#E1D6BE] uppercase block font-semibold">Dokter Pemeriksa</span>
                          <span className="font-bold text-white">{currentServingVisit.vetName || 'Belum ditugaskan'}</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-[10px] text-[#E1D6BE] uppercase block font-semibold">Keluhan Klinis</span>
                          <span className="font-bold text-amber-200">{currentServingVisit.complaint || 'Pemeriksaan Rutin'}</span>
                        </div>
                      </div>

                      {/* Action Button: Play Call Voice Announcement */}
                      <button
                        type="button"
                        onClick={() => playQueueChime(`A-${String(currentServingVisit.queueNo).padStart(2, '0')}`, currentServingVisit.petName)}
                        disabled={isCallingAudio}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border shadow-md transition-all cursor-pointer ${
                          isCallingAudio
                            ? 'bg-amber-400 text-[#101A2C] border-amber-300 animate-pulse'
                            : 'bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-amber-400 hover:to-[#B8905A] text-[#101A2C] border-amber-300/40'
                        }`}
                      >
                        <Volume2 className="w-5 h-5 text-[#101A2C]" />
                        <span>
                          {isCallingAudio
                            ? '📢 Mengumumkan ke Pengeras Suara TV...'
                            : `🔊 Panggil Pasien A-${String(currentServingVisit.queueNo).padStart(2, '0')} (${currentServingVisit.petName})`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#E1D6BE] space-y-2">
                      <Clock className="w-8 h-8 text-[#B8905A] mx-auto opacity-70" />
                      <p className="font-bold text-sm">Belum ada pasien yang sedang dipanggil saat ini.</p>
                      <p className="text-xs text-white/60">Antrian berikutnya akan otomatis tampil saat dokter memulai konsultasi.</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Next in Line Waiting List */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E1D6BE] shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#B8905A]" />
                      <h5 className="font-bold text-xs text-[#1B2A45]">
                        Antrian Menunggu Berikutnya ({currentWaitingVisits.length})
                      </h5>
                    </div>
                    <span className="text-[10px] text-[#6B6656] font-medium">Urutan Layanan</span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
                    {currentWaitingVisits.length > 0 ? (
                      currentWaitingVisits.map((visit, index) => (
                        <div
                          key={visit.id || index}
                          className="p-3 bg-[#FAF7F2] hover:bg-[#F3EDE2] rounded-xl border border-[#E1D6BE] flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1B2A45] text-amber-300 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-[#B8905A]/40 shadow-2xs">
                              A-{String(visit.queueNo).padStart(2, '0')}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[#1B2A45]">{visit.petName}</span>
                                <span className="text-[10px] text-[#6B6656]">({visit.petSpecies})</span>
                              </div>
                              <p className="text-[10px] text-[#6B6656] mt-0.5">
                                Pemilik: <span className="font-semibold text-[#1B2A45]">{visit.ownerName}</span> • {visit.complaint || 'Pemeriksaan'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => playQueueChime(`A-${String(visit.queueNo).padStart(2, '0')}`, visit.petName)}
                            className="p-2 bg-white hover:bg-[#B8905A] hover:text-[#101A2C] text-[#1B2A45] rounded-lg border border-[#E1D6BE] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="Panggil Antrian Ini"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[#6B6656] space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <p className="text-xs font-bold text-[#1B2A45]">Semua antrian telah terlayani</p>
                        <p className="text-[11px]">Ruang tunggu poliklinik saat ini sedang lowong.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E1D6BE]">
                    <button
                      onClick={() => setShowFullQueueModal(true)}
                      className="w-full py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#E1D6BE] transition-colors cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>Buka Monitor TV Ruang Tunggu Fullscreen</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Queue Display Modal */}
      {showFullQueueModal && (
        <QueueDisplay onClose={() => setShowFullQueueModal(false)} />
      )}

      {/* Live Operational Snapshot: Customized per Role Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {isPetshop ? (
          <>
            {/* Petshop POS Recent Transactions */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-600" /> Transaksi Kasir POS Hari Ini
                </h3>
                <button
                  onClick={() => setActiveModule('petShop')}
                  className="text-xs text-[#1B2A45] font-bold hover:underline flex items-center gap-1"
                >
                  Buka Kasir POS →
                </button>
              </div>

              <div className="overflow-x-auto">
                {recentPosInvoices.length === 0 ? (
                  <p className="text-center text-[#1B2A45]/60 py-6">Belum ada transaksi kasir hari ini.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E1D6BE] text-[#1B2A45] uppercase text-[10px] font-bold">
                        <th className="py-2">No. Struk</th>
                        <th className="py-2">Pelanggan</th>
                        <th className="py-2">Item Belanja Utama</th>
                        <th className="py-2">Kasir Bertugas</th>
                        <th className="py-2 text-right">Total Tagihan</th>
                        <th className="py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]/40">
                      {recentPosInvoices.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#F6F1E6]">
                          <td className="py-2.5 font-mono font-bold text-[#1B2A45]">{tx.invoiceNo}</td>
                          <td className="py-2.5">
                            <p className="font-semibold text-[#1B2A45]">{tx.customerName}</p>
                            <p className="text-[10px] text-[#1B2A45]/60">Metode: {tx.paymentMethod}</p>
                          </td>
                          <td className="py-2.5 text-[#1B2A45]/90 font-medium max-w-xs truncate">
                            {tx.items.map((it) => it.name).join(', ') || '-'}
                          </td>
                          <td className="py-2.5 text-[#1B2A45] font-semibold">{tx.cashierName}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-[#1B2A45]">
                            Rp {tx.totalAmount.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                tx.status === 'Lunas'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : tx.status === 'Batal'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Fast Moving & Reorder Status */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" /> Fast-Moving & Reorder
                </h3>
                <button
                  onClick={() => setActiveModule('inventory')}
                  className="text-xs text-[#1B2A45] font-bold hover:underline"
                >
                  Stok Opname
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Royal Canin Kitten 2kg', stock: 4, min: 10, demand: 'Tinggi', supplier: 'PT Petindo Jaya', urgency: 'Kritis' },
                  { name: 'Pasir Tofu Soya Cat 7L', stock: 7, min: 15, demand: 'Sangat Tinggi', supplier: 'CV Kucing Cantik', urgency: 'Perlu Order' },
                  { name: 'Inaba Churu Maguro Treats', stock: 12, min: 25, demand: 'Tinggi', supplier: 'PT Anugerah Fauna', urgency: 'Perlu Order' },
                  { name: 'Pro Plan Medium Adult 3kg', stock: 9, min: 10, demand: 'Sedang', supplier: 'PT Petindo Jaya', urgency: 'Aman' },
                  { name: 'Bravecto Dog Chewable', stock: 3, min: 8, demand: 'Tinggi', supplier: 'PT Medika Vet', urgency: 'Kritis' },
                ].map((item, idx) => {
                  const percent = Math.min(100, Math.round((item.stock / item.min) * 100));
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] hover:border-[#1B2A45]/40 hover:shadow-2xs transition-all duration-200 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1B2A45] truncate max-w-[180px]">{item.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            item.urgency === 'Kritis'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : item.urgency === 'Perlu Order'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </div>
                      <div className="w-full bg-[#E1D6BE]/50 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent <= 40 ? 'bg-rose-600' : percent <= 75 ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#1B2A45]/80">
                        <span>Sisa: <strong className="text-[#1B2A45]">{item.stock} pcs</strong> (Min: {item.min})</span>
                        <span>Supplier: {item.supplier}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Clinic Queue Snapshot */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1B2A45]" /> Antrian Klinik Hari Ini
                </h3>
                <button
                  onClick={() => setActiveModule('clinic')}
                  className="text-xs text-[#1B2A45] font-bold hover:underline"
                >
                  Kelola Antrian →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E1D6BE] text-[#1B2A45] uppercase text-[10px] font-bold">
                      <th className="py-2">No. Antrian</th>
                      <th className="py-2">Pasien / Pemilik</th>
                      <th className="py-2">Dokter</th>
                      <th className="py-2">Keluhan</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]/40">
                    {(clinicVisits || []).map((v) => (
                      <tr key={v.id} className="hover:bg-[#F6F1E6]">
                        <td className="py-2.5 font-bold text-[#1B2A45]">A-{String(v.queueNo).padStart(2, '0')}</td>
                        <td className="py-2.5">
                          <p className="font-semibold text-[#1B2A45]">{v.petName} ({v.petSpecies})</p>
                          <p className="text-[10px] text-[#1B2A45]/70">{v.customerName}</p>
                        </td>
                        <td className="py-2.5 text-[#1B2A45] font-medium">{v.doctorName}</td>
                        <td className="py-2.5 text-[#1B2A45]/80 max-w-xs truncate">{v.complaint}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'Selesai'
                                ? 'bg-[#E1D6BE] text-[#1B2A45]'
                                : v.status === 'Sedang Diperiksa'
                                ? 'bg-[#1B2A45] text-[#FFFDF9]'
                                : 'bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE]'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Care Plan Status */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E1D6BE] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45]">Care Plan Aktif</h3>
                <button
                  onClick={() => setActiveModule('carePlan')}
                  className="text-xs text-[#1B2A45] font-bold hover:underline"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="space-y-3">
                {(carePlans || []).map((cp) => {
                  const tasks = cp?.tasks || [];
                  const completedCount = tasks.filter((t) => t?.isCompleted).length;
                  const percent = Math.round((completedCount / (tasks.length || 1)) * 100);

                  return (
                    <div key={cp.id} className="p-3 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] hover:border-[#1B2A45]/40 hover:shadow-2xs hover:-translate-y-0.5 transition-all duration-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1B2A45]">{cp.petName} - {cp.title}</span>
                        <span className="text-[#1B2A45] font-bold">{percent}%</span>
                      </div>
                      <div className="w-full bg-[#E1D6BE]/40 rounded-full h-2 overflow-hidden">
                        <div className="bg-[#1B2A45] h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="text-[10px] text-[#1B2A45]/70">Diagnosis: {cp.diagnosis}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Smart Patient Check-in Modal */}
      <SmartPatientCheckInModal
        isOpen={showSmartCheckInModal}
        onClose={() => setShowSmartCheckInModal(false)}
        setActiveModule={setActiveModule}
      />
    </div>
  );
};
