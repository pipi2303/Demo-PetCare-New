import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Dog,
  X,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, Customer, MembershipTier, Pet } from '../../types';
import {
  downloadClientImportTemplate,
  downloadPatientImportTemplate,
  exportClientsToCSV,
  exportClientsToPDF,
  exportMasterDataToExcel,
  exportPatientsToCSV,
  exportPatientsToPDF,
  getSamplePatientImportRows,
  normalizePhoneDigits,
  parseUploadedSpreadsheet,
  SAMPLE_CLIENT_IMPORT_ROWS,
  StagedClientRow,
  StagedPatientRow,
  validateClientImportRows,
  validatePatientImportRows,
} from '../../utils/masterDataExportImport';

interface MasterDataExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'export' | 'import';
  initialEntity?: 'customers' | 'pets';
  customers: Customer[];
  filteredCustomers: Customer[];
  pets: Pet[];
  filteredPets: Pet[];
  appSettings?: AppSettings;
  onAddCustomer: (
    cust: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'totalSpent' | 'petCount'>
  ) => Promise<Customer>;
  onAddPet: (pet: Omit<Pet, 'id' | 'createdAt'>) => Promise<Pet>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const MasterDataExportImportModal: React.FC<MasterDataExportImportModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'export',
  initialEntity = 'customers',
  customers,
  filteredCustomers,
  pets,
  filteredPets,
  appSettings,
  onAddCustomer,
  onAddPet,
  onSuccessToast,
  onErrorToast,
}) => {
  const [activeMode, setActiveMode] = useState<'export' | 'import'>(initialMode);
  const [targetEntity, setTargetEntity] = useState<'customers' | 'pets' | 'both'>(initialEntity);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');

  // Import state
  const [importEntity, setImportEntity] = useState<'customers' | 'pets'>(initialEntity);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [stagedClients, setStagedClients] = useState<StagedClientRow[]>([]);
  const [stagedPatients, setStagedPatients] = useState<StagedPatientRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{
    entity: 'customers' | 'pets';
    importedCount: number;
    autoCreatedOwnersCount: number;
    skippedCount: number;
    failedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      setTargetEntity(initialEntity);
      setImportEntity(initialEntity);
      setImportSummary(null);
    }
  }, [isOpen, initialMode, initialEntity]);

  if (!isOpen) return null;

  const customersToExport = exportScope === 'filtered' ? filteredCustomers : customers;
  const petsToExport = exportScope === 'filtered' ? filteredPets : pets;
  const scopeLabel =
    exportScope === 'filtered' ? 'Data Hasil Filter Aktif' : 'Seluruh Master Data';

  // ==========================================================================
  // EXPORT HANDLERS
  // ==========================================================================

  const handleExportCSV = () => {
    if (targetEntity === 'customers') {
      exportClientsToCSV(customersToExport, pets);
      onSuccessToast(`${customersToExport.length} data pelanggan berhasil di-export ke CSV!`);
    } else if (targetEntity === 'pets') {
      exportPatientsToCSV(petsToExport, customers);
      onSuccessToast(`${petsToExport.length} data pasien hewan berhasil di-export ke CSV!`);
    } else {
      exportClientsToCSV(customersToExport, pets, 'Backup_Pelanggan_PetCare');
      exportPatientsToCSV(petsToExport, customers, 'Backup_Pasien_Hewan_PetCare');
      onSuccessToast(
        `Paket CSV Pelanggan (${customersToExport.length}) & Pasien (${petsToExport.length}) berhasil diunduh!`
      );
    }
  };

  const handleExportPDF = () => {
    if (targetEntity === 'customers') {
      exportClientsToPDF(customersToExport, pets, appSettings, scopeLabel);
      onSuccessToast(`Laporan PDF Pelanggan (${customersToExport.length} rekam) berhasil diunduh!`);
    } else if (targetEntity === 'pets') {
      exportPatientsToPDF(petsToExport, customers, appSettings, scopeLabel);
      onSuccessToast(`Laporan PDF Pasien Hewan (${petsToExport.length} rekam) berhasil diunduh!`);
    } else {
      exportClientsToPDF(customersToExport, pets, appSettings, scopeLabel);
      exportPatientsToPDF(petsToExport, customers, appSettings, scopeLabel);
      onSuccessToast('Laporan PDF Pelanggan & Pasien Hewan berhasil diunduh!');
    }
  };

  const handleExportExcel = () => {
    exportMasterDataToExcel(targetEntity, customersToExport, petsToExport);
    onSuccessToast('File Excel Workbook (.xlsx) berhasil diunduh!');
  };

  // ==========================================================================
  // IMPORT HANDLERS
  // ==========================================================================

  const processSpreadsheetFile = async (file: File) => {
    try {
      setImportSummary(null);
      setUploadedFileName(file.name);
      const rawRows = await parseUploadedSpreadsheet(file);
      if (!rawRows || rawRows.length === 0) {
        onErrorToast('File kosong atau format kolom tidak terbaca. Gunakan template standar.');
        return;
      }

      if (importEntity === 'customers') {
        const validated = validateClientImportRows(rawRows, customers);
        setStagedClients(validated);
        onSuccessToast(
          `Berhasil memuat ${validated.length} baris data pelanggan dari "${file.name}"`
        );
      } else {
        const validated = validatePatientImportRows(rawRows, customers, pets);
        setStagedPatients(validated);
        onSuccessToast(
          `Berhasil memuat ${validated.length} baris data pasien hewan dari "${file.name}"`
        );
      }
    } catch (err: any) {
      onErrorToast(
        err?.message || 'Gagal membaca file Excel/CSV. Pastikan format .xlsx, .xls, atau .csv valid.'
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSpreadsheetFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleStaging = () => {
    setImportSummary(null);
    if (importEntity === 'customers') {
      setUploadedFileName('Simulasi_Template_Pelanggan_PetCare.xlsx');
      const validated = validateClientImportRows(SAMPLE_CLIENT_IMPORT_ROWS, customers);
      setStagedClients(validated);
      onSuccessToast('Contoh data template pelanggan siap dipratinjau & di-import!');
    } else {
      setUploadedFileName('Simulasi_Template_Pasien_Hewan_PetCare.xlsx');
      const sampleRows = getSamplePatientImportRows(customers);
      const validated = validatePatientImportRows(sampleRows, customers, pets);
      setStagedPatients(validated);
      onSuccessToast('Contoh data template pasien hewan siap dipratinjau & di-import!');
    }
  };

  const revalidateClientRow = (row: StagedClientRow): StagedClientRow => {
    const messages: string[] = [];
    let status: StagedClientRow['status'] = 'valid';
    const normPhone = normalizePhoneDigits(row.phone);

    if (!row.name.trim()) {
      status = 'error';
      messages.push('Nama Lengkap wajib diisi');
    }
    if (!row.phone.trim() || normPhone.length < 8) {
      status = 'error';
      messages.push('No. WhatsApp tidak valid (min. 8 digit)');
    }

    const existingMatch = customers.find(
      (c) =>
        (normPhone && normalizePhoneDigits(c.phone) === normPhone) ||
        (row.nik && c.nik && c.nik.trim() === row.nik.trim()) ||
        c.name.trim().toLowerCase() === row.name.trim().toLowerCase()
    );

    if (status !== 'error' && existingMatch) {
      status = 'duplicate';
      messages.push(`Mirip/duplikat dengan: ${existingMatch.name} (${existingMatch.phone})`);
    }

    if (messages.length === 0) {
      messages.push('Siap didaftarkan ke Master Pelanggan');
    }

    return {
      ...row,
      status,
      messages,
      selected: status === 'error' ? false : row.selected,
    };
  };

  const updateStagedClientField = (
    rowIndex: number,
    patch: Partial<StagedClientRow>
  ) => {
    setStagedClients((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== rowIndex) return r;
        const merged = { ...r, ...patch };
        return revalidateClientRow(merged);
      })
    );
  };

  const revalidatePatientRow = (row: StagedPatientRow): StagedPatientRow => {
    const messages: string[] = [];
    let status: StagedPatientRow['status'] = 'valid';

    if (!row.name.trim()) {
      status = 'error';
      messages.push('Nama Hewan wajib diisi');
    }

    const normOwnerPhone = normalizePhoneDigits(row.ownerIdentifier);
    const matchedCustomer = customers.find(
      (c) =>
        (row.resolvedCustomerId && c.id === row.resolvedCustomerId) ||
        (row.ownerIdentifier && c.id.toLowerCase() === row.ownerIdentifier.toLowerCase()) ||
        (normOwnerPhone.length >= 8 && normalizePhoneDigits(c.phone) === normOwnerPhone) ||
        (row.ownerNameInput && c.name.trim().toLowerCase() === row.ownerNameInput.trim().toLowerCase())
    );

    let resolvedCustomerId = matchedCustomer?.id;
    let resolvedCustomerName = matchedCustomer?.name;
    let willAutoCreateOwner = false;

    if (!matchedCustomer) {
      if (row.ownerNameInput.trim() && normOwnerPhone.length >= 8) {
        willAutoCreateOwner = true;
        resolvedCustomerName = row.ownerNameInput.trim();
        messages.push(`Pemilik baru "${resolvedCustomerName}" (${row.ownerIdentifier}) akan otomatis dibuat`);
      } else {
        status = 'error';
        messages.push('Pilih pemilik terdaftar atau isi Nama Pemilik + No. WA (min. 8 digit)');
      }
    } else {
      messages.push(`Terhubung ke pemilik: ${matchedCustomer.name} (${matchedCustomer.phone})`);
    }

    const duplicatePet = pets.find(
      (p) =>
        matchedCustomer &&
        p.customerId === matchedCustomer.id &&
        p.name.trim().toLowerCase() === row.name.trim().toLowerCase() &&
        p.species === row.species
    );

    if (status !== 'error' && duplicatePet) {
      status = 'duplicate';
      messages.unshift(`Pasien "${duplicatePet.name}" sudah terdaftar pada ${duplicatePet.customerName}`);
    }

    return {
      ...row,
      resolvedCustomerId,
      resolvedCustomerName,
      willAutoCreateOwner,
      status,
      messages,
      selected: status === 'error' ? false : row.selected,
    };
  };

  const updateStagedPatientField = (
    rowIndex: number,
    patch: Partial<StagedPatientRow>
  ) => {
    setStagedPatients((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== rowIndex) return r;
        const merged = { ...r, ...patch };
        return revalidatePatientRow(merged);
      })
    );
  };

  const handleExecuteBulkImport = async () => {
    if (importEntity === 'customers') {
      const selectedRows = stagedClients.filter((r) => r.selected && r.status !== 'error');
      if (selectedRows.length === 0) {
        onErrorToast('Pilih minimal 1 baris data pelanggan yang valid untuk di-import.');
        return;
      }

      setIsImporting(true);
      setImportProgress({ current: 0, total: selectedRows.length });
      let importedCount = 0;
      let failedCount = 0;
      const skippedCount = stagedClients.length - selectedRows.length;

      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i];
        setImportProgress({ current: i + 1, total: selectedRows.length });
        try {
          await onAddCustomer({
            name: row.name.trim(),
            phone: row.phone.trim(),
            email: row.email.trim(),
            address: row.address.trim(),
            nik: row.nik.trim() || undefined,
            gender: row.gender,
            membershipTier: row.membershipTier,
          });
          importedCount++;
        } catch {
          failedCount++;
        }
      }

      setIsImporting(false);
      setImportProgress(null);
      setImportSummary({
        entity: 'customers',
        importedCount,
        autoCreatedOwnersCount: 0,
        skippedCount,
        failedCount,
      });
      setStagedClients([]);
      onSuccessToast(`Import selesai: ${importedCount} pelanggan baru berhasil didaftarkan!`);
    } else {
      const selectedRows = stagedPatients.filter((r) => r.selected && r.status !== 'error');
      if (selectedRows.length === 0) {
        onErrorToast('Pilih minimal 1 baris data pasien hewan yang valid untuk di-import.');
        return;
      }

      setIsImporting(true);
      setImportProgress({ current: 0, total: selectedRows.length });
      let importedCount = 0;
      let autoCreatedOwnersCount = 0;
      let failedCount = 0;
      const skippedCount = stagedPatients.length - selectedRows.length;

      // Cache newly auto-created owners by normalized phone so multiple pets for the same new owner share 1 customer record
      const newlyCreatedOwnersByPhone = new Map<string, Customer>();

      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i];
        setImportProgress({ current: i + 1, total: selectedRows.length });
        try {
          let targetCustomerId = row.resolvedCustomerId;
          let targetCustomerName = row.resolvedCustomerName || row.ownerNameInput || 'Pelanggan';

          if (!targetCustomerId && row.willAutoCreateOwner) {
            const normPhone = normalizePhoneDigits(row.ownerIdentifier);
            const cachedOwner = newlyCreatedOwnersByPhone.get(normPhone);
            if (cachedOwner) {
              targetCustomerId = cachedOwner.id;
              targetCustomerName = cachedOwner.name;
            } else {
              const createdOwner = await onAddCustomer({
                name: row.ownerNameInput.trim(),
                phone: row.ownerIdentifier.trim(),
                email: '',
                address: '',
                gender: 'L',
                membershipTier: 'Silver',
              });
              newlyCreatedOwnersByPhone.set(normPhone, createdOwner);
              targetCustomerId = createdOwner.id;
              targetCustomerName = createdOwner.name;
              autoCreatedOwnersCount++;
            }
          }

          if (!targetCustomerId) {
            failedCount++;
            continue;
          }

          await onAddPet({
            customerId: targetCustomerId,
            customerName: targetCustomerName,
            name: row.name.trim(),
            species: row.species,
            breed: row.breed.trim() || 'Domestik',
            color: row.color.trim() || 'Cokelat',
            gender: row.gender,
            sterilized: row.sterilized,
            birthDate: row.birthDate || '2023-01-01',
            weightKg: Number(row.weightKg) || 3.5,
            microchipNo:
              row.microchipNo.trim() ||
              `MC-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
            allergies: row.allergies.trim() || 'Tidak Ada',
            notes: row.notes.trim(),
            photoUrl:
              row.species === 'Kucing'
                ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600'
                : 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600',
          });
          importedCount++;
        } catch {
          failedCount++;
        }
      }

      setIsImporting(false);
      setImportProgress(null);
      setImportSummary({
        entity: 'pets',
        importedCount,
        autoCreatedOwnersCount,
        skippedCount,
        failedCount,
      });
      setStagedPatients([]);
      onSuccessToast(
        `Import selesai: ${importedCount} pasien hewan${
          autoCreatedOwnersCount > 0 ? ` (+${autoCreatedOwnersCount} pemilik baru)` : ''
        } berhasil terdaftar!`
      );
    }
  };

  const currentStagedList = importEntity === 'customers' ? stagedClients : stagedPatients;
  const validCount = currentStagedList.filter((r) => r.status === 'valid').length;
  const dupCount = currentStagedList.filter((r) => r.status === 'duplicate').length;
  const errCount = currentStagedList.filter((r) => r.status === 'error').length;
  const selectedCount = currentStagedList.filter((r) => r.selected && r.status !== 'error').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A2C]/65 backdrop-blur-xs p-3 sm:p-5 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-2xl border border-[#E1D6BE] bg-[#FFFDF9] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1B2A45] via-[#16233B] to-[#101A2C] border-b border-[#B8905A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A] shrink-0">
              {activeMode === 'export' ? (
                <Download className="w-5 h-5" />
              ) : (
                <FileUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#FFFDF9] tracking-tight">
                Pusat Bulk Export (CSV / PDF) &amp; Import Excel Master Data
              </h2>
              <p className="text-xs text-[#D9B98A]/90">
                Ekspor rekam Pelanggan &amp; Pasien Hewan untuk pelaporan/backup, atau unggah template Excel standar untuk registrasi massal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-[#101A2C] p-1 border border-[#B8905A]/30">
              <button
                type="button"
                onClick={() => setActiveMode('export')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'export'
                    ? 'bg-[#B8905A] text-[#101A2C] shadow-xs'
                    : 'text-[#EDE6D6]/80 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bulk Export (CSV / PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('import')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'import'
                    ? 'bg-[#B8905A] text-[#101A2C] shadow-xs'
                    : 'text-[#EDE6D6]/80 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Data (Excel / CSV)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#101A2C]/80 hover:bg-rose-500/20 text-[#EDE6D6] hover:text-rose-300 border border-[#B8905A]/30 flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeMode === 'export' ? (
            <>
              {/* Step 1: Select Dataset & Scope */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-[#E1D6BE] bg-[#F6F1E6]/45 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B2A45]">
                      1. Pilih Dataset Master yang Akan Di-Export
                    </span>
                    <span className="text-[11px] font-semibold text-[#6B6656]">
                      Mendukung CSV, PDF Resmi &amp; Excel
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTargetEntity('customers')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        targetEntity === 'customers'
                          ? 'border-[#1B2A45] bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                          : 'border-[#E1D6BE] bg-white text-[#1B2A45] hover:border-[#B8905A]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Users className="w-4 h-4 text-[#B8905A]" />
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#B8905A]/20 text-[#B8905A]">
                          {customersToExport.length} Klien
                        </span>
                      </div>
                      <p className="text-xs font-bold">Data Pelanggan (Clients)</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          targetEntity === 'customers' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'
                        }`}
                      >
                        Kontak WA, NIK, Tier, Poin &amp; Total Transaksi
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetEntity('pets')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        targetEntity === 'pets'
                          ? 'border-[#1B2A45] bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                          : 'border-[#E1D6BE] bg-white text-[#1B2A45] hover:border-[#B8905A]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Dog className="w-4 h-4 text-[#B8905A]" />
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#B8905A]/20 text-[#B8905A]">
                          {petsToExport.length} Pasien
                        </span>
                      </div>
                      <p className="text-xs font-bold">Pasien Hewan (Patients)</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          targetEntity === 'pets' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'
                        }`}
                      >
                        Spesies, Ras, Microchip, Alergi, Steril &amp; Pemilik
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetEntity('both')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        targetEntity === 'both'
                          ? 'border-[#1B2A45] bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                          : 'border-[#E1D6BE] bg-white text-[#1B2A45] hover:border-[#B8905A]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-[#B8905A]" />
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#B8905A]/20 text-[#B8905A]">
                          {customersToExport.length + petsToExport.length} Rekam
                        </span>
                      </div>
                      <p className="text-xs font-bold">Paket Backup Lengkap</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          targetEntity === 'both' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'
                        }`}
                      >
                        Unduh Klien &amp; Pasien sekaligus untuk arsip penuh
                      </p>
                    </button>
                  </div>
                </div>

                {/* Scope selector */}
                <div className="rounded-xl border border-[#E1D6BE] bg-[#F6F1E6]/45 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B2A45] block mb-2">
                      2. Cakupan Rekam Data
                    </span>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#E1D6BE] bg-white cursor-pointer hover:border-[#1B2A45]">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="exportScope"
                            checked={exportScope === 'all'}
                            onChange={() => setExportScope('all')}
                            className="accent-[#1B2A45]"
                          />
                          <div>
                            <p className="text-xs font-bold text-[#1B2A45]">Semua Rekam Master</p>
                            <p className="text-[11px] text-[#6B6656]">
                              {customers.length} Klien &bull; {pets.length} Pasien
                            </p>
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#E1D6BE] bg-white cursor-pointer hover:border-[#1B2A45]">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="exportScope"
                            checked={exportScope === 'filtered'}
                            onChange={() => setExportScope('filtered')}
                            className="accent-[#1B2A45]"
                          />
                          <div>
                            <p className="text-xs font-bold text-[#1B2A45]">Sesuai Filter Pencarian Aktif</p>
                            <p className="text-[11px] text-[#6B6656]">
                              {filteredCustomers.length} Klien &bull; {filteredPets.length} Pasien
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Format Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CSV Card */}
                <div className="rounded-xl border border-[#E1D6BE] bg-white p-4 flex flex-col justify-between shadow-2xs hover:border-[#B8905A] transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold">
                        FORMAT CSV (.CSV)
                      </span>
                      <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                    </div>
                    <h3 className="text-sm font-extrabold text-[#1B2A45]">
                      Export Tabel CSV (UTF-8 BOM)
                    </h3>
                    <p className="text-xs text-[#6B6656] leading-relaxed">
                      Format teks terpisah koma standar industri untuk backup database cepat, migrasi data, atau diolah di Microsoft Excel &amp; Google Sheets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File CSV Sekarang</span>
                  </button>
                </div>

                {/* PDF Card */}
                <div className="rounded-xl border border-[#E1D6BE] bg-white p-4 flex flex-col justify-between shadow-2xs hover:border-[#B8905A] transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-extrabold">
                        LAPORAN RESMI (.PDF)
                      </span>
                      <FileText className="w-5 h-5 text-rose-700" />
                    </div>
                    <h3 className="text-sm font-extrabold text-[#1B2A45]">
                      Export Laporan Resmi PDF
                    </h3>
                    <p className="text-xs text-[#6B6656] leading-relaxed">
                      Dokumen A4 Landscape siap cetak dengan Kop Surat Klinik, kartu ringkasan KPI eksekutif, tabel terformat rapi, serta penomoran halaman resmi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#D9B98A]" />
                    <span>Unduh Laporan PDF Resmi</span>
                  </button>
                </div>

                {/* Excel (.xlsx) Card */}
                <div className="rounded-xl border border-[#E1D6BE] bg-white p-4 flex flex-col justify-between shadow-2xs hover:border-[#B8905A] transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-extrabold">
                        EXCEL WORKBOOK (.XLSX)
                      </span>
                      <FileSpreadsheet className="w-5 h-5 text-[#B8905A]" />
                    </div>
                    <h3 className="text-sm font-extrabold text-[#1B2A45]">
                      Export Excel Workbook (.xlsx)
                    </h3>
                    <p className="text-xs text-[#6B6656] leading-relaxed">
                      File spreadsheet asli Microsoft Excel dengan lebar kolom otomatis dan pemisahan sheet `Data_Pelanggan` serta `Data_Pasien_Hewan`.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-105 text-[#101A2C] text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Preview Table of Export Data */}
              <div className="rounded-xl border border-[#E1D6BE] bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F6F1E6] border-b border-[#E1D6BE] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1B2A45]">
                    Pratinjau Data yang Akan Di-Export (Menampilkan 5 Baris Pertama)
                  </span>
                  <span className="text-[11px] font-semibold text-[#6B6656]">
                    {targetEntity === 'pets'
                      ? `${petsToExport.length} Pasien Hewan`
                      : `${customersToExport.length} Pelanggan`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  {targetEntity === 'pets' ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FFFDF9] border-b border-[#E1D6BE] text-[#6B6656]">
                          <th className="py-2 px-3 font-bold">Nama Hewan</th>
                          <th className="py-2 px-3 font-bold">Spesies / Ras</th>
                          <th className="py-2 px-3 font-bold">Gender &amp; Berat</th>
                          <th className="py-2 px-3 font-bold">Microchip</th>
                          <th className="py-2 px-3 font-bold">Alergi</th>
                          <th className="py-2 px-3 font-bold">Pemilik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1D6BE]/60">
                        {petsToExport.slice(0, 5).map((p) => (
                          <tr key={p.id} className="hover:bg-[#F6F1E6]/40">
                            <td className="py-2 px-3 font-bold text-[#1B2A45]">{p.name}</td>
                            <td className="py-2 px-3 text-[#1B2A45]">
                              {p.species} &bull; {p.breed}
                            </td>
                            <td className="py-2 px-3 text-[#6B6656]">
                              {p.gender} ({p.weightKg} kg)
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#6B6656]">
                              {p.microchipNo || '-'}
                            </td>
                            <td className="py-2 px-3 text-rose-700 font-semibold">
                              {p.allergies || 'Tidak Ada'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#1B2A45]">
                              {p.customerName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FFFDF9] border-b border-[#E1D6BE] text-[#6B6656]">
                          <th className="py-2 px-3 font-bold">Nama Pelanggan</th>
                          <th className="py-2 px-3 font-bold">No. WhatsApp</th>
                          <th className="py-2 px-3 font-bold">Email</th>
                          <th className="py-2 px-3 font-bold">Tier</th>
                          <th className="py-2 px-3 font-bold">Jumlah Hewan</th>
                          <th className="py-2 px-3 font-bold">Total Transaksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1D6BE]/60">
                        {customersToExport.slice(0, 5).map((c) => {
                          const petList = pets.filter((p) => p.customerId === c.id);
                          return (
                            <tr key={c.id} className="hover:bg-[#F6F1E6]/40">
                              <td className="py-2 px-3 font-bold text-[#1B2A45]">{c.name}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-[#1B2A45]">
                                {c.phone}
                              </td>
                              <td className="py-2 px-3 text-[#6B6656]">{c.email || '-'}</td>
                              <td className="py-2 px-3 font-semibold text-[#B8905A]">
                                {c.membershipTier}
                              </td>
                              <td className="py-2 px-3 text-[#1B2A45]">
                                {petList.length || c.petCount || 0} ekor
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-[#1B2A45]">
                                Rp {(c.totalSpent || 0).toLocaleString('id-ID')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ================================================================
               IMPORT MODE: STANDARDIZED EXCEL / CSV BULK REGISTRATION
               ================================================================ */
            <div className="space-y-5">
              {/* Target Entity Selector + Template Download Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 rounded-xl border border-[#E1D6BE] bg-[#F6F1E6]/50 p-4 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B2A45] block">
                    1. Pilih Jenis Data yang Akan Di-Import
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setImportEntity('customers');
                        setImportSummary(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        importEntity === 'customers'
                          ? 'border-[#1B2A45] bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                          : 'border-[#E1D6BE] bg-white text-[#1B2A45] hover:border-[#B8905A]'
                      }`}
                    >
                      <Users className="w-4 h-4 text-[#B8905A] mb-1" />
                      <p className="text-xs font-bold">Pelanggan (Clients)</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          importEntity === 'customers' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'
                        }`}
                      >
                        Registrasi massal pemilik hewan
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImportEntity('pets');
                        setImportSummary(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        importEntity === 'pets'
                          ? 'border-[#1B2A45] bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                          : 'border-[#E1D6BE] bg-white text-[#1B2A45] hover:border-[#B8905A]'
                      }`}
                    >
                      <Dog className="w-4 h-4 text-[#B8905A] mb-1" />
                      <p className="text-xs font-bold">Pasien Hewan (Patients)</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          importEntity === 'pets' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'
                        }`}
                      >
                        Registrasi massal pasien &amp; tautan pemilik
                      </p>
                    </button>
                  </div>
                </div>

                {/* Step 2: Standardized Template Download */}
                <div className="lg:col-span-7 rounded-xl border border-[#E1D6BE] bg-[#F6F1E6]/50 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B2A45]">
                        2. Unduh Template Excel Standar ({importEntity === 'customers' ? 'Pelanggan' : 'Pasien Hewan'})
                      </span>
                      <span className="text-[11px] font-semibold text-[#B8905A]">
                        Dilengkapi Sheet Panduan &amp; Contoh Pengisian
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6656] mt-1">
                      {importEntity === 'customers'
                        ? 'Kolom standar: Nama Lengkap *, No WhatsApp *, Email, NIK, Gender (L/P), Membership Tier, Alamat Lengkap.'
                        : 'Kolom standar: Nama Hewan *, Spesies *, Ras/Breed *, Gender *, Warna, Tgl Lahir, Berat (kg), Steril, Microchip, Alergi, No WA Pemilik *, Nama Pemilik *.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        importEntity === 'customers'
                          ? downloadClientImportTemplate('xlsx')
                          : downloadPatientImportTemplate('xlsx', customers)
                      }
                      className="px-3.5 py-2 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[#D9B98A]" />
                      <span>Unduh Template Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        importEntity === 'customers'
                          ? downloadClientImportTemplate('csv')
                          : downloadPatientImportTemplate('csv', customers)
                      }
                      className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>Template CSV (.csv)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadSampleStaging}
                      className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Muat Contoh Data Siap Import</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: File Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) await processSpreadsheetFile(file);
                }}
                className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                  isDragging
                    ? 'border-[#B8905A] bg-[#B8905A]/10'
                    : 'border-[#E1D6BE] bg-white hover:border-[#B8905A]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F6F1E6] border border-[#E1D6BE] flex items-center justify-center text-[#1B2A45] shrink-0">
                    <Upload className="w-6 h-6 text-[#B8905A]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-[#1B2A45]">
                      Unggah File Excel (.xlsx, .xls) atau CSV (.csv) yang Telah Diisi
                    </p>
                    <p className="text-xs text-[#6B6656] mt-0.5">
                      Tarik &amp; lepaskan file ke area ini, atau klik tombol Pilih File untuk memvalidasi baris sebelum disimpan ke database.
                    </p>
                    {uploadedFileName && (
                      <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>File aktif: {uploadedFileName}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-105 text-[#101A2C] text-xs font-extrabold shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    Pilih File Excel / CSV
                  </button>
                </div>
              </div>

              {/* Import Completion Banner */}
              {importSummary && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-950">
                        Proses Bulk Import Selesai!
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Berhasil mendaftarkan{' '}
                        <span className="font-bold">
                          {importSummary.importedCount}{' '}
                          {importSummary.entity === 'customers' ? 'pelanggan baru' : 'pasien hewan baru'}
                        </span>
                        {importSummary.autoCreatedOwnersCount > 0 &&
                          ` serta membuat otomatis ${importSummary.autoCreatedOwnersCount} profil pemilik baru`}
                        .{' '}
                        {importSummary.skippedCount > 0 &&
                          `(${importSummary.skippedCount} baris dilewati)`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportSummary(null)}
                    className="text-xs font-bold text-emerald-900 underline cursor-pointer"
                  >
                    Tutup Ringkasan
                  </button>
                </div>
              )}

              {/* Staging & Validation Table */}
              {currentStagedList.length > 0 && (
                <div className="rounded-xl border border-[#E1D6BE] bg-white overflow-hidden space-y-0">
                  {/* Validation Summary Bar */}
                  <div className="px-4 py-3 bg-[#F6F1E6] border-b border-[#E1D6BE] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1B2A45]">
                        Pratinjau &amp; Validasi Pra-Import ({currentStagedList.length} Baris)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {validCount} Valid
                      </span>
                      {dupCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                          {dupCount} Duplikat Terdeteksi
                        </span>
                      )}
                      {errCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                          {errCount} Perlu Perbaikan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (importEntity === 'customers') {
                            setStagedClients((prev) =>
                              prev.map((r) => ({ ...r, selected: r.status === 'valid' }))
                            );
                          } else {
                            setStagedPatients((prev) =>
                              prev.map((r) => ({ ...r, selected: r.status === 'valid' }))
                            );
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E1D6BE] hover:border-[#1B2A45] text-[11px] font-bold text-[#1B2A45] cursor-pointer"
                      >
                        Pilih Hanya yang Valid ({validCount})
                      </button>

                      {dupCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (importEntity === 'customers') {
                              setStagedClients((prev) =>
                                prev.map((r) => ({ ...r, selected: r.status !== 'error' }))
                              );
                            } else {
                              setStagedPatients((prev) =>
                                prev.map((r) => ({ ...r, selected: r.status !== 'error' }))
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-900 cursor-pointer"
                        >
                          Sertakan Duplikat
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setStagedClients([]);
                          setStagedPatients([]);
                          setUploadedFileName('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Staging Rows */}
                  <div className="overflow-x-auto max-h-80">
                    {importEntity === 'customers' ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-[#FFFDF9] border-b border-[#E1D6BE] text-[#6B6656] z-10">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                            <th className="py-2.5 px-3">Nama Lengkap *</th>
                            <th className="py-2.5 px-3">No. WhatsApp *</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Tier</th>
                            <th className="py-2.5 px-3">Alamat</th>
                            <th className="py-2.5 px-3">Status Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E1D6BE]/60">
                          {stagedClients.map((row) => (
                            <tr
                              key={row.rowIndex}
                              className={
                                row.status === 'error'
                                  ? 'bg-rose-50/40'
                                  : row.status === 'duplicate'
                                  ? 'bg-amber-50/40'
                                  : 'hover:bg-[#F6F1E6]/40'
                              }
                            >
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={row.status === 'error'}
                                  onClick={() =>
                                    updateStagedClientField(row.rowIndex, {
                                      selected: !row.selected,
                                    })
                                  }
                                  className="text-[#1B2A45] disabled:opacity-30 cursor-pointer"
                                >
                                  {row.selected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#6B6656]" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) =>
                                    updateStagedClientField(row.rowIndex, { name: e.target.value })
                                  }
                                  className="w-full min-w-[140px] px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs font-bold text-[#1B2A45]"
                                  placeholder="Nama wajib diisi"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.phone}
                                  onChange={(e) =>
                                    updateStagedClientField(row.rowIndex, { phone: e.target.value })
                                  }
                                  className="w-full min-w-[120px] px-2 py-1 rounded border border-[#E1D6BE] bg-white font-mono text-xs text-[#1B2A45]"
                                  placeholder="0812..."
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.email}
                                  onChange={(e) =>
                                    updateStagedClientField(row.rowIndex, { email: e.target.value })
                                  }
                                  className="w-full min-w-[140px] px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                  placeholder="email@domain.com"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={row.membershipTier}
                                  onChange={(e) =>
                                    updateStagedClientField(row.rowIndex, {
                                      membershipTier: e.target.value as MembershipTier,
                                    })
                                  }
                                  className="px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs font-semibold text-[#1B2A45]"
                                >
                                  <option value="Silver">Silver</option>
                                  <option value="Gold">Gold</option>
                                  <option value="Platinum">Platinum</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.address}
                                  onChange={(e) =>
                                    updateStagedClientField(row.rowIndex, {
                                      address: e.target.value,
                                    })
                                  }
                                  className="w-full min-w-[160px] px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  {row.status === 'valid' && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                      Siap Import
                                    </span>
                                  )}
                                  {row.status === 'duplicate' && (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                                      Duplikat
                                    </span>
                                  )}
                                  {row.status === 'error' && (
                                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                                      Error
                                    </span>
                                  )}
                                  <span className="text-[11px] text-[#6B6656]">
                                    {row.messages.join(' • ')}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-[#FFFDF9] border-b border-[#E1D6BE] text-[#6B6656] z-10">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                            <th className="py-2.5 px-3">Nama Hewan *</th>
                            <th className="py-2.5 px-3">Spesies &amp; Ras</th>
                            <th className="py-2.5 px-3">Gender / Berat</th>
                            <th className="py-2.5 px-3">Alergi</th>
                            <th className="py-2.5 px-3">Pemilik (Tautan / Auto-Create) *</th>
                            <th className="py-2.5 px-3">Status Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E1D6BE]/60">
                          {stagedPatients.map((row) => (
                            <tr
                              key={row.rowIndex}
                              className={
                                row.status === 'error'
                                  ? 'bg-rose-50/40'
                                  : row.status === 'duplicate'
                                  ? 'bg-amber-50/40'
                                  : 'hover:bg-[#F6F1E6]/40'
                              }
                            >
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={row.status === 'error'}
                                  onClick={() =>
                                    updateStagedPatientField(row.rowIndex, {
                                      selected: !row.selected,
                                    })
                                  }
                                  className="text-[#1B2A45] disabled:opacity-30 cursor-pointer"
                                >
                                  {row.selected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#6B6656]" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) =>
                                    updateStagedPatientField(row.rowIndex, { name: e.target.value })
                                  }
                                  className="w-full min-w-[110px] px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs font-bold text-[#1B2A45]"
                                  placeholder="Nama Hewan"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={row.species}
                                    onChange={(e) =>
                                      updateStagedPatientField(row.rowIndex, {
                                        species: e.target.value as Pet['species'],
                                      })
                                    }
                                    className="px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs font-semibold text-[#1B2A45]"
                                  >
                                    <option value="Anjing">Anjing</option>
                                    <option value="Kucing">Kucing</option>
                                    <option value="Kelinci">Kelinci</option>
                                    <option value="Burung">Burung</option>
                                    <option value="Reptil">Reptil</option>
                                    <option value="Lainnya">Lainnya</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={row.breed}
                                    onChange={(e) =>
                                      updateStagedPatientField(row.rowIndex, {
                                        breed: e.target.value,
                                      })
                                    }
                                    className="w-28 px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                    placeholder="Ras"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={row.gender}
                                    onChange={(e) =>
                                      updateStagedPatientField(row.rowIndex, {
                                        gender: e.target.value as 'Jantan' | 'Betina',
                                      })
                                    }
                                    className="px-1.5 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                  >
                                    <option value="Jantan">Jantan</option>
                                    <option value="Betina">Betina</option>
                                  </select>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.weightKg}
                                    onChange={(e) =>
                                      updateStagedPatientField(row.rowIndex, {
                                        weightKg: parseFloat(e.target.value) || 1,
                                      })
                                    }
                                    className="w-16 px-1.5 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.allergies}
                                  onChange={(e) =>
                                    updateStagedPatientField(row.rowIndex, {
                                      allergies: e.target.value,
                                    })
                                  }
                                  className="w-32 px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs text-[#1B2A45]"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={row.resolvedCustomerId || ''}
                                  onChange={(e) => {
                                    const chosen = customers.find((c) => c.id === e.target.value);
                                    if (chosen) {
                                      updateStagedPatientField(row.rowIndex, {
                                        resolvedCustomerId: chosen.id,
                                        resolvedCustomerName: chosen.name,
                                        ownerIdentifier: chosen.phone,
                                        ownerNameInput: chosen.name,
                                      });
                                    }
                                  }}
                                  className="w-full min-w-[170px] px-2 py-1 rounded border border-[#E1D6BE] bg-white text-xs font-semibold text-[#1B2A45]"
                                >
                                  <option value="">
                                    {row.willAutoCreateOwner
                                      ? `+ Pemilik Baru: ${row.ownerNameInput} (${row.ownerIdentifier})`
                                      : '-- Pilih Pemilik Terdaftar --'}
                                  </option>
                                  {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.phone})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  {row.status === 'valid' && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] whitespace-nowrap">
                                      {row.willAutoCreateOwner ? 'Siap (+Klien Baru)' : 'Siap Import'}
                                    </span>
                                  )}
                                  {row.status === 'duplicate' && (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                                      Duplikat
                                    </span>
                                  )}
                                  {row.status === 'error' && (
                                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                                      Error
                                    </span>
                                  )}
                                  <span className="text-[11px] text-[#6B6656]">
                                    {row.messages[0]}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Footer Execute Bar */}
                  <div className="px-4 py-3 bg-[#FFFDF9] border-t border-[#E1D6BE] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-[#6B6656] flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#B8905A] shrink-0" />
                      <span>
                        Anda dapat mengedit sel langsung di tabel di atas sebelum menekan tombol Proses Import Massal.
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isImporting || selectedCount === 0}
                      onClick={handleExecuteBulkImport}
                      className="px-5 py-2.5 rounded-xl bg-[#1B2A45] hover:bg-[#101A2C] disabled:opacity-50 text-[#FFFDF9] text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#D9B98A]" />
                          <span>
                            Memproses ({importProgress?.current}/{importProgress?.total})...
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" />
                          <span>
                            Proses Import Massal ({selectedCount}{' '}
                            {importEntity === 'customers' ? 'Pelanggan' : 'Pasien Hewan'})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
