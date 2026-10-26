/**
 * PetCare ERP - Core Type Definitions
 */

export type UserRole =
  | 'owner_klinik'
  | 'owner_petshop'
  | 'owner_petcare'
  | 'owner'
  | 'admin'
  | 'dokter'
  | 'kasir'
  | 'perawat'
  | 'groomer'
  | 'resepsionis'
  | 'pemilik'
  | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  customerId?: string; // Linked customer ID if role is 'pemilik'
  active: boolean;
  tenantId?: string;
  branchId?: string;
  branchName?: string;
  groupId?: string;
  groupName?: string;
  ownershipType?: 'owner_klinik' | 'owner_petshop' | 'owner_petcare' | 'superadmin' | 'pemilik' | string;
  // Note: shift PINs are intentionally NOT modeled here — they live only in
  // the server-side hashed PIN store (server/authService.ts) and must never
  // be shipped to the client bundle.
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'expired';
  ownerName: string;
  phone: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  isMainBranch?: boolean;
}

// Konfigurasi sistem dari SettingsModule — dulu semua tombol "Simpan" di
// sini cuma addToast tanpa persist apa pun. Sekarang nilai-nilai ini
// disimpan permanen DAN benar-benar dipakai modul lain: invoicePrefix &
// taxRate/enableTax dibaca saat membuat invoice/checkout kasir, dan profil
// klinik dipakai sebagai identitas kop surat di laporan PDF resmi.
export interface AppSettings {
  clinicName: string;
  slogan: string;
  sipNumber: string;
  taxId: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicAddress: string;
  operationalHours: string;

  invoicePrefix: string;
  invoiceHeader: string;
  invoiceFooter: string;
  taxRate: number;
  enableTax: boolean;
  serviceFeePercent: number;
  roundingMode: 'round' | 'floor' | 'ceil';
  cashierAutoPrint: boolean;

  waSessionName: string;
  waPhoneConnected: string;
  waApiKey: string;
  autoReminderHMinus1: boolean;
  autoVaccineAlert: boolean;
  autoSendInvoicePdf: boolean;

  paperWidth: '58mm' | '80mm';
  printerConnection: 'bluetooth' | 'usb' | 'network';
  printerDeviceName: string;
  printerIpAddress: string;
  cutPaperAfterPrint: boolean;

  // Lock Aplikasi Otomatis — mengunci sesi (overlay PIN) setelah tidak ada
  // aktivitas mouse/keyboard selama appLockTimeoutMinutes. Tidak sama
  // dengan logout: token & state aplikasi tetap utuh, hanya disembunyikan
  // di balik LockScreen sampai user memasukkan PIN miliknya sendiri.
  appLockEnabled: boolean;
  appLockTimeoutMinutes: number;
}

export type MembershipTier = 'Silver' | 'Gold' | 'Platinum';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  nik?: string;
  gender?: 'L' | 'P';
  membershipTier: MembershipTier;
  loyaltyPoints: number;
  totalSpent: number;
  petCount: number;
  createdAt: string;
  tenantId?: string;
}

export interface Pet {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  species: 'Anjing' | 'Kucing' | 'Kelinci' | 'Burung' | 'Reptil' | 'Lainnya';
  breed: string;
  color: string;
  gender: 'Jantan' | 'Betina';
  sterilized: boolean;
  birthDate: string;
  weightKg: number;
  microchipNo?: string;
  allergies?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  tenantId?: string;
}

export interface DoctorBooking {
  id: string;
  bookingNo: string;
  customerId: string;
  customerName: string;
  petId: string;
  petName: string;
  petSpecies: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  status: 'Terkonfirmasi' | 'Menunggu' | 'Selesai' | 'Batal';
  complaint: string;
  createdAt: string;
  branchId?: string;
  googleCalendarEventId?: string;
  googleCalendarSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced';
  googleCalendarHtmlLink?: string;
  lastSyncedAt?: string;
}

export interface GroomingBooking {
  id: string;
  bookingNo: string;
  customerName: string;
  petName: string;
  groomerName: string;
  packageType: 'Basic' | 'Regular' | 'Premium' | 'Medicinal';
  date: string;
  timeSlot: string;
  price: number;
  status: 'Terkonfirmasi' | 'Menunggu' | 'Selesai' | 'Batal';
  notes?: string;
}

