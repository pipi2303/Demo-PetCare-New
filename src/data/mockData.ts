import {
  User,
  Tenant,
  Branch,
  Customer,
  Pet,
  ServiceItem,
  DoctorBooking,
  GroomingBooking,
  HotelBooking,
  ClinicVisit,
  Inpatient,
  SOAPNote,
  DischargeNote,
  MedicalRecord,
  VacSchedule,
  VacHistory,
  SurgicalProcedure,
  DewormingRecord,
  EctoRecord,
  Drug,
  LabTest,
  GroomingSession,
  HotelReservation,
  DailyMonitoring,
  StockItem,
  StockMovement,
  Supplier,
  PurchaseOrder,
  Invoice,
  CashTransaction,
  Employee,
  AbsenceRecord,
  LeaveRequest,
  LoyaltyEntry,
  Reminder,
  CarePlan,
  TelehealthSession,
  EFormTemplate,
  EFormSubmission,
  AmbulanceUnit,
  AmbulanceRequest,
  PatientPhoto,
  AuditLog,
  AppNotification,
  PreConsultForm,
  ReferralLetter,
  VisitSurvey,
  SystemGroup,
  CustomerTierGroup,
  HotelRoom,
  GroomingPackage,
  ProductCategory,
  Warehouse
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u1_klinik',
    name: 'drh. Hendrawan (Owner Klinik)',
    email: 'owner.klinik@petcare.id',
    role: 'owner_klinik',
    active: true,
    phone: '081122334455',
    branchId: 'b1',
    branchName: 'Klinik Utama (Pusat)',
    groupId: 'grp-manajemen',
    groupName: 'Direksi & Manajemen Keuangan',
    ownershipType: 'owner_klinik',
  },
  {
    id: 'u1_petshop',
    name: 'Rendra Pratama (Owner Petshop)',
    email: 'owner.petshop@petcare.id',
    role: 'owner_petshop',
    active: true,
    phone: '081199887766',
    branchId: 'b2',
    branchName: 'Cabang BSD Serpong',
    groupId: 'grp-manajemen',
    groupName: 'Direksi & Manajemen Retail',
    ownershipType: 'owner_petshop',
  },
  {
    id: 'u1_petcare',
    name: 'drh. Melissa Putri (Owner PetCare)',
    email: 'owner.petcare@petcare.id',
    role: 'owner_petcare',
    active: true,
    phone: '081155443322',
    branchId: 'all',
    branchName: 'Semua Cabang (Holding)',
    groupId: 'grp-manajemen',
    groupName: 'Eksekutif Holding PetCare',
    ownershipType: 'owner_petcare',
  },
  {
    id: 'u1',
    name: 'drh. Hendrawan',
    email: 'owner@petcare.id',
    role: 'owner_klinik',
    active: true,
    phone: '081122334455',
    branchId: 'b1',
    branchName: 'Klinik Utama (Pusat)',
    groupId: 'grp-manajemen',
    groupName: 'Direksi Medis & Keuangan',
    ownershipType: 'owner_klinik',
  },
  {
    id: 'u2',
    name: 'drh. Ananda Putri',
    email: 'ananda@petcare.id',
    role: 'dokter',
    active: true,
    phone: '081233445566',
    branchId: 'b1',
    branchName: 'Klinik Utama (Pusat)',
    groupId: 'grp-medis',
    groupName: 'Tim Medis & Dokter Hewan',
    ownershipType: 'owner_klinik',
  },
  {
    id: 'u3',
    name: 'Ani Lestari',
    email: 'ani@petcare.id',
    role: 'kasir',
    active: true,
    phone: '081344556677',
    branchId: 'b1',
    branchName: 'Klinik Utama (Pusat)',
    groupId: 'grp-frontoffice',
    groupName: 'Front Office & Kasir POS',
    ownershipType: 'owner_petshop',
  },
  {
    id: 'u4',
    name: 'Binta Amalia',
    email: 'binta@petcare.id',
    role: 'groomer',
    active: true,
    phone: '081455667788',
    branchId: 'b3',
    branchName: 'Cabang Kemang Express',
    groupId: 'grp-ops-care',
    groupName: 'Divisi Salon Grooming & Hotel',
    ownershipType: 'owner_petcare',
  },
  {
    id: 'u5',
    name: 'Admin Sistem',
    email: 'admin@petcare.id',
    role: 'admin',
    active: true,
    phone: '081566778899',
    branchId: 'all',
    branchName: 'Semua Cabang',
    groupId: 'grp-manajemen',
    groupName: 'Tata Usaha & Admin Sistem',
    ownershipType: 'owner_petcare',
  },
  {
    id: 'u6',
    name: 'Super Admin Multi-Tenant',
    email: 'superadmin@petcare.co.id',
    role: 'superadmin',
    active: true,
    phone: '081677889900',
    branchId: 'all',
    branchName: 'Master Pusat SaaS',
    groupId: 'grp-manajemen',
    groupName: 'Super Admin SaaS Master',
    ownershipType: 'superadmin',
  },
  {
    id: 'u7',
    name: 'Andri Santoso (Klien)',
    email: 'andri@email.com',
    role: 'pemilik',
    customerId: 'c1',
    active: true,
    phone: '081234567890',
    branchId: 'b1',
    branchName: 'Klinik Utama (Pusat)',
    groupId: 'grp-client',
    groupName: 'Portal Pelanggan & Anabul',
    ownershipType: 'pemilik',
  },
  {
    id: 'u8',
    name: 'Dewi Lestari (Klien)',
    email: 'dewi@email.com',
    role: 'pemilik',
    customerId: 'c2',
    active: true,
    phone: '082198765432',
    branchId: 'b2',
    branchName: 'Cabang BSD Serpong',
    groupId: 'grp-client',
    groupName: 'Portal Pelanggan & Anabul',
    ownershipType: 'pemilik',
  },
];

export const INITIAL_TENANTS: Tenant[] = [
  { id: 't1', name: 'PetCare Central Jakarta', code: 'PC-JKT', plan: 'enterprise', status: 'active', ownerName: 'Owner Klinik', phone: '021-5550192', email: 'owner@petcare.id', createdAt: '2025-01-10', expiresAt: '2028-01-10' },
  { id: 't2', name: 'PetCare Vet Surabaya', code: 'PC-SBY', plan: 'pro', status: 'active', ownerName: 'drh. Hendra', phone: '031-7771234', email: 'surabaya@petcare.id', createdAt: '2025-03-15', expiresAt: '2027-03-15' },
  { id: 't3', name: 'PetCare Bandung Hub', code: 'PC-BDG', plan: 'basic', status: 'trial', ownerName: 'drh. Rina', phone: '022-4449876', email: 'bandung@petcare.id', createdAt: '2026-05-01', expiresAt: '2026-06-01' },
];

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Klinik Utama (Pusat)', code: 'BR-01', address: 'Jl. Radio Dalam No. 45, Jakarta Selatan', phone: '021-7201982', email: 'pusat@petcare.id', isActive: true, isMainBranch: true },
  { id: 'b2', name: 'Cabang BSD Serpong', code: 'BR-02', address: 'Ruko BSD Green Office Park No. 12, Tangerang', phone: '021-5378900', email: 'bsd@petcare.id', isActive: true },
  { id: 'b3', name: 'Cabang Kemang Express', code: 'BR-03', address: 'Jl. Kemang Raya No. 88, Jakarta Selatan', phone: '021-7193321', email: 'kemang@petcare.id', isActive: true },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Andri Santoso', phone: '081234567890', email: 'andri@email.com', address: 'Jl. Kebon Jeruk No. 12, Jakarta', nik: '3171012304850001', gender: 'L', membershipTier: 'Platinum', loyaltyPoints: 850, totalSpent: 12500000, petCount: 2, createdAt: '2025-01-15' },
  { id: 'c2', name: 'Dewi Lestari', phone: '082198765432', email: 'dewi@email.com', address: 'Jl. Sudirman No. 88, Jakarta', nik: '3172056108900002', gender: 'P', membershipTier: 'Gold', loyaltyPoints: 420, totalSpent: 6200000, petCount: 1, createdAt: '2025-02-20' },
  { id: 'c3', name: 'Ahmad Dani', phone: '081311223344', email: 'ahmad@email.com', address: 'Jl. Gatot Subroto No. 45, Jakarta', nik: '3173091211820003', gender: 'L', membershipTier: 'Silver', loyaltyPoints: 150, totalSpent: 2100000, petCount: 1, createdAt: '2025-04-10' },
  { id: 'c4', name: 'Rizky Febian', phone: '081599887766', email: 'rizky@email.com', address: 'Jl. Senopati No. 20, Jakarta', nik: '3174021506950004', gender: 'L', membershipTier: 'Silver', loyaltyPoints: 80, totalSpent: 950000, petCount: 1, createdAt: '2026-01-05' },
];

