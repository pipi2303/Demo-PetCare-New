import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Customer, Pet, Employee, Supplier, ServiceItem, MembershipTier } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { TriageUrgencyBadge } from '../clinic/TriageUrgencyBadge';
import { TriageUrgencyModal } from '../clinic/TriageUrgencyModal';
import { computeClientTriageUrgency } from '../../utils/aiTriageUrgency';
import {
  Users,
  Dog,
  Database,
  Search,
  Plus,
  Edit3,
  Trash2,
  Phone,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  Award,
  Filter,
  CheckCircle2,
  X,
  Briefcase,
  Truck,
  DollarSign,
  Download,
  AlertTriangle,
  Clock,
  UserCheck
} from 'lucide-react';

export const MasterDataModule: React.FC = () => {
  const {
    customers = [],
    addCustomer,
    updateCustomer,
    deleteCustomer,
    pets = [],
    addPet,
    updatePet,
    deletePet,
    services = [],
    addService,
    updateService,
    deleteService,
    employees = [],
    addEmployee,
    updateEmployee,
    deleteEmployee,
    suppliers = [],
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clinicVisits = [],
    soapNotes = []
  } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'customers' | 'pets' | 'services' | 'staff' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [triageFilter, setTriageFilter] = useState<string>('All');
  const [serviceCatFilter, setServiceCatFilter] = useState<string>('All');

  // Modals visibility
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [selectedPetForPassport, setSelectedPetForPassport] = useState<Pet | null>(null);
  const [selectedPetForTriageModal, setSelectedPetForTriageModal] = useState<{
    pet: Pet;
    clinicVisit?: any;
    soapNote?: any;
  } | null>(null);

  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Forms state
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nik: '',
    gender: 'L' as 'L' | 'P',
    membershipTier: 'Silver' as MembershipTier,
  });

  const [petForm, setPetForm] = useState({
    customerId: customers[0]?.id || '',
    name: '',
    species: 'Anjing' as const,
    breed: 'Golden Retriever',
    color: 'Cokelat',
    gender: 'Jantan' as const,
    birthDate: '2023-01-01',
    weightKg: 10,
    microchipNo: '',
    allergies: '',
    notes: ''
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'Konsultasi' as ServiceItem['category'],
    estimatedDurationMins: 30,
    price: 150000,
    description: '',
    isActive: true
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'Dokter Hewan',
    department: 'Medis',
    phone: '',
    email: '',
    hireDate: new Date().toISOString().substring(0, 10),
    sipNumber: '',
    baseSalary: 5000000,
    commissionRatePercent: 5,
    status: 'Aktif' as const
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    category: 'Makanan & Nutrisi'
  });

  // Export handlers
  const handleExportCustomersCSV = () => {
    const headers = ['ID', 'Nama', 'Telepon/WA', 'Email', 'Tier', 'Poin', 'Total Transaksi', 'Jumlah Hewan'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      c.phone,
      c.email,
      c.membershipTier,
      c.loyaltyPoints,
      c.totalSpent,
      c.petCount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Database_Pelanggan_PetCare_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Data Pelanggan berhasil di-export ke CSV!', 'success');
  };

  // Customer submit
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) {
      addToast('Nama dan No WhatsApp Wajib Diisi!', 'error');
      return;
    }
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerForm);
      addToast(`Data pelanggan ${customerForm.name} berhasil diperbarui!`, 'success');
      setEditingCustomer(null);
    } else {
      addCustomer(customerForm);
      addToast(`Pelanggan baru ${customerForm.name} berhasil ditambahkan!`, 'success');
    }
    setShowAddCustomerModal(false);
    resetCustomerForm();
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      nik: '',
      gender: 'L',
      membershipTier: 'Silver'
    });
  };

  const startEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      nik: c.nik || '',
      gender: c.gender || 'L',
      membershipTier: c.membershipTier
    });
    setShowAddCustomerModal(true);
  };

  const handleDeleteCustomer = (c: Customer) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan ${c.name}? Data hewan peliharaan terkait juga akan terpengaruh.`)) {
      deleteCustomer(c.id);
      addToast(`Pelanggan ${c.name} telah dihapus!`, 'success');
    }
  };

  // Pet submit
  const handleSavePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petForm.name || !petForm.customerId) {
      addToast('Nama Hewan dan Pemilik Wajib Dipilih!', 'error');
      return;
    }
    const owner = customers.find((c) => c.id === petForm.customerId);
    const microchipVal = petForm.microchipNo.trim() || `MC-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    if (editingPet) {
      updatePet(editingPet.id, {
        ...petForm,
        customerName: owner?.name || 'Pelanggan',
        microchipNo: microchipVal
      });
      addToast(`Data hewan ${petForm.name} berhasil diperbarui!`, 'success');
      setEditingPet(null);
    } else {
      addPet({
        customerId: petForm.customerId,
        customerName: owner?.name || 'Pelanggan',
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed,
        color: petForm.color,
        gender: petForm.gender,
        sterilized: true,
        birthDate: petForm.birthDate,
        weightKg: Number(petForm.weightKg),
        microchipNo: microchipVal,
        allergies: petForm.allergies,
        notes: petForm.notes,
        photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600'
      });
      addToast(`Pasien hewan ${petForm.name} berhasil terdaftar!`, 'success');
    }
    setShowAddPetModal(false);
    resetPetForm();
  };

  const resetPetForm = () => {
    setPetForm({
      customerId: customers[0]?.id || '',
      name: '',
      species: 'Anjing',
      breed: 'Golden Retriever',
      color: 'Cokelat',
      gender: 'Jantan',
      birthDate: '2023-01-01',
      weightKg: 10,
      microchipNo: '',
      allergies: '',
      notes: ''
    });
  };

  const startEditPet = (p: Pet) => {
    setEditingPet(p);
    setPetForm({
      customerId: p.customerId,
      name: p.name,
      species: p.species as any,
      breed: p.breed,
      color: p.color || 'Cokelat',
      gender: p.gender,
      birthDate: p.birthDate || '2023-01-01',
      weightKg: p.weightKg,
      microchipNo: p.microchipNo,
      allergies: p.allergies || '',
      notes: p.notes || ''
    });
    setShowAddPetModal(true);
  };

  const handleDeletePet = (p: Pet) => {
    if (window.confirm(`Hapus pasien hewan ${p.name}?`)) {
      deletePet(p.id);
      addToast(`Pasien hewan ${p.name} dihapus!`, 'success');
    }
  };

  // Service submit
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || serviceForm.price <= 0) {
      addToast('Nama Layanan dan Tarif Wajib Valid!', 'error');
      return;
    }
    if (editingService) {
      updateService(editingService.id, serviceForm);
      addToast(`Layanan ${serviceForm.name} diperbarui!`, 'success');
      setEditingService(null);
    } else {
      addService(serviceForm);
      addToast(`Layanan baru ${serviceForm.name} ditambahkan!`, 'success');
    }
    setShowAddServiceModal(false);
    resetServiceForm();
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      category: 'Konsultasi',
      estimatedDurationMins: 30,
      price: 150000,
      description: '',
      isActive: true
    });
  };

  const startEditService = (s: ServiceItem) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      category: s.category,
      estimatedDurationMins: s.estimatedDurationMins,
      price: s.price,
      description: s.description || '',
      isActive: s.isActive
    });
    setShowAddServiceModal(true);
  };

  // Staff submit
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.phone) {
      addToast('Nama dan Telepon Staff Wajib Diisi!', 'error');
      return;
    }
    if (editingStaff) {
      updateEmployee(editingStaff.id, staffForm);
      addToast(`Data staff ${staffForm.name} berhasil diperbarui!`, 'success');
      setEditingStaff(null);
    } else {
      addEmployee(staffForm);
      addToast(`Staff baru ${staffForm.name} berhasil ditambahkan!`, 'success');
    }
    setShowAddStaffModal(false);
    resetStaffForm();
  };

  const resetStaffForm = () => {
    setStaffForm({
      name: '',
      role: 'Dokter Hewan',
      department: 'Medis',
      phone: '',
      email: '',
      hireDate: new Date().toISOString().substring(0, 10),
      sipNumber: '',
      baseSalary: 5000000,
      commissionRatePercent: 5,
      status: 'Aktif'
    });
  };

  const startEditStaff = (emp: Employee) => {
    setEditingStaff(emp);
    setStaffForm({
      name: emp.name,
      role: emp.role,
      department: emp.department,
      phone: emp.phone,
      email: emp.email || '',
      hireDate: emp.hireDate || new Date().toISOString().substring(0, 10),
      sipNumber: emp.sipNumber || '',
      baseSalary: emp.baseSalary,
      commissionRatePercent: emp.commissionRatePercent,
      status: emp.status
    });
    setShowAddStaffModal(true);
  };

  // Supplier submit
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) {
      addToast('Nama Supplier dan Nomor Telepon Wajib Diisi!', 'error');
      return;
    }
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
      addToast(`Supplier ${supplierForm.name} diperbarui!`, 'success');
      setEditingSupplier(null);
    } else {
      addSupplier(supplierForm);
      addToast(`Supplier baru ${supplierForm.name} ditambahkan!`, 'success');
    }
    setShowAddSupplierModal(false);
    resetSupplierForm();
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      category: 'Makanan & Nutrisi'
    });
  };

  const startEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email || '',
      address: sup.address || '',
      category: sup.category
    });
    setShowAddSupplierModal(true);
  };

  // Helper to get triage result for any pet
  const getPetTriage = (p: Pet) => {
    const visit = clinicVisits.find((v) => v.petId === p.id);
    const soap = soapNotes.find((s) => s.petId === p.id || (visit && s.visitId === visit.id));
    return {
      triage: computeClientTriageUrgency(p, visit, soap),
      visit,
      soap
    };
  };

  const petTriageMap = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof getPetTriage>>();
    pets.forEach((p) => {
      map.set(p.id, getPetTriage(p));
    });
    return map;
  }, [pets, clinicVisits, soapNotes]);

  const triageCounts = React.useMemo(() => {
    const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };
    petTriageMap.forEach(({ triage }) => {
      if (counts[triage.level] !== undefined) {
        counts[triage.level]++;
      }
    });
    return counts;
  }, [petTriageMap]);

  // Filters
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesTier = tierFilter === 'All' || c.membershipTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const filteredPets = pets.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.microchipNo.includes(searchTerm);
    const matchesSpecies = speciesFilter === 'All' || p.species === speciesFilter;
    const triageData = petTriageMap.get(p.id);
    const matchesTriage = triageFilter === 'All' || triageData?.triage.level === triageFilter;
    return matchesSearch && matchesSpecies && matchesTriage;
  });

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = serviceCatFilter === 'All' || s.category === serviceCatFilter;
    return matchesSearch && matchesCat;
  });

  const filteredStaff = employees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.phone.includes(searchTerm)
  );

  const filteredSuppliers = suppliers.filter((sup) =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Database}
        title="Master Data Operations Center"
        description="Database Terpusat: Pelanggan, Pasien Microchip, Katalog Tarif Layanan, Dokter/Staff & Pemasok."
        badges={[
          { label: 'Master Data Terpadu', variant: 'gold' },
          { label: `${customers.length} Pelanggan`, variant: 'blue' },
          { label: `${pets.length} Pasien`, variant: 'purple' },
          { label: `${services.length} Tarif Layanan`, variant: 'emerald' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'customers' && (
              <>
                <button
                  onClick={handleExportCustomersCSV}
                  className="px-3 py-1.5 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    resetCustomerForm();
                    setShowAddCustomerModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Pelanggan
                </button>
              </>
            )}

            {activeTab === 'pets' && (
              <button
                onClick={() => {
                  setEditingPet(null);
                  resetPetForm();
                  setShowAddPetModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Registrasi Pasien
              </button>
            )}

            {activeTab === 'services' && (
              <button
                onClick={() => {
                  setEditingService(null);
                  resetServiceForm();
                  setShowAddServiceModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Layanan
              </button>
            )}

            {activeTab === 'staff' && (
              <button
                onClick={() => {
                  setEditingStaff(null);
                  resetStaffForm();
                  setShowAddStaffModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Dokter/Staff
              </button>
            )}

            {activeTab === 'suppliers' && (
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  resetSupplierForm();
                  setShowAddSupplierModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Supplier
              </button>
            )}
          </div>
        }
        tabs={[
          { id: 'customers', label: 'Data Pelanggan', icon: Users, count: (customers || []).length },
          { id: 'pets', label: 'Pasien Hewan', icon: Dog, count: (pets || []).length },
          { id: 'services', label: 'Katalog Layanan', icon: Briefcase, count: (services || []).length },
          { id: 'staff', label: 'Dokter & Staff', icon: UserCheck, count: (employees || []).length },
          { id: 'suppliers', label: 'Pemasok / Supplier', icon: Truck, count: (suppliers || []).length }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Search & Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#1B2A45] absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata kunci: nama, no. telepon, microchip, NIK, dsb..."
            className="w-full bg-white border border-[#E1D6BE] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#1B2A45] focus:outline-none focus:border-[#1B2A45] shadow-xs font-medium"
          />
        </div>

        {activeTab === 'customers' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#1B2A45]">Filter Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs text-[#1B2A45] font-semibold focus:outline-none"
            >
              <option value="All">Semua Tier</option>
              <option value="Platinum">Platinum</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
            </select>
          </div>
        )}

        {activeTab === 'pets' && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1B2A45]">Spesies:</span>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="bg-white border border-[#E1D6BE] rounded-lg px-2.5 py-2 text-xs text-[#1B2A45] font-semibold focus:outline-none"
              >
                <option value="All">Semua Spesies</option>
                <option value="Anjing">Anjing</option>
                <option value="Kucing">Kucing</option>
                <option value="Kelinci">Kelinci</option>
                <option value="Hamster">Hamster</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1B2A45]">Triage:</span>
              <select
                value={triageFilter}
                onChange={(e) => setTriageFilter(e.target.value)}
                className="bg-white border border-[#E1D6BE] rounded-lg px-2.5 py-2 text-xs text-[#1B2A45] font-semibold focus:outline-none"
              >
                <option value="All">Semua Tingkat Triage</option>
                <option value="P1">🔴 P1 - Kritis / Gawat Darurat ({triageCounts.P1})</option>
                <option value="P2">🟠 P2 - Sangat Mendesak ({triageCounts.P2})</option>
                <option value="P3">🟡 P3 - Semi-Mendesak ({triageCounts.P3})</option>
                <option value="P4">🟢 P4 - Rutin / Non-Urgent ({triageCounts.P4})</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#1B2A45]">Filter Kategori:</span>
            <select
              value={serviceCatFilter}
              onChange={(e) => setServiceCatFilter(e.target.value)}
              className="bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs text-[#1B2A45] font-semibold focus:outline-none"
            >
              <option value="All">Semua Kategori</option>
              <option value="Konsultasi">Konsultasi</option>
              <option value="Vaksinasi">Vaksinasi</option>
              <option value="Grooming">Grooming</option>
              <option value="Pet Hotel">Pet Hotel</option>
              <option value="Lab & Radiologi">Lab & Radiologi</option>
              <option value="Bedah & Tindakan">Bedah & Tindakan</option>
              <option value="Ambulance">Ambulance</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Customers Table */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-[#E1D6BE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E1D6BE] bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Pelanggan & NIK</th>
                  <th className="py-3 px-4">Kontak & WA</th>
                  <th className="py-3 px-4">Membership Tier</th>
                  <th className="py-3 px-4 text-center">Poin Loyalitas</th>
                  <th className="py-3 px-4 text-center">Pet Owned</th>
                  <th className="py-3 px-4 text-right">Total Transaksi (LTV)</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]/40">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#1B2A45]/60 font-medium">
                      Tidak ada pelanggan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F6F1E6]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1B2A45] text-sm">{c.name}</p>
                        <p className="text-[10px] text-[#1B2A45]/60 font-mono">ID: {c.id} {c.nik ? `• NIK: ${c.nik}` : ''}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1B2A45] flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> {c.phone}
                        </p>
                        {c.email && <p className="text-[10px] text-[#1B2A45]/60 mt-0.5">{c.email}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            c.membershipTier === 'Platinum'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : c.membershipTier === 'Gold'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          🏅 {c.membershipTier} Member
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-sky-700 text-sm">
                        {c.loyaltyPoints} Pts
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#1B2A45]">
                        {c.petCount} Ekor
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#1B2A45]">
                        Rp {(c.totalSpent || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditCustomer(c)}
                            title="Edit Pelanggan"
                            className="p-1.5 hover:bg-[#E1D6BE]/40 text-[#1B2A45] rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            title="Hapus Pelanggan"
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pets Cards Grid with AI Triage Urgency Indicators */}
      {activeTab === 'pets' && (
        <div className="space-y-4">
          {/* AI Triage Urgency Summary Dashboard Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#1B2A45] via-[#223657] to-[#101A2C] border border-[#B8905A]/40 text-[#FFFDF9] shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 text-[10px] font-extrabold uppercase tracking-wider">
                      AI Triage Urgency Engine
                    </span>
                    <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Real-time EMR Analysis
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#FFFDF9] mt-0.5 font-display">
                    Sistem Skrining & Triase Urgensi Pasien Rawat Jalan & Darurat
                  </h3>
                  <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
                    Menganalisis keluhan utama, tanda vital, dan catatan SOAP untuk memprioritaskan penanganan medis hewan.
                  </p>
                </div>
              </div>

              {/* Triage Quick Filter Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => setTriageFilter(triageFilter === 'P1' ? 'All' : 'P1')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    triageFilter === 'P1'
                      ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/50'
                      : 'bg-rose-950/40 border-rose-800/60 hover:bg-rose-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-rose-300 uppercase">P1 Kritis</span>
                    <span className="text-xs font-black text-white px-1.5 py-0.2 rounded bg-rose-600/60">
                      {triageCounts.P1}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-200/70 mt-0.5 truncate">Gawat Darurat Segera</p>
                </button>

                <button
                  onClick={() => setTriageFilter(triageFilter === 'P2' ? 'All' : 'P2')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    triageFilter === 'P2'
                      ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-300 uppercase">P2 Mendesak</span>
                    <span className="text-xs font-black text-white px-1.5 py-0.2 rounded bg-amber-600/60">
                      {triageCounts.P2}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-200/70 mt-0.5 truncate">&lt; 15 Menit</p>
                </button>

                <button
                  onClick={() => setTriageFilter(triageFilter === 'P3' ? 'All' : 'P3')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    triageFilter === 'P3'
                      ? 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400/50'
                      : 'bg-yellow-950/40 border-yellow-800/60 hover:bg-yellow-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-yellow-300 uppercase">P3 Semi-Mendesak</span>
                    <span className="text-xs font-black text-white px-1.5 py-0.2 rounded bg-yellow-600/60">
                      {triageCounts.P3}
                    </span>
                  </div>
                  <p className="text-[10px] text-yellow-200/70 mt-0.5 truncate">&lt; 60 Menit</p>
                </button>

                <button
                  onClick={() => setTriageFilter(triageFilter === 'P4' ? 'All' : 'P4')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    triageFilter === 'P4'
                      ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/50'
                      : 'bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-300 uppercase">P4 Rutin</span>
                    <span className="text-xs font-black text-white px-1.5 py-0.2 rounded bg-emerald-600/60">
                      {triageCounts.P4}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/70 mt-0.5 truncate">Standar Antrian</p>
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPets.length === 0 ? (
              <div className="col-span-full py-12 bg-white rounded-xl border border-[#E1D6BE] text-center text-xs text-[#1B2A45]/60 font-medium">
                Tidak ada data pasien hewan ditemukan untuk filter yang dipilih.
              </div>
            ) : (
              filteredPets.map((p) => {
                const triageData = petTriageMap.get(p.id);
                const triage = triageData?.triage || computeClientTriageUrgency(p);
                const visit = triageData?.visit;
                const soap = triageData?.soap;

                // Border accent styling per severity level
                const severityBorderClass =
                  triage.level === 'P1'
                    ? 'border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/20'
                    : triage.level === 'P2'
                    ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/20'
                    : triage.level === 'P3'
                    ? 'border-l-4 border-l-yellow-500 border-yellow-200 bg-yellow-50/20'
                    : 'border-l-4 border-l-emerald-500 border-[#E1D6BE]';

                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${severityBorderClass}`}
                  >
                    <div>
                      {/* Top Header: Pet image, Name, and Triage Urgency Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={p.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400'}
                            alt={p.name}
                            className="w-14 h-14 rounded-xl object-cover border border-[#E1D6BE] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-[#1B2A45] truncate">{p.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE]">
                                {p.species}
                              </span>
                            </div>
                            <p className="text-xs text-[#1B2A45]/70 font-medium mt-0.5 truncate">
                              Ras: {p.breed} • {p.gender}
                            </p>
                            <p className="text-xs text-[#1B2A45] mt-0.5 truncate">
                              Pemilik: <span className="font-bold">{p.customerName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Interactive Triage Urgency Badge */}
                        <div className="shrink-0">
                          <TriageUrgencyBadge
                            pet={p}
                            clinicVisit={visit}
                            soapNote={soap}
                            onClick={() =>
                              setSelectedPetForTriageModal({
                                pet: p,
                                clinicVisit: visit,
                                soapNote: soap
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Triage Triggers / Symptom severity box if available */}
                      {triage.triggers && triage.triggers.length > 0 && (
                        <div className="mt-2.5 p-2 rounded-lg bg-[#F6F1E6]/70 border border-[#E1D6BE]/70 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-[#1B2A45] font-semibold">
                            <span className="flex items-center gap-1 text-[10px] text-[#B8905A] uppercase tracking-wider font-extrabold">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Indikasi Triase:
                            </span>
                            <button
                              onClick={() =>
                                setSelectedPetForTriageModal({
                                  pet: p,
                                  clinicVisit: visit,
                                  soapNote: soap
                                })
                              }
                              className="text-[10px] text-[#1B2A45] hover:text-[#B8905A] font-bold underline cursor-pointer"
                            >
                              Detail AI &rarr;
                            </button>
                          </div>
                          <p className="text-[#1B2A45]/80 text-[11px] font-medium line-clamp-2">
                            {triage.reasoning}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {triage.triggers.slice(0, 3).map((trig, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded bg-white text-[#1B2A45] border border-[#E1D6BE] text-[9px] font-bold"
                              >
                                {trig}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E1D6BE]/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#1B2A45]/70">
                        <span>Microchip ID:</span>
                        <span className="font-mono text-[#1B2A45] font-bold">{p.microchipNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#1B2A45]/70">
                        <span>Berat Badan:</span>
                        <span className="font-bold text-emerald-700">{p.weightKg} kg</span>
                      </div>
                      {p.allergies && (
                        <div className="flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Alergi: {p.allergies}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#E1D6BE]/60">
                      <button
                        onClick={() =>
                          setSelectedPetForTriageModal({
                            pet: p,
                            clinicVisit: visit,
                            soapNote: soap
                          })
                        }
                        className={`flex-1 py-1.5 px-2 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer border ${
                          triage.level === 'P1'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                            : triage.level === 'P2'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                            : 'bg-[#101A2C] text-[#D9B98A] border-[#B8905A]/40 hover:bg-[#1B2A45]'
                        }`}
                        title="Buka Analisis Triase AI & Rekomendasi Klinis EMR"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Triase AI
                      </button>
                      <button
                        onClick={() => setSelectedPetForPassport(p)}
                        className="py-1.5 px-2.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        title="Buka Paspor Digital"
                      >
                        <Award className="w-3.5 h-3.5 text-[#1B2A45]" /> Paspor
                      </button>
                      <button
                        onClick={() => startEditPet(p)}
                        className="p-1.5 border border-[#E1D6BE] hover:bg-[#F6F1E6] text-[#1B2A45] rounded-lg transition-colors"
                        title="Edit Data Pasien"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePet(p)}
                        className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="Hapus Pasien"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Services Catalog */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-xl border border-[#E1D6BE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E1D6BE] bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Kode & Layanan</th>
                  <th className="py-3 px-4">Kategori Layanan</th>
                  <th className="py-3 px-4">Estimasi Durasi</th>
                  <th className="py-3 px-4 text-right">Tarif Standar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]/40">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#1B2A45]/60 font-medium">
                      Tidak ada katalog layanan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F6F1E6]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1B2A45] text-sm">{s.name}</p>
                        <p className="text-[10px] text-[#1B2A45]/60 font-mono">Kode: {s.code}</p>
                        {s.description && <p className="text-[10px] text-[#1B2A45]/70 mt-0.5">{s.description}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F6F1E6] border border-[#E1D6BE] text-[#1B2A45]">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#1B2A45] font-semibold flex items-center gap-1 mt-2">
                        <Clock className="w-3.5 h-3.5 text-[#1B2A45]/60" /> {s.estimatedDurationMins} Menit
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#1B2A45] text-sm">
                        Rp {s.price.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditService(s)}
                            className="p-1.5 hover:bg-[#E1D6BE]/40 text-[#1B2A45] rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus layanan ${s.name}?`)) {
                                deleteService(s.id);
                                addToast(`Layanan ${s.name} dihapus!`, 'success');
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Staff & Vets */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-[#E1D6BE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E1D6BE] bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">NIK & Nama Staff</th>
                  <th className="py-3 px-4">Jabatan / Peran</th>
                  <th className="py-3 px-4">SIP / Lisensi VET</th>
                  <th className="py-3 px-4">Kontak & WA</th>
                  <th className="py-3 px-4 text-right">Gaji Pokok</th>
                  <th className="py-3 px-4 text-center">Komisi %</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]/40">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#1B2A45]/60 font-medium">
                      Tidak ada data staff ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#F6F1E6]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1B2A45] text-sm">{emp.name}</p>
                        <p className="text-[10px] text-[#1B2A45]/60 font-mono">NIK: {emp.nik}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          {emp.role} ({emp.department})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#1B2A45]">
                        {emp.sipNumber ? emp.sipNumber : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1B2A45]">{emp.phone}</p>
                        <p className="text-[10px] text-[#1B2A45]/60">{emp.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#1B2A45]">
                        Rp {emp.baseSalary.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {emp.commissionRatePercent}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditStaff(emp)}
                            className="p-1.5 hover:bg-[#E1D6BE]/40 text-[#1B2A45] rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus staff ${emp.name}?`)) {
                                deleteEmployee(emp.id);
                                addToast(`Staff ${emp.name} dihapus!`, 'success');
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Suppliers */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-[#E1D6BE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E1D6BE] bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Kode & Nama Pemasok</th>
                  <th className="py-3 px-4">Kategori Pasokan</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">No. Telepon / Email</th>
                  <th className="py-3 px-4">Alamat Kantor</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]/40">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#1B2A45]/60 font-medium">
                      Tidak ada supplier ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-[#F6F1E6]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#1B2A45] text-sm">{sup.name}</p>
                        <p className="text-[10px] text-[#1B2A45]/60 font-mono">Kode: {sup.code}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F6F1E6] border border-[#E1D6BE] text-[#1B2A45]">
                          {sup.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#1B2A45]">
                        {sup.contactPerson}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1B2A45]">{sup.phone}</p>
                        <p className="text-[10px] text-[#1B2A45]/60">{sup.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-[#1B2A45]/80 max-w-xs truncate">
                        {sup.address}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditSupplier(sup)}
                            className="p-1.5 hover:bg-[#E1D6BE]/40 text-[#1B2A45] rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus supplier ${sup.name}?`)) {
                                deleteSupplier(sup.id);
                                addToast(`Supplier ${sup.name} dihapus!`, 'success');
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Customer */}
      {showAddCustomerModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddCustomerModal(false);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-[#1B2A45] text-sm">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Registrasi Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Lengkap Pemilik *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Contoh: Andri Santoso"
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">No. WhatsApp Active *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="andri@email.com"
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">NIK KTP (Optional)</label>
                  <input
                    type="text"
                    value={customerForm.nik}
                    onChange={(e) => setCustomerForm({ ...customerForm, nik: e.target.value })}
                    placeholder="3171012304..."
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Membership Tier</label>
                  <select
                    value={customerForm.membershipTier}
                    onChange={(e) => setCustomerForm({ ...customerForm, membershipTier: e.target.value as MembershipTier })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  >
                    <option value="Silver">Silver Member</option>
                    <option value="Gold">Gold Member</option>
                    <option value="Platinum">Platinum Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Alamat Domisili</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all mt-2"
              >
                {editingCustomer ? 'Simpan Perubahan' : 'Simpan Pelanggan Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Pet */}
      {showAddPetModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddPetModal(false);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-[#1B2A45] text-sm">
                {editingPet ? 'Edit Data Pasien Hewan' : 'Registrasi Pasien Hewan Baru'}
              </h3>
              <button onClick={() => setShowAddPetModal(false)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePet} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Pilih Pemilik Pelanggan *</label>
                <select
                  value={petForm.customerId}
                  onChange={(e) => setPetForm({ ...petForm, customerId: e.target.value })}
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Nama Pasien Hewan *</label>
                <input
                  type="text"
                  required
                  value={petForm.name}
                  onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                  placeholder="Milo, Luna, Max, Oreo..."
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Spesies</label>
                  <select
                    value={petForm.species}
                    onChange={(e) => setPetForm({ ...petForm, species: e.target.value as any })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  >
                    <option value="Anjing">Anjing</option>
                    <option value="Kucing">Kucing</option>
                    <option value="Kelinci">Kelinci</option>
                    <option value="Hamster">Hamster</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Ras / Breed</label>
                  <input
                    type="text"
                    value={petForm.breed}
                    onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Berat Badan (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={petForm.weightKg}
                    onChange={(e) => setPetForm({ ...petForm, weightKg: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">No Microchip</label>
                  <input
                    type="text"
                    value={petForm.microchipNo}
                    onChange={(e) => setPetForm({ ...petForm, microchipNo: e.target.value })}
                    placeholder="Autogenerate jika kosong"
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Riwayat Alergi (jika ada)</label>
                <input
                  type="text"
                  value={petForm.allergies}
                  onChange={(e) => setPetForm({ ...petForm, allergies: e.target.value })}
                  placeholder="Contoh: Amoxicillin, Daging Ayam"
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all"
              >
                {editingPet ? 'Simpan Perubahan' : 'Daftarkan Pasien Hewan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Service */}
      {showAddServiceModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddServiceModal(false);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-[#1B2A45] text-sm">
                {editingService ? 'Edit Katalog Layanan' : 'Tambah Layanan Baru'}
              </h3>
              <button onClick={() => setShowAddServiceModal(false)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Contoh: Consultation & General Exam"
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kategori Layanan</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  >
                    <option value="Konsultasi">Konsultasi</option>
                    <option value="Vaksinasi">Vaksinasi</option>
                    <option value="Grooming">Grooming</option>
                    <option value="Pet Hotel">Pet Hotel</option>
                    <option value="Lab & Radiologi">Lab & Radiologi</option>
                    <option value="Bedah & Tindakan">Bedah & Tindakan</option>
                    <option value="Ambulance">Ambulance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={serviceForm.estimatedDurationMins}
                    onChange={(e) => setServiceForm({ ...serviceForm, estimatedDurationMins: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Tarif Standar (Rp) *</label>
                <input
                  type="number"
                  required
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Deskripsi Ringkas</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all"
              >
                {editingService ? 'Simpan Perubahan' : 'Tambah Katalog Layanan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Staff */}
      {showAddStaffModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddStaffModal(false);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-[#1B2A45] text-sm">
                {editingStaff ? 'Edit Staff / Dokter' : 'Tambah Staff / Dokter Baru'}
              </h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="drh. Ananda Putri"
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Peran / Jabatan</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  >
                    <option value="Dokter Hewan">Dokter Hewan</option>
                    <option value="Paramedik">Paramedik</option>
                    <option value="Groomer">Groomer</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Departemen</label>
                  <input
                    type="text"
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">No. WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">SIP Dokter (jika ada)</label>
                  <input
                    type="text"
                    value={staffForm.sipNumber}
                    onChange={(e) => setStaffForm({ ...staffForm, sipNumber: e.target.value })}
                    placeholder="SIP.503/VET/..."
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    value={staffForm.baseSalary}
                    onChange={(e) => setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Komisi %</label>
                  <input
                    type="number"
                    value={staffForm.commissionRatePercent}
                    onChange={(e) => setStaffForm({ ...staffForm, commissionRatePercent: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all"
              >
                {editingStaff ? 'Simpan Perubahan' : 'Simpan Data Staff'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Supplier */}
      {showAddSupplierModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddSupplierModal(false);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-[#1B2A45] text-sm">
                {editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Perusahaan Supplier *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="PT Petindo Jaya Utama"
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    placeholder="Hendra Setiawan"
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Kategori Pasokan</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  >
                    <option value="Makanan & Nutrisi">Makanan & Nutrisi</option>
                    <option value="Obat & Vaksin">Obat & Vaksin</option>
                    <option value="Aksesoris & Grooming">Aksesoris & Grooming</option>
                    <option value="Peralatan Medis">Peralatan Medis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">No. Telepon *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Alamat Kantor / Gudang</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none focus:border-[#1B2A45]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all"
              >
                {editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pet Digital Health Passport Modal */}
      {selectedPetForPassport && (
        <div 
          className="fixed inset-0 z-50 bg-[#1B2A45]/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPetForPassport(null);
          }}
        >
          <div 
            className="bg-white border border-[#E1D6BE] rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 text-[#1B2A45] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#1B2A45]" />
                <h3 className="font-bold text-[#1B2A45] text-sm">
                  Paspor Kesehatan Digital Pasien
                </h3>
              </div>
              <button onClick={() => setSelectedPetForPassport(null)} className="text-[#1B2A45]/60 hover:text-[#1B2A45]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-tr from-[#1B2A45] to-[#2C4268] rounded-2xl p-5 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐾</span>
                  <div>
                    <h4 className="font-black text-sm tracking-wide text-[#E1D6BE]">PETCARE VETERINARY PASSPORT</h4>
                    <p className="text-[10px] text-slate-300">Official Digital Health ID Card</p>
                  </div>
                </div>
                <QrCode className="w-10 h-10 text-[#E1D6BE] opacity-90" />
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={selectedPetForPassport.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400'}
                  alt={selectedPetForPassport.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E1D6BE] shadow-md"
                />
                <div className="space-y-1 text-xs">
                  <h3 className="text-xl font-black text-white">{selectedPetForPassport.name}</h3>
                  <p className="text-[#E1D6BE] font-medium">Spesies: {selectedPetForPassport.species} • Ras: {selectedPetForPassport.breed}</p>
                  <p className="text-[11px] text-slate-300">Microchip: <span className="font-mono text-amber-300 font-bold">{selectedPetForPassport.microchipNo}</span></p>
                  <p className="text-[11px] text-slate-300">Pemilik: {selectedPetForPassport.customerName}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/10 p-2 rounded-lg">
                  <span className="text-slate-300">Berat Badan:</span>
                  <p className="font-bold text-white">{selectedPetForPassport.weightKg} kg</p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg">
                  <span className="text-slate-300">Riwayat Alergi:</span>
                  <p className="font-bold text-amber-300">
                    {selectedPetForPassport.allergies || 'Tidak Ada'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#1B2A45]/60 text-center">
              Paspor digital tersimpan aman dalam sistem PetCare ERP dan dapat diakses via QR code oleh pemilik hewan.
            </p>
          </div>
        </div>
      )}

      {/* AI Triage Urgency Analysis Modal */}
      {selectedPetForTriageModal && (
        <TriageUrgencyModal
          isOpen={true}
          onClose={() => setSelectedPetForTriageModal(null)}
          pet={selectedPetForTriageModal.pet}
          clinicVisit={selectedPetForTriageModal.clinicVisit}
          soapNote={selectedPetForTriageModal.soapNote}
        />
      )}
    </div>
  );
};
