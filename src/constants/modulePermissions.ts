// Extracted out of Sidebar.tsx so it can be imported by both the sidebar UI
// and src/hooks/usePermissions.ts without creating a circular dependency
// (Sidebar.tsx re-exports these for every existing `from './Sidebar'` import
// site, so nothing else needs to change).
export type NavModule =
  | 'dashboard'
  | 'masterData'
  | 'booking'
  | 'clinic'
  | 'emr'
  | 'vaccination'
  | 'pharmacy'
  | 'grooming'
  | 'petHotel'
  | 'patientGallery'
  | 'petShop'
  | 'inventory'
  | 'purchasing'
  | 'billing'
  | 'finance'
  | 'hrm'
  | 'crm'
  | 'reports'
  | 'aiAssistant'
  | 'telehealth'
  | 'eForms'
  | 'ambulance'
  | 'carePlan'
  | 'auditLog'
  | 'notifications'
  | 'branches'
  | 'settings'
  | 'systemGroups'
  | 'tenantAdmin';

// Group definitions for role-based permissions
const ALL_OWNERS = ['owner_klinik', 'owner_petshop', 'owner_petcare'];
const CLINIC_OWNERS = ['owner_klinik', 'owner_petcare'];
const PETSHOP_OWNERS = ['owner_petshop', 'owner_petcare'];

export const MODULE_PERMISSIONS: Record<NavModule, string[]> = {
  // Beranda & Master Data
  dashboard: ['*'],
  masterData: ['*'],

  // Layanan Klinis & Umum (Khusus Klinik & PetCare All-in-One - HIDDEN for PetShop)
  booking: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'resepsionis', 'superadmin'],
  grooming: ['owner_petcare', 'admin', 'groomer', 'superadmin'],
  petHotel: ['owner_petcare', 'admin', 'groomer', 'kasir', 'superadmin'],
  telehealth: [...CLINIC_OWNERS, 'admin', 'dokter', 'superadmin'],
  ambulance: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'superadmin'],

  // Medis & Farmasi (Khusus Klinik & PetCare All-in-One - HIDDEN for PetShop)
  clinic: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'superadmin'],
  emr: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'superadmin'],
  vaccination: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'superadmin'],
  pharmacy: [...CLINIC_OWNERS, 'admin', 'dokter', 'superadmin'],
  carePlan: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'superadmin'],
  eForms: [...CLINIC_OWNERS, 'admin', 'dokter', 'superadmin'],
  patientGallery: [...CLINIC_OWNERS, 'admin', 'dokter', 'perawat', 'groomer', 'superadmin'],

  // Penjualan & Logistik (PetShop POS is HIDDEN for Owner Klinik)
  petShop: [...PETSHOP_OWNERS, 'admin', 'kasir', 'superadmin'],
  inventory: [...ALL_OWNERS, 'admin', 'kasir', 'dokter', 'superadmin'],
  purchasing: [...ALL_OWNERS, 'admin', 'superadmin'],
  billing: [...ALL_OWNERS, 'admin', 'kasir', 'superadmin'],

  // Manajemen Bisnis
  finance: [...ALL_OWNERS, 'admin', 'superadmin'],
  hrm: [...ALL_OWNERS, 'admin', 'superadmin'],
  crm: [...ALL_OWNERS, 'admin', 'superadmin'],

  // Laporan & AI
  reports: [...ALL_OWNERS, 'admin', 'superadmin'],
  aiAssistant: [...CLINIC_OWNERS, 'admin', 'dokter', 'superadmin'],

  // Sistem & Konfigurasi
  notifications: ['*'],
  branches: [...ALL_OWNERS, 'admin', 'superadmin'],
  systemGroups: [...ALL_OWNERS, 'admin', 'superadmin'],
  auditLog: [...ALL_OWNERS, 'admin', 'superadmin'],
  settings: [...ALL_OWNERS, 'admin', 'superadmin'],
  tenantAdmin: ['superadmin'],
};
