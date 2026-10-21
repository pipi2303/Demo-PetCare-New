import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Types from '../types';
import * as Seed from '../data/mockData';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

interface DataContextType {
  // Branches & Tenants
  branches: Types.Branch[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  addBranch: (b: Omit<Types.Branch, 'id'>) => Promise<Types.Branch>;
  updateBranch: (id: string, b: Partial<Types.Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  tenants: Types.Tenant[];
  addTenant: (tenant: Omit<Types.Tenant, 'id' | 'createdAt'>) => Promise<Types.Tenant>;

  // App Settings (SettingsModule) — persisten & dipakai lintas modul
  // (invoicePrefix/taxRate untuk faktur & kasir, profil klinik untuk kop
  // surat PDF resmi). Sejak Fase 1 migrasi Postgres, disimpan lewat
  // /api/app-settings, bukan localStorage lagi.
  appSettings: Types.AppSettings;
  updateAppSettings: (patch: Partial<Types.AppSettings>) => Promise<void>;

  // Master Data — customers/pets/services sejak Fase 1 disimpan di Postgres
  // (lihat server/customerService.ts, server/petService.ts,
  // server/catalogService.ts) bukan localStorage lagi.
  customers: Types.Customer[];
  addCustomer: (cust: Omit<Types.Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'totalSpent' | 'petCount'>) => Promise<Types.Customer>;
  updateCustomer: (id: string, cust: Partial<Types.Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  adjustCustomerPoints: (customerId: string, amount: number, reason: string) => Promise<void>;

  pets: Types.Pet[];
  addPet: (pet: Omit<Types.Pet, 'id' | 'createdAt'>) => Promise<Types.Pet>;
  updatePet: (id: string, pet: Partial<Types.Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  services: Types.ServiceItem[];
  addService: (srv: Omit<Types.ServiceItem, 'id' | 'code'>) => Promise<Types.ServiceItem>;
  updateService: (id: string, srv: Partial<Types.ServiceItem>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  // Bookings
  doctorBookings: Types.DoctorBooking[];
  addDoctorBooking: (b: Omit<Types.DoctorBooking, 'id' | 'bookingNo' | 'createdAt'>) => Types.DoctorBooking;
  updateDoctorBooking: (id: string, updates: Partial<Types.DoctorBooking>) => void;
  rescheduleDoctorBooking: (id: string, date: string, timeSlot: string, doctorId?: string, doctorName?: string) => void;
  updateDoctorBookingStatus: (id: string, status: Types.DoctorBooking['status']) => void;
  checkInDoctorBooking: (id: string) => void;

  groomingBookings: Types.GroomingBooking[];
  addGroomingBooking: (b: Omit<Types.GroomingBooking, 'id' | 'bookingNo'>) => Promise<void>;
  updateGroomingBooking: (id: string, updates: Partial<Types.GroomingBooking>) => Promise<void>;
  rescheduleGroomingBooking: (id: string, date: string, timeSlot: string, groomerName?: string) => Promise<void>;

  hotelBookings: Types.HotelBooking[];
  addHotelBooking: (b: Omit<Types.HotelBooking, 'id' | 'bookingNo'>) => Promise<void>;

  // Clinic — clinicVisits sejak Fase 1 disimpan di Postgres (server/clinicService.ts)
  clinicVisits: Types.ClinicVisit[];
  addClinicVisit: (v: Omit<Types.ClinicVisit, 'id' | 'visitNo' | 'queueNo' | 'status' | 'queuedAt'>) => Promise<Types.ClinicVisit>;
  updateVisitStatus: (id: string, status: Types.VisitStatus) => Promise<void>;
  updateClinicVisit: (id: string, updates: Partial<Types.ClinicVisit>) => Promise<void>;

  soapNotes: Types.SOAPNote[];
  saveSOAPNote: (soap: Omit<Types.SOAPNote, 'id'>) => void;

  inpatients: Types.Inpatient[];
  addInpatient: (inp: Omit<Types.Inpatient, 'id' | 'inpatientNo' | 'status' | 'admittedAt'>) => void;
  updateInpatientStatus: (id: string, status: Types.Inpatient['status']) => void;

  dischargeNotes: Types.DischargeNote[];
  addDischargeNote: (dn: Omit<Types.DischargeNote, 'id' | 'createdAt'>) => void;

  medicalRecords: Types.MedicalRecord[];
  addMedicalRecord: (mr: Omit<Types.MedicalRecord, 'id'>) => void;

  preConsultForms: Types.PreConsultForm[];
  addPreConsultForm: (pcf: Omit<Types.PreConsultForm, 'id' | 'status' | 'createdAt'>) => void;
  updatePreConsultStatus: (id: string, status: 'Menunggu' | 'Digunakan') => void;

  referralLetters: Types.ReferralLetter[];
  addReferralLetter: (rl: Omit<Types.ReferralLetter, 'id' | 'referralNo' | 'createdAt'>) => void;

  visitSurveys: Types.VisitSurvey[];
  addVisitSurvey: (vs: Omit<Types.VisitSurvey, 'id' | 'createdAt'>) => void;

  // Vaccines
  vacSchedules: Types.VacSchedule[];
  addVacSchedule: (vs: Omit<Types.VacSchedule, 'id'>) => void;
  vacHistories: Types.VacHistory[];
  addVacHistory: (vh: Omit<Types.VacHistory, 'id'>) => void;
  dewormingRecords: Types.DewormingRecord[];
  addDewormingRecord: (dr: Omit<Types.DewormingRecord, 'id'>) => Types.DewormingRecord;

  customerNotes: Types.CustomerNote[];
  addCustomerNote: (customerId: string, note: string) => Promise<Types.CustomerNote>;

  // Inter-branch stock transfer (surat jalan, bukan pemindahan angka stok —
  // lihat catatan di Types.InterBranchTransfer)
  interBranchTransfers: Types.InterBranchTransfer[];
  addInterBranchTransfer: (t: Omit<Types.InterBranchTransfer, 'id' | 'transferNo' | 'date' | 'status'>) => Promise<Types.InterBranchTransfer>;
  markInterBranchTransferReceived: (id: string) => void;

  // Surgeries
  surgicalProcedures: Types.SurgicalProcedure[];
  addSurgicalProcedure: (sp: Omit<Types.SurgicalProcedure, 'id' | 'procedureNo'>) => void;

  // Pharmacy & Lab
  drugs: Types.Drug[];
  addDrug: (d: Omit<Types.Drug, 'id' | 'code'>) => Promise<void>;
  updateDrug: (id: string, d: Partial<Types.Drug>) => Promise<void>;
  deleteDrug: (id: string) => Promise<void>;
  dispenseDrug: (drugId: string, qty: number) => Promise<void>;

  labTests: Types.LabTest[];
  addLabTest: (lt: Omit<Types.LabTest, 'id' | 'testNo' | 'status' | 'orderedAt'>) => Types.LabTest;
  updateLabResult: (id: string, results: Types.LabTest['results'], notes?: string) => void;

  // Grooming & Hotel Ops
  groomingPackages: Types.GroomingPackage[];
  addGroomingPackage: (gp: Omit<Types.GroomingPackage, 'id'>) => Promise<void>;
  updateGroomingPackage: (id: string, gp: Partial<Types.GroomingPackage>) => Promise<void>;
  deleteGroomingPackage: (id: string) => Promise<void>;

  groomingSessions: Types.GroomingSession[];
  addGroomingSession: (gs: Omit<Types.GroomingSession, 'id' | 'sessionNo'>) => Promise<void>;
  updateGroomingStage: (id: string, stage: Types.GroomingStage) => Promise<void>;

  hotelRooms: Types.HotelRoom[];
  addHotelRoom: (hr: Omit<Types.HotelRoom, 'id'>) => Promise<void>;
  updateHotelRoom: (id: string, hr: Partial<Types.HotelRoom>) => Promise<void>;
  deleteHotelRoom: (id: string) => Promise<void>;

  hotelReservations: Types.HotelReservation[];
  addHotelReservation: (hr: Omit<Types.HotelReservation, 'id' | 'reservationNo'>) => Promise<void>;
  updateHotelStatus: (id: string, status: Types.HotelReservation['status']) => Promise<void>;

  dailyMonitorings: Types.DailyMonitoring[];
  addDailyMonitoring: (dm: Omit<Types.DailyMonitoring, 'id'>) => Promise<void>;

  // Inventory & Purchasing
  productCategories: Types.ProductCategory[];
  addProductCategory: (name: string) => Promise<void>;
  deleteProductCategory: (id: string) => Promise<void>;

  warehouses: Types.Warehouse[];
  addWarehouse: (name: string) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;

  stockItems: Types.StockItem[];
  addStockItem: (si: Omit<Types.StockItem, 'id' | 'sku'> & { sku?: string }) => Promise<Types.StockItem>;
  updateStockItem: (id: string, si: Partial<Types.StockItem>) => Promise<void>;
  stockMovements: Types.StockMovement[];
  addStockMovement: (sm: Omit<Types.StockMovement, 'id' | 'date'>) => Promise<void>;

  suppliers: Types.Supplier[];
  addSupplier: (s: Omit<Types.Supplier, 'id' | 'code'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Types.Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  purchaseOrders: Types.PurchaseOrder[];
  addPurchaseOrder: (po: Omit<Types.PurchaseOrder, 'id' | 'poNo' | 'date' | 'status'>) => Promise<void>;
  receivePurchaseOrder: (poId: string) => Promise<void>;

  // Billing & Finance — invoices/cashTransactions sejak Fase 1 disimpan di
  // Postgres (server/invoiceService.ts)
  invoices: Types.Invoice[];
  addInvoice: (inv: Omit<Types.Invoice, 'id' | 'invoiceNo' | 'date'>) => Promise<Types.Invoice>;
  processPayment: (invId: string, method: Types.Invoice['paymentMethod'], pointsRedeemed?: number) => Promise<void>;

  cashTransactions: Types.CashTransaction[];
  addCashTransaction: (ct: Omit<Types.CashTransaction, 'id' | 'transNo' | 'date'>) => Promise<void>;

  // HR & Shifts
  employees: Types.Employee[];
  addEmployee: (e: Omit<Types.Employee, 'id' | 'nik'>) => Promise<void>;
  updateEmployee: (id: string, e: Partial<Types.Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  absenceRecords: Types.AbsenceRecord[];
  addAbsenceRecord: (ab: Omit<Types.AbsenceRecord, 'id'>) => void;
  leaveRequests: Types.LeaveRequest[];
  addLeaveRequest: (lr: Omit<Types.LeaveRequest, 'id'>) => void;

  // CRM
  reminders: Types.Reminder[];
  addReminder: (rem: Omit<Types.Reminder, 'id'>) => Promise<void>;
  updateReminderStatus: (id: string, status: Types.Reminder['status']) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  loyaltyEntries: Types.LoyaltyEntry[];

  // Care Plan, Telehealth, EForm, Ambulance
  carePlans: Types.CarePlan[];
  addCarePlan: (cp: Omit<Types.CarePlan, 'id' | 'planNo'>) => Types.CarePlan;
  toggleCarePlanTask: (planId: string, taskId: string) => void;

  telehealthSessions: Types.TelehealthSession[];
  addTelehealthSession: (th: Omit<Types.TelehealthSession, 'id' | 'sessionNo' | 'meetingUrl'>) => Types.TelehealthSession;
  updateTelehealthStatus: (id: string, status: Types.TelehealthSession['status']) => void;
  updateTelehealthSession: (id: string, updates: Partial<Types.TelehealthSession>) => void;

  eFormTemplates: Types.EFormTemplate[];
  addEFormTemplate: (t: Omit<Types.EFormTemplate, 'id'>) => void;
  updateEFormTemplate: (id: string, t: Partial<Types.EFormTemplate>) => void;
  deleteEFormTemplate: (id: string) => void;
  eFormSubmissions: Types.EFormSubmission[];
  addEFormSubmission: (efs: Omit<Types.EFormSubmission, 'id' | 'date'>) => Types.EFormSubmission;
  informedConsents: Types.InformedConsentRecord[];
  addInformedConsent: (ic: Omit<Types.InformedConsentRecord, 'id'>) => Types.InformedConsentRecord;

  ambulanceUnits: Types.AmbulanceUnit[];
  addAmbulanceUnit: (u: Omit<Types.AmbulanceUnit, 'id'>) => void;
  updateAmbulanceUnit: (id: string, u: Partial<Types.AmbulanceUnit>) => void;
  deleteAmbulanceUnit: (id: string) => void;
  ambulanceRequests: Types.AmbulanceRequest[];
  addAmbulanceRequest: (ar: Omit<Types.AmbulanceRequest, 'id' | 'requestNo' | 'requestedAt' | 'status'>) => Types.AmbulanceRequest;
  updateAmbulanceStatus: (id: string, status: Types.AmbulanceRequest['status'], unitCode?: string) => void;

  // Grup Akses & Tier Membership (Master Data)
  systemGroups: Types.SystemGroup[];
  addSystemGroup: (g: Omit<Types.SystemGroup, 'id' | 'createdAt'>) => Types.SystemGroup;
  updateSystemGroup: (id: string, g: Partial<Types.SystemGroup>) => void;
  deleteSystemGroup: (id: string) => void;

  customerTierGroups: Types.CustomerTierGroup[];
  addCustomerTierGroup: (t: Omit<Types.CustomerTierGroup, 'id'>) => void;
  updateCustomerTierGroup: (id: string, t: Partial<Types.CustomerTierGroup>) => void;
  deleteCustomerTierGroup: (id: string) => void;

  // Photos, Audit Logs, Notifications
  patientPhotos: Types.PatientPhoto[];
  addPatientPhoto: (ph: Omit<Types.PatientPhoto, 'id'>) => void;

  auditLogs: Types.AuditLog[];
  addAuditLog: (
    action: Types.AuditLog['action'],
    module: string,
    target: string,
    details: string,
    options?: {
      severity?: 'Info' | 'Warning' | 'Kritis';
      userName?: string;
      userRole?: string;
      branchName?: string;
      previousValue?: string;
      newValue?: string;
    }
  ) => void;

  notifications: Types.AppNotification[];
  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<Types.AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;

  // System actions
  resetDailyQueue: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Helper for localStorage state initialization
  function useLocalState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
      const saved = localStorage.getItem(`petcare_${key}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fallback
        }
      }
      return initialValue;
    });

    useEffect(() => {
      localStorage.setItem(`petcare_${key}`, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
  }

  // Fase 1 migrasi Postgres: entitas ini sekarang bersumber dari /api/* (lihat
  // src/services/api.ts), bukan localStorage. Placeholder seed dipakai hanya
  // sebagai tampilan awal sebelum fetch pertama selesai; begitu server
  // merespons, state diganti dengan data dari Postgres. Kalau fetch gagal
  // (server belum siap / offline), data seed lokal tetap dipakai sebagai
  // fallback supaya UI tidak kosong.
  // Incremented on tab focus so all useServerState hooks re-fetch stale data
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefreshKey(k => k + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  function useServerState<T>(endpoint: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(initialValue);
    useEffect(() => {
      let active = true;
      api
        .get<T>(endpoint)
        .then((data) => {
          if (active && data !== undefined && data !== null) setState(data);
        })
        .catch((err) => {
          console.error(`[DataContext] Gagal memuat ${endpoint} dari server, memakai data seed lokal:`, err);
        });
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, refreshKey]);
    return [state, setState];
  }

  // Active Context
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [tenants, setTenants] = useServerState<Types.Tenant[]>('/tenants', Seed.INITIAL_TENANTS);
  const [branches, setBranches] = useServerState<Types.Branch[]>('/branches', Seed.INITIAL_BRANCHES);
  const [appSettings, setAppSettings] = useServerState<Types.AppSettings>('/app-settings', Seed.DEFAULT_APP_SETTINGS);

  // Entities
  const [customers, setCustomers] = useServerState<Types.Customer[]>('/customers', Seed.INITIAL_CUSTOMERS);
  const [pets, setPets] = useServerState<Types.Pet[]>('/pets', Seed.INITIAL_PETS);
  const [services, setServices] = useServerState<Types.ServiceItem[]>('/services', Seed.INITIAL_SERVICES);
  const [doctorBookings, setDoctorBookings] = useLocalState<Types.DoctorBooking[]>('doc_bookings', Seed.INITIAL_DOCTOR_BOOKINGS);
  const [groomingBookings, setGroomingBookings] = useServerState<Types.GroomingBooking[]>('/grooming-bookings', Seed.INITIAL_GROOMING_BOOKINGS);
  const [hotelBookings, setHotelBookings] = useServerState<Types.HotelBooking[]>('/hotel-bookings', Seed.INITIAL_HOTEL_BOOKINGS);
  const [clinicVisits, setClinicVisits] = useServerState<Types.ClinicVisit[]>('/clinic-visits', Seed.INITIAL_CLINIC_VISITS);
  const [soapNotes, setSoapNotes] = useLocalState<Types.SOAPNote[]>('soap_notes', Seed.INITIAL_SOAP_NOTES);
  const [inpatients, setInpatients] = useLocalState<Types.Inpatient[]>('inpatients', Seed.INITIAL_INPATIENTS);
  const [dischargeNotes, setDischargeNotes] = useLocalState<Types.DischargeNote[]>('discharge_notes', Seed.INITIAL_DISCHARGE_NOTES);
  const [medicalRecords, setMedicalRecords] = useLocalState<Types.MedicalRecord[]>('medical_records', Seed.INITIAL_MEDICAL_RECORDS);
  const [preConsultForms, setPreConsultForms] = useLocalState<Types.PreConsultForm[]>('pre_consult_forms', Seed.INITIAL_PRE_CONSULT_FORMS);
  const [referralLetters, setReferralLetters] = useLocalState<Types.ReferralLetter[]>('referral_letters', Seed.INITIAL_REFERRAL_LETTERS);
  const [visitSurveys, setVisitSurveys] = useLocalState<Types.VisitSurvey[]>('visit_surveys', Seed.INITIAL_VISIT_SURVEYS);

  const [vacSchedules, setVacSchedules] = useLocalState<Types.VacSchedule[]>('vac_schedules', Seed.INITIAL_VAC_SCHEDULES);
  const [vacHistories, setVacHistories] = useLocalState<Types.VacHistory[]>('vac_histories', Seed.INITIAL_VAC_HISTORIES);
  const [dewormingRecords, setDewormingRecords] = useLocalState<Types.DewormingRecord[]>('deworming_records', []);
  const [customerNotes, setCustomerNotes] = useServerState<Types.CustomerNote[]>('/customer-notes', []);
  const [interBranchTransfers, setInterBranchTransfers] = useLocalState<Types.InterBranchTransfer[]>('inter_branch_transfers', []);
  const [surgicalProcedures, setSurgicalProcedures] = useLocalState<Types.SurgicalProcedure[]>('surgical_procedures', Seed.INITIAL_SURGICAL_PROCEDURES);

  const [drugs, setDrugs] = useServerState<Types.Drug[]>('/drugs', Seed.INITIAL_DRUGS);
  const [labTests, setLabTests] = useLocalState<Types.LabTest[]>('lab_tests', Seed.INITIAL_LAB_TESTS);

  const [groomingPackages, setGroomingPackages] = useServerState<Types.GroomingPackage[]>('/grooming-packages', Seed.INITIAL_GROOMING_PACKAGES);
  const [groomingSessions, setGroomingSessions] = useServerState<Types.GroomingSession[]>('/grooming-sessions', Seed.INITIAL_GROOMING_SESSIONS);
  const [hotelRooms, setHotelRooms] = useServerState<Types.HotelRoom[]>('/hotel-rooms', Seed.INITIAL_HOTEL_ROOMS);
  const [hotelReservations, setHotelReservations] = useServerState<Types.HotelReservation[]>('/hotel-reservations', Seed.INITIAL_HOTEL_RESERVATIONS);
  const [dailyMonitorings, setDailyMonitorings] = useServerState<Types.DailyMonitoring[]>('/daily-monitorings', Seed.INITIAL_DAILY_MONITORING);

  const [productCategories, setProductCategories] = useServerState<Types.ProductCategory[]>('/product-categories', Seed.INITIAL_PRODUCT_CATEGORIES);
  const [warehouses, setWarehouses] = useServerState<Types.Warehouse[]>('/warehouses', Seed.INITIAL_WAREHOUSES);
  const [stockItems, setStockItems] = useServerState<Types.StockItem[]>('/stock-items', Seed.INITIAL_STOCK_ITEMS);
  const [stockMovements, setStockMovements] = useServerState<Types.StockMovement[]>('/stock-movements', Seed.INITIAL_STOCK_MOVEMENTS);
  const [suppliers, setSuppliers] = useServerState<Types.Supplier[]>('/suppliers', Seed.INITIAL_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useServerState<Types.PurchaseOrder[]>('/purchase-orders', Seed.INITIAL_PURCHASE_ORDERS);

  const [invoices, setInvoices] = useServerState<Types.Invoice[]>('/invoices', Seed.INITIAL_INVOICES);
  const [cashTransactions, setCashTransactions] = useServerState<Types.CashTransaction[]>('/cash-transactions', Seed.INITIAL_CASH_TRANSACTIONS);

  const [employees, setEmployees] = useServerState<Types.Employee[]>('/employees', Seed.INITIAL_EMPLOYEES);
  const [absenceRecords, setAbsenceRecords] = useLocalState<Types.AbsenceRecord[]>('absence_records', Seed.INITIAL_ABSENCE_RECORDS);
  const [leaveRequests, setLeaveRequests] = useLocalState<Types.LeaveRequest[]>('leave_requests', Seed.INITIAL_LEAVE_REQUESTS);

  const [reminders, setReminders] = useServerState<Types.Reminder[]>('/reminders', Seed.INITIAL_REMINDERS);
  const [loyaltyEntries, setLoyaltyEntries] = useLocalState<Types.LoyaltyEntry[]>('loyalty_entries', Seed.INITIAL_LOYALTY_ENTRIES);

  const [carePlans, setCarePlans] = useLocalState<Types.CarePlan[]>('care_plans', Seed.INITIAL_CARE_PLANS);
  const [telehealthSessions, setTelehealthSessions] = useLocalState<Types.TelehealthSession[]>('telehealth_sessions', Seed.INITIAL_TELEHEALTH_SESSIONS);
  const [eFormTemplates, setEFormTemplates] = useLocalState<Types.EFormTemplate[]>('eform_templates', Seed.INITIAL_EFORM_TEMPLATES);
  const [eFormSubmissions, setEFormSubmissions] = useLocalState<Types.EFormSubmission[]>('eform_submissions', Seed.INITIAL_EFORM_SUBMISSIONS);
  const [informedConsents, setInformedConsents] = useLocalState<Types.InformedConsentRecord[]>('informed_consents', []);

  const [ambulanceUnits, setAmbulanceUnits] = useLocalState<Types.AmbulanceUnit[]>('ambulance_units', Seed.INITIAL_AMBULANCE_UNITS);
  const [ambulanceRequests, setAmbulanceRequests] = useLocalState<Types.AmbulanceRequest[]>('ambulance_requests', Seed.INITIAL_AMBULANCE_REQUESTS);

  const [systemGroups, setSystemGroups] = useLocalState<Types.SystemGroup[]>('system_groups', Seed.INITIAL_SYSTEM_GROUPS);
  const [customerTierGroups, setCustomerTierGroups] = useLocalState<Types.CustomerTierGroup[]>('customer_tier_groups', Seed.INITIAL_CUSTOMER_TIER_GROUPS);

  const [patientPhotos, setPatientPhotos] = useLocalState<Types.PatientPhoto[]>('patient_photos', Seed.INITIAL_PATIENT_PHOTOS);
  const [auditLogs, setAuditLogs] = useLocalState<Types.AuditLog[]>('audit_logs', Seed.INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useLocalState<Types.AppNotification[]>('notifications', Seed.INITIAL_NOTIFICATIONS);

  // Generate a random 3-digit entity code that doesn't collide with existing codes
  const generateUniqueCode = (prefix: string, existingCodes: string[]): string => {
    let code: string;
    do {
      code = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    } while (existingCodes.includes(code));
    return code;
  };

  // Audit logger helper with user, branch, and severity awareness
  const addAuditLog = (
    action: Types.AuditLog['action'],
    moduleName: string,
    target: string,
    details: string,
    options?: {
      severity?: 'Info' | 'Warning' | 'Kritis';
      userName?: string;
      userRole?: string;
      branchName?: string;
      previousValue?: string;
      newValue?: string;
    }
  ) => {
    const activeBranchName = branches.find((b) => b.id === activeBranchId)?.name || 'Klinik Utama (Pusat)';
    const newLog: Types.AuditLog = {
      id: 'al_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: options?.userName || user?.name || 'Staf Operasional',
      userRole: options?.userRole || user?.role || 'admin',
      action,
      module: moduleName,
      target,
      details,
      severity: options?.severity || (action === 'Hapus' ? 'Kritis' : action === 'Edit' ? 'Warning' : 'Info'),
      branchId: activeBranchId === 'all' ? undefined : activeBranchId,
      branchName: options?.branchName || activeBranchName,
      previousValue: options?.previousValue,
      newValue: options?.newValue
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addNotification = (n: Omit<Types.AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotif: Types.AppNotification = {
      ...n,
      id: 'n_' + Date.now(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isRead: false
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  // CRUD Implementations with Comprehensive Audit Logging
  // Fase 1 migrasi Postgres: branch/tenant/appSettings/customer/pet/service
  // di bawah ini memanggil /api/* (src/services/api.ts) dan menunggu respons
  // server sebelum memperbarui state lokal — beda dari pola optimistic-local
  // yang masih dipakai entitas localStorage lain di file ini.
  const addBranch = async (b: Omit<Types.Branch, 'id'>): Promise<Types.Branch> => {
    const newBranch = await api.post<Types.Branch>('/branches', b);
    setBranches((prev) => [...prev, newBranch]);
    addAuditLog('Tambah', 'Cabang & Multi-Lokasi', newBranch.name, `Cabang baru didaftarkan: ${newBranch.name} (${newBranch.code})`, { severity: 'Kritis' });
    return newBranch;
  };

  const updateBranch = async (id: string, bData: Partial<Types.Branch>) => {
    const current = branches.find((b) => b.id === id);
    await api.put(`/branches/${id}`, bData);
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...bData } : b)));
    addAuditLog('Edit', 'Cabang & Multi-Lokasi', current?.name || id, `Pembaruan data cabang: ${current?.name || id}`, { severity: 'Warning' });
  };

  const deleteBranch = async (id: string) => {
    const current = branches.find((b) => b.id === id);
    if (current?.isMainBranch) {
      return;
    }
    await api.del(`/branches/${id}`);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    addAuditLog('Hapus', 'Cabang & Multi-Lokasi', current?.name || id, `Penghapusan cabang: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addTenant = async (tenantData: Omit<Types.Tenant, 'id' | 'createdAt'>): Promise<Types.Tenant> => {
    const newTenant = await api.post<Types.Tenant>('/tenants', tenantData);
    setTenants((prev) => [newTenant, ...prev]);
    addAuditLog('Tambah', 'SaaS Multi-Tenant', newTenant.name, `Tenant organisasi baru '${newTenant.name}' didaftarkan (Paket: ${newTenant.plan})`, { severity: 'Kritis' });
    return newTenant;
  };

  const updateAppSettings = async (patch: Partial<Types.AppSettings>) => {
    const updated = await api.put<Types.AppSettings>('/app-settings', patch);
    setAppSettings(updated);
    addAuditLog('Edit', 'Pengaturan Sistem', 'Konfigurasi Aplikasi', `Pengaturan sistem diperbarui: ${Object.keys(patch).join(', ')}`, { severity: 'Info' });
  };

  const addCustomer = async (custData: Omit<Types.Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'totalSpent' | 'petCount'>): Promise<Types.Customer> => {
    const newCust = await api.post<Types.Customer>('/customers', custData);
    setCustomers((prev) => [newCust, ...prev]);
    addAuditLog('Tambah', 'Master Data & CRM', newCust.name, `Registrasi klien/pemilik baru: ${newCust.name} (HP/WA: ${newCust.phone})`, { severity: 'Info' });
    return newCust;
  };

  const updateCustomer = async (id: string, custData: Partial<Types.Customer>) => {
    const current = customers.find((c) => c.id === id);
    await api.put(`/customers/${id}`, custData);
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...custData } : c)));
    addAuditLog(
      'Edit',
      'Master Data & CRM',
      current?.name || id,
      `Pembaruan profil data pelanggan: ${current?.name || id}`,
      {
        severity: 'Warning',
        previousValue: current ? JSON.stringify({ name: current.name, phone: current.phone, address: current.address }) : undefined,
        newValue: JSON.stringify(custData)
      }
    );
  };

  const deleteCustomer = async (id: string) => {
    const current = customers.find((c) => c.id === id);
    await api.del(`/customers/${id}`);
    // Server-side ON DELETE CASCADE (pets.customer_id -> customers.id) sudah
    // menghapus pets terkait di Postgres; ini menyamakan state lokal.
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setPets((prev) => prev.filter((p) => p.customerId !== id));
    addAuditLog(
      'Hapus',
      'Master Data & CRM',
      current?.name || id,
      `Penghapusan data pelanggan & seluruh arsip terkait: ${current?.name || id}`,
      { severity: 'Kritis', previousValue: current ? JSON.stringify(current) : undefined }
    );
  };

  const addPet = async (petData: Omit<Types.Pet, 'id' | 'createdAt'>): Promise<Types.Pet> => {
    const newPet = await api.post<Types.Pet>('/pets', petData);
    setPets((prev) => [newPet, ...prev]);
    // update petCount on customer (server did the same +1 in the same request)
    setCustomers((prev) =>
      prev.map((c) => (c.id === newPet.customerId ? { ...c, petCount: c.petCount + 1 } : c))
    );
    addAuditLog('Tambah', 'Master Pasien Hewan', newPet.name, `Registrasi pasien hewan baru: ${newPet.name} (${newPet.species} / ${newPet.breed})`);
    return newPet;
  };

  const updatePet = async (id: string, petData: Partial<Types.Pet>) => {
    const current = pets.find((p) => p.id === id);
    await api.put(`/pets/${id}`, petData);
    setPets((prev) => prev.map((p) => (p.id === id ? { ...p, ...petData } : p)));
    if (current && petData.customerId && petData.customerId !== current.customerId) {
      const oldCustomerId = current.customerId;
      const newCustomerId = petData.customerId;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === oldCustomerId) return { ...c, petCount: Math.max(0, c.petCount - 1) };
          if (c.id === newCustomerId) return { ...c, petCount: c.petCount + 1 };
          return c;
        })
      );
    }
    addAuditLog(
      'Edit',
      'Master Pasien Hewan',
      current?.name || id,
      `Pembaruan data rekam identitas pasien hewan: ${current?.name || id}`,
      {
        severity: 'Warning',
        previousValue: current ? JSON.stringify({ name: current.name, weightKg: current.weightKg, allergies: current.allergies }) : undefined,
        newValue: JSON.stringify(petData)
      }
    );
  };