export const INITIAL_PETS: Pet[] = [
  { id: 'p1', customerId: 'c1', customerName: 'Andri Santoso', name: 'Milo', species: 'Anjing', breed: 'Golden Retriever', color: 'Cokelat Muda', gender: 'Jantan', sterilized: true, birthDate: '2022-03-10', weightKg: 28.5, microchipNo: '985141002341829', allergies: 'Amoxicillin, Daging Ayam', notes: 'Sangat ramah, takut suara petir', photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400', createdAt: '2025-01-15' },
  { id: 'p2', customerId: 'c1', customerName: 'Andri Santoso', name: 'Luna', species: 'Kucing', breed: 'Persia Medium', color: 'Putih Abu', gender: 'Betina', sterilized: true, birthDate: '2023-06-15', weightKg: 4.2, microchipNo: '985141002349912', allergies: 'Tidak ada', notes: 'Suka digrooming halus', photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400', createdAt: '2025-01-16' },
  { id: 'p3', customerId: 'c2', customerName: 'Dewi Lestari', name: 'Max', species: 'Anjing', breed: 'French Bulldog', color: 'Hitam Brindle', gender: 'Jantan', sterilized: false, birthDate: '2023-11-20', weightKg: 12.1, microchipNo: '985141002350100', allergies: 'Suhu Panas', notes: 'Punya riwayat nafas pendek saat kepanasan', photoUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400', createdAt: '2025-02-20' },
  { id: 'p4', customerId: 'c3', customerName: 'Ahmad Dani', name: 'Oreo', species: 'Kucing', breed: 'Domestic Shorthair', color: 'Hitam Putih', gender: 'Jantan', sterilized: true, birthDate: '2024-01-08', weightKg: 3.8, microchipNo: '985141002358821', allergies: 'Tidak ada', notes: 'Suka berontak saat diperiksa telinga', photoUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=400', createdAt: '2025-04-10' },
  { id: 'p5', customerId: 'c4', customerName: 'Rizky Febian', name: 'Chiko', species: 'Anjing', breed: 'Shih Tzu', color: 'Putih Cokelat', gender: 'Jantan', sterilized: true, birthDate: '2023-09-12', weightKg: 5.6, microchipNo: '985141002369012', allergies: 'Pollen, Shampoo Tertentu', notes: 'Tenang dan suka dibelai di bagian dagu', photoUrl: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&q=80&w=400', createdAt: '2025-05-18' },
];

const getMockDate = (offsetDays: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().substring(0, 10);
};

export const INITIAL_DOCTOR_BOOKINGS: DoctorBooking[] = [
  { id: 'db1', bookingNo: 'DOC-20260604-001', customerId: 'c1', customerName: 'Andri Santoso', petId: 'p1', petName: 'Milo', petSpecies: 'Anjing', doctorId: 'u2', doctorName: 'drh. Ananda Putri', date: getMockDate(0), timeSlot: '09:00', status: 'Terkonfirmasi', complaint: 'Vaksinasi Rabies tahunan dan cek telinga', createdAt: getMockDate(-1) },
  { id: 'db2', bookingNo: 'DOC-20260604-002', customerId: 'c2', customerName: 'Dewi Lestari', petId: 'p3', petName: 'Max', petSpecies: 'Anjing', doctorId: 'u2', doctorName: 'drh. Ananda Putri', date: getMockDate(0), timeSlot: '10:30', status: 'Terkonfirmasi', complaint: 'Mata merah dan sering digaruk', createdAt: getMockDate(-1) },
  { id: 'db3', bookingNo: 'DOC-20260604-003', customerId: 'c3', customerName: 'Ahmad Dani', petId: 'p4', petName: 'Oreo', petSpecies: 'Kucing', doctorId: 'e6', doctorName: 'drh. Citra Prasetyo', date: getMockDate(0), timeSlot: '13:00', status: 'Menunggu', complaint: 'Muntah air 2x sejak pagi', createdAt: getMockDate(0) },
  { id: 'db4', bookingNo: 'DOC-20260604-004', customerId: 'c4', customerName: 'Rizky Febian', petId: 'p5', petName: 'Chiko', petSpecies: 'Anjing', doctorId: 'u1', doctorName: 'drh. Hendrawan', date: getMockDate(0), timeSlot: '15:00', status: 'Terkonfirmasi', complaint: 'Pemeriksaan sendi kaki belakang pasca lompat', createdAt: getMockDate(-1) },
  { id: 'db5', bookingNo: 'DOC-20260604-005', customerId: 'c1', customerName: 'Andri Santoso', petId: 'p2', petName: 'Luna', petSpecies: 'Kucing', doctorId: 'e6', doctorName: 'drh. Citra Prasetyo', date: getMockDate(1), timeSlot: '10:00', status: 'Terkonfirmasi', complaint: 'Kontrol dermatitis alergi & pakan khusus', createdAt: getMockDate(0) },
  { id: 'db6', bookingNo: 'DOC-20260604-006', customerId: 'c2', customerName: 'Dewi Lestari', petId: 'p3', petName: 'Max', petSpecies: 'Anjing', doctorId: 'u2', doctorName: 'drh. Ananda Putri', date: getMockDate(1), timeSlot: '14:00', status: 'Menunggu', complaint: 'Check-up berkala dan evaluasi berat badan', createdAt: getMockDate(0) },
  { id: 'db7', bookingNo: 'DOC-20260604-007', customerId: 'c3', customerName: 'Ahmad Dani', petId: 'p4', petName: 'Oreo', petSpecies: 'Kucing', doctorId: '', doctorName: '', date: getMockDate(0), timeSlot: '', status: 'Menunggu', complaint: 'Request konsultasi lanjutan diare ringan (Online Booking)', createdAt: getMockDate(0) },
  { id: 'db8', bookingNo: 'DOC-20260604-008', customerId: 'c4', customerName: 'Rizky Febian', petId: 'p5', petName: 'Chiko', petSpecies: 'Anjing', doctorId: '', doctorName: '', date: getMockDate(0), timeSlot: '', status: 'Menunggu', complaint: 'Scraping kulit & grooming medis kutu (Belum ada slot)', createdAt: getMockDate(0) },
  { id: 'db9', bookingNo: 'DOC-20260604-009', customerId: 'c1', customerName: 'Andri Santoso', petId: 'p1', petName: 'Milo', petSpecies: 'Anjing', doctorId: '', doctorName: '', date: getMockDate(0), timeSlot: '', status: 'Menunggu', complaint: 'Booster vaksin DHPPi tahunan (Intake WhatsApp)', createdAt: getMockDate(0) },
];

export const INITIAL_GROOMING_BOOKINGS: GroomingBooking[] = [
  { id: 'gb1', bookingNo: 'GRM-20260604-001', customerName: 'Andri Santoso', petName: 'Luna', groomerName: 'Binta Amalia', packageType: 'Premium', date: getMockDate(0), timeSlot: '09:30', price: 175000, status: 'Terkonfirmasi', notes: 'Potong kuku halus dan blow dry dingin' },
  { id: 'gb2', bookingNo: 'GRM-20260604-002', customerName: 'Rizky Febian', petName: 'Oreo', groomerName: 'Binta Amalia', packageType: 'Medicinal', date: getMockDate(0), timeSlot: '11:00', price: 220000, status: 'Terkonfirmasi', notes: 'Keramas mandi jamur khusus kulit sensitif' },
  { id: 'gb3', bookingNo: 'GRM-20260604-003', customerName: 'Dewi Lestari', petName: 'Max', groomerName: 'Binta Amalia', packageType: 'Basic', date: getMockDate(1), timeSlot: '13:30', price: 150000, status: 'Terkonfirmasi', notes: 'Grooming rutin & pembersihan telinga' },
];

export const INITIAL_HOTEL_BOOKINGS: HotelBooking[] = [
  { id: 'hb1', bookingNo: 'HTL-20260604-001', customerName: 'Andri Santoso', petName: 'Milo', roomNo: 'R01 (Large VIP)', checkInDate: '2026-08-10', checkOutDate: '2026-08-14', nights: 4, totalCost: 600000, status: 'Aktif', notes: 'Makan 2x sehari jam 8 pagi & 6 sore' },
  { id: 'hb2', bookingNo: 'HTL-20260604-002', customerName: 'Dewi Lestari', petName: 'Max', roomNo: 'R03 (Small)', checkInDate: '2026-08-12', checkOutDate: '2026-08-15', nights: 3, totalCost: 375000, status: 'Reservasi', notes: 'Bawa mainan sendiri dari rumah' },
];

export const INITIAL_CLINIC_VISITS: ClinicVisit[] = [
  { id: 'v1', visitNo: 'VIS-20260604-01', queueNo: 1, customerId: 'c1', customerName: 'Andri Santoso', petId: 'p1', petName: 'Milo', petSpecies: 'Anjing', petBreed: 'Golden Retriever', doctorId: 'u2', doctorName: 'drh. Ananda Putri', complaint: 'Vaksinasi Rabies & cek gatal di telinga kanan', status: 'Selesai', queuedAt: '08:45', calledAt: '09:00', examinedAt: '09:05', completedAt: '09:30', slaMinutes: 25 },
  { id: 'v2', visitNo: 'VIS-20260604-02', queueNo: 2, customerId: 'c2', customerName: 'Dewi Lestari', petId: 'p3', petName: 'Max', petSpecies: 'Anjing', petBreed: 'French Bulldog', doctorId: 'u2', doctorName: 'drh. Ananda Putri', complaint: 'Iritasi mata merah dan sekret berlebih', status: 'Sedang Diperiksa', queuedAt: '09:15', calledAt: '09:35', examinedAt: '09:37', slaMinutes: 20 },
  { id: 'v3', visitNo: 'VIS-20260604-03', queueNo: 3, customerId: 'c3', customerName: 'Ahmad Dani', petId: 'p4', petName: 'Oreo', petSpecies: 'Kucing', petBreed: 'Domestic Shorthair', doctorId: 'u2', doctorName: 'drh. Ananda Putri', complaint: 'Muntah & lemas 1 hari', status: 'Menunggu', queuedAt: '10:00' },
  { id: 'v4', visitNo: 'VIS-20260604-04', queueNo: 4, customerId: 'c1', customerName: 'Andri Santoso', petId: 'p2', petName: 'Luna', petSpecies: 'Kucing', petBreed: 'Persia Medium', doctorId: 'u2', doctorName: 'drh. Ananda Putri', complaint: 'Dermatitis alergi & gatal lipatan kulit', status: 'Selesai', queuedAt: '10:30', calledAt: '10:45', examinedAt: '10:50', completedAt: '11:15', slaMinutes: 25 },
  { id: 'v5', visitNo: 'VIS-20260604-05', queueNo: 5, customerId: 'c4', customerName: 'Rizky Febian', petId: 'p5', petName: 'Chiko', petSpecies: 'Anjing', petBreed: 'Shih Tzu', doctorId: 'u2', doctorName: 'drh. Budi Setiawan', complaint: 'Bau mulut & kalkulus gigi (Periodontitis)', status: 'Selesai', queuedAt: '11:20', calledAt: '11:35', examinedAt: '11:40', completedAt: '12:10', slaMinutes: 30 },
];

export const INITIAL_SOAP_NOTES: SOAPNote[] = [
  {
    id: 'soap1',
    visitId: 'v1',
    petId: 'p1',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-08-11',
    chiefComplaint: 'Pemilik ingin vaksin Rabies rutin dan pemeriksaan serumen telinga.',
    historyOfPresentIllness: 'Gatal telinga kanan ringan sejak 2 hari lalu. Makan minum tetap baik, aktif.',
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 98,
    respiratoryRate: 24,
    temperatureC: 38.6,
    spO2: 99,
    weightKg: 28.5,
    physicalExamNotes: 'Telinga kanan: sedikit serumen cokelat, mukosa merah muda cerah, CRT < 2 detik. TTH bersih.',
    workingDiagnosis: 'Otitis Externa Dextra ringan & Sehat untuk Vaksinasi',
    differentialDiagnosis: 'Otitis Otodectes, Dermatitis Alergi',
    severityScore: 'Ringan',
    medicationPlan: 'Tetes telinga Otopain 2x sehari 3 tetes selama 5 hari. Vaksin Rabies injeksi IM.',
    prescribedDrugs: [
      { drugId: 'd1', drugName: 'Otopain Ear Drops 10ml', dosage: '3 tetes', frequency: '2x sehari', durationDays: 5 },
      { drugId: 'd2', drugName: 'Vaksin Rabies Defensor 3', dosage: '1 ml', frequency: 'Dosis tunggal', durationDays: 1 }
    ],
    investigationInstructions: 'Sitologi serumen telinga jika tidak membaik dalam 5 hari.',
    patientEducation: 'Jaga telinga tetap kering pasca mandi. Kontrol ulang 1 minggu lagi.',
    isFinalized: true
  },
  {
    id: 'soap1_prev1',
    visitId: 'v_prev_1',
    petId: 'p1',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-05-18',
    chiefComplaint: 'Check-up rutin 3 bulanan & timbang badan.',
    historyOfPresentIllness: 'Nafsu makan sangat baik, aktivitas lari pagi aktif.',
    systolicBP: 118,
    diastolicBP: 78,
    heartRate: 92,
    respiratoryRate: 22,
    temperatureC: 38.4,
    spO2: 99,
    weightKg: 28.2,
    physicalExamNotes: 'Kondisi tubuh ideal BCS 5/9, auskultasi jantung/paru bersih normofonik.',
    workingDiagnosis: 'Pemeriksaan Kesehatan Rutin (Normal)',
    differentialDiagnosis: '-',
    severityScore: 'Ringan',
    medicationPlan: 'Suplemen multivitamin minyak ikan 1 kapsul/hari.',
    prescribedDrugs: [],
    investigationInstructions: 'Rutin antiparasit setiap 3 bulan.',
    patientEducation: 'Pertahankan porsi makan dan jadwal olahraga.',
    isFinalized: true
  },
  {
    id: 'soap1_prev2',
    visitId: 'v_prev_2',
    petId: 'p1',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-02-10',
    chiefComplaint: 'Muntah busa putih 2x setelah makan rumput.',
    historyOfPresentIllness: 'Gastritis ringan sesaat, sedikit lemas pagi hari namun siang membaik.',
    systolicBP: 125,
    diastolicBP: 82,
    heartRate: 110,
    respiratoryRate: 28,
    temperatureC: 38.9,
    spO2: 98,
    weightKg: 27.8,
    physicalExamNotes: 'Abdomen sedikit tegang saat palpasi cranial, tidak teraba benda asing.',
    workingDiagnosis: 'Gastritis Akut Ringan',
    differentialDiagnosis: 'Indigesti Dietetik',
    severityScore: 'Ringan',
    medicationPlan: 'Sucralfate sirup 5ml 2x1 hari ac.',
    prescribedDrugs: [],
    investigationInstructions: 'Puasa makanan padat 8 jam.',
    patientEducation: 'Awasi kebiasaan memakan rumput dan sampah.',
    isFinalized: true
  },
  {
    id: 'soap1_prev3',
    visitId: 'v_prev_3',
    petId: 'p1',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2025-11-04',
    chiefComplaint: 'Vaksinasi tahunan DHPPi + L.',
    historyOfPresentIllness: 'Kondisi bugar, tidak ada demam atau riwayat sakit.',
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 95,
    respiratoryRate: 20,
    temperatureC: 38.5,
    spO2: 99,
    weightKg: 27.5,
    physicalExamNotes: 'Suhu dan vitalitas normal, siap vaksinasi.',
    workingDiagnosis: 'Sehat untuk Vaksinasi',
    differentialDiagnosis: '-',
    severityScore: 'Ringan',
    medicationPlan: 'Injeksi Vaksin DHPPi.',
    prescribedDrugs: [],
    investigationInstructions: '-',
    patientEducation: 'Jangan dimandikan selama 7 hari pasca vaksin.',
    isFinalized: true
  },
  {
    id: 'soap1_prev4',
    visitId: 'v_prev_4',
    petId: 'p1',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2025-08-10',
    chiefComplaint: 'Konsultasi awal & microchip registration.',
    historyOfPresentIllness: 'Pasien baru diadopsi, lincah dan nafsu makan baik.',
    systolicBP: 116,
    diastolicBP: 76,
    heartRate: 90,
    respiratoryRate: 22,
    temperatureC: 38.3,
    spO2: 99,
    weightKg: 26.9,
    physicalExamNotes: 'Pemasangan microchip pada interscapular sukses tanpa hematoma.',
    workingDiagnosis: 'Registrasi Microchip & General Wellness',
    differentialDiagnosis: '-',
    severityScore: 'Ringan',
    medicationPlan: 'Pemberian obat cacing Drontal Plus 2 tablet.',
    prescribedDrugs: [],
    investigationInstructions: '-',
    patientEducation: 'Bawa paspor hewan saat kontrol.',
    isFinalized: true
  },
  {
    id: 'soap2_luna1',
    visitId: 'v_luna_1',
    petId: 'p2',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-08-05',
    chiefComplaint: 'Gatal pada lipatan paha & telinga.',
    historyOfPresentIllness: 'Sering garuk leher dan telinga sejak 3 hari.',
    systolicBP: 128,
    diastolicBP: 85,
    heartRate: 165,
    respiratoryRate: 30,
    temperatureC: 38.8,
    spO2: 98,
    weightKg: 4.2,
    physicalExamNotes: 'Eritema ringan di leher, kuku agak panjang.',
    workingDiagnosis: 'Allergic Dermatitis Mild',
    differentialDiagnosis: 'Fleabite Hypersensitivity',
    severityScore: 'Ringan',
    medicationPlan: 'Cetirizine drop 0.5ml 1x1, Spot-on antiparasit.',
    prescribedDrugs: [],
    investigationInstructions: 'Wood lamp test negatif.',
    patientEducation: 'Rutin grooming dan bersihkan litter box.',
    isFinalized: true
  },
  {
    id: 'soap2_luna2',
    visitId: 'v_luna_2',
    petId: 'p2',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-04-12',
    chiefComplaint: 'Check-up berat badan & grooming berkala.',
    historyOfPresentIllness: 'Aktif bermain bola wol, makan dry food Royal Canin.',
    systolicBP: 122,
    diastolicBP: 80,
    heartRate: 155,
    respiratoryRate: 28,
    temperatureC: 38.5,
    spO2: 99,
    weightKg: 4.0,
    physicalExamNotes: 'Bulu bersih bebas ektoparasit, gigi bebas kalkulus.',
    workingDiagnosis: 'Status Sehat',
    differentialDiagnosis: '-',
    severityScore: 'Ringan',
    medicationPlan: 'Multivitamin gel lysine 1 cm/hari.',
    prescribedDrugs: [],
    investigationInstructions: '-',
    patientEducation: 'Jaga asupan air minum fresh.',
    isFinalized: true
  },
  {
    id: 'soap2_luna3',
    visitId: 'v_luna_3',
    petId: 'p2',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2025-12-01',
    chiefComplaint: 'Demam ringan & bersin 2 hari.',
    historyOfPresentIllness: 'Keluar leleran bening dari hidung, nafsu makan agak turun.',
    systolicBP: 130,
    diastolicBP: 88,
    heartRate: 180,
    respiratoryRate: 34,
    temperatureC: 39.4,
    spO2: 97,
    weightKg: 3.8,
    physicalExamNotes: 'Suhu 39.4 C (Febrile), konjungtiva sedikit hiperemis.',
    workingDiagnosis: 'Feline Upper Respiratory Infection (URI) Mild',
    differentialDiagnosis: 'Calicivirus, Herpesvirus',
    severityScore: 'Sedang',
    medicationPlan: 'Doxycycline sirup, Nebulisasi saline hangat, Vitamin booster.',
    prescribedDrugs: [],
    investigationInstructions: 'Isolasi dari kucing lain selama 7 hari.',
    patientEducation: 'Hangatkan ruangan dan pantau pernapasan.',
    isFinalized: true
  },
  {
    id: 'soap3_max1',
    visitId: 'v2',
    petId: 'p3',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-08-11',
    chiefComplaint: 'Iritasi mata merah dan sekret berlebih.',
    historyOfPresentIllness: 'Mengedip sering di mata kanan, sekret mukoid 1 hari.',
    systolicBP: 135,
    diastolicBP: 90,
    heartRate: 115,
    respiratoryRate: 32,
    temperatureC: 38.9,
    spO2: 98,
    weightKg: 12.1,
    physicalExamNotes: 'Blepharospasme mata dextra, tes fluorescein negatif kornea intact.',
    workingDiagnosis: 'Konjungtivitis Kataralis Dextra',
    differentialDiagnosis: 'Entropion, Korpus Alienum Mata',
    severityScore: 'Sedang',
    medicationPlan: 'Cendo Xitrol tetes mata 3x1 tetes mata kanan.',
    prescribedDrugs: [],
    investigationInstructions: 'Re-evaluasi bila sekret berubah purulen.',
    patientEducation: 'Gunakan E-Collar agar tidak mengucek mata.',
    isFinalized: false
  },
  {
    id: 'soap3_max2',
    visitId: 'v_max_prev',
    petId: 'p3',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-03-20',
    chiefComplaint: 'Sesak napas saat bermain di terik matahari.',
    historyOfPresentIllness: 'Stridor respirasi inspiratoris karena cuaca panas.',
    systolicBP: 140,
    diastolicBP: 92,
    heartRate: 130,
    respiratoryRate: 42,
    temperatureC: 39.3,
    spO2: 96,
    weightKg: 11.8,
    physicalExamNotes: 'Napas cuping hidung terengah-engah, stenotic nares ringan.',
    workingDiagnosis: 'Brachycephalic Airway Syndrome (Exacerbation by Heat)',
    differentialDiagnosis: 'Laryngeal Collapse, Heat Stroke Mild',
    severityScore: 'Sedang',
    medicationPlan: 'Pendinginan kompres es, O2 chamber 15 menit, Dexamethasone 0.5ml.',
    prescribedDrugs: [],
    investigationInstructions: 'Evaluasi stenotic nares rhinoplasty di masa depan.',
    patientEducation: 'Hindari aktivitas berat di siang hari terik.',
    isFinalized: true
  },
  {
    id: 'soap4_oreo1',
    visitId: 'v_oreo_1',
    petId: 'p4',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-08-10',
    chiefComplaint: 'Muntah lendir 3x dan nafsu makan drop.',
    historyOfPresentIllness: 'Lemas sejak kemarin, tidak mau makan wet food.',
    systolicBP: 110,
    diastolicBP: 70,
    heartRate: 170,
    respiratoryRate: 36,
    temperatureC: 39.1,
    spO2: 97,
    weightKg: 3.8,
    physicalExamNotes: 'Turgor kulit sedikit lambat (~5% dehidrasi), palpasi abdomen tegang.',
    workingDiagnosis: 'Gastroenteritis Dehidrasi Ringan-Sedang',
    differentialDiagnosis: 'Panleukopenia, Foreign Body GI',
    severityScore: 'Sedang',
    medicationPlan: 'Infus RL 20 tpm, Maropitant injeksi SC, Ondansetron.',
    prescribedDrugs: [],
    investigationInstructions: 'Lab Hematologi Darah Lengkap & Testkit Panleukopenia.',
    patientEducation: 'Rawat inap untuk hidrasi dan pemantauan cairan.',
    isFinalized: true
  },
  {
    id: 'soap4_oreo2',
    visitId: 'v_oreo_2',
    petId: 'p4',
    doctorId: 'u2',
    doctorName: 'drh. Ananda Putri',
    date: '2026-04-05',
    chiefComplaint: 'Vaksinasi Tricat Trio Booster.',
    historyOfPresentIllness: 'Kondisi sehat, makan minum lancar.',
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 150,
    respiratoryRate: 26,
    temperatureC: 38.6,
    spO2: 99,
    weightKg: 3.5,
    physicalExamNotes: 'Pemeriksaan fisik bersih, suhu optimal.',
    workingDiagnosis: 'Sehat untuk Vaksinasi',
    differentialDiagnosis: '-',
    severityScore: 'Ringan',
    medicationPlan: 'Vaksin Tricat.',
    prescribedDrugs: [],
    investigationInstructions: '-',
    patientEducation: 'Bawa kembali untuk Rabies 1 bulan lagi.',
    isFinalized: true
  },
  {
    id: 'soap5_chiko1',
    visitId: 'v5',
    petId: 'p5',
    doctorId: 'u2',
    doctorName: 'drh. Budi Setiawan',
    date: '2026-08-11',
    chiefComplaint: 'Bau mulut tak sedap & karang gigi tebal.',
    historyOfPresentIllness: 'Nafsu makan baik tapi kesulitan mengunyah makanan keras kibble.',
    systolicBP: 124,
    diastolicBP: 82,
    heartRate: 110,
    respiratoryRate: 24,
    temperatureC: 38.5,
    spO2: 99,
    weightKg: 5.6,
    physicalExamNotes: 'Kalkulus subgingiva derajat 2 pada premolar & molar atas, gingivitis marginalis.',
    workingDiagnosis: 'Periodontitis Kronis Grade 2 & Dental Calculus',
    differentialDiagnosis: 'Stomatitis, Epulis',
    severityScore: 'Sedang',
    medicationPlan: 'Ultrasonic Dental Scaling, Chlorhexidine Oral Gel 0.12% 2x sehari pasca makan.',
    prescribedDrugs: [],
    investigationInstructions: 'Jadwalkan scaling gigi dengan anestesi inhalasi ringan.',
    patientEducation: 'Lakukan sikat gigi rutin menggunakan pasta enzim hewan 2-3x per minggu.',
    isFinalized: true
  }
];

export const INITIAL_INPATIENTS: Inpatient[] = [
  { id: 'ip1', inpatientNo: 'INP-20260601-01', petId: 'p4', petName: 'Oreo', customerName: 'Ahmad Dani', cageNo: 'Kandang ICU-02', doctorId: 'u2', doctorName: 'drh. Ananda Putri', diagnosis: 'Gastroenteritis Dehidrasi Sedang', dietInstructions: 'Pakan i/d Wet 3x1/2 kaleng + Terapi Infus Ringer Lactate 20 tpm', status: 'Stabil', admittedAt: '2026-08-10 14:00' }
];

export const INITIAL_DISCHARGE_NOTES: DischargeNote[] = [
  { id: 'dn1', visitId: 'v1', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', finalDiagnosis: 'Otitis Externa Dextra Ringan', homeMedications: 'Otopain Ear Drops (2x3 tetes telinga kanan)', homeCareInstructions: 'Jaga telinga tidak kemasukan air saat mandi.', restrictions: 'Jangan biarkan digaruk kencang.', warningSigns: 'Telinga bengkak, berbau busuk, atau Milo tampak kesakitan hebat.', followUpDate: '2026-08-18', createdAt: '2026-08-11' }
];

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [
  { id: 'mr1', petId: 'p1', date: '2026-08-11', type: 'Kunjungan', title: 'Pemeriksaan Rutin & Vaksin Rabies', description: 'Kunjungan pemeriksaan rutin, ditemukannya otitis externa ringan dextra, telah diberikan vaksinasi Rabies.', performedBy: 'drh. Ananda Putri' },
  { id: 'mr2', petId: 'p1', date: '2025-08-10', type: 'Vaksinasi', title: 'Vaksinasi DHPPi + L', description: 'Pemberian vaksinasi kombinasi tahunan tanpa komplikasi.', performedBy: 'drh. Ananda Putri' },
  { id: 'mr3', petId: 'p2', date: '2026-08-11', type: 'Grooming', title: 'Grooming Premium Cat', description: 'Mandi potong kuku, bersihkan telinga, blow dry dingin.', performedBy: 'Binta Amalia' },
];

export const INITIAL_VAC_SCHEDULES: VacSchedule[] = [
  { id: 'vs1', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', customerPhone: '081234567890', vaccineName: 'Rabies Booster', dueDate: '2026-08-11', status: 'Selesai' },
  { id: 'vs2', petId: 'p2', petName: 'Luna', customerName: 'Andri Santoso', customerPhone: '081234567890', vaccineName: 'FVRCP Booster', dueDate: '2026-08-15', status: 'Jatuh Tempo' },
  { id: 'vs3', petId: 'p3', petName: 'Max', customerName: 'Dewi Lestari', customerPhone: '082198765432', vaccineName: 'DHPPi Annual', dueDate: '2026-08-01', status: 'Terlambat' },
  { id: 'vs4', petId: 'p4', petName: 'Oreo', customerName: 'Ahmad Dani', customerPhone: '081311223344', vaccineName: 'FeLV Booster', dueDate: '2026-09-10', status: 'Mendatang' },
];

export const INITIAL_VAC_HISTORIES: VacHistory[] = [
  { id: 'vh1', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', vaccineName: 'Rabies Defensor 3', givenDate: '2026-08-11', nextDueDate: '2027-08-11', doctorName: 'drh. Ananda Putri', batchNumber: 'RB-2026-991A', expiryDate: '2027-12-31', certificateNo: 'CERT-2026-0089' },
  { id: 'vh2', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', vaccineName: 'DHPPi + L Vanguard Plus 5', givenDate: '2025-08-10', nextDueDate: '2026-08-10', doctorName: 'drh. Ananda Putri', batchNumber: 'VG-2025-8812', expiryDate: '2026-09-30', certificateNo: 'CERT-2025-0104' },
  { id: 'vh3', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', vaccineName: 'Nobivac DHPPi Core Puppy Booster', givenDate: '2024-08-15', nextDueDate: '2025-08-15', doctorName: 'drh. Hendrawan', batchNumber: 'NB-2024-4401', expiryDate: '2025-10-31', certificateNo: 'CERT-2024-0051' },
  { id: 'vh4', petId: 'p2', petName: 'Luna', customerName: 'Andri Santoso', vaccineName: 'Felocell 4 (FVRCP)', givenDate: '2025-08-15', nextDueDate: '2026-08-15', doctorName: 'drh. Ananda Putri', batchNumber: 'FC-2025-4412', expiryDate: '2026-11-30', certificateNo: 'CERT-2025-0042' },
  { id: 'vh5', petId: 'p2', petName: 'Luna', customerName: 'Andri Santoso', vaccineName: 'Rabies Defensor 3 Feline', givenDate: '2024-09-01', nextDueDate: '2025-09-01', doctorName: 'drh. Citra Prasetyo', batchNumber: 'RB-2024-3320', expiryDate: '2025-12-31', certificateNo: 'CERT-2024-0088' },
  { id: 'vh6', petId: 'p3', petName: 'Max', customerName: 'Dewi Lestari', vaccineName: 'Nobivac DHPPi + Lepto Annual', givenDate: '2025-07-28', nextDueDate: '2026-07-28', doctorName: 'drh. Ananda Putri', batchNumber: 'NB-2025-1102', expiryDate: '2026-09-15', certificateNo: 'CERT-2025-0211' },
  { id: 'vh7', petId: 'p4', petName: 'Oreo', customerName: 'Ahmad Dani', vaccineName: 'Felocell 4 (FVRCP Booster)', givenDate: '2025-09-08', nextDueDate: '2026-09-08', doctorName: 'drh. Citra Prasetyo', batchNumber: 'FC-2025-7719', expiryDate: '2026-10-31', certificateNo: 'CERT-2025-0301' },
  { id: 'vh8', petId: 'p5', petName: 'Chiko', customerName: 'Rizky Febian', vaccineName: 'Vanguard Plus 5/L (DHPPi)', givenDate: '2026-01-20', nextDueDate: '2027-01-20', doctorName: 'drh. Hendrawan', batchNumber: 'VG-2026-0922', expiryDate: '2027-04-30', certificateNo: 'CERT-2026-0015' },
];

export const INITIAL_SURGICAL_PROCEDURES: SurgicalProcedure[] = [
  {
    id: 'sp1',
    procedureNo: 'SURG-20251120-01',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    procedureName: 'Dental Prophylaxis, Root Planing & Ekstraksi Gigi Incisor 201',
    category: 'Dental',
    date: '2025-11-20',
    startTime: '10:00',
    endTime: '11:15',
    leadSurgeon: 'drh. Budi Setiawan, Sp.NV',
    assistantSurgeon: 'drh. Ananda Putri',
    anesthetist: 'Paramedik Surya',
    anesthesiaProtocol: 'Premed: Butorphanol + Dexmedetomidine, Induksi: Propofol 4mg/kg IV, Maintenance: Isoflurane 1.5% in O2',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Kalkulus derajat 3 regio bukal molar atas & fraktur enamel kronis incisor 201 dengan pulpa nekrotik.',
    postOpNotes: 'Ekstraksi gigi incisor berhasil tanpa fraktur akar. Flap gingiva tertutup rapi absorbable suture vicryl 4-0. Pasien sadar penuh 25 menit pasca-ekstubasi.',
    sutureRemovalDate: 'Tidak perlu (benang diserap tubuh)'
  },
  {
    id: 'sp2',
    procedureNo: 'SURG-20240418-02',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    procedureName: 'Debridement & Penjahitan Laserasi Vulnus Laceratum Regio Femur',
    category: 'Jaringan Lunak',
    date: '2024-04-18',
    startTime: '14:30',
    endTime: '15:20',
    leadSurgeon: 'drh. Hendrawan',
    anesthetist: 'Paramedik Surya',
    anesthesiaProtocol: 'Premed: Acepromazine, Induksi: Ketamine-Diazepam IV, Anestesi Lokal Lidocaine 2%',
    asaScore: 'ASA II',
    status: 'Selesai',
    findings: 'Laserasi tajam sepanjang 7 cm pada paha kanan akibat tergores pagar kawat, tanpa cedera otot dalam.',
    postOpNotes: 'Pembersihan luka dengan NaCl 0.9% hangat & povidone iodine, penjahitan dua lapis (subkutan vicryl & kulit nylon 3-0). Dipasang Elizabeth collar.',
    sutureRemovalDate: '2024-04-28'
  },
  {
    id: 'sp3',
    procedureNo: 'SURG-20230510-01',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    procedureName: 'Orchiectomy (Kastrasi) & Pemasangan Transponder Microchip',
    category: 'Sterilisasi',
    date: '2023-05-10',
    startTime: '09:00',
    endTime: '09:45',
    leadSurgeon: 'drh. Budi Setiawan, Sp.NV',
    assistantSurgeon: 'drh. Ananda Putri',
    anesthetist: 'drh. Citra Prasetyo',
    anesthesiaProtocol: 'Premed: Xylazine + Atropine, Induksi: Ketamine, Maintenance: Isoflurane 2%',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Kedua testis normal descended, tunika vaginalis diligasi ligasure & vicryl 3-0.',
    postOpNotes: 'Insisi preskrotal sembuh primer. Microchip ID 985141002341829 sukses terpasang di regio interskapula & terbaca jelas pada scanner.',
    sutureRemovalDate: '2023-05-20'
  },
  {
    id: 'sp4',
    procedureNo: 'SURG-20240214-01',
    petId: 'p2',
    petName: 'Luna',
    customerName: 'Andri Santoso',
    procedureName: 'Ovariohysterectomy (OH - Steril Kucing Betina)',
    category: 'Sterilisasi',
    date: '2024-02-14',
    startTime: '11:00',
    endTime: '11:50',
    leadSurgeon: 'drh. Ananda Putri',
    assistantSurgeon: 'drh. Citra Prasetyo',
    anesthetist: 'Paramedik Surya',
    anesthesiaProtocol: 'Premed: Dexmedetomidine + Butorphanol, Induksi: Zoletil 50, Maintenance: Isoflurane 1.5%',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Uterus dan ovarium dextra-sinistra normal, tidak ada hidrometra atau kista. Hemostasis sempurna.',
    postOpNotes: 'Insisi linea alba 2.5 cm, penutupan jahitan subkutikular monofilament. Pasien diberi bantalan pemanas pasca-operasi.',
    sutureRemovalDate: '2024-02-24'
  },
  {
    id: 'sp5',
    procedureNo: 'SURG-20250320-03',
    petId: 'p2',
    petName: 'Luna',
    customerName: 'Andri Santoso',
    procedureName: 'Eksisi Biopsi Kista Sebasea Dorsalis',
    category: 'Jaringan Lunak',
    date: '2025-03-20',
    startTime: '13:00',
    endTime: '13:35',
    leadSurgeon: 'drh. Budi Setiawan, Sp.NV',
    anesthetist: 'drh. Ananda Putri',
    anesthesiaProtocol: 'Premed: Acepromazine, Induksi: Propofol, Anestesi Infiltrasi Lokal Bupivacaine',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Massa nodul kistik diameter 1.2 cm berkapsul utuh di area dorsum punggung.',
    postOpNotes: 'Eksisi massa lengkap dengan margin bebas, spesimen dikirim ke histopatologi. Luka bersih.',
    sutureRemovalDate: '2025-03-30'
  },
  {
    id: 'sp6',
    procedureNo: 'SURG-20250512-01',
    petId: 'p3',
    petName: 'Max',
    customerName: 'Dewi Lestari',
    procedureName: 'Stenotic Nares Rhinoplasty & Soft Palate Resection (BOAS Correction)',
    category: 'Jaringan Lunak',
    date: '2025-05-12',
    startTime: '09:30',
    endTime: '11:00',
    leadSurgeon: 'drh. Budi Setiawan, Sp.NV',
    assistantSurgeon: 'drh. Hendrawan',
    anesthetist: 'drh. Ananda Putri',
    anesthesiaProtocol: 'Premed: Methadone + Glycopyrrolate, Induksi: Propofol halus, Maintenance: Sevoflurane + Dexamethasone pre-op',
    asaScore: 'ASA II',
    status: 'Selesai',
    findings: 'Nares stenotik parah derajat 3 dan elongated soft palate menutupi epiglotis hingga 8mm.',
    postOpNotes: 'Reseksi baji bilateral cuping hidung & pemendekan palatum molle dengan radiofrekuensi electrocautery. Pernafasan pasca-ekstubasi terdengar jauh lebih lega.',
    sutureRemovalDate: '2025-05-22'
  },
  {
    id: 'sp7',
    procedureNo: 'SURG-20250315-02',
    petId: 'p4',
    petName: 'Oreo',
    customerName: 'Ahmad Dani',
    procedureName: 'Orchiectomy Bilateral Kucing Jantan (Kastrasi)',
    category: 'Sterilisasi',
    date: '2025-03-15',
    startTime: '10:15',
    endTime: '10:40',
    leadSurgeon: 'drh. Citra Prasetyo',
    anesthetist: 'Paramedik Surya',
    anesthesiaProtocol: 'Premed: Ketamine-Xylazine cocktail IM + Meloxicam analgesia',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Kedua testis normal, insisi skrotal terbuka tanpa jahitan (open technique autoligation).',
    postOpNotes: 'Pemulihan cepat dan refleks aktif dalam 30 menit pasca anestesi.',
    sutureRemovalDate: 'Tidak perlu'
  },
  {
    id: 'sp8',
    procedureNo: 'SURG-20251005-01',
    petId: 'p5',
    petName: 'Chiko',
    customerName: 'Rizky Febian',
    procedureName: 'Koreksi Flap Membrana Nictitans & Debridement Ulkus Kornea',
    category: 'Jaringan Lunak',
    date: '2025-10-05',
    startTime: '14:00',
    endTime: '14:45',
    leadSurgeon: 'drh. Ananda Putri',
    assistantSurgeon: 'drh. Budi Setiawan, Sp.NV',
    anesthetist: 'drh. Citra Prasetyo',
    anesthesiaProtocol: 'Premed: Butorphanol, Induksi: Propofol, Maintenance: Isoflurane + Tetes Pantocain 0.5%',
    asaScore: 'ASA I',
    status: 'Selesai',
    findings: 'Ulkus kornea superfisial indolen pada mata sinistra akibat tergores kuku saat bermain.',
    postOpNotes: 'Kuretase margin ulkus & fiksasi flap kelopak mata ketiga (third eyelid flap) untuk proteksi penyembuhan epitel kornea.',
    sutureRemovalDate: '2025-10-19'
  }
];

export const INITIAL_DRUGS: Drug[] = [
  { id: 'd1', code: 'DRG-001', name: 'Otopain Ear Drops 10ml', category: 'Analgesik', unit: 'Botol', stock: 18, minStock: 5, unitPrice: 85000, batchNumber: 'OTP-9921', expiryDate: '2027-05-20', location: 'Rak A-1' },
  { id: 'd2', code: 'DRG-002', name: 'Vaksin Rabies Defensor 3', category: 'Vaksin', unit: 'Vial', stock: 8, minStock: 10, unitPrice: 150000, batchNumber: 'RB-2026-991A', expiryDate: '2027-12-31', location: 'Kulkas V-1' },
  { id: 'd3', code: 'DRG-003', name: 'Amoxicillin Trihydrate 500mg', category: 'Antibiotik', unit: 'Tablet', stock: 120, minStock: 50, unitPrice: 5000, batchNumber: 'AMX-1092', expiryDate: '2027-08-15', location: 'Rak B-3' },
  { id: 'd4', code: 'DRG-004', name: 'Meloxicam Oral Suspension 0.5mg/ml', category: 'Analgesik', unit: 'Botol', stock: 4, minStock: 10, unitPrice: 120000, batchNumber: 'MLX-4011', expiryDate: '2026-09-30', location: 'Rak A-2' },
  { id: 'd5', code: 'DRG-005', name: 'Ringer Lactate Infusion 500ml', category: 'Cairan', unit: 'Kolf', stock: 25, minStock: 15, unitPrice: 28000, batchNumber: 'RL-8820', expiryDate: '2028-01-10', location: 'Gudang Cairan' },
];

export const INITIAL_LAB_TESTS: LabTest[] = [
  {
    id: 'lt1',
    testNo: 'LAB-20260604-01',
    petId: 'p4',
    petName: 'Oreo',
    customerName: 'Ahmad Dani',
    testName: 'Darah Lengkap (Hematologi Rutin)',
    status: 'Selesai',
    orderedBy: 'drh. Ananda Putri',
    orderedAt: '2026-08-10 14:30',
    completedAt: '2026-08-10 15:15',
    results: [
      { parameter: 'Hemoglobin (Hb)', value: '11.2', unit: 'g/dL', referenceRange: '9.0 - 15.0' },
      { parameter: 'Leukosit (WBC)', value: '18.5', unit: '10^3/uL', referenceRange: '5.5 - 19.5', isCritical: false },
      { parameter: 'Hematokrit (PCV)', value: '38', unit: '%', referenceRange: '30 - 45' },
      { parameter: 'Trombosit (PLT)', value: '280', unit: '10^3/uL', referenceRange: '200 - 500' }
    ],
    notes: 'Leukosit sedikit meningkat mendukung proses inflamasi GI.'
  },
  {
    id: 'lt2',
    testNo: 'LAB-20260810-02',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    testName: 'Profil Darah Lengkap & Kimia Klinik Komprehensif',
    status: 'Selesai',
    orderedBy: 'drh. Ananda Putri',
    orderedAt: '2026-08-10 09:15',
    completedAt: '2026-08-10 10:45',
    results: [
      { parameter: 'Hemoglobin (Hb)', value: '15.4', unit: 'g/dL', referenceRange: '12.0 - 18.0' },
      { parameter: 'Hematokrit (PCV)', value: '46', unit: '%', referenceRange: '37 - 55' },
      { parameter: 'Leukosit (WBC)', value: '11.8', unit: '10^3/uL', referenceRange: '6.0 - 17.0' },
      { parameter: 'Trombosit (PLT)', value: '315', unit: '10^3/uL', referenceRange: '200 - 500' },
      { parameter: 'SGPT / ALT (Fungsi Hati)', value: '48', unit: 'U/L', referenceRange: '10 - 100' },
      { parameter: 'Kreatinin (Fungsi Ginjal)', value: '1.1', unit: 'mg/dL', referenceRange: '0.5 - 1.5' },
      { parameter: 'BUN (Ureum)', value: '18.2', unit: 'mg/dL', referenceRange: '7.0 - 25.0' },
      { parameter: 'Glukosa Darah Puasa', value: '92', unit: 'mg/dL', referenceRange: '70 - 120' }
    ],
    notes: 'Hasil profil darah & fungsi organ vital dalam batas rujukan normal. Kondisi fisik prima.'
  },
  {
    id: 'lt3',
    testNo: 'LAB-20251118-01',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    testName: 'Skrining Pre-Anestesi & Profil Koagulasi Darah',
    status: 'Selesai',
    orderedBy: 'drh. Budi Setiawan, Sp.NV',
    orderedAt: '2025-11-18 11:00',
    completedAt: '2025-11-18 12:30',
    results: [
      { parameter: 'Trombosit (PLT)', value: '340', unit: '10^3/uL', referenceRange: '200 - 500' },
      { parameter: 'Prothrombin Time (PT)', value: '7.2', unit: 'detik', referenceRange: '6.0 - 8.5' },
      { parameter: 'Activated PTT (aPTT)', value: '14.8', unit: 'detik', referenceRange: '12.0 - 18.0' },
      { parameter: 'Total Protein (TP)', value: '6.8', unit: 'g/dL', referenceRange: '5.4 - 7.5' },
      { parameter: 'Albumin', value: '3.3', unit: 'g/dL', referenceRange: '2.6 - 4.0' }
    ],
    notes: 'Profil pembekuan darah normal. Pasien siap dan aman menjalani prosedur dental di bawah anestesi umum.'
  },
  {
    id: 'lt4',
    testNo: 'LAB-20240620-03',
    petId: 'p1',
    petName: 'Milo',
    customerName: 'Andri Santoso',
    testName: 'Sitologi Swab Eksudat Telinga (Kanalis Eksternus)',
    status: 'Selesai',
    orderedBy: 'drh. Ananda Putri',
    orderedAt: '2024-06-20 14:00',
    completedAt: '2024-06-20 14:40',
    results: [
      { parameter: 'Malassezia pachydermatis', value: '3+ (Banyak)', unit: '/HPF', referenceRange: '0 - 1 /HPF', isCritical: true },
      { parameter: 'Bakteri Cocci Gram Positif', value: '1+ (Sedikit)', unit: '/HPF', referenceRange: '0 - 1 /HPF' },
      { parameter: 'Neutrofil / Sel Radang', value: '2+ (Moderat)', unit: '/HPF', referenceRange: 'Negatif' }
    ],
    notes: 'Dikonfirmasi infeksi Otitis Externa ragi Malassezia sekunder. Terapi tetes antijamur & pembersih telinga disarankan.'
  },
  {
    id: 'lt5',
    testNo: 'LAB-20260722-01',
    petId: 'p2',
    petName: 'Luna',
    customerName: 'Andri Santoso',
    testName: 'Sitologi & Uji Kerokan Kulit (Skin Scraping & DTM Fungal)',
    status: 'Selesai',
    orderedBy: 'drh. Citra Prasetyo',
    orderedAt: '2026-07-22 10:30',
    completedAt: '2026-07-22 11:15',
    results: [
      { parameter: 'Ektoparasit (Notoedres / Otodectes)', value: 'Negatif', unit: '-', referenceRange: 'Negatif' },
      { parameter: 'Kultur Jamur Dermatofit (DTM)', value: 'Positif (Microsporum canis)', unit: '-', referenceRange: 'Negatif', isCritical: true },
      { parameter: 'Spora Jamur Hifa', value: 'Positif Ditemukan', unit: '-', referenceRange: 'Negatif', isCritical: true }
    ],
    notes: 'Hasil mendukung Ringworm Dermatophytosis. Dilanjutkan terapi shampoo ketoconazole & antifungal oral.'
  },
  {
    id: 'lt6',
    testNo: 'LAB-20240210-01',
    petId: 'p2',
    petName: 'Luna',
    customerName: 'Andri Santoso',
    testName: 'Pre-Op Screening Hematologi & Uji Rapid Antigen FPV',
    status: 'Selesai',
    orderedBy: 'drh. Ananda Putri',
    orderedAt: '2024-02-10 09:00',
    completedAt: '2024-02-10 09:40',
    results: [
      { parameter: 'FPV Antigen Rapid Test', value: 'Negatif', unit: '-', referenceRange: 'Negatif' },
      { parameter: 'Leukosit (WBC)', value: '9.4', unit: '10^3/uL', referenceRange: '5.5 - 19.5' },
      { parameter: 'Trombosit (PLT)', value: '380', unit: '10^3/uL', referenceRange: '200 - 600' },
      { parameter: 'Hematokrit (PCV)', value: '35', unit: '%', referenceRange: '30 - 45' }
    ],
    notes: 'Luna dalam kondisi prima tanpa viremia, parameter darah lengkap mendukung jadwal operasi sterilisasi.'
  },
  {
    id: 'lt7',
    testNo: 'LAB-20250510-01',
    petId: 'p3',
    petName: 'Max',
    customerName: 'Dewi Lestari',
    testName: 'Radiologi X-Ray Thorax 2 Proyeksi (Lateral & VD)',
    status: 'Selesai',
    orderedBy: 'drh. Budi Setiawan, Sp.NV',
    orderedAt: '2025-05-10 15:00',
    completedAt: '2025-05-10 15:45',
    results: [
      { parameter: 'Rasio Diameter Trakea / Thoracic Inlet', value: '0.14', unit: 'rasio', referenceRange: '> 0.16 (Normal)', isCritical: true },
      { parameter: 'Panjang Palatum Molle', value: 'Elongated (Menutupi Epiglotis)', unit: 'mm', referenceRange: 'Normo-posisi' },
      { parameter: 'Cor / Silhouette Jantung', value: 'VHS 9.8 (Normal Bulldog)', unit: 'Vertebral Scale', referenceRange: '< 10.5' }
    ],
    notes: 'X-Ray mengonfirmasi elongasi palatum molle & hipoplasia trakea ringan khas sindrom brachycephalic.'
  },
  {
    id: 'lt8',
    testNo: 'LAB-20260614-02',
    petId: 'p5',
    petName: 'Chiko',
    customerName: 'Rizky Febian',
    testName: 'Urinalisis Lengkap & Pemeriksaan Sedimen Mikroskopis',
    status: 'Selesai',
    orderedBy: 'drh. Hendrawan',
    orderedAt: '2026-06-14 11:30',
    completedAt: '2026-06-14 12:15',
    results: [
      { parameter: 'Berat Jenis Urin (USG)', value: '1.038', unit: '-', referenceRange: '1.015 - 1.045' },
      { parameter: 'pH Urin', value: '7.5 (Alkalin)', unit: 'pH', referenceRange: '6.0 - 7.0', isCritical: true },
      { parameter: 'Kristal Struvit (Triple Fosfat)', value: '2+ (Bentuk Prisma Peti Mati)', unit: '/LPF', referenceRange: '0 - Sedikit', isCritical: true },
      { parameter: 'Eritrosit (RBC)', value: '3 - 5', unit: '/HPF', referenceRange: '0 - 3 /HPF' }
    ],
    notes: 'Ditemukan kristaluria struvit dengan urin alkalin. Direkomendasikan pakan urinary diet & asupan hidrasi diperbanyak.'
  }
];

export const INITIAL_GROOMING_SESSIONS: GroomingSession[] = [
  { id: 'gs1', sessionNo: 'GRM-20260604-01', petId: 'p2', petName: 'Luna', customerName: 'Andri Santoso', groomerName: 'Binta Amalia', packageType: 'Premium', petSize: 'Medium', stage: 'Selesai', date: '2026-08-11', timeSlot: '09:30', price: 175000, beforePhotoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200', afterPhotoUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=200', notes: 'Bulu halus bersinar, telinga bersih' },
  { id: 'gs2', sessionNo: 'GRM-20260604-02', petId: 'p4', petName: 'Oreo', customerName: 'Ahmad Dani', groomerName: 'Binta Amalia', packageType: 'Medicinal', petSize: 'Small', stage: 'Proses Grooming', date: '2026-08-11', timeSlot: '11:00', price: 220000, notes: 'Shampoo jamur direndam 10 menit' },
];

export const INITIAL_HOTEL_RESERVATIONS: HotelReservation[] = [
  { id: 'hr1', reservationNo: 'HTL-20260604-01', petId: 'p1', petName: 'Milo', customerName: 'Andri Santoso', roomType: 'VIP CCTV', roomNo: 'R01', checkInDate: '2026-08-10', checkOutDate: '2026-08-14', totalNights: 4, dailyRate: 150000, totalCost: 600000, status: 'Aktif', notes: 'Milo tenang, nafsu makan baik.' },
  { id: 'hr2', reservationNo: 'HTL-20260604-02', petId: 'p3', petName: 'Max', customerName: 'Dewi Lestari', roomType: 'Small', roomNo: 'R03', checkInDate: '2026-08-12', checkOutDate: '2026-08-15', totalNights: 3, dailyRate: 125000, totalCost: 375000, status: 'Reservasi', notes: 'Reservasi terbayar DP.' },
];

export const INITIAL_DAILY_MONITORING: DailyMonitoring[] = [
  { id: 'dm1', reservationId: 'hr1', petName: 'Milo', roomNo: 'R01', date: '2026-08-11', morningFeeding: true, morningMedication: true, afternoonPlaytime: true, eveningFeeding: true, eveningRest: true, temperatureC: 38.5, notes: 'Minum banyak, kotoran normal.', staffName: 'Binta Amalia' }
];

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  { id: 'si1', sku: 'FD-RC-01', name: 'Royal Canin Golden Retriever Adult 3kg', category: 'Makanan', warehouse: 'Pet Shop', stock: 12, minStock: 5, unit: 'Bag', purchasePrice: 320000, sellingPrice: 385000, supplierName: 'PT Petindo Jaya', expiryDate: '2026-12-15', batchNumber: 'LOT-RC2601' },
  { id: 'si2', sku: 'FD-RC-02', name: 'Royal Canin Persian Adult 2kg', category: 'Makanan', warehouse: 'Pet Shop', stock: 3, minStock: 5, unit: 'Bag', purchasePrice: 240000, sellingPrice: 295000, supplierName: 'PT Petindo Jaya', expiryDate: '2026-08-28', batchNumber: 'LOT-RC2508' },
  { id: 'si3', sku: 'MED-AMX-500', name: 'Amoxicillin 500mg Strip', category: 'Obat', warehouse: 'Apotek', stock: 120, minStock: 30, unit: 'Strip', purchasePrice: 12000, sellingPrice: 20000, supplierName: 'PharmaVet Supply', expiryDate: '2027-04-10', batchNumber: 'LOT-AMX2027' },
  { id: 'si4', sku: 'ACC-CLW-01', name: 'Pemotong Kuku Anjing Stainless', category: 'Aksesoris', warehouse: 'Grooming Supply', stock: 8, minStock: 3, unit: 'Pcs', purchasePrice: 45000, sellingPrice: 75000, supplierName: 'CV Animalia Tools' },
  { id: 'si5', sku: 'VIT-NUT-01', name: 'Nutri-Plus Gel High Energy 120g', category: 'Vitamin', warehouse: 'Pet Shop', stock: 15, minStock: 4, unit: 'Tube', purchasePrice: 95000, sellingPrice: 135000, supplierName: 'PT Petindo Jaya', expiryDate: '2026-09-02', batchNumber: 'LOT-NUT2609' },
  { id: 'si6', sku: 'FD-WHISK-01', name: 'Whiskas Pouch Tuna & Salmon 85g (Pack of 12)', category: 'Makanan', warehouse: 'Pet Shop', stock: 20, minStock: 6, unit: 'Box', purchasePrice: 70000, sellingPrice: 95000, supplierName: 'PT Petindo Jaya', expiryDate: '2026-08-25', batchNumber: 'LOT-WSK2508' },
  { id: 'si7', sku: 'SAND-BENT-10', name: 'Pasir Kucing Bentonite Wangi Lavender 10L', category: 'Pasir Kucing', warehouse: 'Pet Shop', stock: 18, minStock: 5, unit: 'Sak', purchasePrice: 55000, sellingPrice: 85000, supplierName: 'PT Petindo Jaya', expiryDate: '2028-12-31' },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'sm1', itemId: 'si1', itemName: 'Royal Canin Golden Retriever Adult 3kg', type: 'Masuk', quantity: 10, toWarehouse: 'Pet Shop', referenceNo: 'PO-20260601-01', date: '2026-08-01', operator: 'Ani Lestari' },
  { id: 'sm2', itemId: 'si2', itemName: 'Royal Canin Persian Adult 2kg', type: 'Keluar', quantity: 2, fromWarehouse: 'Pet Shop', referenceNo: 'INV-20260604-001', date: '2026-08-11', operator: 'Ani Lestari' },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup1', code: 'SUP-001', name: 'PT Petindo Jaya Utama', contactPerson: 'Hendra Setiawan', phone: '021-55443322', email: 'orders@petindo.co.id', address: 'Kawasan Industri Pulogadung Blok B-12, Jakarta', category: 'Makanan & Nutrisi' },
  { id: 'sup2', code: 'SUP-002', name: 'PharmaVet Nusantara', contactPerson: 'Dr. Farah Dian', phone: '021-88990011', email: 'sales@pharmavet.co.id', address: 'Jl. Pemuda No. 99, Jakarta Timur', category: 'Obat & Vaksin' },
  { id: 'sup3', code: 'SUP-003', name: 'CV Animalia Tools & Supply', contactPerson: 'Rudi Tabuti', phone: '022-7788990', email: 'rudi@animalia.com', address: 'Jl. Soekarno Hatta No. 401, Bandung', category: 'Aksesoris & Grooming' },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'po1', poNo: 'PO-20260601-01', supplierName: 'PT Petindo Jaya Utama', date: '2026-08-01', status: 'Diterima', items: [{ itemName: 'Royal Canin Golden Retriever Adult 3kg', quantity: 10, unit: 'Bag', unitPrice: 320000, total: 3200000 }], totalAmount: 3200000, notes: 'Lunas via Transfer Bank' },
  { id: 'po2', poNo: 'PO-20260604-01', supplierName: 'PharmaVet Nusantara', date: '2026-08-11', status: 'Draft', items: [{ itemName: 'Royal Canin Persian Adult 2kg', quantity: 10, unit: 'Bag', unitPrice: 240000, total: 2400000 }], totalAmount: 2400000, notes: 'Reorder otomatis stok menipis' },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNo: 'INV-20260604-001',
    customerId: 'c1',
    customerName: 'Andri Santoso',
    petName: 'Milo',
    date: '2026-08-11',
    items: [
      { id: 'ii1', category: 'Konsultasi', name: 'Jasa Dokter & Pemeriksaan Fisik', quantity: 1, unitPrice: 150000, totalPrice: 150000 },
      { id: 'ii2', category: 'Vaksin', name: 'Vaksin Rabies Defensor 3', quantity: 1, unitPrice: 150000, totalPrice: 150000 },
      { id: 'ii3', category: 'Obat', name: 'Otopain Ear Drops 10ml', quantity: 1, unitPrice: 85000, totalPrice: 85000 }
    ],
    subtotal: 385000,
    discountAmount: 19250, // 5% Platinum discount
    totalAmount: 365750,
    paidAmount: 365750,
    paymentMethod: 'QRIS',
    status: 'Lunas',
    loyaltyPointsEarned: 36,
    cashierName: 'Ani Lestari'
  },
  {
    id: 'inv2',
    invoiceNo: 'INV-20260604-002',
    customerId: 'c2',
    customerName: 'Dewi Lestari',
    petName: 'Max',
    date: '2026-08-11',
    items: [
      { id: 'ii4', category: 'Pet Hotel', name: 'Reservasi Pet Hotel VIP CCTV (3 malam)', quantity: 3, unitPrice: 125000, totalPrice: 375000 }
    ],
    subtotal: 375000,
    discountAmount: 0,
    totalAmount: 375000,
    paidAmount: 0,
    paymentMethod: 'Tunai',
    status: 'Belum Dibayar',
    loyaltyPointsEarned: 0,
    cashierName: 'Ani Lestari'
  }
];

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [
  { id: 'ct1', transNo: 'CSH-20260604-01', type: 'Masuk', category: 'Penjualan Klinik', amount: 365750, date: '2026-08-11 09:35', description: 'Pelunasan Invoice INV-20260604-001 (Andri Santoso)', referenceNo: 'INV-20260604-001', operator: 'Ani Lestari' },
  { id: 'ct2', transNo: 'CSH-20260604-02', type: 'Keluar', category: 'Operasional Kantor', amount: 150000, date: '2026-08-11 10:00', description: 'Pembelian konsumsi rapat staf & dokter', operator: 'Ani Lestari' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', nik: 'EMP-001', name: 'drh. Ananda Putri', role: 'Dokter Hewan', department: 'Medis', phone: '081233445566', email: 'ananda@petcare.id', hireDate: '2023-01-15', sipNumber: 'SIP.503/VET/2023/0019', baseSalary: 8500000, commissionRatePercent: 10, status: 'Aktif' },
  { id: 'e5', nik: 'EMP-005', name: 'drh. Budi Setiawan, Sp.NV', role: 'Dokter Hewan', department: 'Bedah & Spesialis', phone: '081298765432', email: 'budi@petcare.id', hireDate: '2023-04-10', sipNumber: 'SIP.503/VET/2022/0104', baseSalary: 9500000, commissionRatePercent: 12, status: 'Aktif' },
  { id: 'e6', nik: 'EMP-006', name: 'drh. Citra Prasetyo', role: 'Dokter Hewan', department: 'Medis (Feline)', phone: '081377889900', email: 'citra@petcare.id', hireDate: '2024-01-20', sipNumber: 'SIP.503/VET/2024/0088', baseSalary: 8000000, commissionRatePercent: 10, status: 'Aktif' },
  { id: 'e2', nik: 'EMP-002', name: 'Ani Lestari', role: 'Kasir', department: 'Front Office', phone: '081344556677', email: 'ani@petcare.id', hireDate: '2023-06-01', baseSalary: 4800000, commissionRatePercent: 0, status: 'Aktif' },
  { id: 'e3', nik: 'EMP-003', name: 'Binta Amalia', role: 'Groomer', department: 'Grooming', phone: '081455667788', email: 'binta@petcare.id', hireDate: '2024-02-10', baseSalary: 4200000, commissionRatePercent: 15, status: 'Aktif' },
  { id: 'e4', nik: 'EMP-004', name: 'Rahmat Hidayat', role: 'Paramedik', department: 'Medis', phone: '081566778899', email: 'rahmat@petcare.id', hireDate: '2024-05-01', baseSalary: 5000000, commissionRatePercent: 2, status: 'Aktif' },
];

export const INITIAL_ABSENCE_RECORDS: AbsenceRecord[] = [
  { id: 'ab1', employeeId: 'e1', employeeName: 'drh. Ananda Putri', date: '2026-08-11', checkIn: '08:15', status: 'Hadir' },
  { id: 'ab2', employeeId: 'e2', employeeName: 'Ani Lestari', date: '2026-08-11', checkIn: '08:25', status: 'Hadir' },
  { id: 'ab3', employeeId: 'e3', employeeName: 'Binta Amalia', date: '2026-08-11', checkIn: '08:30', status: 'Hadir' },
  { id: 'ab4', employeeId: 'e4', employeeName: 'Rahmat Hidayat', date: '2026-08-11', checkIn: '08:50', status: 'Terlambat', notes: 'Macet tol barat' },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employeeId: 'e4', employeeName: 'Rahmat Hidayat', leaveType: 'Tahunan', startDate: '2026-08-20', endDate: '2026-08-22', totalDays: 3, reason: 'Acara keluarga di Bandung', status: 'Disetujui' }
];

export const INITIAL_LOYALTY_ENTRIES: LoyaltyEntry[] = [
  { id: 'le1', customerId: 'c1', customerName: 'Andri Santoso', pointsChanged: 36, type: 'Earn', description: 'Transaksi INV-20260604-001', date: '2026-08-11' },
  { id: 'le2', customerId: 'c1', customerName: 'Andri Santoso', pointsChanged: -100, type: 'Redeem', description: 'Penukaran Voucher Diskon Rp 5.000', date: '2026-08-01' },
];

export const INITIAL_REMINDERS: Reminder[] = [
  { id: 'rem1', customerName: 'Dewi Lestari', customerPhone: '082198765432', petName: 'Max', title: 'Vaksinasi DHPPi Terlambat', type: 'Vaksin', dueDate: '2026-08-01', status: 'Menunggu' },
  { id: 'rem2', customerName: 'Andri Santoso', customerPhone: '081234567890', petName: 'Luna', title: 'Vaksin FVRCP Jatuh Tempo', type: 'Vaksin', dueDate: '2026-08-15', status: 'Menunggu' },
];

export const INITIAL_CARE_PLANS: CarePlan[] = [
  {
    id: 'cp1',
    planNo: 'CP-20260601-01',
    petId: 'p4',
    petName: 'Oreo',
    customerName: 'Ahmad Dani',
    doctorName: 'drh. Ananda Putri',
    title: 'Rencana Pemulihan Gastroenteritis & Rehidrasi',
    diagnosis: 'Gastroenteritis Dehidrasi Sedang',
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    status: 'Aktif',
    tasks: [
      { id: 'cpt1', type: 'Monitoring', title: 'Cek TTV & Turgor Kulit Pagi', dueDate: '2026-08-11', isCompleted: true, completedAt: '2026-08-11 08:30' },
      { id: 'cpt2', type: 'Obat', title: 'Injeksi Ondansetron & Metronidazole', dueDate: '2026-08-11', isCompleted: true, completedAt: '2026-08-11 09:00' },
      { id: 'cpt3', type: 'Diet', title: 'Pemberian Wet Food i/d 1/2 kaleng', dueDate: '2026-08-11', isCompleted: false },
      { id: 'cpt4', type: 'Kunjungan', title: 'Kontrol Evaluasi Rawat Jalan', dueDate: '2026-08-17', isCompleted: false },
    ],
    notes: 'Prioritaskan cegah muntah berulang.'
  }
];

export const INITIAL_TELEHEALTH_SESSIONS: TelehealthSession[] = [
  { id: 'th1', sessionNo: 'TH-20260604-01', customerId: 'c2', customerName: 'Dewi Lestari', petId: 'p3', petName: 'Max', doctorName: 'drh. Ananda Putri', date: '2026-08-11', timeSlot: '16:00', durationMinutes: 30, type: 'Follow-up', complaint: 'Konsultasi kelanjutan gatal di lipatan kulit Max', fee: 75000, status: 'Menunggu', meetingUrl: 'https://meet.petcare.id/th-20260604-01' }
];

export const INITIAL_EFORM_TEMPLATES: EFormTemplate[] = [
  { id: 'eft1', title: 'Persetujuan Tindakan Operasi / Anestesi', category: 'Medis', description: 'Surat persetujuan tindakan bedah & pembiusan oleh pemilik hewan', fields: [{ id: 'f1', label: 'Prosedur Tindakan Medis', type: 'text', required: true }, { id: 'f2', label: 'Pernyataan Memahami Risiko', type: 'checkbox', required: true }, { id: 'f3', label: 'Tanda Tangan Pemilik', type: 'signature', required: true }] },
  { id: 'eft2', title: 'Persetujuan Penitipan Pet Hotel', category: 'Hotel', description: 'Ketentuan dan syarat penitipan hewan di PetCare Hotel', fields: [{ id: 'f1', label: 'Lama Penitipan (Hari)', type: 'text', required: true }, { id: 'f2', label: 'Instruksi Khusus / Makanan', type: 'textarea', required: false }, { id: 'f3', label: 'Setuju Aturan & Emergency Care', type: 'checkbox', required: true }, { id: 'f4', label: 'Tanda Tangan Pemilik', type: 'signature', required: true }] },
];

export const INITIAL_EFORM_SUBMISSIONS: EFormSubmission[] = [
  { id: 'efs1', templateId: 'eft2', templateTitle: 'Persetujuan Penitipan Pet Hotel', petName: 'Milo', customerName: 'Andri Santoso', date: '2026-08-10', status: 'Ditandatangani', fieldValues: { f1: '4 Hari', f2: 'Makan 2x sehari jam 8 pagi & 6 sore', f3: true }, signatureData: 'Andri Santoso' }
];

export const INITIAL_AMBULANCE_UNITS: AmbulanceUnit[] = [
  { id: 'au1', code: 'AMB-01', vehicleName: 'Daihatsu GranMax VET Rescue', plateNo: 'B 9182 VET', status: 'Tersedia', currentDriver: 'Ahmad Subagja', currentParamedic: 'Rahmat Hidayat', equipmentStatus: 'Lengkap (Oxygen, Stretcher, First Aid, Suction)' },
  { id: 'au2', code: 'AMB-02', vehicleName: 'Toyota HiAce Emergency Unit', plateNo: 'B 1092 VET', status: 'Bertugas', currentDriver: 'Bambang Tri', currentParamedic: 'Siti Rahma', equipmentStatus: 'Lengkap (Defibrillator, Ventilator, Oxygen)' },
];

export const INITIAL_AMBULANCE_REQUESTS: AmbulanceRequest[] = [
  { id: 'ar1', requestNo: 'AMB-REQ-20260604-01', customerName: 'Dewi Lestari', customerPhone: '082198765432', petName: 'Max', petSpecies: 'Anjing', urgency: 'Emergency', pickupAddress: 'Jl. Sudirman No. 88, Jakarta', destination: 'Klinik Utama (Pusat)', assignedUnitCode: 'AMB-02', status: 'Perjalanan', requestedAt: '2026-08-11 10:15', notes: 'Max kejang dan sulit bernapas' }
];

export const INITIAL_PATIENT_PHOTOS: PatientPhoto[] = [
  { id: 'ph1', petId: 'p1', petName: 'Milo', category: 'Kunjungan', photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600', caption: 'Pemeriksaan rutin telinga kanan Milo', takenAt: '2026-08-11', takenBy: 'drh. Ananda Putri' },
  { id: 'ph2', petId: 'p2', petName: 'Luna', category: 'Sebelum', photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600', caption: 'Kondisi bulu Luna sebelum grooming premium', takenAt: '2026-08-11', takenBy: 'Binta Amalia' },
  { id: 'ph3', petId: 'p2', petName: 'Luna', category: 'Sesudah', photoUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600', caption: 'Bulu Luna mengembang indah setelah blow dry', takenAt: '2026-08-11', takenBy: 'Binta Amalia' },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', timestamp: '2026-08-11 08:30:00', userName: 'Admin Sistem', userRole: 'admin', action: 'Login', module: 'Auth', target: 'System', details: 'Berhasil login ke sistem' },
  { id: 'al2', timestamp: '2026-08-11 09:35:12', userName: 'Ani Lestari', userRole: 'kasir', action: 'Bayar', module: 'Billing', target: 'INV-20260604-001', details: 'Pelunasan invoice via QRIS sejumlah Rp 365.750' },
  { id: 'al3', timestamp: '2026-08-11 10:15:00', userName: 'Rahmat Hidayat', userRole: 'perawat', action: 'Tambah', module: 'Ambulance', target: 'AMB-REQ-20260604-01', details: 'Permintaan emergency ambulance dibuat untuk Max' },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'Vaksinasi Jatuh Tempo Hari Ini', message: 'Milo (Andri Santoso) dijadwalkan Vaksin Rabies Booster hari ini.', type: 'Vaksin', priority: 'Tinggi', createdAt: '2026-08-11 08:00', isRead: false },
  { id: 'n2', title: 'Peringatan Stok Obat Menipis', message: 'Vaksin Rabies Defensor 3 tersisa 8 vial (Minimum 10 vial).', type: 'Stok', priority: 'Tinggi', createdAt: '2026-08-11 08:05', isRead: false },
  { id: 'n3', title: 'Booking Baru Diterima', message: 'Dewi Lestari memesan konsultasi untuk Max jam 10:30.', type: 'Booking', priority: 'Sedang', createdAt: '2026-08-10 18:20', isRead: true },
];

export const INITIAL_PRE_CONSULT_FORMS: PreConsultForm[] = [
  { id: 'pcf1', customerName: 'Andri Santoso', petName: 'Milo', chiefComplaint: 'Gatal di telinga kanan', knownAllergies: 'Amoxicillin', currentMedications: 'Tidak ada', homeWeightKg: 28.5, behaviorNotes: 'Tenang namun sensitif saat telinga disentuh', status: 'Digunakan', createdAt: '2026-08-11 08:40' }
];

export const INITIAL_REFERRAL_LETTERS: ReferralLetter[] = [
  { id: 'rl1', referralNo: 'REF-20260601-01', petName: 'Max', customerName: 'Dewi Lestari', destinationClinic: 'RS Animal Central Jakarta', destinationDoctor: 'drh. Budi Specialist Sp.NV', urgency: 'Segera', reason: 'Pemeriksaan lanjutan MRI Otak & Tulang Belakang', currentMedications: 'Dexamethasone 0.5mg', notes: 'Harap dilampirkan hasil X-Ray tanggal 01 Juni.', createdAt: '2026-08-01' }
];

export const INITIAL_VISIT_SURVEYS: VisitSurvey[] = [
  { id: 'vs1', visitId: 'v1', petName: 'Milo', customerName: 'Andri Santoso', doctorName: 'drh. Ananda Putri', rating: 5, comments: 'Pelayanan sangat memuaskan, drh. Ananda menjelaskan dengan detail dan ramah!', createdAt: '2026-08-11 09:40' }
];

export const INITIAL_SERVICES: ServiceItem[] = [
  { id: 'srv1', code: 'SRV-001', name: 'Konsultasi & Pemeriksaan Dokter Umum', category: 'Konsultasi', estimatedDurationMins: 30, price: 150000, description: 'Pemeriksaan fisik komprehensif oleh dokter hewan', isActive: true },
  { id: 'srv2', code: 'SRV-002', name: 'Vaksinasi Rabies (Defensor 3)', category: 'Vaksinasi', estimatedDurationMins: 15, price: 150000, description: 'Injeksi vaksin rabies + paspor kesehatan', isActive: true },
  { id: 'srv3', code: 'SRV-003', name: 'Grooming Premium Anjing / Kucing', category: 'Grooming', estimatedDurationMins: 60, price: 175000, description: 'Mandi, potong kuku, pangkas rapi, blow dry', isActive: true },
  { id: 'srv4', code: 'SRV-004', name: 'Grooming Medicated / Anti-Jamur', category: 'Grooming', estimatedDurationMins: 60, price: 220000, description: 'Keramas dengan shampoo terapis khusus', isActive: true },
  { id: 'srv5', code: 'SRV-005', name: 'Pet Hotel VIP Room (per malam)', category: 'Pet Hotel', estimatedDurationMins: 1440, price: 150000, description: 'Ruang AC, CCTV live 24 jam, pakan & playtime', isActive: true },
  { id: 'srv6', code: 'SRV-006', name: 'Radiologi X-Ray Digital (1 posisi)', category: 'Lab & Radiologi', estimatedDurationMins: 30, price: 350000, description: 'Citra Rontgen DICOM + ekspertise dokter', isActive: true },
  { id: 'srv7', code: 'SRV-007', name: 'Pemeriksaan Darah Lengkap (Hematologi)', category: 'Lab & Radiologi', estimatedDurationMins: 20, price: 250000, description: 'Cek Hb, Leukosit, Hematokrit, Trombosit', isActive: true },
];

export const INITIAL_SYSTEM_GROUPS: SystemGroup[] = [
  {
    id: 'grp-medis',
    code: 'MED-VET',
    name: 'Tim Medis & Dokter Hewan (EMR / Poliklinik)',
    type: 'Staf & Medis',
    description: 'Otorisasi diagnosa klinis, SOAP, EMR, tindakan bedah, radiologi, resep obat keras, dan rencana rawat inap.',
    departmentHead: 'Drh. Ratna Permata, M.Si (Kepala Tim Medis)',
    color: '#5BB076',
    allowedRoles: ['dokter', 'perawat', 'owner_klinik', 'owner_petcare', 'superadmin'],
    memberCount: 6,
    isSystemDefault: true,
    createdAt: '2026-01-10',
    modulePermissions: [
      { moduleId: 'clinic', moduleName: 'Pemeriksaan Klinik & EMR', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'emr', moduleName: 'Rekam Medis & Riwayat Pasien', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'vaccination', moduleName: 'Buku Vaksinasi & Paspor', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'pharmacy', moduleName: 'Resep Obat & Lab Cito', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'carePlan', moduleName: 'Care Plan & Rencana Terapi', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'eForms', moduleName: 'E-Form Persetujuan Tindakan Bedah', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'booking', moduleName: 'Antrean & Reservasi Pasien', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'inventory', moduleName: 'Stok Obat & Gudang', canView: true, canCreate: false, canEdit: false, canDelete: false },
      { moduleId: 'billing', moduleName: 'Kasir & Keuangan', canView: false, canCreate: false, canEdit: false, canDelete: false }
    ]
  },
  {
    id: 'grp-farmasi',
    code: 'PHARM-LOG',
    name: 'Departemen Farmasi, Apotek & Lab',
    type: 'Staf & Medis',
    description: 'Pengelolaan obat etiket keras, dispensing resep dokter, validasi dosis interaksi obat, dan stok opname apotek.',
    departmentHead: 'Apoteker Dimas Pratama, S.Farm',
    color: '#6BA3BE',
    allowedRoles: ['admin', 'dokter', 'owner_klinik', 'superadmin'],
    memberCount: 4,
    isSystemDefault: true,
    createdAt: '2026-01-12',
    modulePermissions: [
      { moduleId: 'pharmacy', moduleName: 'Dispensing Resep & Lab', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'inventory', moduleName: 'Inventaris & Farmasi', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'purchasing', moduleName: 'Purchasing (PO Obat)', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'clinic', moduleName: 'EMR (Hanya Riwayat Resep)', canView: true, canCreate: false, canEdit: false, canDelete: false },
      { moduleId: 'billing', moduleName: 'Kasir & Billing', canView: true, canCreate: false, canEdit: false, canDelete: false }
    ]
  },
  {
    id: 'grp-frontoffice',
    code: 'FO-CASHIER',
    name: 'Front Office, Registrasi & Kasir POS',
    type: 'Layanan & Operasional',
    description: 'Pendaftaran pasien baru, antrean poli, kasir POS billing, invoice, WhatsApp reminder, dan retail pet shop.',
    departmentHead: 'Siska Amanda (Head Receptionist)',
    color: '#D9B98A',
    allowedRoles: ['kasir', 'resepsionis', 'admin', 'owner_petshop', 'owner_petcare', 'superadmin'],
    memberCount: 5,
    isSystemDefault: true,
    createdAt: '2026-01-15',
    modulePermissions: [
      { moduleId: 'dashboard', moduleName: 'Dashboard Operasional', canView: true, canCreate: false, canEdit: false, canDelete: false },
      { moduleId: 'masterData', moduleName: 'Master Pelanggan & Hewan', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'booking', moduleName: 'Booking & Antrean Kiosk', canView: true, canCreate: true, canEdit: true, canDelete: true },
      { moduleId: 'petShop', moduleName: 'Pet Shop Retail POS', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'billing', moduleName: 'Billing & Kasir Pembayaran', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'clinic', moduleName: 'Status Kunjungan Poli', canView: true, canCreate: true, canEdit: false, canDelete: false }
    ]
  },
  {
    id: 'grp-ops-care',
    code: 'CARE-HOTEL',
    name: 'Divisi Perawatan Grooming, Hotel & Ambulans',
    type: 'Layanan & Operasional',
    description: 'Layanan salon grooming spa anabul, reservasi kandang pet hotel, pemantauan CCTV, dan penjemputan darurat ambulans.',
    departmentHead: 'Budi Santoso (Koordinator Pet Care)',
    color: '#D97757',
    allowedRoles: ['groomer', 'perawat', 'admin', 'owner_petcare', 'superadmin'],
    memberCount: 7,
    isSystemDefault: false,
    createdAt: '2026-02-01',
    modulePermissions: [
      { moduleId: 'grooming', moduleName: 'Grooming Salon & Spa', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'petHotel', moduleName: 'Pet Hotel Boarding & Kandang', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'ambulance', moduleName: 'Ambulance & Emergency Rescue', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
      { moduleId: 'patientGallery', moduleName: 'Galeri Foto Pasien', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { moduleId: 'masterData', moduleName: 'Data Hewan & Klien', canView: true, canCreate: false, canEdit: false, canDelete: false }
    ]
  },
  {
    id: 'grp-manajemen',
    code: 'EXEC-MGMT',
    name: 'Direksi, Audit & Manajemen Keuangan',
    type: 'Eksekutif & Keuangan',
    description: 'Akses tanpa batas ke laporan P&L, buku kas besar, manajemen SDM, multi-cabang, audit trail, dan konfigurasi sistem.',
    departmentHead: 'Drh. Hendra Wijaya (Direktur Operasional)',
    color: '#B8905A',
    allowedRoles: ['owner', 'owner_klinik', 'owner_petshop', 'owner_petcare', 'admin', 'superadmin'],
    memberCount: 3,
    isSystemDefault: true,
    createdAt: '2026-01-01',
    modulePermissions: [
      { moduleId: 'dashboard', moduleName: 'Dashboard Utama & Analitik', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'finance', moduleName: 'Buku Kas & Laporan Laba Rugi', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'hrm', moduleName: 'SDM, Payroll & Shift Staf', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'reports', moduleName: 'Laporan Eksekutif & Ekspor', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'crm', moduleName: 'CRM & Loyalty Member Club', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'auditLog', moduleName: 'Audit Log & Keamanan Cloud', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'branches', moduleName: 'Manajemen Multi-Cabang', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'masterData', moduleName: 'Master Data (Pelanggan, Layanan, Staf, dst)', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'systemGroups', moduleName: 'Grup Sistem & Tier Loyalitas Klien', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { moduleId: 'purchasing', moduleName: 'Purchasing & Pengadaan Supplier', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true }
    ]
  }
];

export const INITIAL_CUSTOMER_TIER_GROUPS: CustomerTierGroup[] = [
  { id: 'tier-platinum', tierName: 'VIP Platinum Pet Club', code: 'PLATINUM', minSpend: 5000000, discountPercent: 15, perks: 'Prioritas booking tanpa antre poli, diskon 15% rawat inap/tindakan, gratis antar-jemput ambulans 3x/tahun, birthday voucher Rp 100.000', color: '#B8905A', memberCount: 18, autoUpgrade: true },
  { id: 'tier-gold', tierName: 'Gold Member Paws Elite', code: 'GOLD', minSpend: 2000000, discountPercent: 10, perks: 'Diskon konsultasi dokter 10%, diskon grooming salon 10%, poin reward 2x lipat setiap transaksi retail pet shop', color: '#D9B98A', memberCount: 34, autoUpgrade: true },
  { id: 'tier-silver', tierName: 'Silver Reguler Care', code: 'SILVER', minSpend: 500000, discountPercent: 5, perks: 'Poin reward belanja produk pet shop, pengingat vaksinasi & booster otomatis via WhatsApp/SMS terintegrasi', color: '#6BA3BE', memberCount: 72, autoUpgrade: true }
];

export const INITIAL_HOTEL_ROOMS: HotelRoom[] = [
  { id: 'room1', roomNo: 'R01', roomType: 'VIP CCTV', capacity: 1, dailyRate: 150000, isActive: true, notes: 'Dilengkapi CCTV live streaming untuk pemilik' },
  { id: 'room2', roomNo: 'R02', roomType: 'VIP AC', capacity: 1, dailyRate: 140000, isActive: true },
  { id: 'room3', roomNo: 'R03', roomType: 'Small', capacity: 1, dailyRate: 125000, isActive: true },
  { id: 'room4', roomNo: 'R04', roomType: 'Medium', capacity: 1, dailyRate: 135000, isActive: true },
  { id: 'room5', roomNo: 'R05', roomType: 'Large', capacity: 2, dailyRate: 160000, isActive: true },
  { id: 'room6', roomNo: 'R06', roomType: 'Regular', capacity: 1, dailyRate: 100000, isActive: true }
];

export const INITIAL_GROOMING_PACKAGES: GroomingPackage[] = [
  { id: 'pkg1', name: 'Basic Grooming', packageType: 'Basic', priceSmall: 100000, priceMedium: 125000, priceLarge: 150000, estimatedDurationMins: 45, description: 'Mandi, sikat bulu, potong kuku dasar', isActive: true },
  { id: 'pkg2', name: 'Regular Grooming', packageType: 'Regular', priceSmall: 125000, priceMedium: 150000, priceLarge: 175000, estimatedDurationMins: 60, description: 'Mandi, potong kuku, pangkas rapi, blow dry', isActive: true },
  { id: 'pkg3', name: 'Premium Grooming & Spa', packageType: 'Premium', priceSmall: 150000, priceMedium: 175000, priceLarge: 200000, estimatedDurationMins: 75, description: 'Perawatan lengkap plus spa aromaterapi & parfum', isActive: true },
  { id: 'pkg4', name: 'Medicinal / Anti-Jamur', packageType: 'Medicinal', priceSmall: 180000, priceMedium: 200000, priceLarge: 220000, estimatedDurationMins: 60, description: 'Keramas dengan shampoo terapis khusus kulit sensitif', isActive: true }
];

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'cat1', name: 'Makanan' },
  { id: 'cat2', name: 'Vitamin' },
  { id: 'cat3', name: 'Mainan' },
  { id: 'cat4', name: 'Kandang' },
  { id: 'cat5', name: 'Aksesoris' },
  { id: 'cat6', name: 'Pasir Kucing' },
  { id: 'cat7', name: 'Obat' },
  { id: 'cat8', name: 'Vaksin' }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: 'wh1', name: 'Gudang Utama' },
  { id: 'wh2', name: 'Apotek' },
  { id: 'wh3', name: 'Grooming Supply' },
  { id: 'wh4', name: 'Pet Shop' }
];
