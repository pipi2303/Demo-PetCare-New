import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ClinicVisit, Pet, Customer, VisitStatus } from '../../types';
import { getIndonesianFemaleVoice, playHospitalChime } from '../../utils/audioVoiceUtils';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';
import QRCode from 'qrcode';
import {
  QrCode,
  Camera,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Dog,
  Cat,
  Stethoscope,
  Ticket,
  Printer,
  Share2,
  Sparkles,
  Zap,
  Phone,
  Calendar,
  HeartPulse,
  Syringe,
  FileText,
  RefreshCw,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Volume2,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface SmartPatientCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPetId?: string;
  onCheckInSuccess?: (visit: ClinicVisit) => void;
  setActiveModule?: (moduleName: any) => void;
}

export const SmartPatientCheckInModal: React.FC<SmartPatientCheckInModalProps> = ({
  isOpen,
  onClose,
  initialPetId,
  onCheckInSuccess,
  setActiveModule
}) => {
  const {
    pets = [],
    customers = [],
    clinicVisits = [],
    addClinicVisit,
    doctorBookings = [],
    updateDoctorBookingStatus,
    employees = [],
    addAuditLog,
    addNotification
  } = useData();

  const { addToast } = useToast();

  // Modal active tabs
  const [activeTab, setActiveTab] = useState<'scanner' | 'patient_list' | 'qr_card'>('scanner');
  
  // Selected Patient State
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Check-in Configuration State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('d1');
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>('drh. Budi Santoso, M.Si');
  const [complaint, setComplaint] = useState<string>('Pemeriksaan Rutin & Konsultasi Sehat');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [patientWeight, setPatientWeight] = useState<string>('');
  
  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannerFlash, setScannerFlash] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSpecies, setFilterSpecies] = useState<'all' | 'Anjing' | 'Kucing' | 'Lainnya'>('all');

  // Step state: 'scan' | 'confirm' | 'success'
  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan');
  const [checkedInVisit, setCheckedInVisit] = useState<ClinicVisit | null>(null);

  // QR Code data URL cache
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');
  const [passportPet, setPassportPet] = useState<Pet | null>(null);
  const [passportQrUrl, setPassportQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Doctors on duty list
  const availableDoctors = [
    { id: 'd1', name: 'drh. Budi Santoso, M.Si', poli: 'Poli Medis 1 (Umum & Bedah)', status: 'Tersedia' },
    { id: 'd2', name: 'drh. Ananda Putri, Sp.KGV', poli: 'Poli Medis 2 (Kulit & Alergi)', status: 'Tersedia' },
    { id: 'd3', name: 'drh. Citra Kusuma, M.Sc', poli: 'Poli Medis 3 (Penyakit Dalam)', status: 'Konsultasi' },
    { id: 'd4', name: 'drh. Denny Prasetyo', poli: 'Poli Medis 4 (Vaksinasi & Sehat)', status: 'Tersedia' }
  ];

  // Quick complaint presets
  const quickComplaints = [
    { label: '🩺 Pemeriksaan Rutin & Sehat', val: 'Pemeriksaan Rutin & Konsultasi Sehat' },
    { label: '💉 Kontrol Vaksinasi Booster', val: 'Vaksinasi Tahunan / Booster & Obat Cacing' },
    { label: '🤢 Muntah & Lemas (Pencernaan)', val: 'Muntah, Lemas, dan Penurunan Nafsu Makan Akut' },
    { label: '🐾 Gatal & Rontok (Kulit)', val: 'Gatal-gatal, Lesi Kulit, dan Kerontokan Bulu' },
    { label: '🤧 Flu / Batuk Anabul', val: 'Gejala Flu, Bersin, Batuk, dan Keluar Cairan Hidung' },
    { label: '🚨 Gawat Darurat / Trauma', val: 'Kondisi Darurat: Trauma Akut / Sesak Napas Berat', emergency: true }
  ];

  // Initialize with initialPetId if provided
  useEffect(() => {
    if (initialPetId && isOpen) {
      const found = pets.find((p) => p.id === initialPetId);
      if (found) {
        handleSelectPet(found);
      }
    }
  }, [initialPetId, isOpen, pets]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setCheckedInVisit(null);
      setManualCodeInput('');
      setIsScanning(true);
      if (!passportPet && pets.length > 0) {
        setPassportPet(pets[0]);
      }
    }
  }, [isOpen]);

  // Generate Passport QR whenever passportPet changes
  useEffect(() => {
    if (passportPet) {
      const qrPayload = JSON.stringify({
        type: 'PETCARE_PATIENT_QR',
        petId: passportPet.id,
        petName: passportPet.name,
        species: passportPet.species,
        breed: passportPet.breed,
        customerId: passportPet.customerId,
        microchip: passportPet.microchipNo || 'N/A'
      });

      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#101A2C',
          light: '#FFFFFF'
        }
      })
        .then((url) => setPassportQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [passportPet]);

  // Generate Ticket QR on check-in success
  useEffect(() => {
    if (checkedInVisit) {
      const ticketPayload = JSON.stringify({
        type: 'PETCARE_QUEUE_TICKET',
        visitNo: checkedInVisit.visitNo,
        queueNo: checkedInVisit.queueNo,
        petName: checkedInVisit.petName,
        doctorName: checkedInVisit.doctorName,
        status: checkedInVisit.status,
        queuedAt: checkedInVisit.queuedAt
      });

      QRCode.toDataURL(ticketPayload, {
        width: 250,
        margin: 1,
        color: {
          dark: '#101A2C',
          light: '#FFFFFF'
        }
      })
        .then((url) => setTicketQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [checkedInVisit]);

  if (!isOpen) return null;

  // Sound Chime generator using Web Audio API
  const playBeepSound = (type: 'beep' | 'success' = 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'beep') {
        // High-tech scanner recognition beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else {
        // 3-Tone Success Airport chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);
          gain.gain.setValueAtTime(0.2, now + idx * 0.16);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Audio context playback failed:', e);
    }
  };

  // Voice speech synthesis announcement with fluent Indonesian female voice
  const announceQueueSpeech = (ticketNo: string, petName: string, doctorName: string) => {
    playHospitalChime();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          const text = `Check-in mandiri berhasil. Nomor antrean, ${ticketNo}. Pasien, ${petName}. Silakan menunggu panggilan ${doctorName || 'dokter'} di ruang tunggu.`;
          const utterance = new SpeechSynthesisUtterance(text);
          const femaleVoice = getIndonesianFemaleVoice();
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          utterance.lang = 'id-ID';
          utterance.pitch = 1.1;
          utterance.rate = 0.92;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }, 650);
      } catch (e) {
        console.warn('Speech synthesis failed:', e);
      }
    }
  };

  // Select a pet and proceed to confirmation step
  const handleSelectPet = (pet: Pet) => {
    playBeepSound('beep');
    setSelectedPet(pet);
    setPatientWeight(pet.weightKg ? String(pet.weightKg) : '4.5');
    
    // Find customer
    const owner = customers.find((c) => c.id === pet.customerId) || {
      id: pet.customerId || 'c_default',
      name: 'Pemilik Terdaftar',
      phone: '081234567890',
      address: 'Alamat Klien Terdaftar',
      loyaltyPoints: 120,
      totalSpent: 1500000,
      petCount: 1,
      createdAt: '2025-01-01'
    };
    setSelectedCustomer(owner);

    // Check if there is an existing DoctorBooking for today to auto-link
    const todayBooking = doctorBookings.find(
      (b) => b.petId === pet.id && b.status !== 'Selesai' && b.status !== 'Batal'
    );
    if (todayBooking) {
      setSelectedDoctorId(todayBooking.doctorId);
      setSelectedDoctorName(todayBooking.doctorName);
      if (todayBooking.complaint) {
        setComplaint(todayBooking.complaint);
      }
    }

    setStep('confirm');
    addToast(`QR Pasien terdeteksi: ${pet.name} (${pet.species}) - ${owner.name}`, 'success');
  };

  // Decode/parse raw QR Code string or Manual Code
  const handleProcessQrCode = (rawCode: string) => {
    const cleaned = rawCode.trim();
    if (!cleaned) {
      addToast('Masukkan kode QR atau ID pasien terlebih dahulu.', 'error');
      return;
    }

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.petId) {
        const found = pets.find((p) => p.id === parsed.petId);
        if (found) {
          handleSelectPet(found);
          return;
        }
      }
    } catch (e) {
      // Not JSON, continue to string match
    }

    // Search by ID, Microchip, Name, or Owner Phone
    const matchedPet = pets.find(
      (p) =>
        p.id.toLowerCase() === cleaned.toLowerCase() ||
        (p.microchipNo && p.microchipNo.toLowerCase() === cleaned.toLowerCase()) ||
        p.name.toLowerCase() === cleaned.toLowerCase()
    );

    if (matchedPet) {
      handleSelectPet(matchedPet);
      return;
    }

    // Try searching by customer phone/name to get their pet
    const matchedCustomer = customers.find(
      (c) =>
        c.phone.includes(cleaned) ||
        c.name.toLowerCase().includes(cleaned.toLowerCase()) ||
        c.id.toLowerCase() === cleaned.toLowerCase()
    );

    if (matchedCustomer) {
      const custPet = pets.find((p) => p.customerId === matchedCustomer.id);
      if (custPet) {
        handleSelectPet(custPet);
        return;
      }
    }

    // Fallback: pick first pet if sample code
    if (cleaned.toLowerCase().includes('milo') || cleaned.toLowerCase().includes('demo')) {
      const milo = pets.find((p) => p.name.toLowerCase().includes('milo')) || pets[0];
      if (milo) {
        handleSelectPet(milo);
        return;
      }
    }

    addToast(`Data pasien tidak ditemukan untuk kode: "${cleaned}". Silakan pilih dari daftar pasien lama.`, 'error');
  };

  // Perform Final Smart Check-In -> Triggers 'Menunggu' (Waiting for Doctor)
  const handleExecuteCheckIn = async () => {
    if (!selectedPet || !selectedCustomer) {
      addToast('Data pasien tidak lengkap.', 'error');
      return;
    }

    const nextQueueNo = clinicVisits.length + 1;
    const finalComplaint = isEmergency ? `[🚨 GAWAT DARURAT] ${complaint}` : complaint;

    try {
      // Create the clinic visit with status: 'Menunggu' (Waiting for Doctor)
      const newVisit: ClinicVisit = await addClinicVisit({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        petId: selectedPet.id,
        petName: selectedPet.name,
        petSpecies: selectedPet.species,
        petBreed: selectedPet.breed,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        complaint: finalComplaint,
        slaMinutes: isEmergency ? 5 : 20
      });

      // Check if there is an existing DoctorBooking for today to auto-complete
      const todayBooking = doctorBookings.find(
        (b) => b.petId === selectedPet.id && b.status !== 'Selesai' && b.status !== 'Batal'
      );
      if (todayBooking) {
        updateDoctorBookingStatus(todayBooking.id, 'Selesai');
      }

      // Play chime & speak announcement
      playBeepSound('success');
      announceQueueSpeech(`A-${String(nextQueueNo).padStart(2, '0')}`, selectedPet.name, selectedDoctorName);

      // Audit log & notification
      addAuditLog(
        'Tambah',
        'Smart Check-In (QR EMR)',
        newVisit.visitNo,
        `Pasien ${selectedPet.name} (${selectedPet.species} - ${selectedCustomer.name}) berhasil check-in mandiri via QR Code ke dokter ${selectedDoctorName} [Status: Menunggu Dokter].`,
        { severity: isEmergency ? 'Kritis' : 'Info' }
      );

      addNotification({
        title: isEmergency ? '🚨 Pasien Darurat Masuk Antrean!' : 'Smart QR Check-in: Pasien Baru',
        message: `${selectedPet.name} (${selectedPet.species}) telah check-in ke ${selectedDoctorName} [Nomor: A-${String(nextQueueNo).padStart(2, '0')}].`,
        type: 'Antrean',
        priority: isEmergency ? 'Tinggi' : 'Sedang'
      });

      setCheckedInVisit(newVisit);
      setStep('success');

      if (onCheckInSuccess) {
        onCheckInSuccess(newVisit);
      }

      addToast(
        `Check-in Berhasil! Nomor Antrean: A-${String(nextQueueNo).padStart(2, '0')}. Status EMR & Antrean: Menunggu Dokter.`,
        'success'
      );
    } catch (err: any) {
      addToast(err?.message || 'Gagal melakukan check-in pasien.', 'error');
    }
  };

  // Filtered returning pets list
  const filteredPets = pets.filter((p) => {
    const cust = customers.find((c) => c.id === p.customerId);
    const ownerName = cust?.name || '';
    const ownerPhone = cust?.phone || '';
    
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.microchipNo && p.microchipNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerPhone.includes(searchQuery);

    const matchesSpecies =
      filterSpecies === 'all' ||
      (filterSpecies === 'Anjing' && p.species.toLowerCase().includes('anjing')) ||
      (filterSpecies === 'Kucing' && p.species.toLowerCase().includes('kucing')) ||
      (filterSpecies === 'Lainnya' && !p.species.toLowerCase().includes('anjing') && !p.species.toLowerCase().includes('kucing'));

    return matchesSearch && matchesSpecies;
  });

  // Kirim notifikasi WhatsApp (otomatis via Fonnte jika sudah terkonfigurasi, atau fallback tautan manual)
  const handleSendWhatsAppNotification = async () => {
    if (!checkedInVisit || !selectedCustomer) return;

    const text = `Halo Kak ${selectedCustomer.name}! 🐾\n\nCheck-in anabul *${checkedInVisit.petName}* di PetCare Clinic telah BERHASIL.\n\n` +
      `🎫 *Nomor Antrean:* A-${String(checkedInVisit.queueNo).padStart(2, '0')}\n` +
      `📋 *No. Registrasi:* ${checkedInVisit.visitNo}\n` +
      `🩺 *Dokter Jaga:* ${checkedInVisit.doctorName}\n` +
      `🕒 *Jam Check-in:* ${checkedInVisit.queuedAt} WIB\n` +
      `⏳ *Status:* Menunggu Panggilan Dokter\n\n` +
      `Mohon menunggu di ruang tunggu. Anda dapat memantau antrean live pada layar monitor klinik kami. Terima kasih! ✨`;

    const outcome = await sendWhatsAppNotification(selectedCustomer.phone, text);
    addToast(
      outcome.auto
        ? `Notifikasi WA terkirim otomatis ke ${selectedCustomer.name}.`
        : 'Membuka WhatsApp Gateway untuk notifikasi klien...',
      outcome.auto ? 'success' : 'info'
    );
  };

  // Direct print ticket slip
  const handlePrintSlip = () => {
    window.print();
    addToast('Memulai pencetakan struk tiket antrean fisik...', 'info');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#B8905A]/40 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] text-[#101A2C] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1B2A45] via-[#16233B] to-[#101A2C] border-b border-[#B8905A]/40 text-[#FFFDF9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-xs shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-[#FFFDF9]">
                  Smart Patient Check-in (QR Code & EMR)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 uppercase">
                  Instant Auto-Queue
                </span>
              </div>
              <p className="text-xs text-[#EDE6D6]/80">
                Pindai QR Digital Passport pasien lama untuk langsung memicu status <span className="text-[#D9B98A] font-bold">'Menunggu Dokter'</span> di EMR & Antrean Poli.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFFDF9] transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation if in 'scan' mode */}
        {step === 'scan' && (
          <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#E1D6BE]/60 bg-[#F6F1E6]/40 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'scanner'
                  ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
                  : 'border-transparent text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <Camera className="w-4 h-4 text-[#B8905A]" />
              <span>Live QR Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('patient_list')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'patient_list'
                  ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
                  : 'border-transparent text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <User className="w-4 h-4 text-[#B8905A]" />
              <span>Database Pasien Lama ({pets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr_card')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'qr_card'
                  ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
                  : 'border-transparent text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <QrCode className="w-4 h-4 text-[#B8905A]" />
              <span>Cetak / Paspor QR Anabul</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* ======================================================== */}
          {/* STEP 1: SCANNER OR PATIENT SELECTION                     */}
          {/* ======================================================== */}
          {step === 'scan' && activeTab === 'scanner' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Visual Viewfinder Camera Simulation */}
                <div className="md:col-span-6 bg-[#101A2C] rounded-2xl p-4 text-[#FFFDF9] relative overflow-hidden border border-[#B8905A]/40 shadow-inner flex flex-col items-center justify-between min-h-[300px]">
                  {/* Top viewfinder status bar */}
                  <div className="w-full flex items-center justify-between text-[11px] text-[#EDE6D6]/80 z-10">
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-mono font-bold text-emerald-300">CAMERA SENSOR: ONLINE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScannerFlash(!scannerFlash)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        scannerFlash
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                      }`}
                      title="Toggle Flash / Lighting"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Optical Reticle / Target Corners & Laser Sweep */}
                  <div className="relative my-4 w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-[#B8905A]/50 rounded-xl flex items-center justify-center bg-black/40 overflow-hidden group">
                    {/* Laser scanning line */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D9B98A] to-transparent shadow-[0_0_12px_#D9B98A] animate-[bounce_2s_infinite]" />

                    {/* Corner Reticles */}
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-[#B8905A] rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-[#B8905A] rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-[#B8905A] rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-[#B8905A] rounded-br-md" />

                    <div className="text-center p-3 space-y-1 z-10 pointer-events-none">
                      <QrCode className="w-10 h-10 text-[#B8905A]/80 mx-auto animate-pulse" />
                      <p className="text-[11px] font-bold text-[#FFFDF9]">Arahkan QR Paspor Pasien</p>
                      <p className="text-[9px] text-[#EDE6D6]/60">Deteksi QR digital / Barcode kartu fisik</p>
                    </div>
                  </div>

                  {/* Bottom Viewfinder controls */}
                  <div className="w-full text-center z-10">
                    <p className="text-[11px] text-[#EDE6D6]/70">
                      Sistem membaca ID Microchip, E-Passport Anabul, atau Member Card Klien.
                    </p>
                  </div>
                </div>

                {/* Right side: Fast Manual Code Entry & Quick Demo Tags */}
                <div className="md:col-span-6 space-y-4">
                  {/* Manual Code Input Box */}
                  <div className="bg-[#F6F1E6] p-4 rounded-xl border border-[#E1D6BE] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-[#B8905A]" />
                        Cari Manual (ID Pasien / No. HP / Microchip)
                      </label>
                      <span className="text-[10px] text-[#1B2A45]/60 font-mono">Scan / Ketik</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualCodeInput}
                        onChange={(e) => setManualCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleProcessQrCode(manualCodeInput);
                        }}
                        placeholder="Contoh: p1, Milo, 081234567890, atau CHIP-982..."
                        className="flex-1 px-3 py-2 text-xs bg-white text-[#101A2C] border border-[#E1D6BE] rounded-lg focus:outline-none focus:border-[#B8905A] font-mono font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleProcessQrCode(manualCodeInput)}
                        className="px-3 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#D9B98A]" />
                        Pindai
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Fast Demo QR Test Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" />
                        Simulasi Scan Kartu Pasien Demo (1-Click Test):
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                        Database Pasien Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pets.slice(0, 4).map((p) => {
                        const owner = customers.find((c) => c.id === p.customerId);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPet(p)}
                            className="p-2.5 bg-white hover:bg-[#F6F1E6] text-left rounded-xl border border-[#E1D6BE] hover:border-[#B8905A] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-xs shrink-0">
                                {p.species.toLowerCase().includes('kucing') ? (
                                  <Cat className="w-4 h-4" />
                                ) : (
                                  <Dog className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#1B2A45] truncate group-hover:text-[#B8905A]">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-[#1B2A45]/60 truncate">
                                  {p.species} • {owner?.name || 'Klien Tetap'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#1B2A45] bg-[#F6F1E6] group-hover:bg-[#B8905A] group-hover:text-white px-2 py-1 rounded-md shrink-0 transition-colors">
                              Scan QR ⚡
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Hint */}
                  <div className="p-3 bg-[#1B2A45]/5 rounded-xl border border-[#B8905A]/30 text-[11px] text-[#1B2A45]/80 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Fitur Mandiri Resepsionis & Kiosk:</strong> Menghemat 90% waktu pendaftaran ulang pasien lama tanpa mengetik ulang data rekam medis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1 - TAB 2: DATABASE PASIEN LAMA (MANUAL LIST)       */}
          {/* ======================================================== */}
          {step === 'scan' && activeTab === 'patient_list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#1B2A45]/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama anabul, pemilik, breed, no. HP, atau microchip..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white text-[#101A2C] border border-[#E1D6BE] rounded-lg focus:outline-none focus:border-[#B8905A]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {(['all', 'Anjing', 'Kucing', 'Lainnya'] as const).map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setFilterSpecies(spec)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filterSpecies === spec
                          ? 'bg-[#1B2A45] text-[#FFFDF9]'
                          : 'bg-white text-[#1B2A45]/70 hover:text-[#1B2A45] border border-[#E1D6BE]'
                      }`}
                    >
                      {spec === 'all' ? 'Semua Spesies' : spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredPets.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-[#F6F1E6] rounded-xl border border-dashed border-[#E1D6BE] text-[#1B2A45]/60">
                    <Dog className="w-8 h-8 mx-auto text-[#1B2A45]/30 mb-2" />
                    <p className="font-bold text-xs text-[#1B2A45]">Tidak ada pasien yang sesuai kata kunci pencarian.</p>
                    <p className="text-[11px]">Coba cari dengan nama pemilik atau nomor telepon pelanggan.</p>
                  </div>
                ) : (
                  filteredPets.map((p) => {
                    const owner = customers.find((c) => c.id === p.customerId);
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl bg-white border border-[#E1D6BE] hover:border-[#B8905A] hover:shadow-sm transition-all flex flex-col justify-between space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-sm shrink-0 border border-[#B8905A]/40">
                            {p.species.toLowerCase().includes('kucing') ? (
                              <Cat className="w-5 h-5" />
                            ) : (
                              <Dog className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-xs text-[#1B2A45] truncate">{p.name}</h4>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                {p.gender}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#1B2A45]/70 truncate">
                              {p.species} • {p.breed}
                            </p>
                            <p className="text-[10px] text-[#1B2A45]/60 truncate mt-0.5">
                              👤 {owner?.name || 'Pemilik'} ({owner?.phone || '-'})
                            </p>
                          </div>
                        </div>

                        {p.allergies && (
                          <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 truncate">
                            ⚠️ Alergi: {p.allergies}
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#E1D6BE]/60 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPassportPet(p);
                              setActiveTab('qr_card');
                            }}
                            className="text-[10px] text-[#1B2A45] hover:text-[#B8905A] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3 h-3" /> Paspor QR
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPet(p)}
                            className="px-2.5 py-1 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] text-xs font-extrabold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Check-In ➔
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1 - TAB 3: PASPOR QR ANABUL GENERATOR               */}
          {/* ======================================================== */}
          {step === 'scan' && activeTab === 'qr_card' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE]">
                <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                  <Dog className="w-4 h-4 text-[#B8905A]" />
                  Pilih Pasien untuk Dibuatkan Kartu Paspor QR:
                </label>
                <select
                  value={passportPet?.id || ''}
                  onChange={(e) => {
                    const found = pets.find((p) => p.id === e.target.value);
                    if (found) setPassportPet(found);
                  }}
                  className="text-xs font-bold bg-white text-[#1B2A45] border border-[#E1D6BE] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B8905A]"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species} - {p.breed})
                    </option>
                  ))}
                </select>
              </div>

              {passportPet && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Digital Passport Card Preview */}
                  <div className="md:col-span-7 mx-auto w-full max-w-sm bg-gradient-to-br from-[#1B2A45] via-[#16233B] to-[#101A2C] text-[#FFFDF9] p-5 rounded-2xl border-2 border-[#B8905A] shadow-xl space-y-4 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm tracking-tight text-[#FFFDF9] font-display">
                          PETCARE ANIMAL CLINIC
                        </h4>
                        <p className="text-[9px] text-[#D9B98A] uppercase font-mono tracking-wider">
                          OFFICIAL VETERINARY HEALTH PASSPORT
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#B8905A] text-[#101A2C] text-[9px] font-black uppercase">
                        VERIFIED
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {passportQrUrl && (
                        <div className="bg-white p-2 rounded-xl shadow-md shrink-0 border border-amber-300/40">
                          <img src={passportQrUrl} alt="Pet QR Code" className="w-24 h-24" />
                        </div>
                      )}

                      <div className="space-y-1 text-xs">
                        <p className="text-base font-extrabold text-[#FFFDF9]">{passportPet.name}</p>
                        <p className="text-[11px] text-[#EDE6D6]/80">
                          {passportPet.species} • {passportPet.breed}
                        </p>
                        <p className="text-[10px] text-[#EDE6D6]/70">
                          ID: <span className="font-mono font-bold text-[#D9B98A]">{passportPet.id}</span>
                        </p>
                        <p className="text-[10px] text-[#EDE6D6]/70">
                          Chip: <span className="font-mono">{passportPet.microchipNo || 'CHIP-VET-8821'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Owner Info & Emergency contact */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#EDE6D6]/60">Pemilik:</span>
                        <span className="font-bold text-[#FFFDF9]">
                          {customers.find((c) => c.id === passportPet.customerId)?.name || 'Klien Terdaftar'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#EDE6D6]/60">Emergency WA:</span>
                        <span className="font-mono text-[#D9B98A]">
                          {customers.find((c) => c.id === passportPet.customerId)?.phone || '0812-3456-7890'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Passport */}
                  <div className="md:col-span-5 space-y-3 text-center sm:text-left">
                    <h4 className="font-bold text-sm text-[#1B2A45]">Digital Passport Siap Digunakan</h4>
                    <p className="text-xs text-[#1B2A45]/70 leading-relaxed">
                      Pemilik dapat menyimpan QR code ini di galeri ponsel atau mencetaknya sebagai kalung/kartu anabul.
                    </p>

                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPet(passportPet)}
                        className="w-full py-2.5 px-4 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-[#D9B98A]" />
                        Lakukan Check-In Pasien Ini
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.download = `Passport-QR-${passportPet.name}.png`;
                          link.href = passportQrUrl;
                          link.click();
                          addToast(`QR Paspor ${passportPet.name} berhasil diunduh!`, 'success');
                        }}
                        className="w-full py-2 px-4 bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-[#B8905A]" />
                        Unduh File QR Gambar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: CONFIRM PATIENT DATA & TRIAGE COMPLAINT          */}
          {/* ======================================================== */}
          {step === 'confirm' && selectedPet && selectedCustomer && (
            <div className="space-y-5">
              {/* Identified Patient Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#1B2A45] to-[#16233B] text-[#FFFDF9] border border-[#B8905A]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {selectedPet.species.toLowerCase().includes('kucing') ? (
                      <Cat className="w-6 h-6" />
                    ) : (
                      <Dog className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-[#FFFDF9]">{selectedPet.name}</h4>
                      <span className="px-2 py-0.2 rounded text-[10px] font-black bg-[#B8905A] text-[#101A2C] uppercase">
                        {selectedPet.species}
                      </span>
                    </div>
                    <p className="text-xs text-[#EDE6D6]/80">
                      Ras: {selectedPet.breed} • Berat: {selectedPet.weightKg || patientWeight || '4.5'} kg • ID: {selectedPet.id}
                    </p>
                    <p className="text-[11px] text-[#EDE6D6]/70 mt-0.5">
                      Pemilik: <span className="font-bold text-[#FFFDF9]">{selectedCustomer.name}</span> (HP: {selectedCustomer.phone})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-[#FFFDF9] transition-all cursor-pointer shrink-0"
                >
                  Ganti Pasien
                </button>
              </div>

              {/* Triage & Check-in Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#B8905A]" />
                    Pilih Dokter Jaga & Poliklinik:
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      const doc = availableDoctors.find((d) => d.id === e.target.value);
                      if (doc) setSelectedDoctorName(doc.name);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-white text-[#101A2C] border border-[#E1D6BE] rounded-xl focus:outline-none focus:border-[#B8905A] cursor-pointer"
                  >
                    {availableDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} - {doc.poli} ({doc.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emergency Triage Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                    Prioritas Triase Medis:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEmergency(false)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        !isEmergency
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs'
                          : 'bg-white text-gray-500 border-[#E1D6BE]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Reguler (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmergency(true)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        isEmergency
                          ? 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold shadow-2xs animate-pulse'
                          : 'bg-white text-gray-500 border-[#E1D6BE]'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Gawat Darurat (SLA 5m)
                    </button>
                  </div>
                </div>
              </div>

              {/* Reason for Visit / Chief Complaint */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#B8905A]" />
                  Keluhan Utama / Alasan Kunjungan Hari Ini:
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {quickComplaints.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setComplaint(item.val);
                        if (item.emergency) setIsEmergency(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        complaint === item.val
                          ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45]'
                          : 'bg-[#F6F1E6] text-[#1B2A45]/80 hover:bg-[#E1D6BE] border-[#E1D6BE]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Ketik catatan keluhan spesifik atau observasi pemilik..."
                  className="w-full p-2.5 text-xs bg-white text-[#101A2C] border border-[#E1D6BE] rounded-xl focus:outline-none focus:border-[#B8905A]"
                />
              </div>

              {/* Bottom Confirm Action */}
              <div className="pt-3 border-t border-[#E1D6BE]/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  className="px-4 py-2 text-xs font-bold text-[#1B2A45]/70 hover:text-[#1B2A45] cursor-pointer"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={handleExecuteCheckIn}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] hover:brightness-105 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#101A2C]" />
                  Konfirmasi Check-In (Status: Menunggu Dokter) ➔
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: CHECK-IN SUCCESS & PRINTABLE TICKET SLIP         */}
          {/* ======================================================== */}
          {step === 'success' && checkedInVisit && (
            <div className="space-y-6 text-center py-2">
              {/* Success Banner */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Check-in Pasien Sukses • Status EMR & Antrean: MENUNGGU DOKTER</span>
              </div>

              {/* Printable Ticket Receipt Card */}
              <div
                id="printable-ticket-slip"
                className="max-w-sm mx-auto bg-white p-5 rounded-2xl border-2 border-[#B8905A] shadow-xl text-left space-y-4 relative"
              >
                {/* Header Ticket */}
                <div className="text-center border-b-2 border-dashed border-[#E1D6BE] pb-3 space-y-0.5">
                  <h4 className="font-black text-base text-[#1B2A45] tracking-tight font-display">
                    PETCARE ANIMAL CLINIC
                  </h4>
                  <p className="text-[10px] text-[#1B2A45]/60 uppercase tracking-widest font-mono">
                    TIKET ANTREAN POLIKLINIK VET
                  </p>
                  <p className="text-[10px] text-[#1B2A45]/60">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                </div>

                {/* Big Queue Badge */}
                <div className="text-center py-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]">
                  <p className="text-[11px] text-[#1B2A45]/70 font-semibold uppercase tracking-wider">
                    NOMOR ANTREAN ANDA
                  </p>
                  <p className="text-4xl font-black text-[#1B2A45] font-mono tracking-tight my-1">
                    A-{String(checkedInVisit.queueNo).padStart(2, '0')}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    ● Menunggu Panggilan Dokter
                  </span>
                </div>

                {/* Patient & Doctor details */}
                <div className="space-y-1.5 text-xs text-[#1B2A45]">
                  <div className="flex justify-between">
                    <span className="text-[#1B2A45]/60">Pasien:</span>
                    <span className="font-bold">{checkedInVisit.petName} ({checkedInVisit.petSpecies})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1B2A45]/60">Pemilik:</span>
                    <span className="font-bold">{checkedInVisit.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1B2A45]/60">Dokter Jaga:</span>
                    <span className="font-bold text-[#1B2A45]">{checkedInVisit.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1B2A45]/60">Jam Masuk:</span>
                    <span className="font-mono">{checkedInVisit.queuedAt} WIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1B2A45]/60">No. Registrasi:</span>
                    <span className="font-mono text-[11px] text-[#B8905A] font-bold">{checkedInVisit.visitNo}</span>
                  </div>
                </div>

                {/* Ticket QR Barcode for scanning */}
                {ticketQrUrl && (
                  <div className="flex items-center justify-center pt-2 border-t-2 border-dashed border-[#E1D6BE]">
                    <img src={ticketQrUrl} alt="Ticket QR" className="w-20 h-20" />
                  </div>
                )}

                <div className="text-center text-[9px] text-[#1B2A45]/60 border-t border-[#E1D6BE]/60 pt-2">
                  Simpan tiket ini & perhatikan monitor ruang tunggu. Semoga lekas pulih! ✨
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3.5 py-2 bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-[#B8905A]" />
                  Cetak Struk Tiket
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppNotification}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Phone className="w-4 h-4" />
                  Kirim Notifikasi WA
                </button>

                {setActiveModule && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveModule('booking');
                      }}
                      className="px-3.5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Clock className="w-4 h-4 text-[#D9B98A]" />
                      Buka Antrean Poli
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveModule('clinic');
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Stethoscope className="w-4 h-4" />
                      Buka EMR Rekam Medis
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('scan');
                    setCheckedInVisit(null);
                    setSelectedPet(null);
                    setManualCodeInput('');
                  }}
                  className="px-3.5 py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Check-in Pasien Lain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