export interface HotelBooking {
  id: string;
  bookingNo: string;
  customerName: string;
  petName: string;
  roomNo: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalCost: number;
  status: 'Reservasi' | 'Aktif' | 'Checkout' | 'Batal';
  notes?: string;
}

export type VisitStatus = 'Menunggu' | 'Dipanggil' | 'Sedang Diperiksa' | 'Selesai' | 'Batal';

export interface ClinicVisit {
  id: string;
  visitNo: string;
  queueNo: number;
  customerId: string;
  customerName: string;
  petId: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  doctorId: string;
  doctorName: string;
  complaint: string;
  status: VisitStatus;
  queuedAt: string;
  calledAt?: string;
  examinedAt?: string;
  completedAt?: string;
  slaMinutes?: number;
  branchId?: string;
  triageUrgency?: TriageUrgencyLevel;
  triageRationale?: string;
  triageScore?: number;
  googleCalendarEventId?: string;
  googleCalendarSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced';
  googleCalendarHtmlLink?: string;
  lastSyncedAt?: string;
}

export interface SOAPNote {
  id: string;
  visitId: string;
  petId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  
  // Subjective
  chiefComplaint: string;
  historyOfPresentIllness: string;
  
  // Objective - Vitals
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  spO2?: number;
  weightKg?: number;
  heightCm?: number;
  physicalExamNotes: string;
  
  // Assessment
  workingDiagnosis: string;
  differentialDiagnosis: string;
  severityScore?: 'Ringan' | 'Sedang' | 'Berat' | 'Kritis';
  triageUrgency?: TriageUrgencyLevel;
  triageRationale?: string;
  
  // Plan
  medicationPlan: string;
  prescribedDrugs: { drugId: string; drugName: string; dosage: string; frequency: string; durationDays: number }[];
  investigationInstructions: string;
  patientEducation: string;
  isFinalized: boolean;
}

export interface Inpatient {
  id: string;
  inpatientNo: string;
  petId: string;
  petName: string;
  customerName: string;
  cageNo: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  dietInstructions: string;
  status: 'Stabil' | 'Membaik' | 'Kritis' | 'Pulang';
  admittedAt: string;
  dischargedAt?: string;
}

export interface DischargeNote {
  id: string;
  visitId: string;
  petId: string;
  petName: string;
  customerName: string;
  finalDiagnosis: string;
  homeMedications: string;
  homeCareInstructions: string;
  restrictions: string;
  warningSigns: string;
  followUpDate: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  date: string;
  type: 'Kunjungan' | 'Vaksinasi' | 'Lab' | 'Rawat Inap' | 'Grooming' | 'Tindakan' | 'Foto' | 'Ambulance';
  title: string;
  description: string;
  performedBy: string;
  attachments?: string[];
}

export interface VacSchedule {
  id: string;
  petId: string;
  petName: string;
  customerName: string;
  customerPhone: string;
  vaccineName: string;
  dueDate: string;
  status: 'Terlambat' | 'Jatuh Tempo' | 'Mendatang' | 'Selesai';
  notes?: string;
}

export interface VacHistory {
  id: string;
  petId: string;
  petName: string;
  customerName: string;
  vaccineName: string;
  givenDate: string;
  nextDueDate: string;
  doctorName: string;
  batchNumber: string;
  expiryDate: string;
  certificateNo: string;
}

export interface SurgicalProcedure {
  id: string;
  procedureNo: string;
  petId: string;
  petName: string;
  customerName: string;
  procedureName: string;
  category: 'Sterilisasi' | 'Jaringan Lunak' | 'Ortopedi' | 'Dental' | 'Onkologi' | 'Gawat Darurat';
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  leadSurgeon: string;
  assistantSurgeon?: string;
  anesthetist: string;
  anesthesiaProtocol: string;
  asaScore?: 'ASA I' | 'ASA II' | 'ASA III' | 'ASA IV' | 'ASA V';
  status: 'Selesai' | 'Dalam Proses' | 'Terjadwal' | 'Pemulihan';
  findings?: string;
  postOpNotes?: string;
  sutureRemovalDate?: string;
  complications?: string;
  photoUrl?: string;
}

