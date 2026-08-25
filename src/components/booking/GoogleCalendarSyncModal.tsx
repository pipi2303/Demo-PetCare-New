import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  User,
  Sliders,
  X,
  Sparkles,
  Check,
  Layers,
  CalendarCheck,
  Radio,
  ArrowRight,
  LogOut,
  Info
} from 'lucide-react';
import { DoctorBooking, ClinicVisit, GoogleCalendarConfig, GoogleCalendarSyncLog, GoogleCalendarEventItem } from '../../types';
import {
  loadGoogleCalendarConfig,
  saveGoogleCalendarConfig,
  getStoredAccessToken,
  requestGoogleCalendarAuth,
  clearGoogleCalendarAuth,
  loadSyncLogs,
  batchSyncAllDoctorBookings,
  fetchGoogleCalendarEventsForDate
} from '../../utils/googleCalendar';
import { useToast } from '../../context/ToastContext';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorBookings: DoctorBooking[];
  clinicVisits?: ClinicVisit[];
  selectedDate?: string;
  onBookingsUpdated?: (updated: DoctorBooking[]) => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  doctorBookings,
  clinicVisits = [],
  selectedDate = new Date().toISOString().substring(0, 10),
  onBookingsUpdated
}) => {
  const { addToast } = useToast();
  const [config, setConfig] = useState<GoogleCalendarConfig>(loadGoogleCalendarConfig());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<GoogleCalendarSyncLog[]>([]);
  const [activeTab, setActiveTab] = useState<'sync' | 'events' | 'settings' | 'logs'>('sync');
  const [fetchedEvents, setFetchedEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const hasValidToken = !!getStoredAccessToken();

  useEffect(() => {
    if (isOpen) {
      const currentConfig = loadGoogleCalendarConfig();
      setConfig(currentConfig);
      setSyncLogs(loadSyncLogs());

      if (hasValidToken) {
        loadEvents(selectedDate);
      }
    }
  }, [isOpen, selectedDate, hasValidToken]);

  const loadEvents = async (dateStr: string) => {
    setIsLoadingEvents(true);
    try {
      const res = await fetchGoogleCalendarEventsForDate(dateStr);
      if (res.success) {
        setFetchedEvents(res.events);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    try {
      const res = await requestGoogleCalendarAuth(config.clientId);
      const updatedConfig = loadGoogleCalendarConfig();
      setConfig(updatedConfig);
      addToast(`Berhasil terhubung ke Google Calendar (${res.user?.email || 'Akun Google'})!`, 'success');
      loadEvents(selectedDate);
      setSyncLogs(loadSyncLogs());
    } catch (err: any) {
      addToast(`Koneksi Google Calendar gagal: ${err.message}`, 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    clearGoogleCalendarAuth();
    setConfig(loadGoogleCalendarConfig());
    setFetchedEvents([]);
    addToast('Koneksi Google Calendar telah diputus.', 'info');
  };

  const handleTriggerBulkSync = async () => {
    if (!hasValidToken) {
      addToast('Hubungkan akun Google Calendar terlebih dahulu.', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await batchSyncAllDoctorBookings(doctorBookings);
      if (onBookingsUpdated) {
        onBookingsUpdated(res.updatedBookings);
      }
      setSyncLogs(loadSyncLogs());
      loadEvents(selectedDate);
      addToast(
        `Sinkronisasi selesai! ${res.synced} jadwal dokter berhasil disinkronkan ke Google Calendar.${res.failed > 0 ? ` (${res.failed} tertunda)` : ''}`,
        'success'
      );
    } catch (err: any) {
      addToast(`Gagal sinkronisasi masal: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = () => {
    saveGoogleCalendarConfig(config);
    addToast('Pengaturan sinkronisasi Google Calendar disimpan.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] dark:bg-[#15233B] w-full max-w-3xl rounded-2xl shadow-2xl border border-[#E1D6BE] dark:border-[#B8905A]/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B2A45] via-[#243B61] to-[#1B2A45] p-5 text-white border-b border-[#E1D6BE]/20 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div className="p-3 rounded-2xl bg-white/15 border border-white/20 text-amber-300 shrink-0 shadow-inner">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Google Calendar Sync Hub
                </span>
                {config.isConnected && hasValidToken ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Terhubung: {config.userEmail}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Belum Terhubung
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black font-display text-white mt-1.5">
                Sinkronisasi Jadwal Dokter & Antrean ke Google Calendar
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Otomasi jadwal janji temu pasien, shift dokter, dan antrean poli langsung ke kalender Google dokter jaga.
              </p>
            </div>
          </div>

          {/* Navigation Subtabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'sync'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Pusat Sinkronisasi ({doctorBookings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'events'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Event Google Calendar Aktif ({fetchedEvents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-500" />
              <span>Pengaturan Otomasi</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Riwayat Sinkronisasi</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-[#22242B] dark:text-[#EDE6D6]">
          {/* TAB 1: SYNC CENTER */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Connection Status Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${config.isConnected && hasValidToken ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1B2A45] dark:text-[#FFFDF9]">
                      {config.isConnected && hasValidToken ? 'Akun Google Calendar Terhubung' : 'Google Calendar Belum Terhubung'}
                    </h4>
                    <p className="text-xs text-[#6B6656] dark:text-[#EDE6D6]/70 mt-0.5">
                      {config.isConnected && hasValidToken
                        ? `Sinkronisasi aktif ke ${config.userEmail || 'Akun Google'}. Jadwal dokter terupdate secara real-time.`
                        : 'Hubungkan akun Google dokter atau resepsionis klinik untuk sinkronisasi 2 arah.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {config.isConnected && hasValidToken ? (
                    <>
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-white dark:bg-[#15233B] hover:bg-[#FAF7F2] text-[#1B2A45] dark:text-[#FFFDF9] border border-[#E1D6BE] dark:border-[#B8905A]/40 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        <span>Buka Google Calendar</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold border border-rose-200 dark:border-rose-900 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Putus
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isAuthenticating}
                      className="px-4 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] rounded-xl font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isAuthenticating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Menghubungkan Google...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>Hubungkan Google Calendar Sekarang</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Sync Actions & Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] dark:border-[#B8905A]/30 space-y-1">
                  <span className="text-[11px] font-semibold text-[#6B6656] dark:text-[#EDE6D6]/70">Total Jadwal Booking</span>
                  <div className="text-2xl font-black text-[#1B2A45] dark:text-[#FFFDF9]">
                    {doctorBookings.length}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">Semua dokter jaga</span>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] dark:border-[#B8905A]/30 space-y-1">
                  <span className="text-[11px] font-semibold text-[#6B6656] dark:text-[#EDE6D6]/70">Jadwal Tanggal Ini ({selectedDate})</span>
                  <div className="text-2xl font-black text-[#1B2A45] dark:text-[#FFFDF9]">
                    {doctorBookings.filter((b) => b.date === selectedDate).length}
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold">Siap sinkron otomatis</span>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] dark:border-[#B8905A]/30 space-y-1">
                  <span className="text-[11px] font-semibold text-[#6B6656] dark:text-[#EDE6D6]/70">Status Sinkronisasi Terakhir</span>
                  <div className="text-xs font-bold text-[#1B2A45] dark:text-[#FFFDF9] truncate">
                    {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString('id-ID') : 'Belum pernah'}
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">Auto-sync 2 arah aktif</span>
                </div>
              </div>

              {/* Booking List with Sync Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-[#B8905A]" /> Daftar Jadwal Pasien & Status Google Calendar
                  </h4>
                  <button
                    type="button"
                    onClick={handleTriggerBulkSync}
                    disabled={isSyncing || !hasValidToken}
                    className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua Sekarang'}</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-[#1B2A45] rounded-xl border border-[#E1D6BE] dark:border-[#B8905A]/30 divide-y divide-[#E1D6BE]/50 overflow-hidden shadow-2xs">
                  {doctorBookings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6B6656]">Belum ada jadwal booking dokter.</div>
                  ) : (
                    doctorBookings.map((b) => (
                      <div key={b.id} className="p-3 flex items-center justify-between gap-3 hover:bg-[#FAF7F2] dark:hover:bg-[#101A2C]/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F6F1E6] dark:bg-[#101A2C] border border-[#E1D6BE] flex flex-col items-center justify-center text-center font-bold">
                            <span className="text-[10px] text-[#B8905A] leading-tight">{b.timeSlot}</span>
                            <span className="text-[8px] text-[#6B6656]">WIB</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9]">{b.petName}</span>
                              <span className="text-[#6B6656] dark:text-[#EDE6D6]/70">({b.petSpecies}) • {b.customerName}</span>
                            </div>
                            <div className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/60 flex items-center gap-2 mt-0.5">
                              <span>👨‍⚕️ {b.doctorName}</span>
                              <span>•</span>
                              <span>📅 {b.date}</span>
                              {b.complaint && <span>• &quot;{b.complaint}&quot;</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {b.googleCalendarEventId ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tersinkron GCal
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 flex items-center gap-1">
                              <Radio className="w-3 h-3 text-amber-600" /> Siap Sinkron
                            </span>
                          )}

                          {b.googleCalendarHtmlLink && (
                            <a
                              href={b.googleCalendarHtmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px]"
                              title="Buka di Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE GOOGLE CALENDAR EVENTS */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-blue-500" /> Event Google Calendar Hari Ini ({selectedDate})
                </h4>
                <button
                  type="button"
                  onClick={() => loadEvents(selectedDate)}
                  disabled={isLoadingEvents || !hasValidToken}
                  className="px-3 py-1 bg-white dark:bg-[#15233B] text-[#1B2A45] dark:text-[#FFFDF9] border border-[#E1D6BE] rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                  <span>Refresh Event</span>
                </button>
              </div>

              {!hasValidToken ? (
                <div className="p-8 text-center bg-white dark:bg-[#1B2A45] rounded-xl border border-[#E1D6BE] space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-bold text-sm text-[#1B2A45] dark:text-[#FFFDF9]">Google Calendar Belum Terhubung</p>
                  <p className="text-xs text-[#6B6656]">Hubungkan akun Google Calendar Anda di tab Pusat Sinkronisasi terlebih dahulu.</p>
                  <button
                    onClick={handleConnectGoogle}
                    className="px-4 py-2 bg-[#1B2A45] text-white font-bold rounded-xl text-xs"
                  >
                    Hubungkan Google Calendar
                  </button>
                </div>
              ) : fetchedEvents.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#1B2A45] rounded-xl border border-[#E1D6BE] text-xs text-[#6B6656]">
                  Tidak ada event luar yang bentrok di Google Calendar pada tanggal ini ({selectedDate}). Jadwal dokter tersedia penuh!
                </div>
              ) : (
                <div className="space-y-2">
                  {fetchedEvents.map((evt) => (
                    <div key={evt.id} className="p-3 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 flex items-start justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {evt.summary}
                        </span>
                        <div className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70 mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Sepanjang Hari'}
                            {' - '}
                            {evt.end?.dateTime ? new Date(evt.end.dateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Selesai'}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/60 mt-1 line-clamp-2 bg-[#FAF7F2] dark:bg-black/20 p-1.5 rounded">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" /> Buka
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTOMATION SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 shadow-2xs space-y-3">
                <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#B8905A]" /> Opsi Sinkronisasi Otomatis
                </h4>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] cursor-pointer">
                    <div>
                      <span className="font-bold text-xs text-[#1B2A45] dark:text-[#FFFDF9] block">Auto-Sync Saat Booking Baru Dibuat / Reschedule</span>
                      <span className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70">Otomatis buat & geser jadwal di Google Calendar saat kartu booking digeser di kalender</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoSyncBookings}
                      onChange={(e) => setConfig({ ...config, autoSyncBookings: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1B2A45]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] cursor-pointer">
                    <div>
                      <span className="font-bold text-xs text-[#1B2A45] dark:text-[#FFFDF9] block">Auto-Sync Antrean Poli & Status Kunjungan</span>
                      <span className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70">Perbarui event Google Calendar dengan nomor antrean dan status &quot;Sedang Diperiksa&quot; / &quot;Selesai&quot;</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoSyncClinicQueue}
                      onChange={(e) => setConfig({ ...config, autoSyncClinicQueue: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1B2A45]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] cursor-pointer">
                    <div>
                      <span className="font-bold text-xs text-[#1B2A45] dark:text-[#FFFDF9] block">Aktifkan Notifikasi & Reminder Google Calendar</span>
                      <span className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70">Kirimkan pop-up pemberitahuan 30 menit sebelum jadwal periksa dimulai</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.syncReminders}
                      onChange={(e) => setConfig({ ...config, syncReminders: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1B2A45]"
                    />
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" /> Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" /> Log Aktivitas Sinkronisasi Google Calendar
              </h4>
              <div className="bg-white dark:bg-[#1B2A45] rounded-xl border border-[#E1D6BE] dark:border-[#B8905A]/30 divide-y divide-[#E1D6BE]/50 max-h-72 overflow-y-auto">
                {syncLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6B6656]">Belum ada riwayat aktivitas sinkronisasi.</div>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                          </span>
                          <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9]">{log.referenceNo}</span>
                          <span className="text-[#6B6656] dark:text-[#EDE6D6]/70">({log.doctorName})</span>
                        </div>
                        <p className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/80 mt-0.5">{log.message}</p>
                      </div>
                      <span className="text-[10px] text-[#6B6656] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F6F1E6] dark:bg-[#101A2C] px-5 py-3.5 border-t border-[#E1D6BE] dark:border-[#B8905A]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#6B6656] dark:text-[#EDE6D6]/70">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Koneksi aman melalui Google Identity Services OAuth 2.0 (Token Client)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#15233B] text-[#1B2A45] dark:text-[#FFFDF9] font-bold border border-[#E1D6BE] rounded-xl text-xs hover:bg-[#FAF7F2] transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
