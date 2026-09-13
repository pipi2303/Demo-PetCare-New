import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Receipt,
  Smartphone,
  Printer,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Zap,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Percent,
  Sliders,
  QrCode,
  HardDrive,
  Copy,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  Camera,
  CalendarCheck,
  Calendar,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { CloudBackupModule } from './CloudBackupModule';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { GoogleCalendarSyncModal } from '../booking/GoogleCalendarSyncModal';
import {
  loadGoogleCalendarConfig,
  saveGoogleCalendarConfig,
  getStoredAccessToken,
  requestGoogleCalendarAuth,
  clearGoogleCalendarAuth
} from '../../utils/googleCalendar';

export const SettingsModule: React.FC = () => {
  const { addToast } = useToast();
  const { branches = [], activeBranchId, doctorBookings = [], appSettings, updateAppSettings } = useData();

  const [activeTab, setActiveTab] = useState<'profile' | 'invoice' | 'whatsapp' | 'printer' | 'security' | 'backup' | 'google_calendar'>('profile');

  // Google Calendar Integration State in Settings
  const [gcalConfig, setGcalConfig] = useState(loadGoogleCalendarConfig());
  const [isGcalConnecting, setIsGcalConnecting] = useState(false);
  const [showGcalModal, setShowGcalModal] = useState(false);

  useEffect(() => {
    setGcalConfig(loadGoogleCalendarConfig());
  }, []);

  // Clinic Profile State — draft lokal diinisialisasi dari appSettings
  // (persisten di DataContext), disimpan permanen saat handleSaveProfile.
  // Sebelumnya semua field ini hardcode & handleSaveProfile cuma addToast
  // tanpa menulis ke mana pun — data "tersimpan" hilang begitu halaman
  // di-reload, dan tidak ada modul lain yang benar-benar membacanya.
  const [clinicName, setClinicName] = useState(appSettings.clinicName);
  const [slogan, setSlogan] = useState(appSettings.slogan);
  const [sipNumber, setSipNumber] = useState(appSettings.sipNumber);
  const [taxId, setTaxId] = useState(appSettings.taxId);
  const [clinicPhone, setClinicPhone] = useState(appSettings.clinicPhone);
  const [clinicEmail, setClinicEmail] = useState(appSettings.clinicEmail);
  const [clinicAddress, setClinicAddress] = useState(appSettings.clinicAddress);
  const [operationalHours, setOperationalHours] = useState(appSettings.operationalHours);

  // Invoice & POS Format State
  const [invoicePrefix, setInvoicePrefix] = useState(appSettings.invoicePrefix);
  const [invoiceHeader, setInvoiceHeader] = useState(appSettings.invoiceHeader);
  const [invoiceFooter, setInvoiceFooter] = useState(appSettings.invoiceFooter);
  const [taxRate, setTaxRate] = useState<number>(appSettings.taxRate);
  const [enableTax, setEnableTax] = useState<boolean>(appSettings.enableTax);
  const [serviceFeePercent, setServiceFeePercent] = useState<number>(appSettings.serviceFeePercent);
  const [roundingMode, setRoundingMode] = useState<'round' | 'floor' | 'ceil'>(appSettings.roundingMode);
  const [cashierAutoPrint, setCashierAutoPrint] = useState<boolean>(appSettings.cashierAutoPrint);

  // WhatsApp Gateway State
  const [waConnected, setWaConnected] = useState<boolean>(true);
  const [waSessionName, setWaSessionName] = useState(appSettings.waSessionName);
  const [waPhoneConnected, setWaPhoneConnected] = useState(appSettings.waPhoneConnected);
  const [waApiKey, setWaApiKey] = useState(appSettings.waApiKey);
  const [autoReminderHMinus1, setAutoReminderHMinus1] = useState<boolean>(appSettings.autoReminderHMinus1);
  const [autoVaccineAlert, setAutoVaccineAlert] = useState<boolean>(appSettings.autoVaccineAlert);
  const [autoSendInvoicePdf, setAutoSendInvoicePdf] = useState<boolean>(appSettings.autoSendInvoicePdf);

  // Printer Configuration State
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(appSettings.paperWidth);
  const [printerConnection, setPrinterConnection] = useState<'bluetooth' | 'usb' | 'network'>(appSettings.printerConnection);
  const [printerDeviceName, setPrinterDeviceName] = useState(appSettings.printerDeviceName);
  const [printerIpAddress, setPrinterIpAddress] = useState(appSettings.printerIpAddress);
  const [cutPaperAfterPrint, setCutPaperAfterPrint] = useState<boolean>(appSettings.cutPaperAfterPrint);

  // Lock Aplikasi Otomatis State
  const [appLockEnabled, setAppLockEnabled] = useState<boolean>(appSettings.appLockEnabled);
  const [appLockTimeoutMinutes, setAppLockTimeoutMinutes] = useState<number>(appSettings.appLockTimeoutMinutes);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({
      clinicName,
      slogan,
      sipNumber,
      taxId,
      clinicPhone,
      clinicEmail,
      clinicAddress,
      operationalHours
    });
    addToast('Profil klinik & identitas operasional berhasil diperbarui! Dipakai juga sebagai kop surat laporan PDF resmi.', 'success');
  };

  const handleSaveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({
      invoicePrefix,
      invoiceHeader,
      invoiceFooter,
      taxRate,
      enableTax,
      serviceFeePercent,
      roundingMode,
      cashierAutoPrint,
      // Field printer disimpan bersamaan karena tabnya sendiri tidak punya
      // tombol Simpan terpisah (lihat TAB 4) — perubahan di sana langsung
      // diterapkan ke draft lokal, ikut tersimpan saat tab lain disimpan.
      paperWidth,
      printerConnection,
      printerDeviceName,
      printerIpAddress,
      cutPaperAfterPrint
    });
    addToast('Pengaturan format invoice, PPN & kasir POS berhasil disimpan! Prefix & PPN langsung dipakai di Kasir Pet Shop.', 'success');
  };

  const handleSaveWaSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({
      waSessionName,
      waPhoneConnected,
      waApiKey,
      autoReminderHMinus1,
      autoVaccineAlert,
      autoSendInvoicePdf
    });
    addToast('Konfigurasi WhatsApp Gateway & pesan otomatis berhasil disimpan!', 'success');
  };

  const handleTestPrint = () => {
    addToast(`Mengirim data cetak uji coba ke printer ${printerDeviceName} (${paperWidth})...`, 'info');
    setTimeout(() => {
      addToast('Uji coba cetak struk thermal berhasil!', 'success');
    }, 1200);
  };

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({ appLockEnabled, appLockTimeoutMinutes });
    addToast(
      appLockEnabled
        ? `Lock Aplikasi Otomatis aktif — sesi akan terkunci setelah ${appLockTimeoutMinutes} menit tanpa aktivitas.`
        : 'Lock Aplikasi Otomatis dinonaktifkan.',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Settings}
        title="Pusat Pengaturan Sistem & Konfigurasi Klinik"
        description="Identitas kop surat, struk kasir, gateway pesan WhatsApp, printer thermal, dan parameter sistem."
        badges={[
          {
            label: `Cabang: ${branches.find((b) => b.id === activeBranchId)?.name || 'Klinik Utama'}`,
            variant: 'emerald',
            icon: Building2
          },
          { label: `PPN ${taxRate}%`, variant: 'amber' },
          { label: `${printerDeviceName} (${paperWidth})`, variant: 'blue' }
        ]}
        tabs={[
          { id: 'profile', label: 'Profil Klinik', icon: Building2 },
          { id: 'invoice', label: 'Format Struk & PPN', icon: Receipt },
          { id: 'whatsapp', label: 'WhatsApp Gateway', icon: Smartphone },
          { id: 'printer', label: 'Printer Thermal', icon: Printer },
          { id: 'security', label: 'Keamanan & Lock', icon: Lock },
          { id: 'google_calendar', label: 'Google Calendar Sync', icon: CalendarCheck },
          { id: 'backup', label: 'Cadangan & Cloud', icon: HardDrive }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: Clinic Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#B8905A]" />
                  Informasi Resmi & Legalitas Klinik
                </h3>
                <p className="text-xs text-[#6B6656] mt-0.5">
                  Informasi ini dicetak pada Kop Surat Rekam Medis, Sertifikat Vaksinasi, dan Invoice Resmi.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nama Rumah Sakit / Klinik</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Slogan / Motto Pelayanan</label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">No. Izin Operasional Klinik / SIP</label>
                  <input
                    type="text"
                    value={sipNumber}
                    onChange={(e) => setSipNumber(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">NPWP Badan Usaha</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nomor Telepon & Hotline Emergency</label>
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Email Resmi Layanan</label>
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Alamat Lengkap Kantor & Poliklinik</label>
                <textarea
                  rows={2}
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jam Operasional Pelayanan</label>
                <input
                  type="text"
                  value={operationalHours}
                  onChange={(e) => setOperationalHours(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4 text-center">
              <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider">Logo Resmi Klinik</h4>
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#101A2C] to-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-3xl shadow-inner border border-[#B8905A]/40">
                🐾
              </div>
              <p className="text-[11px] text-[#6B6656]">Format rekomendasi: PNG / SVG transparan resolusi minimal 512x512px.</p>
              <button
                onClick={() => addToast('Pilih file gambar logo baru dari perangkat Anda', 'info')}
                className="w-full py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-xl border border-[#E1D6BE] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#B8905A]" />
                <span>Unggah Logo Baru</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E1D6BE] space-y-2 text-xs text-[#6B6656]">
              <div className="flex items-center gap-2 font-bold text-[#1B2A45]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Status Keabsahan Dokumen Medis</span>
              </div>
              <p className="text-[11px]">
                Seluruh data identitas klinik ini otomatis dienkripsi dan dicantumkan dengan QR Code verifikasi pada setiap EMR dan e-Prescription.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Invoice & POS Format */}
      {activeTab === 'invoice' && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
            <div>
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#B8905A]" />
                Konfigurasi Struk Kasir POS, Pajak & Faktur
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pengaturan nomor seri invoice, tarif PPN, header/footer struk thermal, dan pembulatan transaksi kasir.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveInvoiceSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Prefix Kode Faktur</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono font-bold text-[#1B2A45]"
                />
                <span className="text-[10px] text-[#6B6656] mt-1 block">Contoh hasil: {invoicePrefix}-20260812-0042</span>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tarif Pajak PPN (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                  />
                  <span className="font-bold text-[#1B2A45]">%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="enableTax"
                    checked={enableTax}
                    onChange={(e) => setEnableTax(e.target.checked)}
                    className="rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                  />
                  <label htmlFor="enableTax" className="text-[11px] text-[#6B6656] cursor-pointer">
                    Kenakan PPN otomatis pada kasir
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Metode Pembulatan Kasir</label>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  <option value="round">Pembulatan Terdekat (Standard)</option>
                  <option value="floor">Pembulatan Ke Bawah (Down)</option>
                  <option value="ceil">Pembulatan Ke Atas (Up)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Header Teks Struk Cetak</label>
                <input
                  type="text"
                  value={invoiceHeader}
                  onChange={(e) => setInvoiceHeader(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Footer / Pesan Terima Kasih</label>
                <input
                  type="text"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
              <div>
                <h5 className="font-bold text-[#1B2A45]">Cetak Otomatis Struk Setelah Pembayaran Lunas</h5>
                <p className="text-[11px] text-[#6B6656]">Kirim perintah cetak langsung ke printer thermal segera setelah kasir menekan tombol Lunas.</p>
              </div>
              <input
                type="checkbox"
                checked={cashierAutoPrint}
                onChange={(e) => setCashierAutoPrint(e.target.checked)}
                className="w-5 h-5 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Format Invoice & Kasir</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: WhatsApp Gateway */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#B8905A]" />
                  Integrasi WhatsApp Gateway Bisnis
                </h3>
                <p className="text-xs text-[#6B6656] mt-0.5">
                  Pengiriman otomatis pesan pengingat booking, jadwal booster vaksin, dan bukti struk digital ke WhatsApp pemilik hewan.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveWaSettings} className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-900 text-xs">Status Gateway: TERHUBUNG (ONLINE)</h5>
                    <p className="text-[11px] text-emerald-700">Nomor: {waPhoneConnected} ({waSessionName})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addToast('Sesi WhatsApp Gateway aktif & sinkron.', 'success')}
                  className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-[11px] rounded-lg hover:bg-emerald-800"
                >
                  Cek Sinyal
                </button>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">API Key WhatsApp Gateway Provider</label>
                <input
                  type="password"
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-[#1B2A45]"
                />
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider">Otomasi Pengiriman Pesan:</h4>

                <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-[#1B2A45]">Pengingat Booking & Janji Temu (H-1)</h5>
                    <p className="text-[11px] text-[#6B6656]">Kirim pesan konfirmasi otomatis 24 jam sebelum jadwal konsultasi/grooming.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReminderHMinus1}
                    onChange={(e) => setAutoReminderHMinus1(e.target.checked)}
                    className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-[#1B2A45]">Notifikasi Booster Vaksin & Anti-Kutu</h5>
                    <p className="text-[11px] text-[#6B6656]">Kirim pengingat saat hewan mendekati tanggal jatuh tempo vaksinasi tahunan.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoVaccineAlert}
                    onChange={(e) => setAutoVaccineAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-[#1B2A45]">Kirim E-Receipt & Link PDF Tagihan Lunas</h5>
                    <p className="text-[11px] text-[#6B6656]">Kirim tautan struk digital segera setelah transaksi pembayaran kasir berhasil.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSendInvoicePdf}
                    onChange={(e) => setAutoSendInvoicePdf(e.target.checked)}
                    className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Konfigurasi WhatsApp</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
              <h4 className="font-bold text-xs text-[#1B2A45] font-display flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#B8905A]" />
                Pairing Perangkat WhatsApp Baru
              </h4>
              <p className="text-[11px] text-[#6B6656]">
                Scan QR Code berikut menggunakan aplikasi WhatsApp di HP Kasir / Front Office untuk menghubungkan session baru:
              </p>
              <div className="p-4 bg-white rounded-xl border border-[#E1D6BE] text-center space-y-2">
                <div className="w-36 h-36 mx-auto bg-gradient-to-br from-[#101A2C] to-[#1B2A45] rounded-xl p-2 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-lg p-2 flex items-center justify-center font-mono font-bold text-xs text-[#1B2A45]">
                    [ QR SCAN READY ]
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold block">Status: Session Terhubung (Live)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Thermal Printer */}
      {activeTab === 'printer' && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
            <div>
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#B8905A]" />
                Konfigurasi Printer Struk Thermal Kasir POS
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pengaturan protokol komunikasi Bluetooth, USB atau Network LAN ESC/POS untuk cetak struk dan label barcode.
              </p>
            </div>
            <button
              onClick={handleTestPrint}
              className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#D9B98A] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#D9B98A]" />
              <span>Uji Coba Cetak (Test Print)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Ukuran Kertas Thermal</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('58mm')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'bg-[#1B2A45] text-white border-[#B8905A]'
                        : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                    }`}
                  >
                    58mm (Kompak Mini)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80mm')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'bg-[#1B2A45] text-white border-[#B8905A]'
                        : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                    }`}
                  >
                    80mm (Standar Hospital POS)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tipe Koneksi Printer</label>
                <select
                  value={printerConnection}
                  onChange={(e) => setPrinterConnection(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  <option value="bluetooth">Bluetooth Wireless (ESC/POS)</option>
                  <option value="usb">USB Direct Cable</option>
                  <option value="network">Network IP / Ethernet LAN</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Perangkat / Bluetooth Device</label>
                <input
                  type="text"
                  value={printerDeviceName}
                  onChange={(e) => setPrinterDeviceName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              {printerConnection === 'network' && (
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Alamat IP Printer LAN</label>
                  <input
                    type="text"
                    value={printerIpAddress}
                    onChange={(e) => setPrinterIpAddress(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono text-[#1B2A45]"
                  />
                </div>
              )}

              <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-[#1B2A45]">Perintah Auto-Cutter Kertas</h5>
                  <p className="text-[11px] text-[#6B6656]">Kirim sinyal potong kertas otomatis setelah struk selesai dicetak.</p>
                </div>
                <input
                  type="checkbox"
                  checked={cutPaperAfterPrint}
                  onChange={(e) => setCutPaperAfterPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                />
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="bg-[#FAF7F0] rounded-2xl border border-[#E1D6BE] p-5 space-y-3">
              <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider text-center">
                Pratinjau Struk Kasir ({paperWidth})
              </h4>
              <div className="max-w-[280px] mx-auto bg-white p-4 rounded-xl shadow-xs border border-[#E1D6BE] font-mono text-[10px] space-y-2 text-[#1B2A45]">
                <div className="text-center border-b border-dashed border-gray-400 pb-2">
                  <p className="font-bold text-xs">{invoiceHeader}</p>
                  <p>{clinicAddress.slice(0, 35)}...</p>
                  <p>Telp: {clinicPhone}</p>
                </div>
                <div className="space-y-1 py-1 border-b border-dashed border-gray-400">
                  <div className="flex justify-between">
                    <span>No: {invoicePrefix}-001</span>
                    <span>13/08/26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Klien: Budi Santoso</span>
                    <span>Pasien: Mimi</span>
                  </div>
                </div>
                <div className="space-y-1 py-1 border-b border-dashed border-gray-400">
                  <div className="flex justify-between">
                    <span>1x Konsul Medis Umum</span>
                    <span>Rp 150.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Resep Amoxicillin</span>
                    <span>Rp 45.000</span>
                  </div>
                </div>
                <div className="space-y-1 font-bold pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp 195.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPN ({taxRate}%):</span>
                    <span>Rp {(195000 * (taxRate / 100)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-400">
                    <span>TOTAL:</span>
                    <span>Rp {(195000 * (1 + taxRate / 100)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="text-center pt-2 text-[9px] text-gray-600">
                  <p>{invoiceFooter}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Keamanan & Lock Aplikasi */}
      {activeTab === 'security' && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
            <div>
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#B8905A]" />
                Lock Aplikasi Otomatis
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Kunci sesi (layar PIN) setelah tidak ada aktivitas mouse/keyboard, supaya data pasien & transaksi
                tidak terbuka begitu saja saat komputer/kasir ditinggal sebentar.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSecuritySettings} className="space-y-4 text-xs">
            <div className="p-4 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
              <div>
                <h5 className="font-bold text-[#1B2A45]">Aktifkan Lock Otomatis Saat Idle</h5>
                <p className="text-[11px] text-[#6B6656]">
                  Kalau dimatikan, aplikasi tidak akan pernah terkunci otomatis (tombol "Kunci Sekarang" di menu
                  profil tetap bisa dipakai kapan saja).
                </p>
              </div>
              <input
                type="checkbox"
                checked={appLockEnabled}
                onChange={(e) => setAppLockEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
              />
            </div>

            <div className={appLockEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <label className="font-bold text-[#1B2A45] block mb-1">Durasi Tanpa Aktivitas Sebelum Terkunci</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[1, 5, 10, 15, 30].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setAppLockTimeoutMinutes(minutes)}
                    className={`py-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      appLockTimeoutMinutes === minutes
                        ? 'bg-[#1B2A45] text-white border-[#B8905A]'
                        : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                    }`}
                  >
                    {minutes} Menit
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p>
                Membuka kunci hanya menerima PIN milik akun yang sedang login — bukan logout, jadi pekerjaan/form
                yang sedang dibuka tidak hilang. Semua kejadian kunci/buka dicatat di Audit Log Sistem.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Keamanan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: Backup & Cloud Snapshots */}
      {activeTab === 'backup' && (
        <CloudBackupModule />
      )}

      {/* TAB 6: Google Calendar Sync & Workspace */}
      {activeTab === 'google_calendar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Connection & Auto-Sync Settings */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Connection Status */}
              <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#1B2A45] font-display">
                        Integrasi Google Calendar & Workspace
                      </h3>
                      <p className="text-xs text-[#6B6656]">
                        Sinkronisasi dua arah jadwal janji temu dokter & antrean klinik dengan Google Calendar.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                      gcalConfig.isConnected && getStoredAccessToken()
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${gcalConfig.isConnected && getStoredAccessToken() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {gcalConfig.isConnected && getStoredAccessToken() ? 'Terhubung Aktif' : 'Belum Terhubung'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-1">
                    <span className="text-[#6B6656] text-[11px] block">Akun Google Terhubung</span>
                    <strong className="text-[#1B2A45] font-mono text-xs block truncate">
                      {gcalConfig.connectedEmail || 'Belum ada akun terhubung'}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      OAuth2 Scope: calendar.events (Read/Write)
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-1">
                    <span className="text-[#6B6656] text-[11px] block">Kalender Target</span>
                    <strong className="text-[#1B2A45] font-mono text-xs block">
                      {gcalConfig.calendarId === 'primary' ? 'Kalender Utama (Primary)' : gcalConfig.calendarId}
                    </strong>
                    <span className="text-[10px] text-[#6B6656] block mt-1">
                      Zona Waktu: Asia/Jakarta (WIB)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {gcalConfig.isConnected && getStoredAccessToken() ? (
                      <button
                        type="button"
                        onClick={() => {
                          clearGoogleCalendarAuth();
                          setGcalConfig(loadGoogleCalendarConfig());
                          addToast('Akun Google Calendar berhasil diputus.', 'info');
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer transition-all"
                      >
                        Putuskan Koneksi
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isGcalConnecting}
                        onClick={async () => {
                          setIsGcalConnecting(true);
                          try {
                            const res = await requestGoogleCalendarAuth();
                            if (res.token) {
                              setGcalConfig(loadGoogleCalendarConfig());
                              addToast('Google Calendar berhasil dihubungkan!', 'success');
                            }
                          } catch (err: any) {
                            addToast(err?.message || 'Gagal menghubungkan Google Calendar', 'error');
                          } finally {
                            setIsGcalConnecting(false);
                          }
                        }}
                        className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-2"
                      >
                        <CalendarCheck className="w-4 h-4 text-amber-400" />
                        <span>{isGcalConnecting ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowGcalModal(true)}
                      className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE] font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>Buka Dashboard Sinkronisasi</span>
                    </button>
                  </div>

                  {gcalConfig.lastSyncTimestamp && (
                    <span className="text-[11px] text-[#6B6656]">
                      Sinkronisasi Terakhir:{' '}
                      <strong>{new Date(gcalConfig.lastSyncTimestamp).toLocaleTimeString('id-ID')}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Automatic Sync Automation Parameters */}
              <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
                  <h4 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Parameter Sinkronisasi Otomatis (Background Automation)
                  </h4>
                  <span className="text-xs text-[#6B6656]">Real-time Sync</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <label className="flex items-start gap-3 p-3 bg-[#F6F1E6]/70 hover:bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={gcalConfig.autoSyncBookings}
                      onChange={(e) => {
                        const updated = { ...gcalConfig, autoSyncBookings: e.target.checked };
                        setGcalConfig(updated);
                        saveGoogleCalendarConfig(updated);
                        addToast('Preferensi otomatis sinkronisasi booking dokter diperbarui.', 'success');
                      }}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <strong className="text-[#1B2A45] block text-xs">
                        Otomatis Sinkron Janji Temu Dokter (Doctor Booking Sync)
                      </strong>
                      <p className="text-[#6B6656] text-[11px] mt-0.5">
                        Setiap kali janji temu dokter baru dibuat, diubah slot waktunya (reschedule), atau dibatalkan, sistem akan langsung memperbarui agenda di Google Calendar dokter secara instan.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#F6F1E6]/70 hover:bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={gcalConfig.autoSyncClinicQueue}
                      onChange={(e) => {
                        const updated = { ...gcalConfig, autoSyncClinicQueue: e.target.checked };
                        setGcalConfig(updated);
                        saveGoogleCalendarConfig(updated);
                        addToast('Preferensi otomatis antrean klinik diperbarui.', 'success');
                      }}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <strong className="text-[#1B2A45] block text-xs">
                        Otomatis Sinkron Antrean Pemeriksaan Klinik (Live Clinic Queue Sync)
                      </strong>
                      <p className="text-[#6B6656] text-[11px] mt-0.5">
                        Membuat event blok waktu dinamis saat pasien masuk ruang periksa klinik, sehingga dokter mengetahui alokasi waktu pemeriksaan real-time.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#F6F1E6]/70 hover:bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={gcalConfig.syncReminders}
                      onChange={(e) => {
                        const updated = { ...gcalConfig, syncReminders: e.target.checked };
                        setGcalConfig(updated);
                        saveGoogleCalendarConfig(updated);
                        addToast('Pengingat pop-up & email Google Calendar diperbarui.', 'success');
                      }}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <strong className="text-[#1B2A45] block text-xs">
                        Kirimkan Google Notification Pop-up & Email Reminder
                      </strong>
                      <p className="text-[#6B6656] text-[11px] mt-0.5">
                        Menambahkan pengingat default 30 menit & 1 hari sebelum jadwal konsultasi dokter dimulai.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Col: Info & Quick Statistics */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-4">
                <h4 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Keamanan & Otorisasi Google
                </h4>
                <div className="space-y-2.5 text-xs text-[#6B6656]">
                  <p>
                    Aplikasi ini menggunakan <strong>Google Identity Services (GIS)</strong> dengan protokol OAuth 2.0 resmi dari Google Cloud Platform.
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Client OAuth Aman
                    </div>
                    <p className="text-[11px]">
                      Token otentikasi disimpan secara lokal dan aman di browser sesi kerja staf klinik.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E1D6BE] space-y-2 text-xs">
                  <span className="font-bold text-[#1B2A45] block">Statistik Booking Saat Ini:</span>
                  <div className="flex justify-between text-[#6B6656]">
                    <span>Total Janji Temu:</span>
                    <strong className="text-[#1B2A45]">{doctorBookings.length} Pasien</strong>
                  </div>
                  <div className="flex justify-between text-[#6B6656]">
                    <span>Tersinkron GCal:</span>
                    <strong className="text-emerald-700 font-bold">
                      {doctorBookings.filter((b) => b.googleCalendarEventId).length} Terpasang
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#6B6656]">
                    <span>Belum Tersinkron:</span>
                    <strong className="text-amber-700 font-bold">
                      {doctorBookings.filter((b) => !b.googleCalendarEventId && b.status !== 'Batal').length} Pending
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGcalModal(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-white font-bold text-xs rounded-xl shadow-2xs hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sinkronkan Semua Data Sekarang</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Mount */}
          <GoogleCalendarSyncModal
            isOpen={showGcalModal}
            onClose={() => {
              setShowGcalModal(false);
              setGcalConfig(loadGoogleCalendarConfig());
            }}
            doctorBookings={doctorBookings}
          />
        </div>
      )}
    </div>
  );
};