export interface DewormingRecord {
  id: string;
  petId: string;
  date: string;
  medicineName: string;
  dosage: string;
  givenBy: string;
  nextDueDate: string;
}

// Catatan interaksi CRM per pelanggan — sebelumnya Record<customerId, string>
// di useState lokal CRMModule.tsx (di-seed 2 catatan contoh, hilang saat
// reload). Sekarang array persisten seperti koleksi lain di aplikasi ini.
export interface CustomerNote {
  id: string;
  customerId: string;
  date: string;
  note: string;
  authorName: string;
}

export interface EctoRecord {
  id: string;
  petId: string;
  date: string;
  productName: string;
  givenBy: string;
  nextDueDate: string;
}

export interface Drug {
  id: string;
  code: string;
  name: string;
  category: 'Antibiotik' | 'Analgesik' | 'Vaksin' | 'Suplemen' | 'Antiparasit' | 'Cairan' | 'Salep' | 'Lainnya';
  unit: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  batchNumber: string;
  expiryDate: string;
  location: string;
}

export interface LabTest {
  id: string;
  testNo: string;
  petId: string;
  petName: string;
  customerName: string;
  testName: string;
  status: 'Menunggu' | 'Dalam Proses' | 'Selesai';
  orderedBy: string;
  orderedAt: string;
  completedAt?: string;
  results?: { parameter: string; value: string; unit: string; referenceRange: string; isCritical?: boolean }[];
  notes?: string;
}

export type GroomingStage = 'Booking' | 'Check-In' | 'Antri' | 'Proses Grooming' | 'Quality Control' | 'Pembayaran' | 'Selesai';

export interface GroomingPackage {
  id: string;
  name: string;
  packageType: 'Basic' | 'Regular' | 'Premium' | 'Medicinal';
  priceSmall: number;
  priceMedium: number;
  priceLarge: number;
  estimatedDurationMins: number;
  description?: string;
  isActive: boolean;
}

export interface GroomingSession {
  id: string;
  sessionNo: string;
  petId: string;
  petName: string;
  customerName: string;
  groomerName: string;
  packageType: 'Basic' | 'Regular' | 'Premium' | 'Medicinal';
  petSize: 'Small' | 'Medium' | 'Large';
  stage: GroomingStage;
  date: string;
  timeSlot: string;
  price: number;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  notes?: string;
}

export interface HotelRoom {
  id: string;
  roomNo: string;
  roomType: 'Regular' | 'Small' | 'Medium' | 'Large' | 'VIP' | 'VIP AC' | 'VIP CCTV';
  capacity: number;
  dailyRate: number;
  isActive: boolean;
  notes?: string;
}

export interface HotelReservation {
  id: string;
  reservationNo: string;
  petId: string;
  petName: string;
  customerName: string;
  roomType: 'Regular' | 'Small' | 'Medium' | 'Large' | 'VIP' | 'VIP AC' | 'VIP CCTV';
  roomNo: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  dailyRate: number;
  totalCost: number;
  status: 'Reservasi' | 'Aktif' | 'Checkout Hari Ini' | 'Selesai';
  notes?: string;
}

export interface DailyMonitoring {
  id: string;
  reservationId: string;
  petName: string;
  roomNo: string;
  date: string;
  morningFeeding: boolean;
  morningMedication: boolean;
  afternoonPlaytime: boolean;
  eveningFeeding: boolean;
  eveningRest: boolean;
  temperatureC?: number;
  notes?: string;
  staffName: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string; // Master Kategori Produk (dapat ditambah dari Menu Master > Kategori & Gudang)
  warehouse: string; // Master Gudang/Lokasi (dapat ditambah dari Menu Master > Kategori & Gudang)
  stock: number;
  minStock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  supplierName: string;
  expiryDate?: string;
  batchNumber?: string;
  isClearanceSale?: boolean;
  clearanceDiscountPercent?: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Masuk' | 'Keluar' | 'Transfer' | 'Opname';
  quantity: number;
  fromWarehouse?: string;
  toWarehouse?: string;
  referenceNo: string;
  date: string;
  operator: string;
}

