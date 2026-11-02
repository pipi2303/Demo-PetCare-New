import jsPDF from 'jspdf';

export interface ReportCompanyInfo {
  clinicName: string;
  subTitle: string;
  address: string;
  phone: string;
  email: string;
  npwp: string;
  licenseNo: string;
  branchName: string;
}

export const DEFAULT_COMPANY_INFO: ReportCompanyInfo = {
  clinicName: 'PETCARE VETERINARY HOSPITAL & CLINIC',
  subTitle: 'Pusat Pelayanan Medis Veteriner Terpadu, Pet Shop & Grooming Modern',
  address: 'Jl. Senopati Raya No. 88, Kebayoran Baru, Jakarta Selatan 12190',
  phone: '(021) 555-8899 / WhatsApp: 0812-9988-7766',
  email: 'finance@petcare-erp.id | info@petcare-erp.id',
  npwp: '01.234.567.8-012.000',
  licenseNo: 'IZIN-KLINIK-VET/DKPKP/2024/0981',
  branchName: 'Cabang Utama Jakarta Selatan',
};

export const formatRupiah = (amount: number): string =>
  'Rp ' + Math.round(amount).toLocaleString('id-ID');

export const formatNumber = (num: number): string =>
  Math.round(num).toLocaleString('id-ID');

export function applyPageFooters(doc: jsPDF): void {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(27, 42, 69);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 102, 86);
    doc.text('Dokumen resmi — dicetak dari sistem PetCare ERP. Verifikasi keaslian via QR atau hubungi admin.', 14, pageHeight - 6.5);
    doc.setTextColor(27, 42, 69);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 6.5, { align: 'right' });
  }
}
