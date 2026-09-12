import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck,
  Scissors,
  Hotel,
  Video,
  Ambulance,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Mic,
  MicOff,
  VideoOff,
  ShieldAlert,
  MapPin,
  Navigation,
  Camera,
  Sparkles,
  Star,
  FileText,
  Send,
  Heart,
  Tv,
  Utensils,
  Pill,
  DollarSign,
  Filter,
  Search,
  ChevronRight,
  Printer,
  Smartphone,
  Info,
  Check
} from 'lucide-react';
import * as Types from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { DailyPetDiaryModal } from '../common/DailyPetDiaryModal';
import { KioskQueueModule } from './KioskQueueModule';
import { BookingCalendarView } from '../booking/BookingCalendarView';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';
import {
  createOperationAmbulanceRequest,
  createOperationTelehealthSession,
  registerOperationAmbulanceUnit,
  transitionOperationAmbulanceRequest,
  transitionOperationTelehealthSession,
} from '../../utils/operationsApi';
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface ServicesModuleProps {
  activeModule?: 'booking' | 'grooming' | 'petHotel' | 'telehealth' | 'ambulance' | string;
  setActiveModule?: (module: any) => void;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({ activeModule = 'booking', setActiveModule }) => {
  const [showDiaryModal, setShowDiaryModal] = useState<boolean>(false);
  const [diaryPetId, setDiaryPetId] = useState<string>('');
  const {
    customers = [],
    pets = [],
    employees = [],
    doctorBookings = [],
    addDoctorBooking,
    checkInDoctorBooking,
    groomingSessions = [],
    addGroomingSession,
    updateGroomingStage,
    groomingPackages = [],
    hotelReservations = [],
    hotelRooms = [],
    addHotelReservation,
    updateHotelStatus,
    dailyMonitorings = [],
    addDailyMonitoring,
    telehealthSessions = [],
    addTelehealthSession,
    updateTelehealthStatus,
    updateTelehealthSession,
    addInvoice,
    ambulanceUnits = [],
    ambulanceRequests = [],
    addAmbulanceRequest,
    updateAmbulanceStatus,
    updateAmbulanceUnit,
    addClinicVisit,
    drugs = [],
    dispenseDrug,
    addMedicalRecord
  } = useData();

  const { addToast } = useToast();

  // Internal tab state corresponding to activeModule
  const [currentTab, setCurrentTab] = useState<'booking' | 'grooming' | 'petHotel' | 'telehealth' | 'ambulance'>(
    (['booking', 'grooming', 'petHotel', 'telehealth', 'ambulance'].includes(activeModule)
      ? activeModule
      : 'booking') as any
  );

  // Sync state if activeModule changes from parent navigation
  React.useEffect(() => {
    if (['booking', 'grooming', 'petHotel', 'telehealth', 'ambulance'].includes(activeModule)) {
      setCurrentTab(activeModule as any);
    }
  }, [activeModule]);

  const handleTabChange = (tab: 'booking' | 'grooming' | 'petHotel' | 'telehealth' | 'ambulance') => {
    setCurrentTab(tab);
    if (setActiveModule) {
      setActiveModule(tab);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. BOOKING STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [bookingSubView, setBookingSubView] = useState<'calendar' | 'table' | 'kiosk'>('calendar');
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [bookingType, setBookingType] = useState<'Dokter' | 'Grooming' | 'Pet Hotel'>('Dokter');
  const [bookingCustId, setBookingCustId] = useState(customers[0]?.id || '');
  const [bookingPetId, setBookingPetId] = useState(pets[0]?.id || '');
  const [bookingDate, setBookingDate] = useState('2026-08-12');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingNotes, setBookingNotes] = useState('Pemeriksaan kesehatan rutin');
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('Semua');
  const [selectedBookingPatientId, setSelectedBookingPatientId] = useState<string>(doctorBookings[0]?.id || '');
  const [bookingProviderId, setBookingProviderId] = useState('');

  const selectedCust = customers.find((c) => c.id === bookingCustId);
  const custPets = pets.filter((p) => p.customerId === bookingCustId);

  // Dokter/Groomer/Petugas Pet Hotel yang berhak ditugaskan diambil dari Master Data (employees),
  // bukan nama yang di-hardcode, supaya konsisten dengan roster di SDM & Shift Kerja.
  const providerRoleForBookingType = (t: 'Dokter' | 'Grooming' | 'Pet Hotel'): Types.Employee['role'] =>
    t === 'Grooming' ? 'Groomer' : t === 'Pet Hotel' ? 'Pet Hotel Staff' : 'Dokter Hewan';
  const eligibleProviders = employees.filter(
    (e) => e.role === providerRoleForBookingType(bookingType) && e.status === 'Aktif'
  );
  const selectedProvider = employees.find((e) => e.id === bookingProviderId) || eligibleProviders[0];

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === bookingCustId);
    const pet = pets.find((p) => p.id === bookingPetId);

    if (!cust || !pet) {
      addToast('Pilih pelanggan dan hewan peliharaan terlebih dahulu', 'error');
      return;
    }

    const provider = employees.find((e) => e.id === bookingProviderId) || eligibleProviders[0];
    if (!provider) {
      addToast(`Belum ada staf aktif dengan peran "${providerRoleForBookingType(bookingType)}" di Master Data. Tambahkan dulu di menu SDM / Master Data.`, 'error');
      return;
    }

    const hasConflict = doctorBookings.some(
      (b) =>
        b.doctorId === provider.id &&
        b.date === bookingDate &&
        b.timeSlot === bookingTime &&
        b.status !== 'Batal'
    );
    if (hasConflict) {
      addToast(`${provider.name} sudah punya janji temu lain pada ${bookingDate} jam ${bookingTime}. Pilih jam lain.`, 'error');
      return;
    }

    addDoctorBooking({
      date: bookingDate,
      timeSlot: bookingTime,
      customerId: cust.id,
      customerName: cust.name,
      petId: pet.id,
      petName: pet.name,
      petSpecies: pet.species,
      doctorId: provider.id,
      doctorName: provider.name,
      complaint: bookingNotes,
      status: 'Terkonfirmasi'
    });

    addToast(`Janji temu ${bookingType} untuk ${pet.name} (${cust.name}) bersama ${provider.name} berhasil dijadwalkan!`, 'success');
    setShowAddBookingModal(false);
  };

  const handleCheckInBookingToQueue = (booking: Types.DoctorBooking) => {
    const pet = pets.find((p) => p.id === booking.petId);
    checkInDoctorBooking(booking.id);
    addClinicVisit({
      customerId: booking.customerId,
      customerName: booking.customerName,
      petId: booking.petId,
      petName: booking.petName,
      petSpecies: booking.petSpecies,
      petBreed: pet?.breed || 'Umum',
      doctorId: booking.doctorId || 'unassigned',
      doctorName: booking.doctorName || 'Belum Ditugaskan',
      complaint: booking.complaint || 'Janji Temu Terjadwal'
    });
    addToast(`Pasien ${booking.petName} telah di-checkin dan masuk ke Antrean Klinik Live!`, 'success');
  };

  // ---------------------------------------------------------------------------
  // 2. GROOMING STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [showAddGroomingModal, setShowAddGroomingModal] = useState(false);
  const [groomingPetId, setGroomingPetId] = useState(pets[0]?.id || '');
  const [groomingPackage, setGroomingPackage] = useState<'Basic' | 'Regular' | 'Premium' | 'Medicinal'>('Regular');
  const [groomerId, setGroomerId] = useState('');
  const [coatNotes, setCoatNotes] = useState('Bulu agak menggumpal di area telinga, bebas kutu');

  // Groomer penanggung jawab juga diambil dari staf aktif di Master Data (role Groomer),
  // konsisten dengan pola booking dokter — bukan free-text yang bisa diisi sembarangan.
  const eligibleGroomers = employees.filter((e) => e.role === 'Groomer' && e.status === 'Aktif');
  const selectedGroomer = employees.find((e) => e.id === groomerId) || eligibleGroomers[0];

  const handleCreateGroomingSession = (e: React.FormEvent) => {
    e.preventDefault();
    const pet = pets.find((p) => p.id === groomingPetId);
    if (!pet) {
      addToast('Pilih hewan peliharaan terlebih dahulu', 'error');
      return;
    }

    const groomer = employees.find((e) => e.id === groomerId) || eligibleGroomers[0];
    if (!groomer) {
      addToast('Belum ada groomer aktif di Master Data. Tambahkan dulu di menu SDM / Master Data.', 'error');
      return;
    }

    const cust = customers.find((c) => c.id === pet.customerId);

    // Ukuran hewan sebelumnya selalu di-hardcode 'Medium'; sekarang
    // diperkirakan dari berat badan sungguhan. Harga sebelumnya juga selalu
    // pakai tarif tetap di kode — sekarang dicari dari paket Master Data
    // Grooming (per ukuran hewan) kalau tersedia & aktif, supaya perubahan
    // harga lewat Master Data ikut berlaku di sini. Tarif tetap tetap
    // dipertahankan sebagai fallback kalau paket belum dikonfigurasi.
    const petSize: 'Small' | 'Medium' | 'Large' = pet.weightKg < 10 ? 'Small' : pet.weightKg <= 25 ? 'Medium' : 'Large';
    const masterPackage = groomingPackages.find((gp) => gp.packageType === groomingPackage && gp.isActive);
    const price = masterPackage
      ? petSize === 'Small'
        ? masterPackage.priceSmall
        : petSize === 'Large'
        ? masterPackage.priceLarge
        : masterPackage.priceMedium
      : groomingPackage === 'Basic'
      ? 75000
      : groomingPackage === 'Regular'
      ? 120000
      : groomingPackage === 'Premium'
      ? 180000
      : 250000;

    addGroomingSession({
      petId: pet.id,
      petName: pet.name,
      customerName: cust?.name || 'Pelanggan',
      packageType: groomingPackage,
      petSize,
      groomerName: groomer.name,
      stage: 'Antri',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '11:00',
      price,
      notes: coatNotes
    });

    addToast(`Sesi Grooming baru untuk ${pet.name} berhasil dibuat!`, 'success');
    setShowAddGroomingModal(false);
  };

  const stageOrder: Types.GroomingStage[] = ['Antri', 'Check-In', 'Proses Grooming', 'Quality Control', 'Selesai'];

  const handleAdvanceGroomingStage = (session: Types.GroomingSession) => {
    const currentIndex = stageOrder.indexOf(session.stage);
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      updateGroomingStage(session.id, nextStage);
      addToast(`Tahapan Grooming ${session.petName} diperbarui ke: ${nextStage}`, 'info');

      // Sesi grooming sebelumnya tidak pernah membuat invoice sama sekali —
      // pelanggan selesai grooming tanpa tagihan yang pernah tercatat di
      // sistem finance manapun. Sekarang saat tahap "Selesai" tercapai,
      // tagihan 'Belum Dibayar' diteruskan ke Kasir (Billing & Kasir),
      // dilunaskan lewat processPayment seperti alur normal.
      if (nextStage === 'Selesai') {
        const pet = pets.find((p) => p.id === session.petId);
        const cust = customers.find((c) => c.id === pet?.customerId);
        addInvoice({
          customerId: cust?.id || 'guest',
          customerName: session.customerName,
          petName: session.petName,
          items: [
            {
              id: 'inv_item_' + Date.now() + Math.random(),
              category: 'Grooming',
              name: `Grooming ${session.packageType} - ${session.petName}`,
              quantity: 1,
              unitPrice: session.price,
              totalPrice: session.price
            }
          ],
          subtotal: session.price,
          discountAmount: 0,
          totalAmount: session.price,
          paidAmount: 0,
          paymentMethod: 'Tunai',
          status: 'Belum Dibayar',
          loyaltyPointsEarned: 0,
          cashierName: session.groomerName
        });
        addToast(`Tagihan grooming Rp ${session.price.toLocaleString('id-ID')} untuk ${session.petName} diteruskan ke Kasir.`, 'success');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 3. PET HOTEL STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [hotelPetId, setHotelPetId] = useState(pets[0]?.id || '');
  const [hotelRoomType, setHotelRoomType] = useState<'Regular' | 'Small' | 'Medium' | 'Large' | 'VIP' | 'VIP AC' | 'VIP CCTV'>('VIP CCTV');
  const [checkInDate, setCheckInDate] = useState('2026-08-11');
  const [checkOutDate, setCheckOutDate] = useState('2026-08-15');
  const [dietaryNotes, setDietaryNotes] = useState('Makanan basah Royal Canin 2x sehari (08.00 & 17.00)');

  const [showAddMonitoringModal, setShowAddMonitoringModal] = useState(false);
  const [selectedResId, setSelectedResId] = useState('');
  const [feedStatus, setFeedStatus] = useState('Habis 100%');
  const [pottyStatus, setPottyStatus] = useState('Normal (Pup & Pipis)');
  const [behaviorNotes, setBehaviorNotes] = useState('Aktif bermain, tidak cemas');

  const [selectedCCTV, setSelectedCCTV] = useState<string | null>(null);

  const handleCreateHotelReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const pet = pets.find((p) => p.id === hotelPetId);
    if (!pet) return;
    const cust = customers.find((c) => c.id === pet.customerId);

    const room = hotelRooms.find((r) => r.roomType === hotelRoomType && r.isActive);
    if (!room) {
      addToast(`Belum ada kamar aktif dengan tipe "${hotelRoomType}" di Master Data. Tambahkan dulu di menu Master Data Kamar.`, 'error');
      return;
    }

    const nights = Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (!checkInDate || !checkOutDate || nights <= 0) {
      addToast('Tanggal check-out harus setelah tanggal check-in.', 'error');
      return;
    }

    addHotelReservation({
      petId: pet.id,
      petName: pet.name,
      customerName: cust?.name || 'Pelanggan',
      roomType: hotelRoomType,
      roomNo: room.roomNo,
      checkInDate,
      checkOutDate,
      totalNights: nights,
      dailyRate: room.dailyRate,
      totalCost: nights * room.dailyRate,
      notes: dietaryNotes,
      status: 'Aktif'
    });

    addToast(`Reservasi Pet Hotel untuk ${pet.name} (${hotelRoomType}) berhasil terdaftar!`, 'success');
    setShowAddHotelModal(false);
  };

  const handleCreateDailyMonitoring = (e: React.FormEvent) => {
    e.preventDefault();
    const res = hotelReservations.find((r) => r.id === selectedResId) || hotelReservations[0];
    if (!res) return;

    addDailyMonitoring({
      reservationId: res.id,
      petName: res.petName,
      roomNo: res.roomNo,
      date: new Date().toISOString().split('T')[0],
      morningFeeding: feedStatus.includes('100%'),
      morningMedication: true,
      afternoonPlaytime: true,
      eveningFeeding: true,
      eveningRest: true,
      notes: `${feedStatus} | ${pottyStatus} | ${behaviorNotes}`,
      staffName: 'Perawat Dewi'
    });

    addToast(`Catatan monitoring harian untuk ${res.petName} berhasil disimpan!`, 'success');
    setShowAddMonitoringModal(false);
  };

  // ---------------------------------------------------------------------------
  // 4. TELEHEALTH STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [activeCallSession, setActiveCallSession] = useState<Types.TelehealthSession | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [teleNotes, setTeleNotes] = useState('Pasien tampak lemas, nafsu makan menurun sejak 2 hari lalu.');
  const [teleDiagnosis, setTeleDiagnosis] = useState('Suspek Dehidrasi Ringan / Gastritis');
  const [telePrescription, setTelePrescription] = useState('Nutrimax Pet Syrup 1x5ml, Probiotik Vet 1x sachet');
  // Resep Telehealth sebelumnya cuma teks bebas dikirim via WA — stok obat
  // apotek tidak pernah berkurang & tidak bisa direkonsiliasi. Daftar
  // terstruktur ini (obat + qty dari master Apotek) dipakai untuk benar-benar
  // memotong stok lewat dispenseDrug saat resep dikirim.
  const [telePrescribedDrugs, setTelePrescribedDrugs] = useState<{ drugId: string; drugName: string; qty: number }[]>([]);
  const [teleDrugPickId, setTeleDrugPickId] = useState<string>(drugs[0]?.id || '');
  const [teleDrugPickQty, setTeleDrugPickQty] = useState<number>(1);

  const handleAddTeleDrug = () => {
    const drug = drugs.find((d) => d.id === teleDrugPickId);
    if (!drug) return;
    setTelePrescribedDrugs((prev) => [...prev, { drugId: drug.id, drugName: drug.name, qty: teleDrugPickQty }]);
  };

  const handleRemoveTeleDrug = (idx: number) => {
    setTelePrescribedDrugs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEndTelehealthCall = async () => {
    if (activeCallSession) {
      try {
        if (activeCallSession.operationId) {
          await transitionOperationTelehealthSession(activeCallSession.operationId, 'completed', 'Konsultasi diselesaikan oleh dokter.');
        }
      } catch (error: any) {
        addToast(error.message || 'Sesi belum dapat ditutup di server.', 'error');
        return;
      }
      updateTelehealthSession(activeCallSession.id, {
        status: 'Selesai',
        notes: teleNotes,
        diagnosis: teleDiagnosis,
        prescription: telePrescription
      });

      addInvoice({
        customerId: activeCallSession.customerId,
        customerName: activeCallSession.customerName,
        petName: activeCallSession.petName,
        items: [
          {
            id: 'item_' + Date.now(),
            category: 'Telehealth',
            name: `Konsultasi Telehealth — ${activeCallSession.doctorName}`,
            quantity: 1,
            unitPrice: activeCallSession.fee,
            totalPrice: activeCallSession.fee
          }
        ],
        subtotal: activeCallSession.fee,
        discountAmount: 0,
        totalAmount: activeCallSession.fee,
        paidAmount: 0,
        paymentMethod: 'Tunai',
        status: 'Belum Dibayar',
        loyaltyPointsEarned: 0,
        cashierName: activeCallSession.doctorName
      });

      addToast(`Sesi Telehealth dengan ${activeCallSession.petName} telah selesai. Catatan medis tersimpan & tagihan diterbitkan.`, 'success');
      setActiveCallSession(null);
    }
  };

  const [showAddTeleModal, setShowAddTeleModal] = useState(false);
  const [telePetId, setTelePetId] = useState(pets[0]?.id || '');
  const [teleComplaints, setTeleComplaints] = useState('Muntah kuning 2x tadi pagi dan batuk ringan');
  const [teleDoctorId, setTeleDoctorId] = useState('');
  const [teleDate, setTeleDate] = useState(new Date().toISOString().split('T')[0]);
  const [teleTimeSlot, setTeleTimeSlot] = useState('14:00');
  const [teleDurationMinutes, setTeleDurationMinutes] = useState<15 | 30 | 45 | 60>(30);
  const [teleFee, setTeleFee] = useState(150000);
  const [teleConsent, setTeleConsent] = useState(false);

  // Dokter telehealth juga diambil dari staf aktif di Master Data (role Dokter Hewan),
  // konsisten dengan pola booking dokter di atas — bukan nama hardcoded.
  const eligibleTeleDoctors = employees.filter((e) => e.role === 'Dokter Hewan' && e.status === 'Aktif');
  const selectedTeleDoctor = employees.find((e) => e.id === teleDoctorId) || eligibleTeleDoctors[0];

  const handleCreateTeleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const pet = pets.find((p) => p.id === telePetId);
    if (!pet) {
      addToast('Pilih hewan peliharaan terlebih dahulu', 'error');
      return;
    }
    const cust = customers.find((c) => c.id === pet.customerId);

    const doctor = employees.find((e) => e.id === teleDoctorId) || eligibleTeleDoctors[0];
    if (!doctor) {
      addToast('Belum ada dokter aktif di Master Data untuk sesi Telehealth. Tambahkan dulu di menu SDM / Master Data.', 'error');
      return;
    }
    if (!teleConsent) {
      addToast('Persetujuan telehealth dari pemilik wajib dicatat sebelum menjadwalkan sesi.', 'error');
      return;
    }

    const hasConflict = telehealthSessions.some(
      (t) =>
        t.doctorName === doctor.name &&
        t.date === teleDate &&
        t.timeSlot === teleTimeSlot &&
        t.status !== 'Dibatalkan'
    );
    if (hasConflict) {
      addToast(`${doctor.name} sudah punya sesi Telehealth lain pada ${teleDate} jam ${teleTimeSlot}. Pilih jam lain.`, 'error');
      return;
    }

    let operationSession;
    try {
      operationSession = await createOperationTelehealthSession({
        patientName: pet.name,
        customerId: cust?.id || 'walk-in',
        doctorId: doctor.id,
        scheduledAt: `${teleDate}T${teleTimeSlot}:00`,
        durationMinutes: teleDurationMinutes,
        consentAcceptedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      addToast(error.message || 'Jadwal telehealth gagal disimpan ke server.', 'error');
      return;
    }

    const newSession = addTelehealthSession({
      customerId: cust?.id || '',
      customerName: cust?.name || 'Pelanggan',
      petId: pet.id,
      petName: pet.name,
      doctorName: doctor.name,
      date: teleDate,
      timeSlot: teleTimeSlot,
      durationMinutes: teleDurationMinutes,
      type: 'Konsultasi',
      fee: teleFee,
      complaint: teleComplaints,
      status: 'Menunggu',
      operationId: operationSession.id,
      consentAcceptedAt: new Date().toISOString(),
    });

    if (cust?.phone) {
      const text = `Halo Kak ${cust.name}! 🐾 Jadwal Konsultasi Video Telehealth untuk ${pet.name} sudah dibuat pada ${teleDate} jam ${teleTimeSlot} bersama ${doctor.name}. Link video call: ${newSession.meetingUrl}`;
      sendWhatsAppNotification(cust.phone, text);
    }

    addToast(`Jadwal Sesi Telehealth Video untuk ${pet.name} berhasil dibuat!`, 'success');
    setShowAddTeleModal(false);
  };

  // ---------------------------------------------------------------------------
  // 5. AMBULANCE STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [showAddAmbulanceModal, setShowAddAmbulanceModal] = useState(false);
  const [callerName, setCallerName] = useState('Rudi Hermawan');
  const [callerPhone, setCallerPhone] = useState('081298765432');
  const [emergencyPetName, setEmergencyPetName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Jl. Kemang Raya No. 45, Jakarta Selatan');
  const [emergencyLevel, setEmergencyLevel] = useState<'Emergency' | 'Urgent' | 'Normal'>('Emergency');
  const [emergencyReason, setEmergencyReason] = useState('Kucing tertabrak sepeda motor, pendarahan di kaki belakang');
  const [ambulanceUnitId, setAmbulanceUnitId] = useState('');

  const availableAmbulanceUnits = ambulanceUnits.filter((u) => u.status === 'Tersedia');

  const handleCreateAmbulanceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const unit = availableAmbulanceUnits.find((u) => u.id === ambulanceUnitId) || availableAmbulanceUnits[0];
    if (!unit) {
      addToast('Tidak ada unit ambulance yang tersedia saat ini.', 'error');
      return;
    }

    let operationUnit;
    let operationRequest;
    try {
      operationUnit = await registerOperationAmbulanceUnit({ id: unit.operationId || unit.id, code: unit.code });
      operationRequest = await createOperationAmbulanceRequest({
        patientName: emergencyPetName || 'Pasien Darurat',
        callerName,
        callerPhone,
        urgency: emergencyLevel.toLowerCase() as 'emergency' | 'urgent' | 'normal',
        pickupAddress,
        notes: emergencyReason,
      });
      await transitionOperationAmbulanceRequest(operationRequest.id, 'triaged', { note: emergencyReason });
      await transitionOperationAmbulanceRequest(operationRequest.id, 'assigned', { unitId: operationUnit.id, note: `Unit ${unit.code} ditugaskan.` });
    } catch (error: any) {
      addToast(error.message || 'Dispatch ambulance gagal disimpan ke server.', 'error');
      return;
    }

    const newReq = addAmbulanceRequest({
      customerName: callerName,
      customerPhone: callerPhone,
      petName: emergencyPetName || 'Pasien Darurat',
      petSpecies: 'Anabul',
      urgency: emergencyLevel,
      pickupAddress,
      destination: 'RS Klinik PetCare Utama',
      notes: emergencyReason,
      assignedUnitCode: unit.code,
      operationId: operationRequest.id,
    });

    updateAmbulanceUnit(unit.id, { status: 'Bertugas', operationId: operationUnit.id });

    const reqNumber = newReq?.requestNo || 'AMB-REQ-LIVE';
    addToast(`Panggilan Darurat Ambulance Dispatch (${reqNumber}) DITERIMA! Unit ${unit.code} diluncurkan.`, 'success');

    if (callerPhone) {
      const text = `Halo Kak ${callerName}! 🚑 Ambulance PetCare (${unit.code} - ${unit.vehicleName}) sedang menuju lokasi penjemputan di ${pickupAddress}. Mohon bersiap, tim medis segera tiba.`;
      sendWhatsAppNotification(callerPhone, text);
    }

    setShowAddAmbulanceModal(false);
  };

  const handleUpdateAmbulanceStage = async (id: string, currentStatus: Types.AmbulanceRequest['status']) => {
    let nextStatus: Types.AmbulanceRequest['status'] = 'Menuju Lokasi';
    if (currentStatus === 'Menuju Lokasi') nextStatus = 'Penjemputan';
    else if (currentStatus === 'Penjemputan') nextStatus = 'Perjalanan';
    else if (currentStatus === 'Perjalanan') nextStatus = 'Completed';

    const request = ambulanceRequests.find((item) => item.id === id);
    try {
      if (request?.operationId) {
        if (nextStatus === 'Menuju Lokasi') await transitionOperationAmbulanceRequest(request.operationId, 'en_route');
        else if (nextStatus === 'Penjemputan') await transitionOperationAmbulanceRequest(request.operationId, 'arrived');
        else if (nextStatus === 'Perjalanan') await transitionOperationAmbulanceRequest(request.operationId, 'patient_onboard');
        else {
          await transitionOperationAmbulanceRequest(request.operationId, 'at_clinic');
          await transitionOperationAmbulanceRequest(request.operationId, 'handed_over');
          await transitionOperationAmbulanceRequest(request.operationId, 'closed');
        }
      }
    } catch (error: any) {
      addToast(error.message || 'Status dispatch gagal diperbarui di server.', 'error');
      return;
    }

    updateAmbulanceStatus(id, nextStatus);

    if (nextStatus === 'Completed') {
      const req = ambulanceRequests.find((r) => r.id === id);
      const unit = req?.assignedUnitCode ? ambulanceUnits.find((u) => u.code === req.assignedUnitCode) : undefined;
      if (unit) updateAmbulanceUnit(unit.id, { status: 'Tersedia' });
    }

    addToast(`Status Ambulance diperbarui: ${nextStatus}`, 'info');
  };

  const handleCancelAmbulanceRequest = async (req: Types.AmbulanceRequest) => {
    try {
      if (req.operationId) await transitionOperationAmbulanceRequest(req.operationId, 'cancelled', { note: 'Dibatalkan dari dispatcher.' });
    } catch (error: any) {
      addToast(error.message || 'Pembatalan belum tersimpan di server.', 'error');
      return;
    }
    updateAmbulanceStatus(req.id, 'Cancelled');
    const unit = req.assignedUnitCode ? ambulanceUnits.find((u) => u.code === req.assignedUnitCode) : undefined;
    if (unit) updateAmbulanceUnit(unit.id, { status: 'Tersedia' });
    addToast(`Panggilan Ambulance ${req.requestNo} dibatalkan. Unit ${req.assignedUnitCode || ''} kembali tersedia.`, 'info');
  };

  // Filtered doctor bookings
  const filteredBookings = doctorBookings.filter((b) => {
    if (bookingFilterStatus === 'Semua') return true;
    return b.status === bookingFilterStatus;
  });

  // Service live activity counts
  const bookingReadyCount = doctorBookings.filter((b) => b.status === 'Terkonfirmasi').length;
  const groomingActiveCount = groomingSessions.filter((s) => s.stage !== 'Selesai').length;
  const hotelActiveCount = hotelReservations.filter((h) => h.status === 'Aktif').length;
  const telehealthActiveCount = telehealthSessions.filter((t) => t.status === 'Menunggu' || t.status === 'Berlangsung').length;
  const ambulanceStandbyCount = ambulanceUnits.filter((u) => u.status === 'Tersedia').length;

  const SERVICE_TABS = [
    { id: 'booking', label: 'Booking & Antrian', icon: CalendarCheck, count: bookingReadyCount, countLabel: 'siap' },
    { id: 'grooming', label: 'Grooming Salon', icon: Scissors, count: groomingActiveCount, countLabel: 'proses' },
    { id: 'petHotel', label: 'Pet Hotel Boarding', icon: Hotel, count: hotelActiveCount, countLabel: 'aktif' },
    { id: 'telehealth', label: 'Telehealth Video', icon: Video, count: telehealthActiveCount, countLabel: 'antre' },
    { id: 'ambulance', label: 'Ambulance Rescue', icon: Ambulance, count: ambulanceStandbyCount, countLabel: 'standby' }
  ] as const;

  return (
    <div className="space-y-4 pb-12">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={CalendarCheck}
        title="Pusat Kendali Layanan PetCare"
        description="Monitoring & manajemen antrian dokter hewan, jadwal salon grooming, kamar pet hotel, konsultasi video telehealth & armada ambulance rescue."
        badges={[
          { label: 'Live Hub Services', variant: 'emerald' },
          { label: `${doctorBookings.length} Booking`, variant: 'gold' },
          { label: `${hotelActiveCount} Kamar Hotel`, variant: 'blue' },
          { label: `${groomingActiveCount} Grooming Aktif`, variant: 'purple' },
          { label: `${ambulanceStandbyCount} Ambulance Siap`, variant: 'amber' }
        ]}
        tabs={[
          { id: 'booking', label: 'Booking & Antrian', icon: CalendarCheck, count: bookingReadyCount },
          { id: 'grooming', label: 'Grooming Salon', icon: Scissors, count: groomingActiveCount },
          { id: 'petHotel', label: 'Pet Hotel Boarding', icon: Hotel, count: hotelActiveCount },
          { id: 'telehealth', label: 'Telehealth Video', icon: Video, count: telehealthActiveCount },
          { id: 'ambulance', label: 'Ambulance Rescue', icon: Ambulance, count: ambulanceStandbyCount }
        ]}
        activeTab={currentTab}
        onTabChange={(tabId) => handleTabChange(tabId as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: BOOKING & ANTRIAN */}
      {/* ========================================================================= */}
      {currentTab === 'booking' && (
        <div className="space-y-4">
          {/* Sub-view Switcher: Drag-and-Drop Visual Calendar vs Data Table */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-[#B8905A]">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1B2A45] font-display">Manajemen Janji Temu & Antrean Pasien</h3>
                <p className="text-[11px] text-[#6B6656]">Kelola jadwal dokter secara visual dengan drag & drop atau tabel data</p>
              </div>
            </div>

            <div className="flex items-center bg-[#F6F1E6] p-1 rounded-xl border border-[#E1D6BE]">
              <button
                type="button"
                onClick={() => setBookingSubView('calendar')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  bookingSubView === 'calendar'
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Kalender Drag & Drop (Visual)</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingSubView('table')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  bookingSubView === 'table'
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabel Data List</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingSubView('kiosk')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  bookingSubView === 'kiosk'
                    ? 'bg-[#1B2A45] text-white shadow-2xs'
                    : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Kiosk Check-In & WA</span>
              </button>
            </div>
          </div>

          {/* Sub-view: Calendar / Table / Self Check-In Kiosk */}
          {bookingSubView === 'calendar' ? (
            <BookingCalendarView
              onCheckInToClinicQueue={handleCheckInBookingToQueue}
              setActiveModule={setActiveModule}
            />
          ) : bookingSubView === 'kiosk' ? (
            <KioskQueueModule />
          ) : (
            <div className="space-y-6">
              {/* Quick Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E1D6BE] shadow-2xs space-y-1">
                  <span className="text-xs text-[#6B6656] font-semibold">Total Janji Temu Hari Ini</span>
                  <p className="text-2xl font-extrabold text-[#1B2A45] font-display">{doctorBookings.length}</p>
                  <p className="text-[10px] text-emerald-700 font-medium">Terjadwal & Terkonfirmasi</p>
                </div>
                <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E1D6BE] shadow-2xs space-y-1">
                  <span className="text-xs text-[#6B6656] font-semibold">Siap Check-In</span>
                  <p className="text-2xl font-extrabold text-[#B8905A] font-display">
                    {doctorBookings.filter((b) => b.status === 'Terkonfirmasi').length}
                  </p>
                  <p className="text-[10px] text-[#6B6656]">Dapat dipindah ke Antrean Live</p>
                </div>
                <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E1D6BE] shadow-2xs space-y-1">
                  <span className="text-xs text-[#6B6656] font-semibold">Sudah Selesai Periksa</span>
                  <p className="text-2xl font-extrabold text-emerald-700 font-display">
                    {doctorBookings.filter((b) => b.status === 'Selesai').length}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Layanan Selesai</p>
                </div>
                <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E1D6BE] shadow-2xs space-y-1">
                  <span className="text-xs text-[#6B6656] font-semibold">Dibatalkan / Reschedule</span>
                  <p className="text-2xl font-extrabold text-rose-700 font-display">
                    {doctorBookings.filter((b) => b.status === 'Batal').length}
                  </p>
                  <p className="text-[10px] text-rose-600 font-medium">Slot Dibebaskan</p>
                </div>
              </div>

              {/* Action Bar & Filter */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Filter className="w-4 h-4 text-[#B8905A] shrink-0" />
                  <span className="text-xs font-bold text-[#1B2A45] shrink-0">Status:</span>
                  {['Semua', 'Terkonfirmasi', 'Menunggu', 'Selesai', 'Batal'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBookingFilterStatus(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        bookingFilterStatus === st
                          ? 'bg-[#1B2A45] text-[#FFFDF9]'
                          : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#E1D6BE]/60'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddBookingModal(true)}
                  className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Buat Janji Temu Baru
                </button>
              </div>

              {/* Dropdown Quick Selector for Booking Patients */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5 shrink-0">
                  <User className="w-4 h-4 text-[#B8905A]" /> Dropdown List Booking Pasien:
                </label>
                <div className="flex-1 max-w-xl">
                  <select
                    value={selectedBookingPatientId}
                    onChange={(e) => setSelectedBookingPatientId(e.target.value)}
                    className="w-full bg-[#F6F1E6] hover:bg-white text-[#1B2A45] text-xs font-bold rounded-lg px-3 py-2 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] shadow-2xs transition-all cursor-pointer"
                  >
                    {doctorBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingNo}: {b.petName} ({b.petSpecies}) • {b.customerName} @ {b.date} {b.timeSlot || 'Unscheduled'} [{b.status}]
                      </option>
                    ))}
                  </select>
                </div>
                {selectedBookingPatientId && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const b = doctorBookings.find((item) => item.id === selectedBookingPatientId);
                      if (!b) return null;
                      return (
                        <>
                          {b.status === 'Terkonfirmasi' && (
                            <button
                              type="button"
                              onClick={() => {
                                checkInDoctorBooking(b.id);
                                addToast(`Pasien ${b.petName} berhasil check-in ke antrean klinik!`, 'success');
                              }}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Check-in Pasien Ini
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bookings List Table */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
                  <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#B8905A]" /> Daftar Jadwal Booking Pasien
                  </h3>
                  <span className="text-xs text-[#6B6656]">Menampilkan {filteredBookings.length} Jadwal</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#22242B]">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">No. Booking</th>
                        <th className="p-3">Pasien & Pemilik</th>
                        <th className="p-3">Tanggal & Jam Slot</th>
                        <th className="p-3">Keluhan</th>
                        <th className="p-3">Dokter / Petugas</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi Operasional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F6F1E6]/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#1B2A45]">{b.bookingNo}</td>
                          <td className="p-3">
                            <span className="font-bold text-[#1B2A45] block">{b.petName} ({b.petSpecies})</span>
                            <span className="text-[11px] text-[#6B6656]">{b.customerName}</span>
                          </td>
                          <td className="p-3 font-semibold">
                            <span className="flex items-center gap-1 text-[#1B2A45]">
                              <Clock className="w-3.5 h-3.5 text-[#B8905A]" /> {b.date} @ {b.timeSlot || 'Belum Terjadwal'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-[#E1D6BE]/40 text-[#1B2A45] font-semibold text-[11px]">
                              {b.complaint}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{b.doctorName || 'Belum Ditugaskan'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'Terkonfirmasi'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : b.status === 'Menunggu'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : b.status === 'Selesai'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {b.status === 'Terkonfirmasi' && (
                                <button
                                  onClick={() => handleCheckInBookingToQueue(b)}
                                  className="px-2.5 py-1 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-[11px] rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-[#D9B98A]" /> Check-In Antrean
                                </button>
                              )}
                              {(() => {
                                const bookingCustomerPhone = customers.find((c) => c.id === b.customerId)?.phone;
                                if (!bookingCustomerPhone) return null;
                                return (
                                  <a
                                    href={`https://wa.me/${bookingCustomerPhone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Halo Kak ${b.customerName}, mengingatkan jadwal periksa ${b.petName} pada ${b.date} pukul ${b.timeSlot || 'segera'} di Klinik PetCare ERP. Terima kasih!`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1"
                                  >
                                    <Smartphone className="w-3 h-3" /> WA Reminder
                                  </a>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GROOMING SALON */}
      {/* ========================================================================= */}
      {currentTab === 'grooming' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#B8905A]" /> Grooming Pipeline & Stage Tracker
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pantau progres pengerjaan salon & spa anabul secara live dari penyerahan hingga siap dijemput.
              </p>
            </div>
            <button
              onClick={() => setShowAddGroomingModal(true)}
              className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Masukkan Pasien Grooming
            </button>
          </div>

          {/* Kanban / Stage Pipeline Board */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
            {stageOrder.map((stage, idx) => {
              const sessionsInStage = groomingSessions.filter((s) => s.stage === stage);

              return (
                <div key={stage} className="bg-[#F6F1E6] rounded-2xl border border-[#E1D6BE] p-3 space-y-3 shrink-0 min-w-[200px]">
                  <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
                    <span className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider">
                      {idx + 1}. {stage}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1B2A45] text-[#D9B98A] font-bold text-[10px]">
                      {sessionsInStage.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sessionsInStage.length === 0 ? (
                      <p className="text-[11px] text-[#6B6656] text-center py-6 italic">Kosong</p>
                    ) : (
                      sessionsInStage.map((s) => (
                        <div key={s.id} className="bg-[#FFFDF9] rounded-xl p-3 border border-[#E1D6BE] shadow-2xs space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-[#1B2A45] text-sm">{s.petName}</span>
                            <span className="text-[10px] text-[#B8905A] font-semibold">{s.groomerName}</span>
                          </div>

                          <p className="text-[11px] text-[#6B6656]">Paket: <strong>{s.packageType}</strong></p>
                          {s.notes && (
                            <p className="text-[10px] text-[#22242B] bg-[#F6F1E6] p-1.5 rounded border border-[#E1D6BE]">
                              {s.notes}
                            </p>
                          )}

                          {stage !== 'Selesai' && (
                            <button
                              onClick={() => handleAdvanceGroomingStage(s)}
                              className="w-full py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-[11px] rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1 mt-1"
                            >
                              Lanjut ke {stageOrder[idx + 1]} <ChevronRight className="w-3 h-3 text-[#D9B98A]" />
                            </button>
                          )}
                          {stage === 'Selesai' && (
                            <div className="space-y-1 mt-1">
                              <span className="w-full py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded block text-center border border-emerald-300">
                                ✓ Siap Diambil Pemilik
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDiaryPetId(s.petId);
                                  setShowDiaryModal(true);
                                }}
                                className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Kirim Foto Hasil ke WA</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Before & After Showcase Gallery */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <Sparkles className="w-4 h-4 text-[#B8905A]" /> Galeri Transformasi Before / After Grooming
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { pet: 'Mimi (Persia Medium)', service: 'Full Grooming & Lion Cut', groomer: 'Agus P.', before: 'Bulu gimbal & kusam', after: 'Wangi, bersih & terawat' },
                { pet: 'Rocky (Golden Retriever)', service: 'Mandi Jamur & Blower Heavy Duty', groomer: 'Rudi H.', before: 'Bulu basah & berbau', after: 'Bulu halus berseri' },
                { pet: 'Luna (Poodle Cut)', service: 'Teddy Bear Style Cut & Ear Cleaning', groomer: 'Agus P.', before: 'Bulu menutupi mata', after: 'Cute Teddy Bear haircut' }
              ].map((item, i) => (
                <div key={i} className="bg-[#F6F1E6] rounded-xl p-4 border border-[#E1D6BE] space-y-2">
                  <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-1">
                    <span className="font-bold text-xs text-[#1B2A45]">{item.pet}</span>
                    <span className="text-[10px] font-bold text-[#B8905A]">{item.groomer}</span>
                  </div>
                  <p className="text-[11px] text-[#6B6656]">{item.service}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="bg-rose-50 text-rose-800 p-2 rounded border border-rose-200">
                      <strong>Before:</strong> {item.before}
                    </div>
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-200">
                      <strong>After:</strong> {item.after}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PET HOTEL BOARDING */}
      {/* ========================================================================= */}
      {currentTab === 'petHotel' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <Hotel className="w-4 h-4 text-[#B8905A]" /> Manajemen Penitipan & Rawat Boarding
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pengelolaan reservasi kamar, jadwal makan harian, serta integrasi CCTV live stream untuk pemilik.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddMonitoringModal(true)}
                className="px-3.5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
              >
                <Utensils className="w-4 h-4 text-[#D9B98A]" /> + Log Monitoring Harian
              </button>
              <button
                onClick={() => setShowAddHotelModal(true)}
                className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Check-In Boarding Baru
              </button>
            </div>
          </div>

          {/* Active Hotel Guests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotelReservations.map((res) => (
              <div key={res.id} className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-start border-b border-[#E1D6BE] pb-2">
                  <div>
                    <span className="font-bold text-[#1B2A45] text-base block">{res.petName}</span>
                    <span className="text-[11px] text-[#6B6656]">Pemilik: {res.customerName}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1B2A45] text-[#D9B98A] text-[10px] font-bold rounded-lg border border-[#B8905A]/30">
                    {res.roomNo}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE]">
                  <p className="flex justify-between">
                    <span className="text-[#6B6656]">Tipe Kamar:</span>
                    <span className="font-bold text-[#1B2A45]">{res.roomType}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#6B6656]">Periode Stay:</span>
                    <span className="font-semibold text-[#1B2A45]">{res.checkInDate} s/d {res.checkOutDate}</span>
                  </p>
                  {res.notes && (
                    <p className="pt-1 text-[11px] text-[#22242B] border-t border-[#E1D6BE]">
                      <strong>Catatan Pakan:</strong> {res.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => setSelectedCCTV(res.petName)}
                    className="flex-1 py-2 bg-[#101A2C] hover:bg-[#101A2C]/80 text-[#D9B98A] border border-[#B8905A]/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Tv className="w-3.5 h-3.5" /> CCTV Stream Live
                  </button>
                  <button
                    onClick={() => {
                      // Reservasi Pet Hotel sebelumnya tidak pernah membuat
                      // invoice sama sekali — tamu check-out tanpa tagihan
                      // yang pernah tercatat. Sekarang diteruskan ke Kasir
                      // sebagai invoice 'Belum Dibayar' saat check-out.
                      const pet = pets.find((p) => p.id === res.petId);
                      const cust = customers.find((c) => c.id === pet?.customerId);
                      addInvoice({
                        customerId: cust?.id || 'guest',
                        customerName: res.customerName,
                        petName: res.petName,
                        items: [
                          {
                            id: 'inv_item_' + Date.now() + Math.random(),
                            category: 'Pet Hotel',
                            name: `Boarding ${res.roomType} (${res.totalNights} malam) - ${res.petName}`,
                            quantity: res.totalNights,
                            unitPrice: res.dailyRate,
                            totalPrice: res.totalCost
                          }
                        ],
                        subtotal: res.totalCost,
                        discountAmount: 0,
                        totalAmount: res.totalCost,
                        paidAmount: 0,
                        paymentMethod: 'Tunai',
                        status: 'Belum Dibayar',
                        loyaltyPointsEarned: 0,
                        cashierName: 'Staf Pet Hotel'
                      });
                      updateHotelStatus(res.id, 'Selesai');
                      addToast(`Pasien ${res.petName} check-out. Tagihan Rp ${res.totalCost.toLocaleString('id-ID')} diteruskan ke Kasir.`, 'success');
                    }}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
                  >
                    Check-Out
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Monitoring History */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <Pill className="w-4 h-4 text-[#B8905A]" /> Rekam Catatan Pengawasan & Pakan Harian
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#22242B]">
                <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Nama Pasien</th>
                    <th className="p-3">Nomor Kamar</th>
                    <th className="p-3">Pakan Pagi / Sore</th>
                    <th className="p-3">Catatan Observasi</th>
                    <th className="p-3">Petugas Jaga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1D6BE]">
                  {dailyMonitorings.map((m) => (
                    <tr key={m.id}>
                      <td className="p-3 font-semibold text-[#1B2A45]">{m.date}</td>
                      <td className="p-3 font-bold text-[#1B2A45]">{m.petName}</td>
                      <td className="p-3">{m.roomNo}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {m.morningFeeding ? 'Pagi ✓' : '-'} | {m.eveningFeeding ? 'Sore ✓' : '-'}
                        </span>
                      </td>
                      <td className="p-3">{m.notes}</td>
                      <td className="p-3 font-medium text-[#6B6656]">{m.staffName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TELEHEALTH VIDEO CONSULTATION */}
      {/* ========================================================================= */}
      {currentTab === 'telehealth' && (
        <div className="space-y-6">
          {/* Active Call Room if active */}
          {activeCallSession ? (
            <div className="bg-[#101A2C] rounded-2xl p-6 border-2 border-[#B8905A] text-[#FFFDF9] shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#B8905A]/30 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] uppercase rounded animate-pulse">
                    ● TELEHEALTH LIVE CALL IN PROGRESS
                  </span>
                  <h3 className="text-xl font-extrabold mt-1 text-[#FFFDF9] font-display">
                    Konsultasi Video: {activeCallSession.petName} ({activeCallSession.customerName})
                  </h3>
                  <p className="text-xs text-[#D9B98A]">Dokter Penanggung Jawab: {activeCallSession.doctorName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`p-3 rounded-xl border font-bold transition-all ${
                      isMicMuted ? 'bg-rose-600 border-rose-500 text-white' : 'bg-[#1B2A45] border-[#B8905A]/40 text-[#D9B98A]'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-3 rounded-xl border font-bold transition-all ${
                      isVideoOff ? 'bg-rose-600 border-rose-500 text-white' : 'bg-[#1B2A45] border-[#B8905A]/40 text-[#D9B98A]'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleEndTelehealthCall}
                    className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    Akhiri Panggilan Video
                  </button>
                </div>
              </div>

              {/* Video Screen & Doctor Notes Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Feed Simulation */}
                <div className="lg:col-span-2 bg-[#1B2A45] rounded-2xl h-80 relative flex items-center justify-center border border-[#B8905A]/40 overflow-hidden shadow-inner">
                  {isVideoOff ? (
                    <div className="text-center space-y-2">
                      <VideoOff className="w-12 h-12 text-[#6B6656] mx-auto" />
                      <p className="text-xs text-[#EDE6D6]/70">Kamera Dokter Dimatikan</p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="bg-black/60 px-3 py-1 rounded-full text-[#D9B98A] font-bold border border-[#B8905A]/40">
                          HD 1080p | Latency 18ms
                        </span>
                        <span className="bg-amber-600/80 px-2.5 py-0.5 rounded text-white font-bold text-[10px]">
                          Vitals tidak terukur otomatis — catat manual dari observasi visual di kolom Anamnesa
                        </span>
                      </div>

                      <div className="text-center my-auto space-y-2">
                        <div className="w-20 h-20 rounded-full bg-[#B8905A]/20 border-2 border-[#B8905A] mx-auto flex items-center justify-center text-3xl animate-pulse">
                          🐾
                        </div>
                        <p className="text-sm font-bold text-white">Live Stream Kamera Pasien ({activeCallSession.petName})</p>
                      </div>

                      <div className="bg-black/60 p-2.5 rounded-xl border border-white/10 text-xs">
                        <span className="text-[#D9B98A] font-bold block">Keluhan Pemilik:</span>
                        <span className="text-white/90">{activeCallSession.complaint}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instant SOAP & E-Prescription Form */}
                <div className="bg-[#1B2A45] rounded-2xl p-5 border border-[#B8905A]/40 space-y-3 text-xs">
                  <h4 className="font-bold text-sm text-[#D9B98A] font-display flex items-center gap-2 border-b border-[#B8905A]/30 pb-2">
                    <FileText className="w-4 h-4 text-[#B8905A]" /> E-Prescription & Catatan Medis Live
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[#EDE6D6]/80 font-medium">Anamnesa & Observasi Visual</label>
                    <textarea
                      rows={2}
                      value={teleNotes}
                      onChange={(e) => setTeleNotes(e.target.value)}
                      className="w-full p-2 bg-[#101A2C] rounded-lg border border-[#B8905A]/30 text-white focus:outline-none focus:border-[#B8905A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#EDE6D6]/80 font-medium">Diagnosa Sementara Dokter</label>
                    <input
                      type="text"
                      value={teleDiagnosis}
                      onChange={(e) => setTeleDiagnosis(e.target.value)}
                      className="w-full p-2 bg-[#101A2C] rounded-lg border border-[#B8905A]/30 text-white focus:outline-none focus:border-[#B8905A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#EDE6D6]/80 font-medium">Resep Obat Digital (E-Prescription) — Instruksi Pakai</label>
                    <textarea
                      rows={2}
                      value={telePrescription}
                      onChange={(e) => setTelePrescription(e.target.value)}
                      className="w-full p-2 bg-[#101A2C] rounded-lg border border-[#B8905A]/30 text-white focus:outline-none focus:border-[#B8905A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#EDE6D6]/80 font-medium">Obat dari Stok Apotek (memotong stok saat dikirim)</label>
                    <div className="flex gap-1.5">
                      <select
                        value={teleDrugPickId}
                        onChange={(e) => setTeleDrugPickId(e.target.value)}
                        className="flex-1 p-2 bg-[#101A2C] rounded-lg border border-[#B8905A]/30 text-white text-xs"
                      >
                        {drugs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} (Stok: {d.stock} {d.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={teleDrugPickQty}
                        onChange={(e) => setTeleDrugPickQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 p-2 bg-[#101A2C] rounded-lg border border-[#B8905A]/30 text-white text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={handleAddTeleDrug}
                        className="px-3 bg-[#B8905A]/30 hover:bg-[#B8905A]/50 text-[#D9B98A] rounded-lg text-xs font-bold"
                      >
                        + Tambah
                      </button>
                    </div>
                    {telePrescribedDrugs.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {telePrescribedDrugs.map((rx, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-[#101A2C] px-2.5 py-1.5 rounded-lg text-[11px]">
                            <span className="text-white">{rx.drugName} × {rx.qty}</span>
                            <button type="button" onClick={() => handleRemoveTeleDrug(idx)} className="text-rose-400 hover:text-rose-300 font-bold">
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (!activeCallSession) return;
                      const cust = customers.find((c) => c.id === activeCallSession.customerId);
                      if (!cust?.phone) {
                        addToast('Nomor WhatsApp pelanggan tidak ditemukan di data pelanggan.', 'error');
                        return;
                      }

                      // Potong stok apotek untuk tiap obat terstruktur & catat
                      // ke rekam medis pasien — sebelumnya resep cuma teks WA
                      // yang hilang begitu terkirim, stok tidak pernah
                      // berkurang.
                      telePrescribedDrugs.forEach((rx) => dispenseDrug(rx.drugId, rx.qty));
                      if (addMedicalRecord) {
                        addMedicalRecord({
                          petId: activeCallSession.petId,
                          date: new Date().toISOString().substring(0, 10),
                          type: 'Tindakan',
                          title: `Resep Telehealth - ${activeCallSession.petName}`,
                          description: `Diagnosa sementara: ${teleDiagnosis}. Instruksi: ${telePrescription}.${telePrescribedDrugs.length > 0 ? ` Obat dipotong dari stok apotek: ${telePrescribedDrugs.map((rx) => `${rx.drugName} x${rx.qty}`).join(', ')}.` : ''}`,
                          performedBy: activeCallSession.doctorName
                        });
                      }

                      const text = `Halo Kak ${activeCallSession.customerName}! 🐾 Resep digital untuk ${activeCallSession.petName} dari sesi Telehealth:\n\n${telePrescription}\n\nSilakan tebus di Apotek Klinik PetCare. Terima kasih!`;
                      const outcome = await sendWhatsAppNotification(cust.phone, text);
                      addToast(
                        outcome.auto
                          ? `Resep Obat Digital terkirim otomatis ke Apotek Klinik & WA ${activeCallSession.customerName}!`
                          : `Resep Obat Digital dikirim via WA ke ${activeCallSession.customerName}...`,
                        outcome.auto ? 'success' : 'info'
                      );
                    }}
                    className="w-full py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Send className="w-4 h-4" /> Kirim Resep ke Apotek Klinik
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Action */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#B8905A]" /> Jadwal Konsultasi Telehealth Video
                  </h3>
                  <p className="text-xs text-[#6B6656] mt-0.5">
                    Layanan periksa kesehatan anabul jarak jauh melalui panggilan video terenskripsi.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddTeleModal(true)}
                  className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Buat Jadwal Telehealth
                </button>
              </div>

              {/* Telehealth Sessions Table */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#22242B]">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">No. Sesi</th>
                        <th className="p-3">Pasien & Pemilik</th>
                        <th className="p-3">Waktu Terjadwal</th>
                        <th className="p-3">Keluhan Pasien</th>
                        <th className="p-3">Dokter Penanggung Jawab</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]">
                      {telehealthSessions.map((th) => (
                        <tr key={th.id}>
                          <td className="p-3 font-mono font-bold text-[#1B2A45]">{th.sessionNo}</td>
                          <td className="p-3 font-bold text-[#1B2A45]">
                            {th.petName} <span className="text-[#6B6656] font-normal">({th.customerName})</span>
                          </td>
                          <td className="p-3 font-medium">{th.date} @ {th.timeSlot}</td>
                          <td className="p-3 text-[#22242B]">{th.complaint}</td>
                          <td className="p-3 font-medium">{th.doctorName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                th.status === 'Menunggu'
                                  ? 'bg-amber-100 text-amber-800'
                                  : th.status === 'Berlangsung'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {th.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {th.status !== 'Selesai' && th.status !== 'Dibatalkan' && (
                              <button
                                onClick={async () => {
                                  try {
                                    if (th.operationId) {
                                      await transitionOperationTelehealthSession(th.operationId, 'waiting_room', 'Dokter membuka ruang tunggu.');
                                      await transitionOperationTelehealthSession(th.operationId, 'in_progress', 'Konsultasi dimulai.');
                                    }
                                  } catch (error: any) {
                                    addToast(error.message || 'Sesi tidak dapat dimulai di server.', 'error');
                                    return;
                                  }
                                  updateTelehealthStatus(th.id, 'Berlangsung');
                                  setActiveCallSession(th);
                                  addToast(`Memulai sesi video call dengan ${th.petName}...`, 'info');
                                }}
                                className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 justify-end ml-auto"
                              >
                                <Video className="w-3.5 h-3.5 text-[#D9B98A]" /> Masuk Room Video
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AMBULANCE RESCUE DISPATCHER */}
      {/* ========================================================================= */}
      {currentTab === 'ambulance' && (
        <div className="space-y-6">
          {/* Emergency Alert Dispatch Header */}
          <div className="bg-[#1B2A45] rounded-2xl p-5 border-2 border-rose-500/50 text-[#FFFDF9] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] uppercase rounded-full tracking-wider animate-pulse">
                EMERGENCY RESCUE DISPATCHER 24/7
              </span>
              <h3 className="text-xl font-extrabold mt-1 text-[#FFFDF9] font-display">
                Layanan Penyelamatan & Ambulance Darurat Hewan
              </h3>
              <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
                Pusat komando pemanggilan ambulance darurat dengan GPS tracking lokasi penjemputan & triase medis.
              </p>
            </div>

            <button
              onClick={() => setShowAddAmbulanceModal(true)}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 animate-bounce"
            >
              <ShieldAlert className="w-4 h-4" /> TERIMA PANGGULAN DARURAT
            </button>
          </div>

          {/* Active Ambulance Fleet Units Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ambulanceUnits.map((unit) => (
              <div key={unit.id} className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
                  <div className="flex items-center gap-2">
                    <Ambulance className="w-5 h-5 text-rose-600" />
                    <div>
                      <h4 className="font-bold text-sm text-[#1B2A45]">{unit.code} ({unit.vehicleName})</h4>
                      <p className="text-[11px] text-[#6B6656]">Pengemudi: {unit.currentDriver} | Paramedis: {unit.currentParamedic}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      unit.status === 'Tersedia'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-[#22242B]">
                  <p>Nomor Polisi: <strong>{unit.plateNo}</strong></p>
                  <p>Ketersediaan Peralatan: <strong>{unit.equipmentStatus}</strong></p>
                  <p className="text-[10px] text-[#6B6656] pt-1">
                    Fasilitas: Oksigen Medis, Stretcher Hewan, Standard First-Aid Kit, Vital Monitor.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Active Rescue Requests List & GPS Route Tracker */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <Navigation className="w-4 h-4 text-[#B8905A]" /> Status Dispatch Penjemputan Darurat Live
            </h3>

            <div className="divide-y divide-[#E1D6BE]">
              {ambulanceRequests.map((req) => (
                <div key={req.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-[#1B2A45] text-sm">{req.requestNo}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            req.urgency === 'Emergency'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {req.urgency}
                        </span>
                        {req.assignedUnitCode && (
                          <span className="px-2 py-0.5 bg-[#1B2A45] text-[#D9B98A] text-[10px] font-bold rounded">
                            Unit: {req.assignedUnitCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#1B2A45] mt-1">
                        Pelapor: {req.customerName} ({req.customerPhone})
                      </p>
                      <p className="text-xs text-[#6B6656] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" /> Lokasi Penjemputan: {req.pickupAddress}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-[#F6F1E6] border border-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg">
                        Status: {req.status}
                      </span>
                      {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                        <>
                          <button
                            onClick={() => handleUpdateAmbulanceStage(req.id, req.status)}
                            className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1"
                          >
                            Update Status Dispatch <ChevronRight className="w-3.5 h-3.5 text-[#D9B98A]" />
                          </button>
                          <button
                            onClick={() => handleCancelAmbulanceRequest(req)}
                            className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-rose-50 text-rose-600 border border-rose-300 font-bold text-xs rounded-lg shadow-2xs transition-all"
                          >
                            Batalkan
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Simulated GPS Route & ETA */}
                  <div className="bg-[#101A2C] p-4 rounded-xl border border-[#B8905A]/30 text-[#FFFDF9] text-xs flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400 font-bold">
                        GPS
                      </div>
                      <div>
                        <p className="font-bold text-[#D9B98A]">Simulasi GPS Live Dispatch</p>
                        <p className="text-[11px] text-[#EDE6D6]/80">
                          Jarak: 3.2 km | Kecepatan Rata-rata 45 km/jam | Sirena Aktif
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono bg-[#1B2A45] px-4 py-2 rounded-lg border border-[#B8905A]/30">
                      <span className="text-[10px] text-[#EDE6D6]/70 uppercase block">ESTIMASI TIBA (ETA)</span>
                      <span className="text-lg font-extrabold text-[#D9B98A]">7 MENIT</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal Add Booking */}
      {showAddBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#B8905A]" /> Buat Janji Temu Pasien Baru
              </h3>
              <button
                onClick={() => setShowAddBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tipe Layanan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Dokter', 'Grooming', 'Pet Hotel'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBookingType(t)}
                      className={`py-2 rounded-lg font-bold border transition-all ${
                        bookingType === t
                          ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45]'
                          : 'bg-[#F6F1E6] text-[#22242B] border-[#E1D6BE]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Pelanggan / Pemilik</label>
                <select
                  value={bookingCustId}
                  onChange={(e) => setBookingCustId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Hewan Peliharaan</label>
                <select
                  value={bookingPetId}
                  onChange={(e) => setBookingPetId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium"
                >
                  {custPets.length > 0 ? (
                    custPets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species} - {p.breed})
                      </option>
                    ))
                  ) : (
                    <option value="">Tidak ada hewan (Pilih hewan lain)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">
                  {bookingType === 'Grooming' ? 'Pilih Groomer' : bookingType === 'Pet Hotel' ? 'Pilih Petugas Pet Hotel' : 'Pilih Dokter Hewan'}
                </label>
                {eligibleProviders.length > 0 ? (
                  <select
                    value={selectedProvider?.id || ''}
                    onChange={(e) => setBookingProviderId(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium"
                  >
                    {eligibleProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sipNumber ? ` (SIP: ${p.sipNumber})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    Belum ada staf aktif untuk peran ini di Master Data / SDM & Shift Kerja.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Jam Slot</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  >
                    {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((time) => (
                      <option key={time} value={time}>
                        {time} WIB
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Keluhan / Catatan Khusus</label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold rounded-lg shadow-md"
                >
                  Simpan Jadwal Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Add Grooming */}
      {showAddGroomingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#B8905A]" /> Masukkan Pasien Grooming Baru
              </h3>
              <button onClick={() => setShowAddGroomingModal(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroomingSession} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Pasien Anabul</label>
                <select
                  value={groomingPetId}
                  onChange={(e) => setGroomingPetId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species} - {p.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Paket Grooming</label>
                <select
                  value={groomingPackage}
                  onChange={(e) => setGroomingPackage(e.target.value as any)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  <option value="Basic">Mandi Sehat Basic (Rp 75.000)</option>
                  <option value="Regular">Mandi Jamur & Kutu Medicated (Rp 120.000)</option>
                  <option value="Premium">Grooming Lengkap & Potong Bulu (Rp 180.000)</option>
                  <option value="Medicinal">Spa & Aromatherapy Cat/Dog (Rp 250.000)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Groomer Penanggung Jawab</label>
                <select
                  value={selectedGroomer?.id || ''}
                  onChange={(e) => setGroomerId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  <option value="" disabled>
                    {eligibleGroomers.length === 0 ? 'Belum ada groomer aktif di Master Data' : 'Pilih groomer...'}
                  </option>
                  {eligibleGroomers.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Catatan Kondisi Bulu / Kulit Initial</label>
                <textarea
                  rows={2}
                  value={coatNotes}
                  onChange={(e) => setCoatNotes(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroomingModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#B8905A] text-white font-bold rounded-lg shadow-md">
                  Mulai Antrean Grooming
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Add Hotel Reservation */}
      {showAddHotelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Hotel className="w-5 h-5 text-[#B8905A]" /> Check-In Pet Hotel Boarding
              </h3>
              <button onClick={() => setShowAddHotelModal(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHotelReservation} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Pasien Anabul</label>
                <select
                  value={hotelPetId}
                  onChange={(e) => setHotelPetId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species} - {p.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tipe Kamar Boarding</label>
                <select
                  value={hotelRoomType}
                  onChange={(e) => setHotelRoomType(e.target.value as any)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  <option value="Regular">Regular (Kandang A)</option>
                  <option value="Small">Small (Kandang Kecil)</option>
                  <option value="Medium">Medium (Kandang Sedang)</option>
                  <option value="Large">Large (Kandang Besar)</option>
                  <option value="VIP">VIP Suite</option>
                  <option value="VIP AC">VIP AC Suite</option>
                  <option value="VIP CCTV">VIP AC & CCTV Live Stream</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tgl Check-In</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tgl Check-Out</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Instruksi Pakan / Khusus</label>
                <input
                  type="text"
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHotelModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#B8905A] text-white font-bold rounded-lg shadow-md">
                  Proses Check-In Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Add Daily Monitoring */}
      {showAddMonitoringModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#B8905A]" /> Catat Monitoring Pakan & Kesehatan
              </h3>
              <button onClick={() => setShowAddMonitoringModal(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDailyMonitoring} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Pasien Inap</label>
                <select
                  value={selectedResId}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  {hotelReservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.petName} ({r.roomNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Status Pakan</label>
                <select
                  value={feedStatus}
                  onChange={(e) => setFeedStatus(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  <option value="Habis 100%">Habis 100%</option>
                  <option value="Makan 50%">Makan 50%</option>
                  <option value="Tidak Mau Makan">Tidak Mau Makan</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Status Buang Air</label>
                <input
                  type="text"
                  value={pottyStatus}
                  onChange={(e) => setPottyStatus(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Observasi Perilaku</label>
                <input
                  type="text"
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMonitoringModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1B2A45] text-white font-bold rounded-lg shadow-md">
                  Simpan Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Add Telehealth */}
      {showAddTeleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-3">
              <h3 className="font-extrabold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Video className="w-5 h-5 text-[#B8905A]" /> Buat Jadwal Telehealth Video Call
              </h3>
              <button onClick={() => setShowAddTeleModal(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeleSession} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Pasien Anabul</label>
                <select
                  value={telePetId}
                  onChange={(e) => setTelePetId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species} - {p.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Dokter Bertugas</label>
                <select
                  value={selectedTeleDoctor?.id || ''}
                  onChange={(e) => setTeleDoctorId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  <option value="" disabled>
                    {eligibleTeleDoctors.length === 0 ? 'Belum ada dokter aktif di Master Data' : 'Pilih dokter...'}
                  </option>
                  {eligibleTeleDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={teleDate}
                    onChange={(e) => setTeleDate(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Jam</label>
                  <input
                    type="time"
                    value={teleTimeSlot}
                    onChange={(e) => setTeleTimeSlot(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Durasi</label>
                  <select
                    value={teleDurationMinutes}
                    onChange={(e) => setTeleDurationMinutes(Number(e.target.value) as 15 | 30 | 45 | 60)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  >
                    <option value={15}>15 menit</option>
                    <option value={30}>30 menit</option>
                    <option value={45}>45 menit</option>
                    <option value={60}>60 menit</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Biaya Konsultasi (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={teleFee}
                    onChange={(e) => setTeleFee(Number(e.target.value))}
                    required
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Keluhan Pasien</label>
                <textarea
                  rows={2}
                  value={teleComplaints}
                  onChange={(e) => setTeleComplaints(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-[#E1D6BE] bg-[#F6F1E6] p-3 text-[11px] text-[#22242B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={teleConsent}
                  onChange={(e) => setTeleConsent(e.target.checked)}
                  className="mt-0.5 accent-[#B8905A]"
                />
                <span>
                  Pemilik telah menyetujui konsultasi jarak jauh, memahami keterbatasan pemeriksaan video, dan setuju kasus darurat dapat dialihkan ke klinik/ambulance.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeleModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#B8905A] text-white font-bold rounded-lg shadow-md">
                  Jadwalkan Sesi Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Add Ambulance Emergency Request */}
      {showAddAmbulanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border-2 border-rose-500 p-6 space-y-4 shadow-2xl text-[#22242B]">
            <div className="flex justify-between items-center border-b border-rose-200 pb-3">
              <h3 className="font-extrabold text-base text-rose-700 font-display flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" /> Panggilan Darurat Ambulance Rescue
              </h3>
              <button onClick={() => setShowAddAmbulanceModal(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAmbulanceRequest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nama Pelapor</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">No. HP Aktif</label>
                  <input
                    type="text"
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Hewan Peliharaan</label>
                <input
                  type="text"
                  value={emergencyPetName}
                  onChange={(e) => setEmergencyPetName(e.target.value)}
                  placeholder="cth. Milo"
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Unit Ambulance Tersedia</label>
                <select
                  value={ambulanceUnitId}
                  onChange={(e) => setAmbulanceUnitId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                >
                  {availableAmbulanceUnits.length === 0 && <option value="">Tidak ada unit tersedia</option>}
                  {availableAmbulanceUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} — {u.vehicleName} ({u.plateNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tingkat Darurat (Triase)</label>
                <select
                  value={emergencyLevel}
                  onChange={(e) => setEmergencyLevel(e.target.value as any)}
                  className="w-full p-2 bg-rose-50 rounded-lg border border-rose-300 font-bold text-rose-800"
                >
                  <option value="Emergency">Emergency (Kritis) - Pendarahan / Kejang / Trauma</option>
                  <option value="Urgent">Urgent (Sedang) - Lemah / Patah Tulang Ringan</option>
                  <option value="Normal">Normal (Stabil) - Transportasi Rutin</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Alamat Penjemputan / GPS</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Kondisi Darurat Pasien</label>
                <textarea
                  rows={2}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAmbulanceModal(false)}
                  className="px-4 py-2 bg-[#F6F1E6] text-[#1B2A45] font-bold rounded-lg border border-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg shadow-lg flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" /> LUNCURKAN AMBULANCE SEKARANG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CCTV Live Stream Simulation Modal */}
      {selectedCCTV && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#101A2C] rounded-2xl border-2 border-[#B8905A] p-6 space-y-4 shadow-2xl text-[#FFFDF9]">
            <div className="flex justify-between items-center border-b border-[#B8905A]/30 pb-3">
              <span className="font-bold text-sm text-[#D9B98A] flex items-center gap-2 font-display">
                <Tv className="w-4 h-4 text-emerald-400 animate-pulse" /> CCTV Live Stream - Kamar {selectedCCTV}
              </span>
              <button onClick={() => setSelectedCCTV(null)} className="text-gray-400 font-bold hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-[#1B2A45] rounded-xl h-64 border border-[#B8905A]/40 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
              <div className="flex justify-between items-center text-[10px] text-[#D9B98A] font-mono">
                <span className="bg-black/60 px-2 py-0.5 rounded border border-white/10">CAM-04 (VIP ROOM)</span>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">● LIVE 30 FPS</span>
              </div>

              <div className="text-center my-auto space-y-2">
                <div className="w-16 h-16 rounded-full bg-[#B8905A]/20 border border-[#B8905A] mx-auto flex items-center justify-center text-2xl animate-bounce">
                  🐱
                </div>
                <p className="text-xs font-bold text-white">Anabul {selectedCCTV} sedang tidur nyenyak di kasur empuk</p>
                <p className="text-[10px] text-[#D9B98A]">Suhu Ruangan AC: 24.5°C | Kelembaban: 55%</p>
              </div>

              <div className="text-[10px] text-gray-400 text-right font-mono">
                2026-08-11 18:00:12 WIB
              </div>
            </div>

            <button
              onClick={() => setSelectedCCTV(null)}
              className="w-full py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Tutup Kamera CCTV
            </button>
          </div>
        </div>
      )}

      {/* Daily Pet Diary Modal */}
      {showDiaryModal && (
        <DailyPetDiaryModal
          onClose={() => setShowDiaryModal(false)}
          defaultPetId={diaryPetId}
          defaultServiceType="Grooming & Salon"
        />
      )}
    </div>
  );
};