// Surat jalan mutasi stok antar cabang. Stok itu sendiri tetap satu pool
// bersama seluruh cabang (StockItem tidak punya branchId) — catatan ini
// adalah dokumen serah-terima fisik & jejak audit (lewat StockMovement
// type 'Transfer' terkait), BUKAN pemindahan angka stok per cabang.
export interface InterBranchTransfer {
  id: string;
  transferNo: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchName: string;
  stockItemId: string;
  itemName: string;
  qty: number;
  unit: string;
  status: 'Dalam Pengiriman' | 'Diterima';
  date: string;
  requestedBy: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierName: string;
  date: string;
  status: 'Draft' | 'Dikirim' | 'Diterima Sebagian' | 'Diterima' | 'Dibatalkan';
  items: { itemName: string; quantity: number; unit: string; unitPrice: number; total: number }[];
  totalAmount: number;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cogsAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  petName?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'Tunai' | 'Debit' | 'Kartu Kredit' | 'QRIS' | 'Transfer Bank' | 'GoPay' | 'OVO' | 'Dana' | 'Midtrans Online';
  status: 'Lunas' | 'Belum Dibayar' | 'Batal';
  loyaltyPointsEarned: number;
  cashierName: string;
}

export interface CashTransaction {
  id: string;
  transNo: string;
  type: 'Masuk' | 'Keluar';
  category: string;
  amount: number;
  date: string;
  description: string;
  referenceNo?: string;
  operator: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'Aset' | 'Kewajiban' | 'Ekuitas' | 'Pendapatan' | 'HPP' | 'Beban';
  description: string;
  isActive: boolean;
}

export interface JournalLine {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  description: string;
  referenceNo: string;
  source: string;
  createdBy: string;
  lines: JournalLine[];
}

export interface TrialBalanceLine {
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface AgingBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  total: number;
  invoices: {
    id: string; invoiceNo: string; customerName: string;
    customerPhone: string; totalAmount: number; date: string; daysOverdue: number;
  }[];
}

export interface ReceivablesAging {
  buckets: AgingBucket[];
  grandTotal: number;
  totalCount: number;
}

export interface Employee {
  id: string;
  nik: string;
  name: string;
  role: 'Dokter Hewan' | 'Paramedik' | 'Groomer' | 'Pet Hotel Staff' | 'Kasir' | 'Finance' | 'Admin';
  department: string;
  branchId?: string; // Cabang penempatan - referensi ke Branch di Manajemen Cabang
  shift?: string; // Shift kerja, dikelola dari modul SDM & Shift Kerja
  phone: string;
  email: string;
  hireDate: string;
  sipNumber?: string; // SIP License for Vets
  baseSalary: number;
  commissionRatePercent: number;
  status: 'Aktif' | 'Cuti' | 'Resigned';
}

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Selesai';
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Tahunan' | 'Sakit' | 'Izin' | 'Bersalin' | 'Duka';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
}

export interface LoyaltyEntry {
  id: string;
  customerId: string;
  customerName: string;
  pointsChanged: number;
  type: 'Earn' | 'Redeem';
  description: string;
  date: string;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: 'Konsultasi' | 'Vaksinasi' | 'Grooming' | 'Pet Hotel' | 'Lab & Radiologi' | 'Bedah & Tindakan' | 'Ambulance';
  estimatedDurationMins: number;
  price: number;
  description?: string;
  isActive: boolean;
}

export interface Reminder {
  id: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  title: string;
  type: 'Vaksin' | 'Kontrol Ulang' | 'Grooming' | 'Ulang Tahun';
  dueDate: string;
  status: 'Menunggu' | 'Terkirim' | 'Dikonfirmasi' | 'Dibatalkan' | 'Selesai';
}

export interface CarePlanTask {
  id: string;
  type: 'Kunjungan' | 'Lab' | 'Obat' | 'Grooming' | 'Vaksin' | 'Diet' | 'Monitoring';
  title: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CarePlan {
  id: string;
  planNo: string;
  petId: string;
  petName: string;
  customerName: string;
  doctorName: string;
  title: string;
  diagnosis: string;
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Selesai' | 'Ditangguhkan';
  tasks: CarePlanTask[];
  notes?: string;
}

export interface TelehealthSession {
  id: string;
  sessionNo: string;
  customerId: string;
  customerName: string;
  petId: string;
  petName: string;
  doctorId?: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  type: 'Konsultasi' | 'Follow-up' | 'Darurat';
  complaint: string;
  fee: number;
  status: 'Menunggu' | 'Berlangsung' | 'Selesai' | 'Dibatalkan';
  meetingUrl: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  operationId?: string;
  consentAcceptedAt?: string;
}

export interface EFormTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  fields: { id: string; label: string; type: 'text' | 'textarea' | 'checkbox' | 'signature'; required: boolean }[];
}

