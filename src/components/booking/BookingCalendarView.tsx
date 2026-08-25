import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  GripVertical,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Scissors,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRightLeft,
  Sparkles,
  CalendarCheck,
  Check,
  X,
  Layers,
  LayoutGrid,
  ListFilter,
  RefreshCw,
  Phone,
  Tag,
  AlertTriangle,
  MoveDown,
  Info,
  ExternalLink,
  Zap
} from 'lucide-react';
import * as Types from '../../types';
import { GoogleCalendarSyncModal } from './GoogleCalendarSyncModal';
import {
  syncDoctorBookingToGoogleCalendar,
  loadGoogleCalendarConfig,
  getStoredAccessToken,
  fetchGoogleCalendarEventsForDate
} from '../../utils/googleCalendar';

interface BookingCalendarViewProps {
  onCheckInToClinicQueue?: (booking: Types.DoctorBooking) => void;
  setActiveModule?: (module: string) => void;
}

// Default operating hours from 08:00 to 18:00 in 30-min intervals
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00'
];

export const BookingCalendarView: React.FC<BookingCalendarViewProps> = ({
  onCheckInToClinicQueue,
  setActiveModule
}) => {
  const {
    doctorBookings = [],
    customers = [],
    pets = [],
    addDoctorBooking,
    updateDoctorBooking,
    rescheduleDoctorBooking,
    updateDoctorBookingStatus,
    checkInDoctorBooking
  } = useData();

  const { addToast } = useToast();

  // Helper date shortcuts
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // View modes: 'matrix' (Doctor Columns), 'timeline' (Chronological single stream), 'compact'
  const [viewMode, setViewMode] = useState<'matrix' | 'timeline'>('matrix');

  // Filters & search
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUnscheduledTrayOpen, setIsUnscheduledTrayOpen] = useState<boolean>(true);

  // Active Drag State
  const [draggedBooking, setDraggedBooking] = useState<{
    id: string;
    bookingNo: string;
    petName: string;
    petSpecies: string;
    customerName: string;
    complaint: string;
    currentSlot: string;
    currentDate: string;
    doctorId?: string;
    doctorName?: string;
    isFromUnscheduled: boolean;
  } | null>(null);

  const [hoveredDropSlotKey, setHoveredDropSlotKey] = useState<string | null>(null); // e.g. "09:00_drh. Ananda Putri" or "09:00"

  // Quick Action Modal states
  const [showAddBookingModal, setShowAddBookingModal] = useState<boolean>(false);
  const [newBookingData, setNewBookingData] = useState({
    customerId: customers[0]?.id || '',
    petId: pets[0]?.id || '',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: todayStr,
    timeSlot: '09:00',
    complaint: 'Pemeriksaan kesehatan rutin & vaksinasi',
    isUnscheduled: false
  });

  // Reschedule / Detail Drawer
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Types.DoctorBooking | null>(null);
  const [showConflictModal, setShowConflictModal] = useState<{
    sourceBooking: Types.DoctorBooking;
    targetSlot: string;
    targetDoctorName: string;
    targetDoctorId: string;
    occupiedBooking?: Types.DoctorBooking;
  } | null>(null);

  // Doctor roster definition
  const DOCTOR_ROSTER = [
    { id: 'u2', name: 'drh. Ananda Putri', title: 'Poli Umum & Bedah Minor', avatarColor: 'from-amber-600 to-amber-800' },
    { id: 'e6', name: 'drh. Citra Prasetyo', title: 'Poli Feline & Eksotik', avatarColor: 'from-rose-600 to-rose-800' },
    { id: 'u1', name: 'drh. Hendrawan', title: 'Senior Vet & Ortopedi', avatarColor: 'from-indigo-600 to-indigo-800' },
    { id: 'u3', name: 'drh. Budi Setiawan', title: 'Spesialis Gigi & Kulit', avatarColor: 'from-teal-600 to-teal-800' }
  ];

  // Google Calendar Integration State
  const [showGCalModal, setShowGCalModal] = useState<boolean>(false);
  const [gcalConfig, setGcalConfig] = useState(loadGoogleCalendarConfig());
  const [gcalEvents, setGcalEvents] = useState<Types.GoogleCalendarEventItem[]>([]);
  const hasGCalToken = !!getStoredAccessToken();

  useEffect(() => {
    setGcalConfig(loadGoogleCalendarConfig());
    if (getStoredAccessToken()) {
      fetchGoogleCalendarEventsForDate(selectedDate).then((res) => {
        if (res.success) setGcalEvents(res.events);
      });
    }
  }, [selectedDate, showGCalModal]);

  // Sync single booking to Google Calendar helper
  const syncSingleBookingGCal = async (booking: Types.DoctorBooking) => {
    const token = getStoredAccessToken();
    if (!token) {
      setShowGCalModal(true);
      return;
    }
    const res = await syncDoctorBookingToGoogleCalendar(booking, token);
    if (res.success && res.eventId) {
      updateDoctorBooking(booking.id, {
        googleCalendarEventId: res.eventId,
        googleCalendarHtmlLink: res.htmlLink,
        googleCalendarSyncStatus: 'synced',
        lastSyncedAt: new Date().toISOString()
      });
      addToast(`📅 Jadwal ${booking.petName} (${booking.doctorName}) tersinkron ke Google Calendar!`, 'success');
    } else {
      addToast(`Sinkronisasi Google Calendar: ${res.error || 'Gagal'}`, 'warning');
    }
  };

  // Helper date navigation
  const handleDateOffset = (offset: number) => {
    try {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().substring(0, 10));
    } catch {
      setSelectedDate(todayStr);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Identify Unscheduled Bookings (no slot or explicitly unscheduled or slot is empty)
  const unscheduledBookings = useMemo(() => {
    return doctorBookings.filter((b) => {
      const hasNoSlot = !b.timeSlot || b.timeSlot.trim() === '' || b.timeSlot === '-' || b.timeSlot === 'Belum Ditentukan';
      const matchSearch = !searchQuery ||
        b.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bookingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.complaint.toLowerCase().includes(searchQuery.toLowerCase());
      return hasNoSlot && matchSearch && b.status !== 'Selesai' && b.status !== 'Batal';
    });
  }, [doctorBookings, searchQuery]);

  // Bookings specifically for the selected date with a valid time slot
  const scheduledBookingsForDate = useMemo(() => {
    return doctorBookings.filter((b) => {
      const hasSlot = b.timeSlot && b.timeSlot.trim() !== '' && b.timeSlot !== '-' && b.timeSlot !== 'Belum Ditentukan';
      const matchDate = b.date === selectedDate;
      const matchDoctor = selectedDoctorFilter === 'all' || (b.doctorName && b.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase()));
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch = !searchQuery ||
        b.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bookingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.complaint.toLowerCase().includes(searchQuery.toLowerCase());
      return hasSlot && matchDate && matchDoctor && matchStatus && matchSearch;
    });
  }, [doctorBookings, selectedDate, selectedDoctorFilter, statusFilter, searchQuery]);

  // Map of bookings by Slot and Doctor: key `${timeSlot}_${doctorName || 'default'}`
  const slotDoctorMap = useMemo(() => {
    const map: Record<string, Types.DoctorBooking[]> = {};
    scheduledBookingsForDate.forEach((b) => {
      const docKey = b.doctorName || 'drh. Ananda Putri';
      const key = `${b.timeSlot}_${docKey}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);

      // Also index by time slot for timeline view
      if (!map[b.timeSlot]) map[b.timeSlot] = [];
      map[b.timeSlot].push(b);
    });
    return map;
  }, [scheduledBookingsForDate]);

  // ---------------------------------------------------------------------------
  // DRAG AND DROP HANDLERS
  // ---------------------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, booking: Types.DoctorBooking, isFromUnscheduled: boolean) => {
    const payload = {
      id: booking.id,
      bookingNo: booking.bookingNo,
      petName: booking.petName,
      petSpecies: booking.petSpecies,
      customerName: booking.customerName,
      complaint: booking.complaint,
      currentSlot: booking.timeSlot || '',
      currentDate: booking.date || selectedDate,
      doctorId: booking.doctorId || '',
      doctorName: booking.doctorName || '',
      isFromUnscheduled
    };

    setDraggedBooking(payload);
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBooking(null);
    setHoveredDropSlotKey(null);
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredDropSlotKey !== slotKey) {
      setHoveredDropSlotKey(slotKey);
    }
  };

  const handleDragLeave = () => {
    setHoveredDropSlotKey(null);
  };

  // Drop into a specific Time Slot and Doctor column
  const handleDropToSlot = (
    e: React.DragEvent,
    targetSlot: string,
    targetDoctor: { id: string; name: string }
  ) => {
    e.preventDefault();
    setHoveredDropSlotKey(null);

    let droppedData = draggedBooking;
    if (!droppedData) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) droppedData = JSON.parse(raw);
      } catch (err) {
        console.error('Drag data parse error:', err);
      }
    }

    if (!droppedData) return;

    const sourceBookingId = droppedData.id;
    const existingBooking = doctorBookings.find((b) => b.id === sourceBookingId);
    if (!existingBooking) return;

    // Check if slot already has a booking with this doctor
    const key = `${targetSlot}_${targetDoctor.name}`;
    const occupiedBookings = slotDoctorMap[key] || [];

    if (occupiedBookings.length > 0 && occupiedBookings[0].id !== sourceBookingId) {
      // Slot conflict -> Open Conflict / Swap dialog
      setShowConflictModal({
        sourceBooking: existingBooking,
        targetSlot,
        targetDoctorName: targetDoctor.name,
        targetDoctorId: targetDoctor.id,
        occupiedBooking: occupiedBookings[0]
      });
      return;
    }

    // Execute scheduling
    rescheduleDoctorBooking(sourceBookingId, selectedDate, targetSlot, targetDoctor.id, targetDoctor.name);
    
    // If was waiting/batal, ensure active status
    if (existingBooking.status === 'Batal' || existingBooking.status === 'Menunggu') {
      updateDoctorBookingStatus(sourceBookingId, 'Terkonfirmasi');
    }

    // Auto-sync to Google Calendar if configured
    const token = getStoredAccessToken();
    const config = loadGoogleCalendarConfig();
    if (token && config.autoSyncBookings) {
      const updatedBooking: Types.DoctorBooking = {
        ...existingBooking,
        date: selectedDate,
        timeSlot: targetSlot,
        doctorId: targetDoctor.id,
        doctorName: targetDoctor.name,
        status: 'Terkonfirmasi'
      };
      syncDoctorBookingToGoogleCalendar(updatedBooking, token).then((res) => {
        if (res.success && res.eventId) {
          updateDoctorBooking(sourceBookingId, {
            googleCalendarEventId: res.eventId,
            googleCalendarHtmlLink: res.htmlLink,
            googleCalendarSyncStatus: 'synced',
            lastSyncedAt: new Date().toISOString()
          });
        }
      });
    }

    addToast(
      `✅ Berhasil menjadwalkan ${existingBooking.petName} ke jam ${targetSlot} bersama ${targetDoctor.name}!`,
      'success'
    );
    setDraggedBooking(null);
  };

  // Drop back into the Unscheduled Tray to unschedule an appointment
  const handleDropToUnscheduledTray = (e: React.DragEvent) => {
    e.preventDefault();
    let droppedData = draggedBooking;
    if (!droppedData) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) droppedData = JSON.parse(raw);
      } catch (err) {
        console.error('Drop error:', err);
      }
    }

    if (!droppedData) return;
    const sourceBookingId = droppedData.id;
    
    // Update booking to have empty slot
    updateDoctorBooking(sourceBookingId, {
      timeSlot: '',
      status: 'Menunggu'
    });

    addToast(`ℹ️ Booking pasien ${droppedData.petName} dipindahkan kembali ke antrean belum terjadwal.`, 'info');
    setDraggedBooking(null);
    setHoveredDropSlotKey(null);
  };

  // Handle Swap appointments
  const handleConfirmSwap = () => {
    if (!showConflictModal) return;
    const { sourceBooking, occupiedBooking, targetSlot, targetDoctorName, targetDoctorId } = showConflictModal;
    
    if (occupiedBooking) {
      // Swap slots
      const sourceOldSlot = sourceBooking.timeSlot || '09:00';
      const sourceOldDoctor = sourceBooking.doctorName || 'drh. Ananda Putri';
      const sourceOldDocId = sourceBooking.doctorId || 'u2';

      rescheduleDoctorBooking(sourceBooking.id, selectedDate, targetSlot, targetDoctorId, targetDoctorName);
      rescheduleDoctorBooking(occupiedBooking.id, selectedDate, sourceOldSlot, sourceOldDocId, sourceOldDoctor);

      addToast(
        `🔄 Sukses menukar jadwal antara ${sourceBooking.petName} (${targetSlot}) dan ${occupiedBooking.petName} (${sourceOldSlot})!`,
        'success'
      );
    } else {
      rescheduleDoctorBooking(sourceBooking.id, selectedDate, targetSlot, targetDoctorId, targetDoctorName);
      addToast(`✅ Berhasil menjadwalkan ${sourceBooking.petName} ke jam ${targetSlot}!`, 'success');
    }

    setShowConflictModal(null);
  };

  // Handle Double-Booking (Add alongside without swapping)
  const handleConfirmDoubleBooking = () => {
    if (!showConflictModal) return;
    const { sourceBooking, targetSlot, targetDoctorName, targetDoctorId } = showConflictModal;
    rescheduleDoctorBooking(sourceBooking.id, selectedDate, targetSlot, targetDoctorId, targetDoctorName);
    addToast(
      `⚠️ Dijadwalkan sebagai Double-Booking: ${sourceBooking.petName} di jam ${targetSlot} (${targetDoctorName})`,
      'info'
    );
    setShowConflictModal(null);
  };

  // Quick Check-in to Live Clinic Queue
  const handleQuickCheckIn = (booking: Types.DoctorBooking) => {
    checkInDoctorBooking(booking.id);
    if (onCheckInToClinicQueue) {
      onCheckInToClinicQueue(booking);
    }
    addToast(`🏥 Pasien ${booking.petName} (${booking.petSpecies}) berhasil check-in ke antrean klinik aktif!`, 'success');
  };

  // Submit New Booking
  const handleSaveNewBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === newBookingData.customerId) || customers[0];
    const pet = pets.find((p) => p.id === newBookingData.petId) || pets[0];
    const doc = DOCTOR_ROSTER.find((d) => d.id === newBookingData.doctorId) || DOCTOR_ROSTER[0];

    const created = addDoctorBooking({
      customerId: cust.id,
      customerName: cust.name,
      petId: pet.id,
      petName: pet.name,
      petSpecies: pet.species,
      doctorId: doc.id,
      doctorName: doc.name,
      date: newBookingData.date,
      timeSlot: newBookingData.isUnscheduled ? '' : newBookingData.timeSlot,
      status: newBookingData.isUnscheduled ? 'Menunggu' : 'Terkonfirmasi',
      complaint: newBookingData.complaint || 'Pemeriksaan kesehatan umum'
    });

    // Auto-sync to Google Calendar if scheduled
    const token = getStoredAccessToken();
    const config = loadGoogleCalendarConfig();
    if (token && config.autoSyncBookings && !newBookingData.isUnscheduled) {
      syncDoctorBookingToGoogleCalendar(created, token).then((res) => {
        if (res.success && res.eventId) {
          updateDoctorBooking(created.id, {
            googleCalendarEventId: res.eventId,
            googleCalendarHtmlLink: res.htmlLink,
            googleCalendarSyncStatus: 'synced',
            lastSyncedAt: new Date().toISOString()
          });
        }
      });
    }

    addToast(
      newBookingData.isUnscheduled
        ? `📥 Booking baru ${created.petName} disimpan di antrean belum terjadwal!`
        : `✅ Janji temu ${created.petName} (${created.timeSlot}) berhasil dibuat!`,
      'success'
    );
    setShowAddBookingModal(false);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL & FILTER BAR */}
      {/* ========================================================================= */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Date Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#F6F1E6] rounded-xl p-1 border border-[#E1D6BE]">
              <button
                type="button"
                onClick={() => handleDateOffset(-1)}
                className="p-1.5 hover:bg-[#FFFDF9] text-[#1B2A45] rounded-lg transition-all cursor-pointer"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-3 flex items-center gap-2 text-xs font-bold text-[#1B2A45]">
                <CalendarIcon className="w-4 h-4 text-[#B8905A]" />
                <span className="font-display font-black text-sm">{formatDateDisplay(selectedDate)}</span>
                {selectedDate === todayStr && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300">
                    Hari Ini
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDateOffset(1)}
                className="p-1.5 hover:bg-[#FFFDF9] text-[#1B2A45] rounded-lg transition-all cursor-pointer"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Date Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  selectedDate === todayStr
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'bg-[#F6F1E6] text-[#6B6656] hover:bg-[#E1D6BE]'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().substring(0, 10));
                }}
                className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-[#F6F1E6] text-[#6B6656] hover:bg-[#E1D6BE] transition-all"
              >
                Besok
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#F6F1E6] text-xs font-bold text-[#1B2A45] rounded-lg px-2.5 py-1.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] cursor-pointer"
              />
            </div>
          </div>

          {/* Right: View Mode & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Unscheduled Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsUnscheduledTrayOpen(!isUnscheduledTrayOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-2xs ${
                isUnscheduledTrayOpen
                  ? 'bg-amber-500/15 text-amber-900 border-amber-300'
                  : 'bg-[#F6F1E6] text-[#6B6656] border-[#E1D6BE] hover:bg-[#E1D6BE]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              <span>Belum Terjadwal</span>
              <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-black">
                {unscheduledBookings.length}
              </span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#F6F1E6] p-1 rounded-xl border border-[#E1D6BE]">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
                title="Matrix Kolom Dokter x Jam Slot"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Matrix Dokter</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
                title="Timeline Kronologis Slot"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Timeline Jam</span>
              </button>
            </div>

            {/* Google Calendar Sync Button */}
            <button
              type="button"
              onClick={() => setShowGCalModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                hasGCalToken && gcalConfig.isConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-white hover:bg-slate-50 text-[#1B2A45] border-[#E1D6BE]'
              }`}
              title="Kelola Sinkronisasi Google Calendar untuk Jadwal Dokter & Antrean"
            >
              <CalendarCheck className={`w-4 h-4 ${hasGCalToken && gcalConfig.isConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Google Calendar</span>
              {hasGCalToken && gcalConfig.isConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[9px]">Hubungkan</span>
              )}
            </button>

            {/* Create New Booking Button */}
            <button
              type="button"
              onClick={() => {
                setNewBookingData({
                  customerId: customers[0]?.id || '',
                  petId: pets[0]?.id || '',
                  doctorId: 'u2',
                  doctorName: 'drh. Ananda Putri',
                  date: selectedDate,
                  timeSlot: '09:00',
                  complaint: '',
                  isUnscheduled: false
                });
                setShowAddBookingModal(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Booking</span>
            </button>
          </div>
        </div>

        {/* Second Row: Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E1D6BE]/70">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#6B6656] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari pasien / pemilik / no booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F6F1E6] rounded-xl text-xs font-medium text-[#1B2A45] border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#6B6656] hover:text-[#1B2A45]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Doctor Filter */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Stethoscope className="w-3.5 h-3.5 text-[#B8905A]" />
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="bg-[#F6F1E6] text-xs font-bold text-[#1B2A45] rounded-xl px-2.5 py-1.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] cursor-pointer"
              >
                <option value="all">Semua Dokter Jaga ({DOCTOR_ROSTER.length})</option>
                {DOCTOR_ROSTER.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Filter className="w-3.5 h-3.5 text-[#B8905A]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F6F1E6] text-xs font-bold text-[#1B2A45] rounded-xl px-2.5 py-1.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="Terkonfirmasi">Terkonfirmasi</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>
            </div>
          </div>

          {/* Quick summary count badge */}
          <div className="text-[11px] text-[#6B6656] font-medium flex items-center gap-2">
            <span>Terjadwal Hari Ini: <strong className="text-[#1B2A45] font-black">{scheduledBookingsForDate.length}</strong> Pasien</span>
            <span>•</span>
            <span>Belum Dijadwalkan: <strong className="text-amber-800 font-black">{unscheduledBookings.length}</strong> Antrean</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CALENDAR LAYOUT (TRAY + GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* UNSCHEDULED BOOKINGS SHELF / TRAY (COL-3 or collapsible) */}
        {isUnscheduledTrayOpen && (
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-[#FFFDF9] rounded-2xl border border-amber-200/90 shadow-2xs p-3.5 space-y-3 sticky top-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-800 font-black text-xs">
                    {unscheduledBookings.length}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#1B2A45] font-display">Belum Ditentukan Slot</h4>
                    <p className="text-[10px] text-[#6B6656]">Tarik kartu & lepas ke slot jam</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewBookingData({
                      customerId: customers[0]?.id || '',
                      petId: pets[0]?.id || '',
                      doctorId: 'u2',
                      doctorName: 'drh. Ananda Putri',
                      date: selectedDate,
                      timeSlot: '',
                      complaint: '',
                      isUnscheduled: true
                    });
                    setShowAddBookingModal(true);
                  }}
                  className="p-1 hover:bg-amber-100 text-amber-800 rounded-lg transition-all"
                  title="Tambah Booking Belum Terjadwal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Instructions banner */}
              <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200/60 text-[11px] text-amber-900 leading-snug flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Fitur Drag & Drop:</strong> Pegang & seret kartu anabul ke slot jam atau dokter yang tersedia di sebelah kanan.
                </span>
              </div>

              {/* Unscheduled Drop Zone Target (If user drags a scheduled card back here) */}
              {draggedBooking && !draggedBooking.isFromUnscheduled && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={handleDropToUnscheduledTray}
                  className="p-3 bg-amber-100/70 border-2 border-dashed border-amber-400 rounded-xl text-center text-amber-900 text-xs font-bold animate-pulse"
                >
                  <MoveDown className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                  Lepas di sini untuk membatalkan jam slot & simpan ke antrean
                </div>
              )}

              {/* List of Unscheduled Cards */}
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {unscheduledBookings.length === 0 ? (
                  <div className="text-center py-8 px-3 border border-dashed border-[#E1D6BE] rounded-xl bg-[#F6F1E6]/40">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-[#1B2A45]">Semua Booking Terjadwal!</p>
                    <p className="text-[10px] text-[#6B6656] mt-0.5">Tidak ada antrean booking tanpa jam slot.</p>
                  </div>
                ) : (
                  unscheduledBookings.map((booking) => (
                    <div
                      key={booking.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, booking, true)}
                      onDragEnd={handleDragEnd}
                      className="group bg-white rounded-xl p-3 border border-[#E1D6BE] hover:border-amber-400 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 group-hover:bg-amber-600 transition-colors" />

                      <div className="flex items-start justify-between gap-2 pl-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-[#1B2A45] font-display">
                              {booking.petName}
                            </span>
                            <span className="px-1.5 py-0.2 bg-[#F6F1E6] text-[#6B6656] rounded text-[9px] font-bold">
                              {booking.petSpecies}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B6656] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#B8905A]" /> {booking.customerName}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                            Unscheduled
                          </span>
                          <GripVertical className="w-4 h-4 text-[#A89F91] group-hover:text-amber-700" />
                        </div>
                      </div>

                      {booking.complaint && (
                        <p className="mt-2 pl-1.5 text-[10px] text-[#22242B] line-clamp-2 bg-[#F6F1E6]/60 rounded-md p-1.5 font-medium border border-[#E1D6BE]/40">
                          {booking.complaint}
                        </p>
                      )}

                      {/* Quick slot assign buttons */}
                      <div className="mt-2.5 pt-2 border-t border-[#E1D6BE]/50 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-[#6B6656] text-[9px]">{booking.bookingNo}</span>
                        <button
                          type="button"
                          onClick={() => {
                            // Quick assign to first available slot
                            rescheduleDoctorBooking(booking.id, selectedDate, '09:00', 'u2', 'drh. Ananda Putri');
                            updateDoctorBookingStatus(booking.id, 'Terkonfirmasi');
                            addToast(`✅ Pasien ${booking.petName} dijadwalkan pada jam 09:00!`, 'success');
                          }}
                          className="text-amber-800 hover:text-amber-900 font-bold hover:underline"
                        >
                          + Set 09:00
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW GRID (COL-9 or COL-12) */}
        <div className={`${isUnscheduledTrayOpen ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-4`}>
          
          {/* MATRIX VIEW: Doctor Columns x Time Slots */}
          {viewMode === 'matrix' && (
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  {/* Table Header: Doctors Columns */}
                  <thead>
                    <tr className="bg-[#F6F1E6] border-b border-[#E1D6BE]">
                      <th className="p-3 w-20 text-center font-bold text-xs text-[#1B2A45] uppercase tracking-wider border-r border-[#E1D6BE]">
                        <Clock className="w-4 h-4 mx-auto text-[#B8905A] mb-0.5" />
                        <span>Jam Slot</span>
                      </th>
                      {DOCTOR_ROSTER.filter(
                        (d) => selectedDoctorFilter === 'all' || d.name.toLowerCase().includes(selectedDoctorFilter.toLowerCase())
                      ).map((doctor) => (
                        <th key={doctor.id} className="p-3 text-left border-r border-[#E1D6BE] last:border-r-0 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${doctor.avatarColor} text-white flex items-center justify-center text-xs font-black shadow-2xs`}>
                              {doctor.name.substring(5, 7).toUpperCase()}
                            </div>
                            <div className="leading-tight">
                              <span className="font-extrabold text-xs text-[#1B2A45] block font-display">
                                {doctor.name}
                              </span>
                              <span className="text-[10px] text-[#6B6656] font-medium block">
                                {doctor.title}
                              </span>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Table Body: Time Slots */}
                  <tbody className="divide-y divide-[#E1D6BE]/70">
                    {TIME_SLOTS.map((slot) => {
                      const isLunchBreak = slot === '12:00';
                      const visibleDoctors = DOCTOR_ROSTER.filter(
                        (d) => selectedDoctorFilter === 'all' || d.name.toLowerCase().includes(selectedDoctorFilter.toLowerCase())
                      );

                      return (
                        <tr key={slot} className={isLunchBreak ? 'bg-[#F6F1E6]/40' : 'hover:bg-[#F6F1E6]/20 transition-colors'}>
                          {/* Time Column */}
                          <td className="p-2.5 text-center font-mono font-bold text-xs text-[#1B2A45] border-r border-[#E1D6BE] bg-[#FFFDF9]">
                            <span className="px-2 py-1 rounded-md bg-[#F6F1E6] text-[#1B2A45] inline-block">
                              {slot}
                            </span>
                          </td>

                          {/* Doctor Slots */}
                          {visibleDoctors.map((doctor) => {
                            const slotKey = `${slot}_${doctor.name}`;
                            const bookingsInSlot = slotDoctorMap[slotKey] || [];
                            const isHovered = hoveredDropSlotKey === slotKey;

                            return (
                              <td
                                key={doctor.id}
                                onDragOver={(e) => handleDragOver(e, slotKey)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropToSlot(e, slot, doctor)}
                                className={`p-2 border-r border-[#E1D6BE]/70 last:border-r-0 align-top transition-all min-h-[72px] ${
                                  isHovered
                                    ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset rounded-lg'
                                    : ''
                                }`}
                              >
                                {bookingsInSlot.length === 0 ? (
                                  /* Empty Slot Dropzone */
                                  <div
                                    onClick={() => {
                                      setNewBookingData({
                                        customerId: customers[0]?.id || '',
                                        petId: pets[0]?.id || '',
                                        doctorId: doctor.id,
                                        doctorName: doctor.name,
                                        date: selectedDate,
                                        timeSlot: slot,
                                        complaint: '',
                                        isUnscheduled: false
                                      });
                                      setShowAddBookingModal(true);
                                    }}
                                    className={`w-full min-h-[58px] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group ${
                                      isHovered
                                        ? 'border-emerald-500 bg-emerald-100/50 text-emerald-900 font-bold'
                                        : 'border-[#E1D6BE] hover:border-[#B8905A] hover:bg-[#F6F1E6]/40 text-[#A89F91]'
                                    }`}
                                  >
                                    {isHovered ? (
                                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" /> Lepas di {slot}
                                      </span>
                                    ) : (
                                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-[#B8905A] font-bold transition-opacity">
                                        <Plus className="w-3 h-3" /> Booking Slot
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Booked Slot Cards */
                                  <div className="space-y-1.5">
                                    {bookingsInSlot.map((booking) => (
                                      <div
                                        key={booking.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, booking, false)}
                                        onDragEnd={handleDragEnd}
                                        className={`group rounded-xl p-2.5 border shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden ${
                                          booking.status === 'Terkonfirmasi'
                                            ? 'bg-amber-50/70 border-amber-300'
                                            : booking.status === 'Selesai'
                                            ? 'bg-emerald-50/70 border-emerald-300'
                                            : booking.status === 'Batal'
                                            ? 'bg-rose-50/70 border-rose-300 opacity-60'
                                            : 'bg-blue-50/70 border-blue-300'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1.5">
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1">
                                              <span className="font-extrabold text-xs text-[#1B2A45] font-display">
                                                {booking.petName}
                                              </span>
                                              <span className="text-[10px] font-bold text-[#6B6656]">
                                                ({booking.petSpecies})
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-[#6B6656] truncate max-w-[140px]">
                                              {booking.customerName}
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                                                booking.status === 'Terkonfirmasi'
                                                  ? 'bg-amber-200 text-amber-900'
                                                  : booking.status === 'Selesai'
                                                  ? 'bg-emerald-200 text-emerald-900'
                                                  : booking.status === 'Batal'
                                                  ? 'bg-rose-200 text-rose-900'
                                                  : 'bg-blue-200 text-blue-900'
                                              }`}
                                            >
                                              {booking.status}
                                            </span>
                                            <GripVertical className="w-3.5 h-3.5 text-[#A89F91] group-hover:text-[#1B2A45]" />
                                          </div>
                                        </div>

                                        {booking.complaint && (
                                          <p className="mt-1 text-[10px] text-[#22242B] truncate bg-white/70 rounded p-1 font-medium border border-[#E1D6BE]/40">
                                            {booking.complaint}
                                          </p>
                                        )}

                                        {/* Action Bar */}
                                        <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between gap-1">
                                          <span className="text-[9px] font-mono text-[#6B6656]">
                                            {booking.bookingNo}
                                          </span>

                                          <div className="flex items-center gap-1">
                                            {booking.googleCalendarHtmlLink ? (
                                              <a
                                                href={booking.googleCalendarHtmlLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[10px] transition-colors"
                                                title="Buka di Google Calendar"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => syncSingleBookingGCal(booking)}
                                                className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] transition-colors cursor-pointer"
                                                title="Sinkronkan ke Google Calendar"
                                              >
                                                <Zap className="w-3 h-3 text-amber-700" />
                                              </button>
                                            )}

                                            {booking.status === 'Terkonfirmasi' && (
                                              <button
                                                type="button"
                                                onClick={() => handleQuickCheckIn(booking)}
                                                className="p-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                                                title="Check-In ke Antrean Klinik Aktif"
                                              >
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[9px]">Check-In</span>
                                              </button>
                                            )}

                                            <a
                                              href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                                                `Halo Kak ${booking.customerName}, mengingatkan jadwal periksa anabul ${booking.petName} pada ${booking.date} jam ${booking.timeSlot} bersama ${booking.doctorName} di Klinik PetCare. Terima kasih!`
                                              )}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] transition-colors"
                                              title="Kirim Reminder WhatsApp"
                                            >
                                              <Smartphone className="w-3 h-3" />
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIMELINE CHRONOLOGICAL VIEW */}
          {viewMode === 'timeline' && (
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
                <h4 className="font-bold text-xs text-[#1B2A45] font-display flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#B8905A]" /> Timeline Jadwal Janji Temu Terpadu ({formatDateDisplay(selectedDate)})
                </h4>
                <span className="text-xs text-[#6B6656]">
                  {scheduledBookingsForDate.length} Janji Temu
                </span>
              </div>

              <div className="space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const bookingsAtSlot = scheduledBookingsForDate.filter((b) => b.timeSlot === slot);
                  const isHovered = hoveredDropSlotKey === slot;

                  return (
                    <div
                      key={slot}
                      onDragOver={(e) => handleDragOver(e, slot)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropToSlot(e, slot, DOCTOR_ROSTER[0])}
                      className={`p-3 rounded-xl border transition-all ${
                        isHovered
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400'
                          : bookingsAtSlot.length > 0
                          ? 'bg-white border-[#E1D6BE]'
                          : 'bg-[#F6F1E6]/30 border-dashed border-[#E1D6BE]/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-[#1B2A45] text-white font-mono font-bold text-xs rounded-lg">
                            {slot}
                          </span>
                          <span className="text-xs font-semibold text-[#6B6656]">
                            {bookingsAtSlot.length === 0 ? 'Slot Tersedia' : `${bookingsAtSlot.length} Pasien Terdaftar`}
                          </span>
                        </div>

                        {bookingsAtSlot.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewBookingData({
                                customerId: customers[0]?.id || '',
                                petId: pets[0]?.id || '',
                                doctorId: 'u2',
                                doctorName: 'drh. Ananda Putri',
                                date: selectedDate,
                                timeSlot: slot,
                                complaint: '',
                                isUnscheduled: false
                              });
                              setShowAddBookingModal(true);
                            }}
                            className="text-[11px] font-bold text-[#B8905A] hover:text-[#9E7848] flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Booking di Slot Ini
                          </button>
                        )}
                      </div>

                      {/* Cards in timeline */}
                      {bookingsAtSlot.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {bookingsAtSlot.map((booking) => (
                            <div
                              key={booking.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, booking, false)}
                              onDragEnd={handleDragEnd}
                              className="bg-[#FFFDF9] rounded-xl p-3 border border-[#E1D6BE] shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[#1B2A45]">{booking.petName}</span>
                                  <span className="px-1.5 py-0.2 bg-[#F6F1E6] text-[#6B6656] text-[10px] font-bold rounded">
                                    {booking.petSpecies}
                                  </span>
                                  <span className="text-[11px] text-[#6B6656]">({booking.customerName})</span>
                                </div>
                                <p className="text-[11px] text-[#1B2A45] font-medium flex items-center gap-1.5">
                                  <Stethoscope className="w-3.5 h-3.5 text-[#B8905A]" />
                                  {booking.doctorName || 'drh. Ananda Putri'}
                                </p>
                                {booking.complaint && (
                                  <p className="text-[10px] text-[#6B6656] bg-[#F6F1E6] rounded p-1">
                                    {booking.complaint}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    booking.status === 'Terkonfirmasi'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {booking.status}
                                </span>
                                {booking.status === 'Terkonfirmasi' && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickCheckIn(booking)}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Check-In
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: TAMBAH BOOKING BARU */}
      {/* ========================================================================= */}
      {showAddBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-[#B8905A]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1B2A45] font-display">
                    {newBookingData.isUnscheduled ? 'Intake Booking Tanpa Jam Slot' : 'Buat Janji Temu Baru'}
                  </h3>
                  <p className="text-xs text-[#6B6656]">Input reservasi konsultasi pasien anabul</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBookingModal(false)}
                className="p-1.5 hover:bg-[#F6F1E6] text-[#6B6656] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBooking} className="space-y-3.5 text-xs">
              {/* Option: Unscheduled Intake vs Scheduled */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1B2A45]">
                  <input
                    type="checkbox"
                    checked={newBookingData.isUnscheduled}
                    onChange={(e) => setNewBookingData({ ...newBookingData, isUnscheduled: e.target.checked })}
                    className="rounded text-[#B8905A] focus:ring-[#B8905A]"
                  />
                  <span>Simpan ke Antrean Belum Terjadwal (Slot Ditentukan Nanti via Drag & Drop)</span>
                </label>
              </div>

              {/* Customer Selector */}
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pemilik Anabul (Customer)</label>
                <select
                  value={newBookingData.customerId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const petMatch = pets.find((p) => p.customerId === cId);
                    setNewBookingData({
                      ...newBookingData,
                      customerId: cId,
                      petId: petMatch?.id || pets[0]?.id || ''
                    });
                  }}
                  className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pet Selector */}
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pasien Anabul (Pet)</label>
                <select
                  value={newBookingData.petId}
                  onChange={(e) => setNewBookingData({ ...newBookingData, petId: e.target.value })}
                  className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                  required
                >
                  {pets
                    .filter((p) => !newBookingData.customerId || p.customerId === newBookingData.customerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species} • {p.breed})
                      </option>
                    ))}
                </select>
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Dokter Hewan Jaga</label>
                <select
                  value={newBookingData.doctorId}
                  onChange={(e) => {
                    const doc = DOCTOR_ROSTER.find((d) => d.id === e.target.value);
                    setNewBookingData({
                      ...newBookingData,
                      doctorId: e.target.value,
                      doctorName: doc?.name || 'drh. Ananda Putri'
                    });
                  }}
                  className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                >
                  {DOCTOR_ROSTER.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Slot (Hidden if Unscheduled) */}
              {!newBookingData.isUnscheduled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={newBookingData.date}
                      onChange={(e) => setNewBookingData({ ...newBookingData, date: e.target.value })}
                      className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Pilihan Jam Slot</label>
                    <select
                      value={newBookingData.timeSlot}
                      onChange={(e) => setNewBookingData({ ...newBookingData, timeSlot: e.target.value })}
                      className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                      required
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot} WIB
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Complaint Notes */}
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Keluhan / Alasan Booking</label>
                <textarea
                  value={newBookingData.complaint}
                  onChange={(e) => setNewBookingData({ ...newBookingData, complaint: e.target.value })}
                  placeholder="Contoh: Vaksinasi Rabies tahunan & konsultasi gatal pada telinga kanan..."
                  rows={2}
                  className="w-full bg-[#F6F1E6] text-[#1B2A45] text-xs font-medium rounded-xl p-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1D6BE]">
                <button
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#6B6656] font-bold rounded-xl hover:bg-[#E1D6BE] transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Simpan Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: SLOT CONFLICT & SWAP CONFIRMATION */}
      {/* ========================================================================= */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-amber-300 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E1D6BE] pb-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1B2A45] font-display">Slot Waktu Sudah Terisi</h3>
                <p className="text-xs text-[#6B6656]">Pilih opsi penanganan jadwal bentrok</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-xs space-y-2 text-amber-950">
              <p>
                Slot jam <strong>{showConflictModal.targetSlot}</strong> ({showConflictModal.targetDoctorName}) sudah diisi oleh:
              </p>
              {showConflictModal.occupiedBooking && (
                <div className="bg-white rounded-lg p-2.5 border border-amber-300 font-medium">
                  🐾 <strong>{showConflictModal.occupiedBooking.petName}</strong> ({showConflictModal.occupiedBooking.customerName})
                  <span className="block text-[10px] text-[#6B6656] mt-0.5">
                    Keluhan: {showConflictModal.occupiedBooking.complaint || '-'}
                  </span>
                </div>
              )}
              <p className="text-[11px]">
                Anda sedang memindahkan pasien: 🐾 <strong>{showConflictModal.sourceBooking.petName}</strong>
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSwap}
                className="w-full py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-white font-bold text-xs rounded-xl shadow-2xs hover:brightness-110 flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Tukar Slot (Swap Jadwal Antar Pasien)</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDoubleBooking}
                className="w-full py-2.5 bg-[#1B2A45] text-white font-bold text-xs rounded-xl hover:bg-[#101A2C] flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Double-Booking (Tetap Jadwalkan Bersamaan)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConflictModal(null)}
                className="w-full py-2 bg-[#F6F1E6] text-[#6B6656] font-bold text-xs rounded-xl hover:bg-[#E1D6BE]"
              >
                Batal & Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE CALENDAR SYNC MODAL */}
      <GoogleCalendarSyncModal
        isOpen={showGCalModal}
        onClose={() => {
          setShowGCalModal(false);
          setGcalConfig(loadGoogleCalendarConfig());
        }}
        selectedDate={selectedDate}
        doctorBookings={doctorBookings}
        onBookingsUpdated={(updatedList) => {
          updatedList.forEach((b) => {
            updateDoctorBooking(b.id, {
              googleCalendarEventId: b.googleCalendarEventId,
              googleCalendarHtmlLink: b.googleCalendarHtmlLink,
              googleCalendarSyncStatus: b.googleCalendarSyncStatus,
              lastSyncedAt: b.lastSyncedAt
            });
          });
        }}
      />
    </div>
  );
};
