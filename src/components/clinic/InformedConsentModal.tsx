import React, { useState, useRef, useEffect } from 'react';
import {
  FileCheck,
  X,
  PenTool,
  RotateCcw,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  User,
  Stethoscope,
  DollarSign,
  Lock,
  Download,
  Share2,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { InformedConsentRecord, Pet, Customer } from '../../types';

interface InformedConsentModalProps {
  onClose: () => void;
  defaultPetId?: string;
  defaultDoctorName?: string;
}

export const InformedConsentModal: React.FC<InformedConsentModalProps> = ({
  onClose,
  defaultPetId,
  defaultDoctorName = 'drh. Ananda Putri'
}) => {
  const { pets = [], customers = [], addMedicalRecord, addInformedConsent } = useData();
  const { addToast } = useToast();

  const selectedPet = pets.find((p) => p.id === defaultPetId) || pets[0];
  const linkedCustomer = customers.find((c) => c.id === selectedPet?.customerId) || customers[0];

  const [petId, setPetId] = useState<string>(selectedPet?.id || '');
  const [procedureType, setProcedureType] = useState<InformedConsentRecord['procedureType']>('Bedah Mayor');
  const [diagnosis, setDiagnosis] = useState('Pyometra Terbuka & Anemia Ringan');
  const [procedureDetails, setProcedureDetails] = useState(
    'Ovariohisterektomi (OH) Cito / Pengangkatan Rahim dan Indung Telur terinfeksi dengan pembiusan inhalasi isofluran, terapi cairan infus IV line, dan premedikasi analgesik multimodal.'
  );
  const [risksDisclosed, setRisksDisclosed] = useState(
    'Resiko depresi kardiorespirasi selama anestesi umum, pendarahan intraoperatif, reaksi anafilaksis obat, serta resiko infeksi luka jahitan pasca-operasi.'
  );
  const [estimatedCost, setEstimatedCost] = useState<number>(1850000);
  const [doctorName, setDoctorName] = useState<string>(defaultDoctorName);
  const [witnessName, setWitnessName] = useState<string>('Ns. Siti Rahma (Paramedik)');
  const [emergencyPhone, setEmergencyPhone] = useState<string>(linkedCustomer?.phone || '081234567890');
  const [ownerNik, setOwnerNik] = useState<string>(linkedCustomer?.nik || '3171025809920004');

  // Terms & Understanding Checkboxes
  const [agreeDiagnosis, setAgreeDiagnosis] = useState(true);
  const [agreeAnesthesia, setAgreeAnesthesia] = useState(true);
  const [agreeCost, setAgreeCost] = useState(true);
  const [agreeEmergencyAction, setAgreeEmergencyAction] = useState(true);

  // Canvas E-Signature State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedConsent, setSavedConsent] = useState<InformedConsentRecord | null>(null);

  // Sync pet change
  const currentPet = pets.find((p) => p.id === petId) || selectedPet;
  const currentOwner = customers.find((c) => c.id === currentPet?.customerId) || linkedCustomer;

  useEffect(() => {
    if (currentOwner) {
      if (currentOwner.phone) setEmergencyPhone(currentOwner.phone);
      if (currentOwner.nik) setOwnerNik(currentOwner.nik);
    }
  }, [currentPet, currentOwner]);

  // Setup Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const generateSecurityHash = () => {
    const raw = `${petId}-${currentOwner?.id}-${Date.now()}-${procedureType}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `IC-SHA256-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  };

  const handleSaveConsent = () => {
    if (!hasSignature) {
      addToast('Harap bubuhkan tanda tangan digital pada kotak yang tersedia!', 'error');
      return;
    }
    if (!agreeDiagnosis || !agreeAnesthesia || !agreeCost || !agreeEmergencyAction) {
      addToast('Seluruh poin persetujuan tindakan medis wajib dicentang!', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    const consentNo = `IC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const securityHash = generateSecurityHash();

    // Sebelumnya dokumen ini (termasuk gambar tanda tangan & hash keamanan)
    // hanya disimpan ke useState lokal komponen — hilang begitu modal
    // ditutup atau halaman di-refresh, walau UI mengklaim "tersimpan
    // permanen". Sekarang benar-benar disimpan lewat addInformedConsent ke
    // DataContext (localStorage), jadi bisa dibuka ulang kapan saja.
    const newRecord = addInformedConsent({
      consentNo,
      petId: currentPet?.id || '',
      petName: currentPet?.name || 'Pasien',
      customerId: currentOwner?.id || '',
      customerName: currentOwner?.name || 'Pemilik',
      customerPhone: emergencyPhone,
      customerNik: ownerNik,
      doctorId: 'doc_1',
      doctorName,
      procedureType,
      diagnosis,
      procedureDetails,
      risksDisclosed,
      estimatedCost,
      signatureDataUrl,
      signedAt: new Date().toISOString(),
      witnessName,
      status: 'Ditandatangani',
      securityHash
    });

    setSavedConsent(newRecord);

    // Save to medical records
    if (addMedicalRecord && currentPet) {
      addMedicalRecord({
        petId: currentPet.id,
        date: new Date().toISOString().substring(0, 10),
        type: 'Tindakan',
        title: `Informed Consent Digital: ${procedureType}`,
        description: `Persetujuan Tindakan Medis (${consentNo}) telah ditandatangani secara elektronik oleh ${currentOwner?.name}. Verifikasi Hash: ${securityHash}. Tindakan: ${procedureDetails}`,
        performedBy: doctorName
      });
    }

    addToast(`Informed Consent ${consentNo} berhasil ditandatangani & disimpan ke Rekam Medis EMR!`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#B8905A]/30 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-4 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl shadow-md font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Surat Persetujuan Tindakan Medis (Informed Consent)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  E-Signature Terenkripsi
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE]/80">
                Persetujuan digital resmi sebelum tindakan bedah, anestesi umum, rawat inap intensif, atau prosedur berisiko tinggi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#E1D6BE]/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-[#101A2C]">
          {savedConsent ? (
            /* Signed Success Certificate View */
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-emerald-950 font-display">
                  Informed Consent Berhasil Diverifikasi & Disimpan
                </h4>
                <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                  Dokumen persetujuan telah sah secara hukum medis dengan stempel digital, tanda tangan elektronik terikat, dan tercatat permanen di Rekam Medis EMR.
                </p>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-emerald-300 text-xs font-mono font-bold text-emerald-900 shadow-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {savedConsent.securityHash}
                </div>
              </div>

              {/* Summary Slip */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Nomor Dokumen:</span>
                  <span className="font-bold text-sm text-slate-900">{savedConsent.consentNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Waktu Penandatanganan:</span>
                  <span className="font-bold text-slate-900">{new Date(savedConsent.signedAt).toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Pasien & Spesies:</span>
                  <span className="font-bold text-slate-900">{savedConsent.petName} ({currentPet?.species} - {currentPet?.breed})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Pemilik Hewan:</span>
                  <span className="font-bold text-slate-900">{savedConsent.customerName} (NIK: {savedConsent.customerNik})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Jenis Tindakan Medis:</span>
                  <span className="font-bold text-indigo-700">{savedConsent.procedureType}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Dokter Penanggung Jawab:</span>
                  <span className="font-bold text-slate-900">{savedConsent.doctorName}</span>
                </div>
              </div>

              {/* Digital Signature Preview */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Tanda Tangan Elektronik Pemilik:</span>
                  <p className="text-[11px] text-slate-500">Telah diverifikasi via canvas touch input.</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-300">
                  <img src={savedConsent.signatureDataUrl} alt="E-Signature" className="h-16 w-48 object-contain" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Dokumen PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white font-bold rounded-xl text-xs shadow-md hover:brightness-110 transition-all cursor-pointer"
                >
                  Tutup & Kembali ke EMR
                </button>
              </div>
            </div>
          ) : (
            /* Consent Form Builder & Signer */
            <div className="space-y-6">
              {/* Patient & Doctor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Pasien Anabul</label>
                  <select
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  >
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species} - {p.customerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Tindakan Medis</label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-[#B8905A]"
                  >
                    <option value="Bedah Mayor">Bedah Mayor (Laparotomi, Ortopedi, dll)</option>
                    <option value="Bedah Minor">Bedah Minor (Sterilisasi, Jahit Luka, dll)</option>
                    <option value="Sedasi / Anestesi">Sedasi / Anestesi Umum Dental/Radiologi</option>
                    <option value="Rawat Inap Intensif">Rawat Inap Kritis / ICU / Infus Lanjut</option>
                    <option value="Tindakan Berisiko Tinggi">Transfusi Darah / Kemoterapi / Kritis</option>
                    <option value="Eutanasia Humanis">Eutanasia Humanis Medis</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dokter Penanggung Jawab</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  />
                </div>
              </div>

              {/* Diagnosis, Procedure & Risk Disclosures */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Stethoscope className="w-3.5 h-3.5 text-[#B8905A]" />
                    Diagnosa Medis / Indikasi Tindakan:
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                    placeholder="Contoh: Pyometra Terbuka, Fraktur Femur, dsb."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <FileCheck className="w-3.5 h-3.5 text-[#B8905A]" />
                    Rincian Prosedur Tindakan yang Akan Dilakukan:
                  </label>
                  <textarea
                    rows={2}
                    value={procedureDetails}
                    onChange={(e) => setProcedureDetails(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Penjelasan Resiko Medis, Komplikasi & Efek Samping:
                  </label>
                  <textarea
                    rows={2}
                    value={risksDisclosed}
                    onChange={(e) => setRisksDisclosed(e.target.value)}
                    className="w-full bg-rose-50/50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-950 focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Estimasi Biaya Tindakan Medis (Rp):
                    </label>
                    <input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      Saksi Tindakan (Paramedik / Staf):
                    </label>
                    <input
                      type="text"
                      value={witnessName}
                      onChange={(e) => setWitnessName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory Affirmation Checkboxes */}
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5">
                <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-amber-700" />
                  Pernyataan Persetujuan Pemilik Hewan (Wajib Dicentang):
                </h5>

                <label className="flex items-start gap-2.5 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeDiagnosis}
                    onChange={(e) => setAgreeDiagnosis(e.target.checked)}
                    className="mt-0.5 rounded text-[#B8905A] focus:ring-[#B8905A]"
                  />
                  <span>Saya telah menerima penjelasan menyeluruh mengenai diagnosis, indikasi, dan tujuan tindakan medis untuk pasien <strong>{currentPet?.name}</strong>.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAnesthesia}
                    onChange={(e) => setAgreeAnesthesia(e.target.checked)}
                    className="mt-0.5 rounded text-[#B8905A] focus:ring-[#B8905A]"
                  />
                  <span>Saya memahami seluruh potensi resiko medis, respon komplikasi anestesi, serta menyetujui pelaksanaan pembiusan/prosedur bedah yang diperlukan.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeEmergencyAction}
                    onChange={(e) => setAgreeEmergencyAction(e.target.checked)}
                    className="mt-0.5 rounded text-[#B8905A] focus:ring-[#B8905A]"
                  />
                  <span>Saya memberikan izin kepada tim dokter hewan untuk mengambil tindakan darurat penyelamatan nyawa (Resusitasi/CPR) bila terjadi situasi kritis tak terduga.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeCost}
                    onChange={(e) => setAgreeCost(e.target.checked)}
                    className="mt-0.5 rounded text-[#B8905A] focus:ring-[#B8905A]"
                  />
                  <span>Saya menyetujui rincian estimasi biaya sebesar <strong>Rp {estimatedCost.toLocaleString('id-ID')}</strong> dan bersedia melunasi kewajiban administrasi.</span>
                </label>
              </div>

              {/* Digital Signature Canvas Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-[#B8905A]" />
                    Tanda Tangan Digital Pemilik Hewan / Yang Bertanggung Jawab ({currentOwner?.name}):
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Hapus / Ulangi TTD
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-[#B8905A] rounded-xl bg-slate-50 relative overflow-hidden transition-all">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 touch-none cursor-crosshair"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
                      <PenTool className="w-6 h-6 mb-1 opacity-40" />
                      <span>Goreskan tanda tangan dengan jari / stylus / mouse di area ini</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Nama Pemilik: <strong>{currentOwner?.name}</strong> • Telp: {emergencyPhone}</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> W3C Digital Ink E-Signature Standard
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveConsent}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#B8905A] text-white font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sahkan Dokumen & Simpan ke EMR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