export interface EFormSubmission {
  id: string;
  templateId: string;
  templateTitle: string;
  petName: string;
  customerName: string;
  date: string;
  status: 'Draft' | 'Ditandatangani' | 'Disimpan ke EMR';
  fieldValues: Record<string, any>;
  signatureData?: string;
}

export interface AmbulanceUnit {
  id: string;
  code: string;
  vehicleName: string;
  plateNo: string;
  status: 'Tersedia' | 'Bertugas' | 'Maintenance';
  currentDriver: string;
  currentParamedic: string;
  equipmentStatus: string;
  operationId?: string;
}

export interface AmbulanceRequest {
  id: string;
  requestNo: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  petSpecies: string;
  urgency: 'Emergency' | 'Urgent' | 'Normal';
  pickupAddress: string;
  destination: string;
  assignedUnitCode?: string;
  status: 'Menunggu' | 'Menuju Lokasi' | 'Penjemputan' | 'Perjalanan' | 'Completed' | 'Cancelled';
  requestedAt: string;
  notes?: string;
  operationId?: string;
}

export interface PatientPhoto {
  id: string;
  petId: string;
  petName: string;
  category: 'Kunjungan' | 'Grooming' | 'Sebelum' | 'Sesudah' | 'Lab' | 'Lainnya';
  photoUrl: string;
  caption: string;
  takenAt: string;
  takenBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'Tambah' | 'Edit' | 'Hapus' | 'Bayar' | 'Dispense' | 'Login' | 'Logout' | 'Cetak' | 'Lainnya';
  module: string;
  target: string;
  details: string;
  severity?: 'Info' | 'Warning' | 'Kritis';
  branchId?: string;
  branchName?: string;
  ipAddress?: string;
  previousValue?: string;
  newValue?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'Vaksin' | 'Stok' | 'Booking' | 'Hotel' | 'Lab' | 'Ulang Tahun' | 'Sistem';
  priority: 'Tinggi' | 'Sedang' | 'Rendah';
  createdAt: string;
  isRead: boolean;
}

export interface PreConsultForm {
  id: string;
  customerName: string;
  petName: string;
  chiefComplaint: string;
  knownAllergies: string;
  currentMedications: string;
  homeWeightKg?: number;
  behaviorNotes: string;
  status: 'Menunggu' | 'Digunakan';
  createdAt: string;
}

export interface ReferralLetter {
  id: string;
  referralNo: string;
  petName: string;
  customerName: string;
  destinationClinic: string;
  destinationDoctor: string;
  urgency: 'Rutin' | 'Segera' | 'Darurat';
  reason: string;
  currentMedications: string;
  notes: string;
  createdAt: string;
}

export interface VisitSurvey {
  id: string;
  visitId: string;
  petName: string;
  customerName: string;
  doctorName: string;
  rating: number; // 1 to 5 stars
  comments: string;
  createdAt: string;
}

export interface GroupModulePermission {
  moduleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove?: boolean;
}

export interface SystemGroup {
  id: string;
  code: string;
  name: string;
  type: 'Staf & Medis' | 'Pelanggan & CRM' | 'Layanan & Operasional' | 'Inventaris & Logistik' | 'Eksekutif & Keuangan';
  description: string;
  departmentHead: string;
  allowedRoles: UserRole[];
  modulePermissions: GroupModulePermission[];
  memberCount: number;
  color: string;
  branchId?: string;
  isSystemDefault?: boolean;
  createdAt: string;
}

export interface CustomerTierGroup {
  id: string;
  tierName: string;
  code: 'PLATINUM' | 'GOLD' | 'SILVER' | 'STANDARD';
  minSpend: number;
  discountPercent: number;
  perks: string;
  color: string;
  memberCount: number;
  autoUpgrade: boolean;
}