  const deletePet = async (id: string) => {
    const current = pets.find((p) => p.id === id);
    await api.del(`/pets/${id}`);
    setPets((prev) => prev.filter((p) => p.id !== id));
    if (current) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === current.customerId ? { ...c, petCount: Math.max(0, c.petCount - 1) } : c))
      );
    }
    addAuditLog('Hapus', 'Master Pasien Hewan', current?.name || id, `Penghapusan data pasien hewan peliharaan: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const adjustCustomerPoints = async (customerId: string, amount: number, reason: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const updated = await api.post<Types.Customer>(`/customers/${customerId}/loyalty-points`, { amount });
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));

    const entry: Types.LoyaltyEntry = {
      id: 'le_' + Date.now(),
      customerId,
      customerName: cust.name,
      pointsChanged: amount,
      type: amount >= 0 ? 'Earn' : 'Redeem',
      description: reason,
      date: new Date().toISOString().substring(0, 10),
    };
    setLoyaltyEntries((prev) => [entry, ...prev]);
    addAuditLog(
      'Edit',
      'CRM & Loyalty Poin',
      cust.name,
      `Penyesuaian manual poin loyalitas: ${amount >= 0 ? '+' : ''}${amount} poin (Saldo baru: ${updated.loyaltyPoints}). Alasan: ${reason}`,
      {
        severity: 'Warning',
        previousValue: `Saldo Poin: ${cust.loyaltyPoints}`,
        newValue: `Saldo Poin: ${updated.loyaltyPoints}`
      }
    );
  };

  const addService = async (srvData: Omit<Types.ServiceItem, 'id' | 'code'>): Promise<Types.ServiceItem> => {
    const newSrv = await api.post<Types.ServiceItem>('/services', srvData);
    setServices((prev) => [...prev, newSrv]);
    addAuditLog('Tambah', 'Katalog Tarif & Layanan', newSrv.name, `Penambahan tarif layanan: ${newSrv.name} (${newSrv.category}) - Rp ${newSrv.price.toLocaleString('id-ID')}`, { severity: 'Info' });
    return newSrv;
  };

  const updateService = async (id: string, srvData: Partial<Types.ServiceItem>) => {
    const current = services.find((s) => s.id === id);
    await api.put(`/services/${id}`, srvData);
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...srvData } : s)));
    addAuditLog('Edit', 'Katalog Tarif & Layanan', current?.name || id, `Perubahan konfigurasi tarif layanan katalog: ${current?.name || id}`, { severity: 'Warning' });
  };

  const deleteService = async (id: string) => {
    const current = services.find((s) => s.id === id);
    await api.del(`/services/${id}`);
    setServices((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('Hapus', 'Katalog Tarif & Layanan', current?.name || id, `Penghapusan item tarif layanan katalog: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addDoctorBooking = (b: Omit<Types.DoctorBooking, 'id' | 'bookingNo' | 'createdAt'>): Types.DoctorBooking => {
    const newBooking: Types.DoctorBooking = {
      ...b,
      id: 'db_' + Date.now(),
      bookingNo: 'DOC-' + new Date().toISOString().replace(/[-:]/g, '').substring(0, 8) + '-' + Math.floor(100 + Math.random() * 900),
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setDoctorBookings((prev) => [newBooking, ...prev]);
    addAuditLog('Tambah', 'Booking & Antrean', newBooking.bookingNo, `Reservasi konsultasi dokter ${newBooking.doctorName} untuk pasien ${newBooking.petName} (${newBooking.timeSlot})`);
    addNotification({
      title: 'Booking Dokter Baru',
      message: `${newBooking.customerName} membuat booking untuk ${newBooking.petName} pada jam ${newBooking.timeSlot}`,
      type: 'Booking',
      priority: 'Sedang'
    });
    return newBooking;
  };

  const updateDoctorBooking = (id: string, updates: Partial<Types.DoctorBooking>) => {
    const booking = doctorBookings.find((b) => b.id === id);
    setDoctorBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    addAuditLog('Edit', 'Booking & Antrean', booking?.bookingNo || id, `Pembaruan data booking: ${JSON.stringify(updates)}`);
  };

  const rescheduleDoctorBooking = (id: string, date: string, timeSlot: string, doctorId?: string, doctorName?: string) => {
    const booking = doctorBookings.find((b) => b.id === id);
    if (!booking) return;
    const oldSlot = `${booking.date} ${booking.timeSlot}`;
    const oldDoctor = booking.doctorName;
    const targetDoctorName = doctorName || booking.doctorName;
    const targetDoctorId = doctorId || booking.doctorId;

    setDoctorBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          date,
          timeSlot,
          doctorId: targetDoctorId,
          doctorName: targetDoctorName,
          status: b.status === 'Batal' ? 'Terkonfirmasi' : b.status,
        };
      })
    );

    addAuditLog(
      'Edit',
      'Booking & Antrean',
      booking.bookingNo,
      `Reschedule booking pasien ${booking.petName} (${booking.bookingNo}) dari ${oldSlot} (${oldDoctor}) ke ${date} jam ${timeSlot} (${targetDoctorName})`,
      {
        severity: 'Warning',
        previousValue: `${oldSlot} - ${oldDoctor}`,
        newValue: `${date} ${timeSlot} - ${targetDoctorName}`
      }
    );

    addNotification({
      title: 'Jadwal Booking Di-reschedule',
      message: `Booking ${booking.bookingNo} (${booking.petName}) berhasil dipindahkan ke ${date} jam ${timeSlot}`,
      type: 'Booking',
      priority: 'Sedang'
    });
  };

  const updateDoctorBookingStatus = (id: string, status: Types.DoctorBooking['status']) => {
    const booking = doctorBookings.find((b) => b.id === id);
    setDoctorBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    addAuditLog('Edit', 'Booking & Antrean', booking?.bookingNo || id, `Status jadwal booking diubah menjadi: ${status}`);
  };

  const checkInDoctorBooking = (id: string) => {
    const booking = doctorBookings.find((b) => b.id === id);
    if (!booking) return;

    updateDoctorBookingStatus(id, 'Selesai');

    // Create a new clinic visit
    const nextQueue = clinicVisits.filter((v) => v.status !== 'Selesai' && v.status !== 'Batal').length + 1;
    const pet = pets.find((p) => p.id === booking.petId);

    const newVisit: Types.ClinicVisit = {
      id: 'v_' + Date.now(),
      visitNo: 'VIS-' + new Date().toISOString().replace(/[-:]/g, '').substring(0, 8) + '-' + String(nextQueue).padStart(2, '0'),
      queueNo: nextQueue,
      customerId: booking.customerId,
      customerName: booking.customerName,
      petId: booking.petId,
      petName: booking.petName,
      petSpecies: booking.petSpecies,
      petBreed: pet?.breed || 'Umum',
      doctorId: booking.doctorId,
      doctorName: booking.doctorName,
      complaint: booking.complaint,
      status: 'Menunggu',
      queuedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setClinicVisits((prev) => [...prev, newVisit]);
    addAuditLog('Tambah', 'Poli & Antrean', newVisit.visitNo, `Check-in pasien ${booking.petName} ke antrean poli dokter ${booking.doctorName}`);
  };

  const addGroomingBooking = async (b: Omit<Types.GroomingBooking, 'id' | 'bookingNo'>): Promise<void> => {
    const newBooking = await api.post<Types.GroomingBooking>('/grooming-bookings', b);
    setGroomingBookings((prev) => [newBooking, ...prev]);
    addAuditLog('Tambah', 'Grooming Salon', newBooking.bookingNo, `Pemesanan sesi grooming untuk ${newBooking.petName} (${newBooking.packageType})`);
  };

  const updateGroomingBooking = async (id: string, updates: Partial<Types.GroomingBooking>): Promise<void> => {
    const booking = groomingBookings.find((b) => b.id === id);
    const updated = await api.put<Types.GroomingBooking>(`/grooming-bookings/${id}`, updates);
    setGroomingBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    addAuditLog('Edit', 'Grooming Salon', booking?.bookingNo || id, `Pembaruan data grooming booking: ${JSON.stringify(updates)}`);
  };

  const rescheduleGroomingBooking = async (id: string, date: string, timeSlot: string, groomerName?: string): Promise<void> => {
    const booking = groomingBookings.find((b) => b.id === id);
    if (!booking) return;
    const oldSlot = `${booking.date} ${booking.timeSlot}`;
    const targetGroomer = groomerName || booking.groomerName;
    const updated = await api.put<Types.GroomingBooking>(`/grooming-bookings/${id}`, {
      date, timeSlot, groomerName: targetGroomer,
      status: booking.status === 'Batal' ? 'Terkonfirmasi' : booking.status,
    });
    setGroomingBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    addAuditLog('Edit', 'Grooming Salon', booking.bookingNo,
      `Reschedule grooming ${booking.petName} (${booking.bookingNo}) dari ${oldSlot} ke ${date} jam ${timeSlot} (${targetGroomer})`,
      { severity: 'Warning', previousValue: oldSlot, newValue: `${date} ${timeSlot} (${targetGroomer})` }
    );
    addNotification({
      title: 'Jadwal Grooming Di-reschedule',
      message: `Grooming ${booking.bookingNo} (${booking.petName}) dipindahkan ke ${date} jam ${timeSlot}`,
      type: 'Booking', priority: 'Sedang',
    });
  };

  const addHotelBooking = async (b: Omit<Types.HotelBooking, 'id' | 'bookingNo'>): Promise<void> => {
    const newBooking = await api.post<Types.HotelBooking>('/hotel-bookings', b);
    setHotelBookings((prev) => [newBooking, ...prev]);
    addAuditLog('Tambah', 'Pet Hotel & Penitipan', newBooking.bookingNo, `Reservasi pet hotel untuk ${newBooking.petName} di kamar ${newBooking.roomNo}`);
  };

  const addClinicVisit = async (v: Omit<Types.ClinicVisit, 'id' | 'visitNo' | 'queueNo' | 'status' | 'queuedAt'>): Promise<Types.ClinicVisit> => {
    const newVisit = await api.post<Types.ClinicVisit>('/clinic-visits', v);
    setClinicVisits((prev) => [...prev, newVisit]);
    addAuditLog('Tambah', 'Poli & Antrean', newVisit.visitNo, `Pendaftaran walk-in antrean poli dokter untuk pasien ${newVisit.petName}`);
    return newVisit;
  };

  const updateVisitStatus = async (id: string, status: Types.VisitStatus) => {
    const visit = clinicVisits.find((v) => v.id === id);
    const updatedVisit = await api.post<Types.ClinicVisit>(`/clinic-visits/${id}/status`, { status });
    setClinicVisits((prev) => prev.map((v) => (v.id === id ? updatedVisit : v)));
    addAuditLog('Edit', 'Poli & Antrean', visit?.visitNo || id, `Status kunjungan poli diubah menjadi: ${status}`);
  };

  const updateClinicVisit = async (id: string, updates: Partial<Types.ClinicVisit>) => {
    const visit = clinicVisits.find((v) => v.id === id);
    await api.put(`/clinic-visits/${id}`, updates);
    setClinicVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
    if (updates.triageUrgency) {
      addAuditLog(
        'Edit',
        'Triase & Urgensi Klinis',
        visit?.visitNo || id,
        `Tingkat urgensi triase diubah menjadi ${updates.triageUrgency} (${updates.triageRationale || 'Rekomendasi AI'})`,
        { severity: updates.triageUrgency === 'P1' ? 'Kritis' : updates.triageUrgency === 'P2' ? 'Warning' : 'Info' }
      );
    }
  };

  const saveSOAPNote = (soapData: Omit<Types.SOAPNote, 'id'>) => {
    const existing = soapNotes.find((s) => s.visitId === soapData.visitId);
    let soapId = existing?.id;
    if (existing) {
      setSoapNotes((prev) => prev.map((s) => (s.id === existing.id ? { ...s, ...soapData } : s)));
    } else {
      soapId = 'soap_' + Date.now();
      setSoapNotes((prev) => [...prev, { ...soapData, id: soapId! }]);
    }

    // Auto create MedicalRecord entry
    const newMr: Types.MedicalRecord = {
      id: 'mr_' + Date.now(),
      petId: soapData.petId,
      date: soapData.date,
      type: 'Kunjungan',
      title: `SOAP: ${soapData.workingDiagnosis}`,
      description: `Rencana Terapi: ${soapData.medicationPlan}`,
      performedBy: soapData.doctorName
    };
    setMedicalRecords((prev) => [newMr, ...prev]);

    // If pet weight updated, update pet entity
    if (soapData.weightKg) {
      setPets((prev) => prev.map((p) => (p.id === soapData.petId ? { ...p, weightKg: soapData.weightKg } : p)));
    }

    addAuditLog(
      'Tambah',
      'Pemeriksaan Klinis (SOAP)',
      soapData.visitId,
      `Pencatatan rekam SOAP: ${soapData.workingDiagnosis} | Terapi: ${soapData.medicationPlan || 'Sesuai resep'}`,
      { severity: 'Warning' }
    );
  };

  const addInpatient = (inp: Omit<Types.Inpatient, 'id' | 'inpatientNo' | 'status' | 'admittedAt'>) => {
    const newInp: Types.Inpatient = {
      ...inp,
      id: 'ip_' + Date.now(),
      inpatientNo: 'INP-' + Date.now().toString().slice(-6),
      status: 'Stabil',
      admittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setInpatients((prev) => [newInp, ...prev]);
    addAuditLog('Tambah', 'Rawat Inap', newInp.inpatientNo, `Admisi rawat inap untuk pasien ${newInp.petName} di kandang ${newInp.cageNo}`, { severity: 'Warning' });
  };

  const updateInpatientStatus = (id: string, status: Types.Inpatient['status']) => {
    const current = inpatients.find((i) => i.id === id);
    setInpatients((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    addAuditLog('Edit', 'Rawat Inap', current?.inpatientNo || id, `Status kondisi rawat inap diperbarui menjadi: ${status}`, { severity: 'Warning' });
  };

  const addDischargeNote = (dn: Omit<Types.DischargeNote, 'id' | 'createdAt'>) => {
    const newDn: Types.DischargeNote = {
      ...dn,
      id: 'dn_' + Date.now(),
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setDischargeNotes((prev) => [newDn, ...prev]);
    addAuditLog('Tambah', 'Rawat Inap', newDn.petName, `Penerbitan resume medis kepulangan rawat inap untuk ${newDn.petName}`, { severity: 'Warning' });
  };

  const addMedicalRecord = (mr: Omit<Types.MedicalRecord, 'id'>) => {
    const newMr = { ...mr, id: 'mr_' + Date.now() };
    setMedicalRecords((prev) => [newMr, ...prev]);
    addAuditLog('Tambah', 'Rekam Medis (EMR)', mr.title, `Pencatatan rekam medis baru (${mr.type}) untuk pasien ID ${mr.petId}`);
  };

  const addPreConsultForm = (pcf: Omit<Types.PreConsultForm, 'id' | 'status' | 'createdAt'>) => {
    const newForm: Types.PreConsultForm = {
      ...pcf,
      id: 'pcf_' + Date.now(),
      status: 'Menunggu',
      createdAt: new Date().toISOString().substring(0, 16)
    };
    setPreConsultForms((prev) => [newForm, ...prev]);
    addAuditLog('Tambah', 'Pre-Konsultasi', newForm.petName, `Formulir pra-konsultasi mandiri diisi untuk ${newForm.petName}`);
  };

  const updatePreConsultStatus = (id: string, status: 'Menunggu' | 'Digunakan') => {
    setPreConsultForms((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    addAuditLog('Edit', 'Pre-Konsultasi', id, `Status formulir pra-konsultasi diubah menjadi: ${status}`);
  };

  const addReferralLetter = (rl: Omit<Types.ReferralLetter, 'id' | 'referralNo' | 'createdAt'>) => {
    const newLetter: Types.ReferralLetter = {
      ...rl,
      id: 'rl_' + Date.now(),
      referralNo: 'REF-' + Date.now().toString().slice(-6),
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setReferralLetters((prev) => [newLetter, ...prev]);
    addAuditLog('Tambah', 'Surat Rujukan Medis', newLetter.referralNo, `Penerbitan rujukan medis pasien ${newLetter.petName} ke ${newLetter.destinationClinic}`, { severity: 'Warning' });
  };

  const addVisitSurvey = (vs: Omit<Types.VisitSurvey, 'id' | 'createdAt'>) => {
    const newSurvey: Types.VisitSurvey = {
      ...vs,
      id: 'vs_' + Date.now(),
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setVisitSurveys((prev) => [newSurvey, ...prev]);
  };

  const addVacSchedule = (vs: Omit<Types.VacSchedule, 'id'>) => {
    setVacSchedules((prev) => [{ ...vs, id: 'vs_' + Date.now() }, ...prev]);
    addAuditLog('Tambah', 'Jadwal Vaksinasi', vs.vaccineName, `Penjadwalan vaksinasi ${vs.vaccineName} untuk pasien ${vs.petName}`);
  };

  const addVacHistory = (vh: Omit<Types.VacHistory, 'id'>) => {
    const newHistory = { ...vh, id: 'vh_' + Date.now() };
    setVacHistories((prev) => [newHistory, ...prev]);

    // Auto mark schedule completed
    setVacSchedules((prev) =>
      prev.map((s) => (s.petId === vh.petId && s.vaccineName.includes(vh.vaccineName) ? { ...s, status: 'Selesai' } : s))
    );

    // Auto add medical record
    addMedicalRecord({
      petId: vh.petId,
      date: vh.givenDate,
      type: 'Vaksinasi',
      title: `Vaksinasi: ${vh.vaccineName}`,
      description: `Sertifikat No: ${vh.certificateNo}, Batch: ${vh.batchNumber}`,
      performedBy: vh.doctorName
    });

    addAuditLog('Tambah', 'Vaksinasi & Paspor', vh.vaccineName, `Pemberian vaksin ${vh.vaccineName} (Batch: ${vh.batchNumber}) & penerbitan sertifikat ${vh.certificateNo}`, { severity: 'Warning' });
  };

  const addDewormingRecord = (dr: Omit<Types.DewormingRecord, 'id'>): Types.DewormingRecord => {
    const newRecord: Types.DewormingRecord = { ...dr, id: 'dw_' + Date.now() };
    setDewormingRecords((prev) => [newRecord, ...prev]);
    addAuditLog('Tambah', 'Vaksinasi & Paspor', dr.medicineName, `Pemberian obat cacing/anti-parasit ${dr.medicineName} untuk pasien, jadwal ulang berikutnya ${dr.nextDueDate}`, { severity: 'Info' });
    return newRecord;
  };

  const addCustomerNote = async (customerId: string, note: string): Promise<Types.CustomerNote> => {
    const newNote = await api.post<Types.CustomerNote>('/customer-notes', { customerId, note });
    setCustomerNotes((prev) => [...prev, newNote]);
    addAuditLog('Tambah', 'CRM & Loyalty', customerId, `Catatan interaksi baru ditambahkan untuk pelanggan.`, { severity: 'Info' });
    return newNote;
  };

  // Mutasi stok antar cabang: stok itu satu pool bersama (StockItem tidak
  // punya branchId), jadi ini TIDAK memanggil updateStockItem — hanya
  // menerbitkan surat jalan persisten + StockMovement type 'Transfer' asli
  // sebagai jejak audit fisik barang berpindah lokasi cabang. Sebelumnya
  // ini cuma useState lokal di BranchesModule.tsx yang hilang saat reload
  // dan tidak pernah memanggil addStockMovement sama sekali.
  const addInterBranchTransfer = async (
    t: Omit<Types.InterBranchTransfer, 'id' | 'transferNo' | 'date' | 'status'>
  ): Promise<Types.InterBranchTransfer> => {
    const newTransfer: Types.InterBranchTransfer = {
      ...t,
      id: 'ibt_' + Date.now(),
      transferNo: 'MUTASI-' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900),
      date: new Date().toISOString().substring(0, 10),
      status: 'Dalam Pengiriman'
    };
    setInterBranchTransfers((prev) => [newTransfer, ...prev]);

    await addStockMovement({
      itemId: t.stockItemId,
      itemName: t.itemName,
      type: 'Transfer',
      quantity: t.qty,
      fromWarehouse: t.sourceBranchName,
      toWarehouse: t.destBranchName,
      referenceNo: newTransfer.transferNo,
      operator: t.requestedBy
    });

    return newTransfer;
  };

  const markInterBranchTransferReceived = (id: string) => {
    const t = interBranchTransfers.find((x) => x.id === id);
    setInterBranchTransfers((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Diterima' } : x)));
    if (t) {
      addAuditLog('Edit', 'Manajemen Multi-Cabang', t.transferNo, `Mutasi stok ${t.transferNo} (${t.itemName} x${t.qty}) dikonfirmasi diterima di ${t.destBranchName}.`, { severity: 'Info' });
    }
  };

  const addSurgicalProcedure = (sp: Omit<Types.SurgicalProcedure, 'id' | 'procedureNo'>) => {
    const procedureNo = 'SURG-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 90);
    const newSurg: Types.SurgicalProcedure = {
      ...sp,
      id: 'sp_' + Date.now(),
      procedureNo
    };
    setSurgicalProcedures((prev) => [newSurg, ...prev]);

    // Auto add medical record
    addMedicalRecord({
      petId: sp.petId,
      date: sp.date,
      type: 'Tindakan',
      title: `Operasi Bedah: ${sp.procedureName}`,
      description: `Kategori: ${sp.category} | Dokter: ${sp.leadSurgeon} | Anestesi: ${sp.anesthesiaProtocol}`,
      performedBy: sp.leadSurgeon
    });

    addAuditLog('Tambah', 'Pemeriksaan Medis (CPPT)', sp.procedureName, `Pencatatan prosedur bedah (${sp.category}) untuk pasien ${sp.petName} oleh ${sp.leadSurgeon}`, { severity: 'Warning' });
  };

  const addDrug = async (d: Omit<Types.Drug, 'id' | 'code'>): Promise<void> => {
    const newDrug = await api.post<Types.Drug>('/drugs', d);
    setDrugs((prev) => [...prev, newDrug]);
    addAuditLog('Tambah', 'Apotek & Farmasi', newDrug.name, `Penambahan item obat baru: ${newDrug.name} (${newDrug.unit}) - Stok: ${newDrug.stock}`, { severity: 'Info' });
  };

  const updateDrug = async (id: string, dData: Partial<Types.Drug>): Promise<void> => {
    const current = drugs.find((d) => d.id === id);
    const updated = await api.put<Types.Drug>(`/drugs/${id}`, dData);
    setDrugs((prev) => prev.map((d) => (d.id === id ? updated : d)));
    addAuditLog('Edit', 'Apotek & Farmasi', current?.name || id, `Pembaruan data/harga/stok obat: ${current?.name || id}`, {
      severity: 'Warning',
      previousValue: current ? JSON.stringify({ unitPrice: current.unitPrice, stock: current.stock }) : undefined,
      newValue: JSON.stringify(dData),
    });
  };

  const deleteDrug = async (id: string): Promise<void> => {
    const current = drugs.find((d) => d.id === id);
    await api.del(`/drugs/${id}`);
    setDrugs((prev) => prev.filter((d) => d.id !== id));
    addAuditLog('Hapus', 'Apotek & Farmasi', current?.name || id, `Penghapusan item master obat/vaksin: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const dispenseDrug = async (drugId: string, qty: number): Promise<void> => {
    const drug = drugs.find((d) => d.id === drugId);
    const updated = await api.post<Types.Drug>(`/drugs/${drugId}/dispense`, { quantity: qty });
    setDrugs((prev) => prev.map((d) => (d.id === drugId ? updated : d)));
    if (updated.stock <= updated.minStock) {
      addNotification({
        title: 'Stok Obat Menipis',
        message: `Stok ${updated.name} tersisa ${updated.stock} ${updated.unit} (Minimum ${updated.minStock}).`,
        type: 'Stok', priority: 'Tinggi',
      });
    }
    addAuditLog('Dispense', 'Apotek & Farmasi', drug?.name || drugId,
      `Dispensing resep obat: ${qty} ${drug?.unit || 'unit'} (Stok sisa: ${updated.stock})`, { severity: 'Warning' });
  };

  const addLabTest = (lt: Omit<Types.LabTest, 'id' | 'testNo' | 'status' | 'orderedAt'>) => {
    const newTest: Types.LabTest = {
      ...lt,
      id: 'lt_' + Date.now(),
      testNo: 'LAB-' + Date.now().toString().slice(-6),
      status: 'Dalam Proses',
      orderedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setLabTests((prev) => [newTest, ...prev]);
    addAuditLog('Tambah', 'Laboratorium & Diagnostik', newTest.testNo, `Order pemeriksaan laboratorium: ${newTest.testName} untuk pasien ${newTest.petName}`);
    return newTest;
  };

  const updateLabResult = (id: string, results: Types.LabTest['results'], notes?: string) => {
    const test = labTests.find((lt) => lt.id === id);
    setLabTests((prev) =>
      prev.map((lt) =>
        lt.id === id
          ? {
              ...lt,
              status: 'Selesai',
              completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              results,
              notes: notes || lt.notes
            }
          : lt
      )
    );
    addAuditLog('Edit', 'Laboratorium & Diagnostik', test?.testNo || id, `Penginputan & validasi hasil tes laboratorium: ${test?.testName || id}`, { severity: 'Warning' });
  };

  const addGroomingPackage = async (gp: Omit<Types.GroomingPackage, 'id'>): Promise<void> => {
    const newPkg = await api.post<Types.GroomingPackage>('/grooming-packages', gp);
    setGroomingPackages((prev) => [...prev, newPkg]);
    addAuditLog('Tambah', 'Grooming Salon', newPkg.name, `Paket grooming baru ditambahkan: ${newPkg.name} (${newPkg.packageType})`);
  };

  const updateGroomingPackage = async (id: string, gpData: Partial<Types.GroomingPackage>): Promise<void> => {
    const current = groomingPackages.find((p) => p.id === id);
    const updated = await api.put<Types.GroomingPackage>(`/grooming-packages/${id}`, gpData);
    setGroomingPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    addAuditLog('Edit', 'Grooming Salon', current?.name || id, `Pembaruan paket & harga grooming: ${current?.name || id}`, { severity: 'Warning' });
  };

  const deleteGroomingPackage = async (id: string): Promise<void> => {
    const current = groomingPackages.find((p) => p.id === id);
    await api.del(`/grooming-packages/${id}`);
    setGroomingPackages((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('Hapus', 'Grooming Salon', current?.name || id, `Penghapusan paket grooming: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addGroomingSession = async (gs: Omit<Types.GroomingSession, 'id' | 'sessionNo'>): Promise<void> => {
    const newSession = await api.post<Types.GroomingSession>('/grooming-sessions', gs);
    setGroomingSessions((prev) => [newSession, ...prev]);
    addAuditLog('Tambah', 'Grooming Salon', newSession.sessionNo, `Sesi grooming baru untuk ${newSession.petName} (${newSession.packageType})`);
  };

  const updateGroomingStage = async (id: string, stage: Types.GroomingStage): Promise<void> => {
    const session = groomingSessions.find((s) => s.id === id);
    const updated = await api.put<Types.GroomingSession>(`/grooming-sessions/${id}/stage`, { stage });
    setGroomingSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    addAuditLog('Edit', 'Grooming Salon', session?.sessionNo || id, `Tahapan pengerjaan grooming diubah menjadi: ${stage}`);
  };

  const addHotelRoom = async (room: Omit<Types.HotelRoom, 'id'>): Promise<void> => {
    const newRoom = await api.post<Types.HotelRoom>('/hotel-rooms', room);
    setHotelRooms((prev) => [...prev, newRoom]);
    addAuditLog('Tambah', 'Pet Hotel & Penitipan', newRoom.roomNo, `Kamar/kandang hotel baru ditambahkan: ${newRoom.roomNo} (${newRoom.roomType})`);
  };

  const updateHotelRoom = async (id: string, roomData: Partial<Types.HotelRoom>): Promise<void> => {
    const current = hotelRooms.find((r) => r.id === id);
    const updated = await api.put<Types.HotelRoom>(`/hotel-rooms/${id}`, roomData);
    setHotelRooms((prev) => prev.map((r) => (r.id === id ? updated : r)));
    addAuditLog('Edit', 'Pet Hotel & Penitipan', current?.roomNo || id, `Pembaruan data kamar/kandang: ${current?.roomNo || id}`, { severity: 'Warning' });
  };

  const deleteHotelRoom = async (id: string): Promise<void> => {
    const current = hotelRooms.find((r) => r.id === id);
    await api.del(`/hotel-rooms/${id}`);
    setHotelRooms((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('Hapus', 'Pet Hotel & Penitipan', current?.roomNo || id, `Penghapusan kamar/kandang: ${current?.roomNo || id}`, { severity: 'Kritis' });
  };

  const addHotelReservation = async (hr: Omit<Types.HotelReservation, 'id' | 'reservationNo'>): Promise<void> => {
    const newRes = await api.post<Types.HotelReservation>('/hotel-reservations', hr);
    setHotelReservations((prev) => [newRes, ...prev]);
    addAuditLog('Tambah', 'Pet Hotel & Penitipan', newRes.reservationNo, `Reservasi pet hotel baru untuk ${newRes.petName} di kandang ${newRes.roomNo}`);
  };

  const updateHotelStatus = async (id: string, status: Types.HotelReservation['status']): Promise<void> => {
    const res = hotelReservations.find((r) => r.id === id);
    const updated = await api.put<Types.HotelReservation>(`/hotel-reservations/${id}/status`, { status });
    setHotelReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    addAuditLog('Edit', 'Pet Hotel & Penitipan', res?.reservationNo || id, `Status pet hotel diubah menjadi: ${status}`);
  };

  const addDailyMonitoring = async (dm: Omit<Types.DailyMonitoring, 'id'>): Promise<void> => {
    const newDm = await api.post<Types.DailyMonitoring>('/daily-monitorings', dm);
    setDailyMonitorings((prev) => [newDm, ...prev]);
    addAuditLog('Tambah', 'Monitoring Pasien', dm.petName, `Pencatatan monitoring harian: Suhu ${dm.temperatureC ?? '-'}°C oleh ${dm.staffName}`);
  };

  const addProductCategory = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newCat = await api.post<Types.ProductCategory>('/product-categories', { name: trimmed });
    setProductCategories((prev) => [...prev, newCat]);
    addAuditLog('Tambah', 'Master Data', trimmed, `Kategori produk baru ditambahkan: ${trimmed}`);
  };

  const deleteProductCategory = async (id: string): Promise<void> => {
    const current = productCategories.find((c) => c.id === id);
    await api.del(`/product-categories/${id}`);
    setProductCategories((prev) => prev.filter((c) => c.id !== id));
    addAuditLog('Hapus', 'Master Data', current?.name || id, `Kategori produk dihapus: ${current?.name || id}`, { severity: 'Warning' });
  };

  const addWarehouse = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newWh = await api.post<Types.Warehouse>('/warehouses', { name: trimmed });
    setWarehouses((prev) => [...prev, newWh]);
    addAuditLog('Tambah', 'Master Data', trimmed, `Gudang/lokasi baru ditambahkan: ${trimmed}`);
  };

  const deleteWarehouse = async (id: string): Promise<void> => {
    const current = warehouses.find((w) => w.id === id);
    await api.del(`/warehouses/${id}`);
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
    addAuditLog('Hapus', 'Master Data', current?.name || id, `Gudang/lokasi dihapus: ${current?.name || id}`, { severity: 'Warning' });
  };

  const addStockItem = async (si: Omit<Types.StockItem, 'id' | 'sku'> & { sku?: string }): Promise<Types.StockItem> => {
    const newItem = await api.post<Types.StockItem>('/stock-items', si);
    setStockItems((prev) => [...prev, newItem]);
    addAuditLog('Tambah', 'Inventaris & Gudang', newItem.name, `Penambahan item stok gudang baru: ${newItem.name} (SKU: ${newItem.sku})`, { severity: 'Info' });
    return newItem;
  };

  const updateStockItem = async (id: string, siData: Partial<Types.StockItem>): Promise<void> => {
    const current = stockItems.find((s) => s.id === id);
    const updated = await api.put<Types.StockItem>(`/stock-items/${id}`, siData);
    setStockItems((prev) => prev.map((s) => (s.id === id ? updated : s)));
    addAuditLog('Edit', 'Inventaris & Gudang', current?.name || id, `Pembaruan item inventaris gudang: ${current?.name || id}`, {
      severity: 'Warning',
      previousValue: current ? JSON.stringify({ stock: current.stock, purchasePrice: current.purchasePrice, sellingPrice: current.sellingPrice }) : undefined,
      newValue: JSON.stringify(siData),
    });
  };

  const addStockMovement = async (sm: Omit<Types.StockMovement, 'id' | 'date'>): Promise<void> => {
    const newMov = await api.post<Types.StockMovement>('/stock-movements', sm);
    setStockMovements((prev) => [newMov, ...prev]);
    addAuditLog(
      newMov.type === 'Opname' ? 'Edit' : 'Tambah',
      'Inventaris & Gudang',
      newMov.itemName,
      `Mutasi stok (${newMov.type}): ${newMov.quantity} unit. Referensi: ${newMov.referenceNo || '-'} (${newMov.operator})`,
      { severity: 'Warning' }
    );
  };

  const addSupplier = async (sup: Omit<Types.Supplier, 'id' | 'code'>): Promise<void> => {
    const newSup = await api.post<Types.Supplier>('/suppliers', sup);
    setSuppliers((prev) => [...prev, newSup]);
    addAuditLog('Tambah', 'Purchasing & Vendor', newSup.name, `Vendor supplier baru didaftarkan: ${newSup.name} (${newSup.phone})`);
  };

  const updateSupplier = async (id: string, sData: Partial<Types.Supplier>): Promise<void> => {
    const current = suppliers.find((s) => s.id === id);
    const updated = await api.put<Types.Supplier>(`/suppliers/${id}`, sData);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    addAuditLog('Edit', 'Purchasing & Vendor', current?.name || id, `Pembaruan data vendor supplier: ${current?.name || id}`, { severity: 'Warning' });
  };

  const deleteSupplier = async (id: string): Promise<void> => {
    const current = suppliers.find((s) => s.id === id);
    await api.del(`/suppliers/${id}`);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('Hapus', 'Purchasing & Vendor', current?.name || id, `Penghapusan vendor supplier: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addPurchaseOrder = async (po: Omit<Types.PurchaseOrder, 'id' | 'poNo' | 'date' | 'status'>): Promise<void> => {
    const newPo = await api.post<Types.PurchaseOrder>('/purchase-orders', po);
    setPurchaseOrders((prev) => [newPo, ...prev]);
    addAuditLog('Tambah', 'Purchasing & PO', newPo.poNo, `Pembuatan Purchase Order baru ke ${newPo.supplierName} senilai Rp ${newPo.totalAmount.toLocaleString('id-ID')}`, { severity: 'Warning' });
  };

  const receivePurchaseOrder = async (poId: string): Promise<void> => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    // Server atomically: marks PO received, bumps stock, records movements.
    await api.post(`/purchase-orders/${poId}/receive`, {});
    // Refresh stock data from server to reflect accurate quantities.
    const [freshStock, freshMovements, freshPOs] = await Promise.all([
      api.get<Types.StockItem[]>('/stock-items'),
      api.get<Types.StockMovement[]>('/stock-movements'),
      api.get<Types.PurchaseOrder[]>('/purchase-orders'),
    ]);
    setStockItems(freshStock);
    setStockMovements(freshMovements);
    setPurchaseOrders(freshPOs);
    addAuditLog('Tambah', 'Purchasing & Penerimaan', po.poNo, `Purchase Order ${po.poNo} diterima penuh & stok gudang otomatis bertambah`, { severity: 'Warning' });
  };

  const addInvoice = async (invData: Omit<Types.Invoice, 'id' | 'invoiceNo' | 'date'>): Promise<Types.Invoice> => {
    const newInv = await api.post<Types.Invoice>('/invoices', invData);
    setInvoices((prev) => [newInv, ...prev]);
    addAuditLog('Tambah', 'Kasir POS & Billing', newInv.invoiceNo, `Penerbitan tagihan/faktur baru senilai Rp ${newInv.totalAmount.toLocaleString('id-ID')} untuk ${newInv.customerName}`, { severity: 'Info' });
    return newInv;
  };

  const processPayment = async (invId: string, method: Types.Invoice['paymentMethod'], pointsRedeemed: number = 0) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return;
    // Idempotency guard: tanpa ini, klik ganda pada "Konfirmasi Pembayaran"
    // (atau race lain yang memanggil processPayment untuk invoice yang sama)
    // menghitung ulang kas masuk & poin loyalti dobel untuk satu invoice. Guard
    // yang sesungguhnya sekarang ada di server/invoiceService.ts (dalam satu
    // transaksi SQL); guard di sini hanya optimisasi supaya UI tidak fetch percuma.
    if (inv.status === 'Lunas') return;

    // Server melakukan SEMUANYA dalam satu transaksi SQL: update invoice,
    // catat cash_transactions, dan update loyalty/totalSpent/tier customer.
    const updatedInvoice = await api.post<Types.Invoice>(`/invoices/${invId}/payment`, { method, pointsRedeemed });
    setInvoices((prev) => prev.map((i) => (i.id === invId ? updatedInvoice : i)));

    // Refresh customer & cash-transactions dari server supaya angka
    // loyalty/totalSpent/tier & buku kas yang ditampilkan konsisten dengan
    // hasil transaksi SQL di atas (bukan dihitung ulang di client).
    try {
      const [refreshedCustomers, refreshedCash] = await Promise.all([
        api.get<Types.Customer[]>('/customers'),
        api.get<Types.CashTransaction[]>('/cash-transactions'),
      ]);
      setCustomers(refreshedCustomers);
      setCashTransactions(refreshedCash);
    } catch (err) {
      console.error('[DataContext] Gagal menyegarkan data customer/kas setelah pembayaran:', err);
    }

    addAuditLog('Bayar', 'Kasir POS & Billing', inv.invoiceNo, `Pelunasan transaksi kasir via ${method} sejumlah Rp ${inv.totalAmount.toLocaleString('id-ID')}${pointsRedeemed ? ` (Redeem Poin: ${pointsRedeemed})` : ''}`, { severity: 'Kritis' });
  };

  const addCashTransaction = async (ct: Omit<Types.CashTransaction, 'id' | 'transNo' | 'date'>) => {
    const newCt = await api.post<Types.CashTransaction>('/cash-transactions', ct);
    setCashTransactions((prev) => [newCt, ...prev]);
    addAuditLog('Tambah', 'Buku Kas & Keuangan', newCt.transNo, `Pencatatan kas operasional [${newCt.type}] senilai Rp ${newCt.amount.toLocaleString('id-ID')} (${newCt.category}): ${newCt.description}`, { severity: 'Kritis' });
  };

  const addEmployee = async (emp: Omit<Types.Employee, 'id' | 'nik'>): Promise<void> => {
    const newEmp = await api.post<Types.Employee>('/employees', emp);
    setEmployees((prev) => [...prev, newEmp]);
    addAuditLog('Tambah', 'SDM & Akses Karyawan', newEmp.name, `Pendaftaran akun karyawan baru: ${newEmp.name} (Peran: ${newEmp.role}, NIK: ${newEmp.nik})`, { severity: 'Kritis' });
  };

  const updateEmployee = async (id: string, empData: Partial<Types.Employee>): Promise<void> => {
    const current = employees.find((e) => e.id === id);
    const updated = await api.put<Types.Employee>(`/employees/${id}`, empData);
    setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    addAuditLog('Edit', 'SDM & Akses Karyawan', current?.name || id, `Pembaruan konfigurasi data/gaji/hak akses karyawan: ${current?.name || id}`, {
      severity: 'Kritis',
      previousValue: current ? JSON.stringify({ role: current.role, baseSalary: current.baseSalary, status: current.status }) : undefined,
      newValue: JSON.stringify(empData),
    });
  };

  const deleteEmployee = async (id: string): Promise<void> => {
    const current = employees.find((e) => e.id === id);
    await api.del(`/employees/${id}`);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    addAuditLog('Hapus', 'SDM & Akses Karyawan', current?.name || id, `Penonaktifan akun karyawan & pencabutan seluruh akses sistem: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addAbsenceRecord = (ab: Omit<Types.AbsenceRecord, 'id'>) => {
    setAbsenceRecords((prev) => [{ ...ab, id: 'ab_' + Date.now() }, ...prev]);
    addAuditLog('Tambah', 'SDM & Presensi', ab.employeeName, `Pencatatan presensi karyawan: ${ab.status} (${ab.date})`);
  };

  const addLeaveRequest = (lr: Omit<Types.LeaveRequest, 'id'>) => {
    setLeaveRequests((prev) => [{ ...lr, id: 'lr_' + Date.now() }, ...prev]);
    addAuditLog('Tambah', 'SDM & Cuti', lr.employeeName, `Pengajuan cuti: ${lr.leaveType} (${lr.startDate} s/d ${lr.endDate})`);
  };

  const addReminder = async (rem: Omit<Types.Reminder, 'id'>): Promise<void> => {
    const newRem = await api.post<Types.Reminder>('/reminders', rem);
    setReminders((prev) => [newRem, ...prev]);
  };

  const updateReminderStatus = async (id: string, status: Types.Reminder['status']): Promise<void> => {
    const updated = await api.put<Types.Reminder>(`/reminders/${id}/status`, { status });
    setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const deleteReminder = async (id: string): Promise<void> => {
    await api.del(`/reminders/${id}`);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const addCarePlan = (cp: Omit<Types.CarePlan, 'id' | 'planNo'>): Types.CarePlan => {
    const newPlan: Types.CarePlan = {
      ...cp,
      id: 'cp_' + Date.now(),
      planNo: 'CP-' + Date.now().toString().slice(-6)
    };
    setCarePlans((prev) => [newPlan, ...prev]);
    addAuditLog('Tambah', 'Care Plan & Tindakan', newPlan.planNo, `Pembuatan rencana perawatan medis terpadu untuk pasien ${newPlan.petName}`);
    return newPlan;
  };

  const toggleCarePlanTask = (planId: string, taskId: string) => {
    setCarePlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const updatedTasks = plan.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const isCompleted = !task.isCompleted;
          return {
            ...task,
            isCompleted,
            completedAt: isCompleted ? new Date().toISOString().replace('T', ' ').substring(0, 16) : undefined
          };
        });
        const allDone = updatedTasks.every((t) => t.isCompleted);
        return {
          ...plan,
          tasks: updatedTasks,
          status: allDone ? 'Selesai' : plan.status
        };
      })
    );
  };

  const addTelehealthSession = (th: Omit<Types.TelehealthSession, 'id' | 'sessionNo' | 'meetingUrl'>): Types.TelehealthSession => {
    const newTh: Types.TelehealthSession = {
      ...th,
      id: 'th_' + Date.now(),
      sessionNo: 'TH-' + Date.now().toString().slice(-6),
      meetingUrl: 'https://meet.petcare.id/th-' + Date.now().toString().slice(-6)
    };
    setTelehealthSessions((prev) => [newTh, ...prev]);
    addAuditLog('Tambah', 'Telehealth & Konsultasi', newTh.sessionNo, `Jadwal telekonsultasi baru untuk ${newTh.petName} dengan dokter ${newTh.doctorName}`);
    return newTh;
  };

  const updateTelehealthStatus = (id: string, status: Types.TelehealthSession['status']) => {
    setTelehealthSessions((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    addAuditLog('Edit', 'Telehealth & Konsultasi', id, `Status telekonsultasi diubah menjadi: ${status}`);
  };

  const updateTelehealthSession = (id: string, updates: Partial<Types.TelehealthSession>) => {
    setTelehealthSessions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    addAuditLog('Edit', 'Telehealth & Konsultasi', id, `Pembaruan data telekonsultasi: ${id}`);
  };

  const addEFormTemplate = (t: Omit<Types.EFormTemplate, 'id'>) => {
    const newTpl: Types.EFormTemplate = { ...t, id: 'eft_' + Date.now() };
    setEFormTemplates((prev) => [...prev, newTpl]);
    addAuditLog('Tambah', 'E-Form & Persetujuan Medis', newTpl.title, `Template e-form baru dibuat: ${newTpl.title}`);
  };

  const updateEFormTemplate = (id: string, tData: Partial<Types.EFormTemplate>) => {
    const current = eFormTemplates.find((t) => t.id === id);
    setEFormTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...tData } : t)));
    addAuditLog('Edit', 'E-Form & Persetujuan Medis', current?.title || id, `Pembaruan template e-form: ${current?.title || id}`, { severity: 'Warning' });
  };

  const deleteEFormTemplate = (id: string) => {
    const current = eFormTemplates.find((t) => t.id === id);
    setEFormTemplates((prev) => prev.filter((t) => t.id !== id));
    addAuditLog('Hapus', 'E-Form & Persetujuan Medis', current?.title || id, `Penghapusan template e-form: ${current?.title || id}`, { severity: 'Kritis' });
  };

  const addEFormSubmission = (efs: Omit<Types.EFormSubmission, 'id' | 'date'>): Types.EFormSubmission => {
    const newSub: Types.EFormSubmission = {
      ...efs,
      id: 'efs_' + Date.now(),
      date: new Date().toISOString().substring(0, 10)
    };
    setEFormSubmissions((prev) => [newSub, ...prev]);
    addAuditLog('Tambah', 'E-Form & Persetujuan Medis', newSub.templateTitle, `Penyerahan formulir digital ${newSub.templateTitle} untuk pasien ${newSub.petName} (Oleh: ${newSub.customerName})`, { severity: 'Warning' });
    return newSub;
  };

  const addInformedConsent = (ic: Omit<Types.InformedConsentRecord, 'id'>): Types.InformedConsentRecord => {
    const newConsent: Types.InformedConsentRecord = { ...ic, id: 'ic_' + Date.now() };
    setInformedConsents((prev) => [newConsent, ...prev]);
    addAuditLog('Tambah', 'E-Form & Persetujuan Medis', newConsent.consentNo, `Persetujuan tindakan medis (${newConsent.procedureType}) untuk pasien ${newConsent.petName} ditandatangani oleh ${newConsent.customerName}. Hash: ${newConsent.securityHash}`, { severity: 'Kritis' });
    return newConsent;
  };

  const addAmbulanceUnit = (u: Omit<Types.AmbulanceUnit, 'id'>) => {
    const newUnit: Types.AmbulanceUnit = { ...u, id: 'au_' + Date.now() };
    setAmbulanceUnits((prev) => [...prev, newUnit]);
    addAuditLog('Tambah', 'Ambulans Emergency', newUnit.vehicleName, `Armada ambulans baru didaftarkan: ${newUnit.vehicleName} (${newUnit.plateNo})`);
  };

  const updateAmbulanceUnit = (id: string, uData: Partial<Types.AmbulanceUnit>) => {
    const current = ambulanceUnits.find((u) => u.id === id);
    setAmbulanceUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...uData } : u)));
    addAuditLog('Edit', 'Ambulans Emergency', current?.vehicleName || id, `Pembaruan data armada ambulans: ${current?.vehicleName || id}`, { severity: 'Warning' });
  };

  const deleteAmbulanceUnit = (id: string) => {
    const current = ambulanceUnits.find((u) => u.id === id);
    setAmbulanceUnits((prev) => prev.filter((u) => u.id !== id));
    addAuditLog('Hapus', 'Ambulans Emergency', current?.vehicleName || id, `Penghapusan armada ambulans: ${current?.vehicleName || id}`, { severity: 'Kritis' });
  };

  const addAmbulanceRequest = (ar: Omit<Types.AmbulanceRequest, 'id' | 'requestNo' | 'requestedAt' | 'status'>): Types.AmbulanceRequest => {
    const newAr: Types.AmbulanceRequest = {
      ...ar,
      id: 'ar_' + Date.now(),
      requestNo: 'AMB-REQ-' + Date.now().toString().slice(-6),
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Menunggu'
    };
    setAmbulanceRequests((prev) => [newAr, ...prev]);
    addAuditLog('Tambah', 'Ambulans Emergency', newAr.requestNo, `Permintaan penjemputan darurat ambulans untuk ${newAr.petName} (Urgensi: ${newAr.urgency})`, { severity: 'Warning' });
    return newAr;
  };

  const updateAmbulanceStatus = (id: string, status: Types.AmbulanceRequest['status'], unitCode?: string) => {
    setAmbulanceRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, assignedUnitCode: unitCode || r.assignedUnitCode } : r))
    );
    addAuditLog('Edit', 'Ambulans Emergency', id, `Status armada ambulans diperbarui menjadi: ${status}${unitCode ? ` (Unit: ${unitCode})` : ''}`);
  };

  const addSystemGroup = (g: Omit<Types.SystemGroup, 'id' | 'createdAt'>): Types.SystemGroup => {
    const newGroup: Types.SystemGroup = {
      ...g,
      id: 'grp_' + Date.now(),
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setSystemGroups((prev) => [...prev, newGroup]);
    addAuditLog('Tambah', 'Grup & Hak Akses', newGroup.name, `Grup departemen baru dibuat: ${newGroup.name} (${newGroup.code})`, { severity: 'Warning' });
    return newGroup;
  };

  const updateSystemGroup = (id: string, gData: Partial<Types.SystemGroup>) => {
    const current = systemGroups.find((g) => g.id === id);
    setSystemGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...gData } : g)));
    addAuditLog('Edit', 'Grup & Hak Akses', current?.name || id, `Pembaruan grup/hak akses: ${current?.name || id}`, { severity: 'Warning' });
  };

  const deleteSystemGroup = (id: string) => {
    const current = systemGroups.find((g) => g.id === id);
    if (current?.isSystemDefault) return;
    setSystemGroups((prev) => prev.filter((g) => g.id !== id));
    addAuditLog('Hapus', 'Grup & Hak Akses', current?.name || id, `Penghapusan grup departemen: ${current?.name || id}`, { severity: 'Kritis' });
  };

  const addCustomerTierGroup = (t: Omit<Types.CustomerTierGroup, 'id'>) => {
    const newTier: Types.CustomerTierGroup = { ...t, id: 'tier_' + Date.now() };
    setCustomerTierGroups((prev) => [...prev, newTier]);
    addAuditLog('Tambah', 'CRM & Loyalty', newTier.tierName, `Tier membership baru dibuat: ${newTier.tierName} (Diskon ${newTier.discountPercent}%)`);
  };

  const updateCustomerTierGroup = (id: string, tData: Partial<Types.CustomerTierGroup>) => {
    const current = customerTierGroups.find((t) => t.id === id);
    setCustomerTierGroups((prev) => prev.map((t) => (t.id === id ? { ...t, ...tData } : t)));
    addAuditLog('Edit', 'CRM & Loyalty', current?.tierName || id, `Pembaruan tier membership: ${current?.tierName || id}`, { severity: 'Warning' });
  };

  const deleteCustomerTierGroup = (id: string) => {
    const current = customerTierGroups.find((t) => t.id === id);
    setCustomerTierGroups((prev) => prev.filter((t) => t.id !== id));
    addAuditLog('Hapus', 'CRM & Loyalty', current?.tierName || id, `Penghapusan tier membership: ${current?.tierName || id}`, { severity: 'Kritis' });
  };

  const addPatientPhoto = (ph: Omit<Types.PatientPhoto, 'id'>) => {
    setPatientPhotos((prev) => [{ ...ph, id: 'ph_' + Date.now() }, ...prev]);
  };

  const resetDailyQueue = () => {
    setClinicVisits((prev) => prev.map((v) => (v.status === 'Menunggu' ? { ...v, status: 'Batal' } : v)));
    addAuditLog('Edit', 'Sistem & Operasional', 'Antrean Harian', 'Penutupan sesi operasional harian: seluruh sisa antrean dibatalkan secara otomatis.', { severity: 'Warning' });
  };

  return (
    <DataContext.Provider
      value={{
        branches,
        activeBranchId,
        setActiveBranchId,
        addBranch,
        updateBranch,
        deleteBranch,
        tenants,
        addTenant,
        appSettings,
        updateAppSettings,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        adjustCustomerPoints,
        pets,
        addPet,
        updatePet,
        deletePet,
        services,
        addService,
        updateService,
        deleteService,
        doctorBookings,
        addDoctorBooking,
        updateDoctorBooking,
        rescheduleDoctorBooking,
        updateDoctorBookingStatus,
        checkInDoctorBooking,
        groomingBookings,
        addGroomingBooking,
        updateGroomingBooking,
        rescheduleGroomingBooking,
        hotelBookings,
        addHotelBooking,
        clinicVisits,
        addClinicVisit,
        updateVisitStatus,
        updateClinicVisit,
        soapNotes,
        saveSOAPNote,
        inpatients,
        addInpatient,
        updateInpatientStatus,
        dischargeNotes,
        addDischargeNote,
        medicalRecords,
        addMedicalRecord,
        preConsultForms,
        addPreConsultForm,
        updatePreConsultStatus,
        referralLetters,
        addReferralLetter,
        visitSurveys,
        addVisitSurvey,
        vacSchedules,
        addVacSchedule,
        vacHistories,
        addVacHistory,
        dewormingRecords,
        addDewormingRecord,
        customerNotes,
        addCustomerNote,
        interBranchTransfers,
        addInterBranchTransfer,
        markInterBranchTransferReceived,
        surgicalProcedures,
        addSurgicalProcedure,
        drugs,
        addDrug,
        updateDrug,
        deleteDrug,
        dispenseDrug,
        labTests,
        addLabTest,
        updateLabResult,
        groomingPackages,
        addGroomingPackage,
        updateGroomingPackage,
        deleteGroomingPackage,
        groomingSessions,
        addGroomingSession,
        updateGroomingStage,
        hotelRooms,
        addHotelRoom,
        updateHotelRoom,
        deleteHotelRoom,
        hotelReservations,
        addHotelReservation,
        updateHotelStatus,
        dailyMonitorings,
        addDailyMonitoring,
        productCategories,
        addProductCategory,
        deleteProductCategory,
        warehouses,
        addWarehouse,
        deleteWarehouse,
        stockItems,
        addStockItem,
        updateStockItem,
        stockMovements,
        addStockMovement,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        purchaseOrders,
        addPurchaseOrder,
        receivePurchaseOrder,
        invoices,
        addInvoice,
        processPayment,
        cashTransactions,
        addCashTransaction,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        absenceRecords,
        addAbsenceRecord,
        leaveRequests,
        addLeaveRequest,
        reminders,
        addReminder,
        updateReminderStatus,
        deleteReminder,
        loyaltyEntries,
        carePlans,
        addCarePlan,
        toggleCarePlanTask,
        telehealthSessions,
        addTelehealthSession,
        updateTelehealthStatus,
        updateTelehealthSession,
        eFormTemplates,
        addEFormTemplate,
        updateEFormTemplate,
        deleteEFormTemplate,
        eFormSubmissions,
        addEFormSubmission,
        informedConsents,
        addInformedConsent,
        ambulanceUnits,
        addAmbulanceUnit,
        updateAmbulanceUnit,
        deleteAmbulanceUnit,
        ambulanceRequests,
        addAmbulanceRequest,
        updateAmbulanceStatus,
        systemGroups,
        addSystemGroup,
        updateSystemGroup,
        deleteSystemGroup,
        customerTierGroups,
        addCustomerTierGroup,
        updateCustomerTierGroup,
        deleteCustomerTierGroup,
        patientPhotos,
        addPatientPhoto,
        auditLogs,
        addAuditLog,
        notifications,
        markNotificationRead,
        addNotification,
        resetDailyQueue
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