export interface InformedConsentRecord {
  id: string;
  consentNo: string;
  petId: string;
  petName: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerNik?: string;
  doctorId: string;
  doctorName: string;
  procedureType: 'Bedah Mayor' | 'Bedah Minor' | 'Sedasi / Anestesi' | 'Rawat Inap Intensif' | 'Tindakan Berisiko Tinggi' | 'Eutanasia Humanis';
  diagnosis: string;
  procedureDetails: string;
  risksDisclosed: string;
  estimatedCost: number;
  signatureDataUrl: string;
  signedAt: string;
  witnessName: string;
  status: 'Ditandatangani' | 'Dibatalkan';
  securityHash?: string;
}

export interface CashDrawerSettlement {
  id: string;
  settlementNo: string;
  shift: 'Pagi' | 'Siang' | 'Malam' | 'Full Day';
  cashierName: string;
  openedAt: string;
  closedAt: string;
  startingCash: number;
  cashSales: number;
  nonCashSales: {
    qris: number;
    debit: number;
    transfer: number;
    total: number;
  };
  expectedCashTotal: number;
  actualCashCount: number;
  variance: number;
  cashBreakdown: Record<string, number>;
  notes?: string;
  status: 'Balanced' | 'Discrepancy';
  branchName?: string;
}

export interface DailyPetJournal {
  id: string;
  petId: string;
  petName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceType: 'Pet Hotel' | 'Grooming' | 'Rawat Inap';
  date: string;
  appetite: 'Sangat Lahap' | 'Normal' | 'Kurang' | 'Tidak Mau Makan';
  urination: 'Lancar & Normal' | 'Jarang' | 'Keruh / Tidak Lancar';
  defecation: 'Padat Normal' | 'Lembek' | 'Diare' | 'Belum BAB';
  mood: 'Aktif Ceria' | 'Tenang & Santai' | 'Gelisah / Takut' | 'Lemas';
  temperatureC?: number;
  medicationGiven?: string;
  notes: string;
  photoUrl?: string;
  staffName: string;
  createdAt: string;
}

export interface StockMutationTransfer {
  id: string;
  transferNo: string;
  suratJalanNo: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  date: string;
  items: {
    itemId: string;
    itemName: string;
    sku: string;
    quantity: number;
    unit: string;
    batchNumber?: string;
    expiryDate?: string;
  }[];
  status: 'Diajukan' | 'Dalam Pengiriman' | 'Diterima' | 'Ditolak';
  dispatchedBy: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
  driverName?: string;
  vehiclePlate?: string;
}

export type TriageUrgencyLevel = 'P1' | 'P2' | 'P3' | 'P4';

export interface TriageUrgencyResult {
  level: TriageUrgencyLevel; // P1 = Resusitasi / Kritis (Merah), P2 = Sangat Mendesak (Oranye), P3 = Semi-Mendesak (Kuning), P4 = Non-Urgent / Rutin (Hijau)
  label: string; // e.g. "P1 - Darurat Kritis"
  severityScore: number; // 0 - 100
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  summary: string;
  symptomTriggers: string[];
  vitalFlags: {
    parameter: string;
    value: string | number;
    status: 'normal' | 'warning' | 'critical';
  }[];
  recommendedActions: string[];
  triageRationale: string;
  analyzedAt: string;
  source: 'ai_gemini' | 'clinical_rule_engine';
}

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  location?: string;
  status?: string;
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarSyncLog {
  id: string;
  timestamp: string;
  type: 'doctor_booking' | 'clinic_visit' | 'doctor_shift' | 'telehealth' | 'bulk_sync';
  referenceId: string;
  referenceNo: string;
  doctorName: string;
  patientName: string;
  action: 'create' | 'update' | 'delete' | 'sync_fetch';
  status: 'success' | 'failed' | 'pending';
  message: string;
  googleEventId?: string;
  htmlLink?: string;
}

export interface GoogleCalendarConfig {
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  calendarId: string;
  calendarName: string;
  autoSyncBookings: boolean;
  autoSyncClinicQueue: boolean;
  autoSyncDoctorShifts: boolean;
  syncReminders: boolean;
  reminderMinutes: number;
  lastSyncedAt?: string;
  clientId?: string;
}


