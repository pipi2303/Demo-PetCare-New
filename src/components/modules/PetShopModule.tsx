import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAutoSaveDraft } from '../../hooks/useAutoSaveDraft';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CreditCard,
  Banknote,
  Percent,
  Award,
  CheckCircle2,
  Printer,
  Sparkles,
  Package,
  User,
  X,
  RotateCcw,
  Receipt,
  ShoppingCart,
  Tag,
  Save,
  Check,
  UserPlus,
  UserX,
  Zap,
  Info,
  Loader2,
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { PetShopCategoryAnalytics } from '../petshop/PetShopCategoryAnalytics';
import { CashDrawerSettlementModal } from '../petshop/CashDrawerSettlementModal';
import { BarcodeCameraScanner } from '../petshop/BarcodeCameraScanner';
import { Camera, Coins } from 'lucide-react';
import { createQrisPayment, pollPaymentStatus, PaymentStatus } from '../../utils/payment';

interface CartItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  isClearanceSale?: boolean;
  clearanceDiscountPercent?: number;
  quantity: number;
  stock: number;
}

interface PetShopDraft {
  selectedCustomerId: string;
  cart: CartItem[];
  voucherCode: string;
  discountPercent: number;
  useLoyaltyPoints: boolean;
  notes: string;
}

export const PetShopModule: React.FC = () => {
  const {
    stockItems = [],
    customers = [],
    addInvoice,
    processPayment,
    addCashTransaction,
    updateStockItem,
    adjustCustomerPoints,
    addCustomer,
    addStockMovement,
    appSettings
  } = useData();
  const { addToast } = useToast();

  // View state: 'pos' or 'analytics'
  const [currentView, setCurrentView] = useState<'pos' | 'analytics'>('pos');

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Guest / Walk-in Name state
  const [guestName, setGuestName] = useState<string>('Pelanggan Umum (Walk-in)');

  // Quick Register Member Modal State
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  // POS Cash Settlement & Barcode Scanner Modal States
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState<boolean>(false);

  // Draft state with local storage auto-save
  const defaultDraft: PetShopDraft = {
    selectedCustomerId: 'guest',
    cart: [],
    voucherCode: '',
    discountPercent: 0,
    useLoyaltyPoints: false,
    notes: ''
  };

  const {
    draft,
    setDraft,
    isSaving,
    lastSavedAt,
    hasRestoredDraft,
    discardDraft,
    clearDraft
  } = useAutoSaveDraft<PetShopDraft>('petcare_petshop_cart_draft', defaultDraft, 500);

  const updateDraft = (fields: Partial<PetShopDraft>) => {
    setDraft((prev) => ({ ...prev, ...fields }));
  };

  // Payment Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  // Nilai di sini HARUS persis sama dengan union Invoice['paymentMethod'] di
  // types.ts ('Debit', 'Transfer Bank') — sebelumnya dipakai 'Kartu Debit'/
  // 'Transfer' yang tidak pernah cocok dengan filter di modul lain (mis.
  // CashDrawerSettlementModal) yang membaca nilai kanonik itu.
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Tunai' | 'Debit' | 'Kartu Kredit' | 'Transfer Bank'>('QRIS');
  const paymentMethodLabels: Record<'QRIS' | 'Tunai' | 'Debit' | 'Kartu Kredit' | 'Transfer Bank', string> = {
    QRIS: 'QRIS',
    Tunai: 'Tunai',
    Debit: 'Kartu Debit',
    'Kartu Kredit': 'Kartu Kredit',
    'Transfer Bank': 'Transfer Bank'
  };
  const [cashPaid, setCashPaid] = useState<number>(0);

  // Real QRIS payment state (Midtrans). 'idle' means no QRIS charge in
  // flight — non-QRIS methods stay staff-confirmed & synchronous, unchanged.
  const [qrisPhase, setQrisPhase] = useState<'idle' | 'loading' | 'waiting_real' | 'waiting_simulated' | 'failed'>('idle');
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [qrisMessage, setQrisMessage] = useState<string>('');
  const [pendingQrisInvoice, setPendingQrisInvoice] = useState<any>(null);
  const qrisPollRef = React.useRef<{ stop: () => void } | null>(null);
  // Ref (bukan useState) supaya guard-nya sinkron: dua klik cepat pada
  // tombol checkout Tunai/Debit/Transfer sebelum re-render bisa lolos dari
  // state React yang masih versi lama, dan memicu addInvoice/addCashTransaction/
  // deductStockForCart dobel untuk satu transaksi yang sama.
  const isCompletingSaleRef = React.useRef(false);

  const stopQrisPolling = () => {
    qrisPollRef.current?.stop();
    qrisPollRef.current = null;
  };

  React.useEffect(() => {
    if (showCheckoutModal && paymentMethod !== 'QRIS' && qrisPhase !== 'idle') {
      stopQrisPolling();
      setQrisPhase('idle');
      setQrisImageUrl(null);
      setPendingQrisInvoice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  React.useEffect(() => () => stopQrisPolling(), []);

  // Struk Modal & Auto-Print Simulation
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [showStrukModal, setShowStrukModal] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(true);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState<boolean>(false);
  const [printStage, setPrintStage] = useState<'idle' | 'transmitting' | 'cutting' | 'done'>('idle');

  // Trigger simulated thermal printing
  const runSimulatedPrint = (invoiceNo: string) => {
    setIsSimulatingPrint(true);
    setPrintStage('transmitting');
    setTimeout(() => {
      setPrintStage('cutting');
      setTimeout(() => {
        setPrintStage('done');
        setIsSimulatingPrint(false);
        addToast(`Struk #${invoiceNo} berhasil dicetak via Auto-Print Thermal ESC/POS!`, 'success');
      }, 1000);
    }, 900);
  };

  // Guest Mode toggle state (Defaults to true for rapid frictionless transactions)
  const [isGuestMode, setIsGuestMode] = useState<boolean>(
    draft.selectedCustomerId === 'guest' || !draft.selectedCustomerId
  );

  // Keep isGuestMode synced with draft changes
  useEffect(() => {
    if (draft.selectedCustomerId === 'guest' || !draft.selectedCustomerId) {
      setIsGuestMode(true);
    } else {
      setIsGuestMode(false);
    }
  }, [draft.selectedCustomerId]);

  const handleToggleGuestMode = (enabled: boolean) => {
    setIsGuestMode(enabled);
    if (enabled) {
      updateDraft({ selectedCustomerId: 'guest', useLoyaltyPoints: false });
      addToast('Mode Tamu (Guest Mode) Aktif: Lewati pemilihan member, transaksi anonim cepat siap.', 'info');
    } else {
      const defaultMemberId = customers[0]?.id || '';
      updateDraft({ selectedCustomerId: defaultMemberId });
      addToast('Mode Member Aktif: Profil member dipilih untuk poin & promo loyalitas.', 'info');
    }
  };

  const isGuestCustomer = isGuestMode || draft.selectedCustomerId === 'guest' || !draft.selectedCustomerId;
  const selectedCustomer = isGuestCustomer
    ? null
    : customers.find((c) => c.id === draft.selectedCustomerId) || null;

  // Categories list
  const categories = [
    'Semua',
    '⚡ Clearance Sale',
    'Makanan',
    'Pasir Kucing',
    'Vitamin',
    'Aksesoris',
    'Mainan',
    'Kandang'
  ];

  // Filtered Stock Items (Pet Shop Products)
  const filteredProducts = stockItems.filter((item) => {
    let matchesCat = true;
    if (selectedCategory === '⚡ Clearance Sale') {
      matchesCat = !!item.isClearanceSale;
    } else if (selectedCategory !== 'Semua') {
      matchesCat = item.category === selectedCategory;
    }

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Cart Calculations
  const cartSubtotal = draft.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Voucher discount
  const voucherDiscount = (cartSubtotal * draft.discountPercent) / 100;

  // Loyalty Point Discount (10 points = Rp 10.000 discount) - Only for registered members
  const availablePoints = selectedCustomer?.loyaltyPoints || 0;
  const pointDiscountRupiah = !isGuestCustomer && draft.useLoyaltyPoints ? Math.min(availablePoints * 1000, cartSubtotal) : 0;

  const totalDiscount = voucherDiscount + pointDiscountRupiah;
  const taxableAmount = Math.max(0, cartSubtotal - totalDiscount);
  // Tarif & aktif/tidaknya PPN sekarang dari Pengaturan Sistem (dulu 0.11
  // hardcoded di sini, tidak pernah membaca konfigurasi apa pun).
  const activeTaxRatePercent = appSettings.enableTax ? appSettings.taxRate : 0;
  const taxPPN = Math.round(taxableAmount * (activeTaxRatePercent / 100));
  const grandTotal = taxableAmount + taxPPN;
  const earnedPoints = isGuestCustomer ? 0 : Math.floor(grandTotal / 10000); // 1 point per 10k spent for members

  // Add item to cart
  const handleAddToCart = (product: any) => {
    if (product.stock <= 0) {
      addToast(`Stok ${product.name} telah habis!`, 'error');
      return;
    }

    const effectivePrice = product.isClearanceSale && product.clearanceDiscountPercent
      ? Math.round(product.sellingPrice * (1 - product.clearanceDiscountPercent / 100))
      : product.sellingPrice;

    const existingIndex = draft.cart.findIndex((item) => item.id === product.id);
    if (existingIndex > -1) {
      const currentQty = draft.cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        addToast(`Stok ${product.name} hanya tersisa ${product.stock} ${product.unit}.`, 'error');
        return;
      }
      const updatedCart = [...draft.cart];
      updatedCart[existingIndex].quantity += 1;
      updateDraft({ cart: updatedCart });
    } else {
      const newItem: CartItem = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        price: effectivePrice,
        originalPrice: product.sellingPrice,
        isClearanceSale: product.isClearanceSale,
        clearanceDiscountPercent: product.clearanceDiscountPercent,
        quantity: 1,
        stock: product.stock
      };
      updateDraft({ cart: [...draft.cart, newItem] });
    }
    addToast(
      product.isClearanceSale
        ? `🔥 ${product.name} (Diskon ${product.clearanceDiscountPercent}%) ditambahkan ke keranjang!`
        : `${product.name} ditambahkan ke keranjang.`,
      'info'
    );
  };

  // Update item qty
  const handleUpdateQty = (itemId: string, delta: number) => {
    const updatedCart = draft.cart
      .map((item) => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          if (newQty > item.stock) {
            addToast(`Mencapai batas stok maksimum (${item.stock}).`, 'error');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);

    updateDraft({ cart: updatedCart });
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    updateDraft({ cart: draft.cart.filter((i) => i.id !== itemId) });
  };

  // Apply Voucher Code
  const handleApplyVoucher = () => {
    const code = draft.voucherCode.trim().toUpperCase();
    if (code === 'PETCARE10') {
      updateDraft({ discountPercent: 10 });
      addToast('Voucher diskon 10% berhasil dipasang!', 'success');
    } else if (code === 'MEMBER20') {
      updateDraft({ discountPercent: 20 });
      addToast('Voucher Spesial Member 20% berhasil dipasang!', 'success');
    } else if (code === '') {
      updateDraft({ discountPercent: 0 });
    } else {
      addToast('Kode voucher tidak valid. Coba "PETCARE10" atau "MEMBER20".', 'error');
    }
  };

  // Handle Quick Member Registration from POS
  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      addToast('Nama pelanggan wajib diisi.', 'error');
      return;
    }
    const newCust = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '081234567890',
      email: '',
      address: newCustAddress.trim() || 'Alamat Pelanggan',
      notes: 'Registrasi Cepat dari Kasir POS Pet Shop'
    });
    updateDraft({ selectedCustomerId: newCust.id });
    setShowQuickRegisterModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    addToast(`Member baru "${newCust.name}" berhasil didaftarkan & dipilih di kasir!`, 'success');
  };

  // Execute Checkout
  // Auto-deduct stok untuk item di keranjang — dipakai setelah invoice benar
  // lunas (langsung untuk metode non-QRIS, atau setelah settlement QRIS).
  // Sebelumnya HANYA updateStockItem yang dipanggil — tidak pernah mencatat
  // addStockMovement type:'Keluar'. Akibatnya setiap fitur "AI" inventori
  // yang menganalisis stockMovements (Velocity Heatmap, Audit Assistant, PO
  // Suggestions) tidak pernah punya riwayat penjualan nyata untuk dianalisis
  // — akar masalah kenapa semua fitur itu jatuh ke rumus tebakan.
  const deductStockForCart = (referenceNo: string) => {
    draft.cart.forEach((cartItem) => {
      const stockObj = stockItems.find((s) => s.id === cartItem.id);
      if (stockObj) {
        updateStockItem(stockObj.id, {
          stock: Math.max(0, stockObj.stock - cartItem.quantity)
        });
        addStockMovement({
          itemId: stockObj.id,
          itemName: stockObj.name,
          type: 'Keluar',
          quantity: cartItem.quantity,
          fromWarehouse: stockObj.warehouse,
          referenceNo,
          operator: 'Kasir Pet Shop'
        });
      }
    });
  };

  // Reset draft, tampilkan struk, & (opsional) auto-print — bagian akhir yang
  // sama persis dipakai baik oleh jalur pembayaran langsung maupun QRIS.
  const finishSaleUi = (finalInvoice: any, methodForReceipt: typeof paymentMethod) => {
    clearDraft();
    setShowCheckoutModal(false);
    const invoicePayload = {
      ...finalInvoice,
      cashPaid: methodForReceipt === 'Tunai' ? cashPaid : grandTotal,
      changeAmount: methodForReceipt === 'Tunai' ? Math.max(0, cashPaid - grandTotal) : 0,
      taxPPN
    };
    setCompletedInvoice(invoicePayload);
    setShowStrukModal(true);

    if (autoPrintEnabled) {
      runSimulatedPrint(finalInvoice.invoiceNo);
    } else {
      setPrintStage('idle');
      addToast(`Transaksi POS #${finalInvoice.invoiceNo} berhasil diselesaikan!`, 'success');
    }
  };

  const buildInvoiceItems = () =>
    draft.cart.map((item) => ({
      id: 'inv_item_' + Date.now() + Math.random(),
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));

  const handleCompleteSale = () => {
    if (isCompletingSaleRef.current) return;

    if (draft.cart.length === 0) {
      addToast('Keranjang belanja masih kosong.', 'error');
      return;
    }

    if (paymentMethod === 'Tunai' && cashPaid < grandTotal) {
      addToast(`Uang tunai (Rp ${cashPaid.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${grandTotal.toLocaleString('id-ID')}).`, 'error');
      return;
    }

    if (paymentMethod === 'QRIS') {
      handleStartQrisSale();
      return;
    }

    isCompletingSaleRef.current = true;

    // Metode selain QRIS tetap staff-confirmed langsung & lunas seketika
    // (Tunai/Kartu/Transfer tidak lewat payment gateway). Catatan penting:
    // TIDAK bisa memanggil processPayment(newInvoice.id, ...) di sini —
    // processPayment mencari invoice lewat `invoices.find()` dari state
    // DataContext, dan karena addInvoice() baru saja menjadwalkan
    // setInvoices() di tick React yang sama, closure `invoices` di sini masih
    // versi lama (belum berisi invoice yang baru dibuat) sampai re-render
    // berikutnya — processPayment akan diam-diam tidak menemukan invoice-nya
    // dan tidak melakukan apa-apa. Makanya invoice dibuat langsung 'Lunas' di
    // sini, dan addCashTransaction dipanggil langsung (fungsi ini tidak perlu
    // mencari apa pun dari state, jadi aman dari masalah closure basi yang
    // sama) — supaya buku kas benar-benar tercatat untuk SEMUA metode bayar,
    // bukan cuma QRIS seperti sebelumnya.
    const isGuest = isGuestCustomer;
    const finalCustomerId = isGuest ? 'guest' : (selectedCustomer?.id || 'guest');
    const finalCustomerName = isGuest ? (guestName.trim() || 'Pelanggan Umum (Walk-in)') : (selectedCustomer?.name || 'Pelanggan Umum');

    const newInvoice = addInvoice({
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      items: buildInvoiceItems(),
      subtotal: cartSubtotal,
      discountAmount: totalDiscount,
      totalAmount: grandTotal,
      paidAmount: grandTotal,
      paymentMethod: paymentMethod,
      status: 'Lunas',
      loyaltyPointsEarned: isGuest ? 0 : earnedPoints,
      cashierName: 'Kasir Pet Shop'
    });

    addCashTransaction({
      type: 'Masuk',
      category: 'Pelunasan Invoice',
      amount: grandTotal,
      description: `Pelunasan ${newInvoice.invoiceNo} (${finalCustomerName}) via ${paymentMethod}`,
      referenceNo: newInvoice.invoiceNo,
      operator: 'Kasir Pet Shop'
    });

    deductStockForCart(newInvoice.invoiceNo);

    if (!isGuest && selectedCustomer) {
      let pointsChange = earnedPoints;
      if (draft.useLoyaltyPoints && pointDiscountRupiah > 0) {
        const pointsRedeemed = Math.ceil(pointDiscountRupiah / 1000);
        pointsChange -= pointsRedeemed;
      }
      if (pointsChange !== 0) {
        adjustCustomerPoints(selectedCustomer.id, pointsChange, `Transaksi POS #${newInvoice.invoiceNo}`);
      }
    }

    finishSaleUi(newInvoice, paymentMethod);
    isCompletingSaleRef.current = false;
  };

  // Membuat charge QRIS nyata via Midtrans untuk transaksi POS. Invoice dibuat
  // dulu sebagai 'Belum Dibayar' — stok & poin loyalti baru diproses SETELAH
  // pembayaran benar terkonfirmasi (settlement), bukan langsung saat checkout
  // diklik seperti sebelumnya. Kalau gateway belum dikonfigurasi, backend balas
  // simulated:true dan UI fallback ke QR dekoratif + tombol konfirmasi manual.
  const handleStartQrisSale = async () => {
    const isGuest = isGuestCustomer;
    const finalCustomerId = isGuest ? 'guest' : (selectedCustomer?.id || 'guest');
    const finalCustomerName = isGuest ? (guestName.trim() || 'Pelanggan Umum (Walk-in)') : (selectedCustomer?.name || 'Pelanggan Umum');

    const pendingInvoice = addInvoice({
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      items: buildInvoiceItems(),
      subtotal: cartSubtotal,
      discountAmount: totalDiscount,
      totalAmount: grandTotal,
      paidAmount: 0,
      paymentMethod: 'QRIS',
      status: 'Belum Dibayar',
      loyaltyPointsEarned: 0,
      cashierName: 'Kasir Pet Shop'
    });

    stopQrisPolling();
    setQrisPhase('loading');
    setQrisImageUrl(null);
    setQrisMessage('');
    setPendingQrisInvoice(pendingInvoice);

    const result = await createQrisPayment(pendingInvoice.invoiceNo, grandTotal, finalCustomerName);

    if (result.simulated) {
      setQrisPhase('waiting_simulated');
      return;
    }
    if (!result.success || !result.qrImageUrl) {
      setQrisPhase('failed');
      setQrisMessage(result.message || 'Gagal membuat kode QRIS. Coba lagi.');
      return;
    }

    setQrisImageUrl(result.qrImageUrl);
    setQrisPhase('waiting_real');

    qrisPollRef.current = pollPaymentStatus(pendingInvoice.invoiceNo, {
      onSettled: (status: PaymentStatus) => {
        if (status === 'settlement') {
          finalizeQrisSale(pendingInvoice, isGuest);
        } else {
          setQrisPhase('failed');
          setQrisMessage(
            status === 'expire' ? 'Kode QRIS kedaluwarsa sebelum dibayar.' : 'Pembayaran dibatalkan atau ditolak.'
          );
        }
      }
    });
  };

  // Konfirmasi manual untuk mode simulasi (gateway belum dikonfigurasi) — sama
  // seperti jalur non-QRIS, tapi invoice-nya sudah terlanjur dibuat 'Belum
  // Dibayar' oleh handleStartQrisSale sehingga tinggal melunaskan.
  const handleConfirmSimulatedQris = (pendingInvoice: any) => {
    finalizeQrisSale(pendingInvoice, isGuestCustomer);
  };

  const finalizeQrisSale = (pendingInvoice: any, isGuest: boolean) => {
    const pointsRedeemed =
      !isGuest && draft.useLoyaltyPoints && pointDiscountRupiah > 0 ? Math.ceil(pointDiscountRupiah / 1000) : 0;

    processPayment(pendingInvoice.id, 'QRIS', pointsRedeemed);
    deductStockForCart(pendingInvoice.invoiceNo);

    addToast(`Pembayaran QRIS Rp ${grandTotal.toLocaleString('id-ID')} untuk ${pendingInvoice.invoiceNo} berhasil dikonfirmasi!`, 'success');

    stopQrisPolling();
    setQrisPhase('idle');
    setQrisImageUrl(null);
    setPendingQrisInvoice(null);

    finishSaleUi({ ...pendingInvoice, status: 'Lunas', paidAmount: grandTotal, loyaltyPointsEarned: isGuest ? 0 : earnedPoints }, 'QRIS');
  };

  // Image placeholder mapping based on product category
  const getProductImage = (category: string) => {
    switch (category) {
      case 'Makanan':
        return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&auto=format&fit=crop&q=80';
      case 'Pasir Kucing':
        return 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&auto=format&fit=crop&q=80';
      case 'Vitamin':
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80';
      case 'Aksesoris':
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&auto=format&fit=crop&q=80';
      case 'Mainan':
        return 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=400&auto=format&fit=crop&q=80';
      case 'Kandang':
        return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80';
      default:
        return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&auto=format&fit=crop&q=80';
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={ShoppingBag}
        title="Point of Sale Pet Shop & Pemotongan Stok Otomatis"
        description="Katalog produk ritel, integrasi member loyalty points, cetak struk kasir thermal & sinkronisasi stok real-time."
        badges={[
          { label: 'POS & Ritel Pet Shop', variant: 'gold' },
          { label: `${stockItems.length} Item Katalog`, variant: 'blue' },
          { label: `${customers.length} Member Loyalty`, variant: 'emerald' }
        ]}
        actions={
          <div className="bg-[#101A2C] px-3 py-1.5 rounded-lg border border-[#B8905A]/40 text-xs flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#D9B98A]" />
            <span className="font-bold text-[#FFFDF9]">{draft.cart.length} Item</span>
            <span className="text-[#D9B98A] font-mono font-bold">
              Rp {cartSubtotal.toLocaleString('id-ID')}
            </span>
          </div>
        }
      />

      {/* View Switcher Tabs (Kasir POS vs Analisis Kategori Recharts) */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-1.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCurrentView('pos')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentView === 'pos'
                ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs font-black'
                : 'text-[#1B2A45]/70 hover:text-[#1B2A45] hover:bg-[#F6F1E6]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Kasir POS & Katalog Produk</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('analytics')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentView === 'analytics'
                ? 'bg-[#B8905A] text-[#101A2C] shadow-xs font-black'
                : 'text-[#1B2A45]/70 hover:text-[#1B2A45] hover:bg-[#F6F1E6]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visualisasi Penjualan Kategori (Recharts)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-900 font-extrabold uppercase ml-0.5">
              Chart
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettlementModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-pointer shadow-2xs"
            title="Buka Formulir Rekonsiliasi & Tutup Shift Kasir (End of Shift)"
          >
            <Coins className="w-4 h-4 text-emerald-700" />
            <span>Tutup Shift Kasir</span>
          </button>
        </div>

        {/* Quick Cart Status & Actions in POS view */}
        {currentView === 'pos' && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowBarcodeScannerModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#1B2A45] to-[#101A2C] hover:brightness-110 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#D9B98A]" />
              <span>Scan Barcode Kamera</span>
            </button>

            {draft.cart.length > 0 && (
              <>
                <span className="text-xs text-[#6B6656]">
                  {draft.cart.length} item
                </span>
                <button
                  onClick={discardDraft}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Kosongkan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {currentView === 'analytics' ? (
        <PetShopCategoryAnalytics onBackToPOS={() => setCurrentView('pos')} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Product Catalog & Search */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6656]" />
                <input
                  type="text"
                  placeholder="Cari produk / scan SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                        : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#E1D6BE]/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Guest Mode POS Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#E1D6BE]/70 text-xs">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${isGuestMode ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E1D6BE]/40 text-[#6B6656]'}`}>
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-[#1B2A45] text-xs">Mode Tamu (Guest Mode)</span>
                  <span className="text-[10px] text-[#6B6656] ml-2 hidden sm:inline">
                    {isGuestMode
                      ? '• Tanpa pilih profil pelanggan, 1-klik Quick-Add barang ke keranjang kasir'
                      : '• Mode Member Aktif (Poin loyalitas & profil pelanggan digunakan)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isGuestMode
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#F6F1E6] text-[#6B6656] border border-[#E1D6BE]'
                }`}>
                  {isGuestMode ? '🟢 Guest Mode ON' : '⚪ Member Mode'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleGuestMode(!isGuestMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isGuestMode ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Guest Mode"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isGuestMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const inCartItem = draft.cart.find((i) => i.id === prod.id);
              const inCartQty = inCartItem?.quantity || 0;
              const isOutOfStock = prod.stock <= 0;

              const isClearance = prod.isClearanceSale && prod.clearanceDiscountPercent;
              const discountedPrice = isClearance
                ? Math.round(prod.sellingPrice * (1 - (prod.clearanceDiscountPercent || 0) / 100))
                : prod.sellingPrice;

              return (
                <div
                  key={prod.id}
                  className={`bg-[#FFFDF9] rounded-xl border ${
                    inCartQty > 0
                      ? 'border-[#B8905A] ring-1 ring-[#B8905A]'
                      : isClearance
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-[#E1D6BE]'
                  } p-3 shadow-2xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden`}
                >
                  <div className="space-y-2">
                    <div className="aspect-4/3 rounded-lg bg-slate-100 overflow-hidden relative">
                      <img
                        src={getProductImage(prod.category)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-[#1B2A45]/90 text-[#D9B98A] text-[9px] font-bold px-2 py-0.5 rounded">
                        {prod.category}
                      </span>
                      {isClearance && (
                        <span className="absolute top-1.5 right-1.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 animate-pulse">
                          <Tag className="w-2.5 h-2.5" />
                          SALE -{prod.clearanceDiscountPercent}%
                        </span>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white font-bold text-[10px] uppercase px-2.5 py-1 rounded shadow-md">
                            Stok Habis
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#B8905A] font-bold">{prod.sku}</span>
                        {isClearance && (
                          <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            Cuci Gudang
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#1B2A45] line-clamp-2 leading-snug">{prod.name}</h4>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E1D6BE]/60 mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        {isClearance ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] line-through text-slate-400 font-medium leading-none">
                              Rp {prod.sellingPrice.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs font-black text-rose-600">
                              Rp {discountedPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#1B2A45]">
                            Rp {prod.sellingPrice.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          prod.stock <= prod.minStock ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        Sisa {prod.stock} {prod.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(prod)}
                      disabled={isOutOfStock}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'bg-[#B8905A] text-[#FFFDF9] hover:bg-[#9E7848]'
                          : isClearance
                          ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:opacity-90 shadow-2xs'
                          : 'bg-[#1B2A45] text-[#FFFDF9] hover:bg-[#101A2C]'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {inCartQty > 0 ? `Tambah (${inCartQty})` : isClearance ? 'Beli Promo' : 'Beli'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Shopping Cart Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
            {/* Header & Guest Mode / Customer Control */}
            <div className="border-b border-[#E1D6BE] pb-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#B8905A]" /> Keranjang Kasir POS
                </h3>
                <span className="text-xs text-[#6B6656] font-medium">{draft.cart.length} Jenis</span>
              </div>

              {/* Dedicated Guest Mode Toggle Card */}
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  isGuestMode
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-[#F6F1E6] border-[#E1D6BE]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md ${isGuestMode ? 'bg-emerald-200/70 text-emerald-800' : 'bg-[#E1D6BE]/60 text-[#6B6656]'}`}>
                      <UserX className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1B2A45]">Mode Tamu (Guest Mode)</p>
                      <p className="text-[10px] text-[#6B6656]">
                        {isGuestMode ? 'Tanpa pilih profil pelanggan • Quick-Add aktif' : 'Mode Member (Poin loyalitas aktif)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleGuestMode(!isGuestMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isGuestMode ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    aria-label="Toggle Guest Mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isGuestMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isGuestMode ? (
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/70 space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-emerald-950">
                          Nama di Struk Kasir:
                        </label>
                        <span className="text-[9px] text-emerald-700 font-medium">Opsional</span>
                      </div>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Pelanggan Umum (Walk-in)"
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-emerald-300 text-[#1B2A45] font-medium focus:outline-hidden focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-emerald-800">
                      <span className="flex items-center gap-1 font-semibold">
                        <Zap className="w-3 h-3 text-emerald-600" />
                        Quick-Add langsung ke kasir
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickRegisterModal(true)}
                        className="text-[10px] font-bold text-[#B8905A] hover:underline"
                      >
                        + Daftar Member
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 pt-2 border-t border-[#E1D6BE] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#1B2A45]">
                        Pilih Profil Member:
                      </label>
                      <button
                        onClick={() => setShowQuickRegisterModal(true)}
                        className="text-[10px] font-bold text-[#B8905A] hover:text-[#9E7848] flex items-center gap-1 hover:underline"
                      >
                        <UserPlus className="w-3 h-3" /> + Member Baru
                      </button>
                    </div>

                    <select
                      value={draft.selectedCustomerId}
                      onChange={(e) => updateDraft({ selectedCustomerId: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - {c.loyaltyPoints} Poin
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between text-[10px] text-[#6B6656]">
                      <span>
                        Member Loyalty: <strong className="text-[#B8905A] font-bold">{selectedCustomer?.loyaltyPoints || 0} Poin</strong>
                      </span>
                      <span>
                        Estimasi Poin: <strong className="text-emerald-700 font-bold">+{earnedPoints} Poin</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-[#E1D6BE] pr-1 space-y-2">
              {draft.cart.length > 0 ? (
                draft.cart.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-[#1B2A45] truncate">{item.name}</p>
                        {item.isClearanceSale && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold border border-rose-200">
                            Clearance -{item.clearanceDiscountPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6B6656]">
                        Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
                        {item.originalPrice && item.originalPrice !== item.price && (
                          <span className="line-through text-slate-400 ml-1">
                            (Rp {item.originalPrice.toLocaleString('id-ID')})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="p-1 rounded bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="p-1 rounded bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#6B6656] space-y-1">
                  <ShoppingBag className="w-8 h-8 mx-auto text-[#B8905A]/50" />
                  <p className="font-medium">Keranjang kasir masih kosong.</p>
                  <p className="text-[10px]">Klik tombol "Beli" pada produk untuk menambahkan.</p>
                </div>
              )}
            </div>

            {/* Discount & Voucher section */}
            <div className="border-t border-[#E1D6BE] pt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#B8905A]" />
                <input
                  type="text"
                  placeholder="Kode Voucher (PETCARE10)"
                  value={draft.voucherCode}
                  onChange={(e) => updateDraft({ voucherCode: e.target.value })}
                  className="flex-1 p-1.5 text-xs bg-[#F6F1E6] rounded border border-[#E1D6BE] uppercase font-bold"
                />
                <button
                  onClick={handleApplyVoucher}
                  className="px-3 py-1.5 bg-[#1B2A45] text-[#FFFDF9] font-bold rounded text-xs"
                >
                  Pasang
                </button>
              </div>

              {availablePoints > 0 && (
                <label className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.useLoyaltyPoints}
                    onChange={(e) => updateDraft({ useLoyaltyPoints: e.target.checked })}
                    className="accent-[#B8905A]"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-amber-900">Tukar {availablePoints} Poin Loyalty</span>
                    <p className="text-[10px] text-amber-700">Potongan Rp {pointDiscountRupiah.toLocaleString('id-ID')}</p>
                  </div>
                </label>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-[#101A2C] text-[#FFFDF9] rounded-xl p-3.5 space-y-2 text-xs border border-[#B8905A]/30">
              <div className="flex justify-between text-[#EDE6D6]/80">
                <span>Subtotal Items:</span>
                <span className="font-bold">Rp {cartSubtotal.toLocaleString('id-ID')}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Total Potongan Diskon:</span>
                  <span className="font-bold">- Rp {totalDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-[#EDE6D6]/80">
                <span>PPN {activeTaxRatePercent}%:</span>
                <span className="font-bold">Rp {taxPPN.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2 text-sm font-extrabold text-[#D9B98A]">
                <span>Total Bayar:</span>
                <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => {
                if (draft.cart.length === 0) {
                  addToast('Keranjang masih kosong.', 'error');
                  return;
                }
                setCashPaid(grandTotal);
                setShowCheckoutModal(true);
              }}
              disabled={draft.cart.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                draft.cart.length > 0
                  ? 'bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Lanjut ke Pembayaran Kasir
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#B8905A]" /> Pembayaran Kasir Pet Shop
              </h3>
              <button
                onClick={() => {
                  stopQrisPolling();
                  setQrisPhase('idle');
                  setQrisImageUrl(null);
                  setPendingQrisInvoice(null);
                  setShowCheckoutModal(false);
                }}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#1B2A45] p-3 rounded-xl text-[#FFFDF9] space-y-1">
                <p className="text-[10px] text-[#D9B98A]">Total Tagihan Kasir:</p>
                <p className="text-xl font-extrabold text-[#FFFDF9]">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-[#EDE6D6]/80">
                  Pelanggan: {isGuestCustomer ? (guestName.trim() || 'Pelanggan Umum (Walk-in)') : selectedCustomer?.name}
                </p>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['QRIS', 'Tunai', 'Debit', 'Kartu Kredit', 'Transfer Bank'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${
                        paymentMethod === m
                          ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45]'
                          : 'bg-[#F6F1E6] text-[#22242B] border-[#E1D6BE]'
                      }`}
                    >
                      {m === 'QRIS' && <QrCode className="w-4 h-4 text-[#D9B98A]" />}
                      {m === 'Tunai' && <Banknote className="w-4 h-4 text-[#D9B98A]" />}
                      {(m === 'Debit' || m === 'Kartu Kredit') && <CreditCard className="w-4 h-4 text-[#D9B98A]" />}
                      {m === 'Transfer Bank' && <Receipt className="w-4 h-4 text-[#D9B98A]" />}
                      <span>{paymentMethodLabels[m]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QRIS Display */}
              {paymentMethod === 'QRIS' && (
                <div className="p-4 bg-white border border-[#E1D6BE] rounded-xl text-center space-y-2">
                  {qrisPhase === 'loading' && (
                    <div className="w-36 h-36 mx-auto flex flex-col items-center justify-center gap-2 text-[#1B2A45]">
                      <Loader2 className="w-7 h-7 animate-spin text-[#B8905A]" />
                      <span className="text-[10px]">Membuat kode QRIS...</span>
                    </div>
                  )}

                  {qrisPhase === 'waiting_real' && qrisImageUrl && (
                    <>
                      <p className="text-[11px] font-bold text-[#1B2A45]">Scan QRIS untuk Bayar</p>
                      <div className="w-36 h-36 mx-auto bg-white rounded-lg p-1 flex items-center justify-center border border-[#E1D6BE]">
                        <img src={qrisImageUrl} alt="Kode QRIS pembayaran" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menunggu pembayaran pelanggan...
                      </p>
                    </>
                  )}

                  {qrisPhase === 'failed' && (
                    <div className="w-36 h-36 mx-auto flex flex-col items-center justify-center gap-2 text-rose-600">
                      <AlertTriangle className="w-7 h-7" />
                      <span className="text-[10px] px-2">{qrisMessage}</span>
                      <button
                        onClick={handleStartQrisSale}
                        className="px-2.5 py-1 bg-[#B8905A] text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Buat Ulang QRIS
                      </button>
                    </div>
                  )}

                  {(qrisPhase === 'idle' || qrisPhase === 'waiting_simulated') && (
                    <>
                      <p className="text-[11px] font-bold text-[#1B2A45]">Scan QRIS Statis / Dinamis</p>
                      <div className="w-36 h-36 mx-auto bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white">
                        <QrCode className="w-28 h-28 text-white" />
                      </div>
                      <p className="text-[10px] text-[#6B6656]">
                        {qrisPhase === 'waiting_simulated'
                          ? 'Mode simulasi — payment gateway belum dikonfigurasi (MIDTRANS_SERVER_KEY)'
                          : 'Gopay, OVO, Dana, ShopeePay, BCA, Mandiri'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Cash Input */}
              {paymentMethod === 'Tunai' && (
                <div className="space-y-2">
                  <label className="font-bold text-[#1B2A45] block">Jumlah Tunai Diterima</label>
                  <input
                    type="number"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-sm text-[#1B2A45]"
                  />

                  <div className="flex gap-2">
                    {[50000, 100000, 200000, 500000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setCashPaid(val)}
                        className="px-2 py-1 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[10px] font-bold text-[#1B2A45] rounded"
                      >
                        Rp {val.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between text-xs font-bold text-emerald-900">
                    <span>Kembalian:</span>
                    <span>Rp {Math.max(0, cashPaid - grandTotal).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* Auto-Print Thermal Receipt Toggle */}
              <div className="p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${autoPrintEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1B2A45]">Auto-Print Struk Kasir</p>
                    <p className="text-[10px] text-[#6B6656]">Cetak otomatis ke Thermal Printer saat pembayaran sukses</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoPrintEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Auto-Print Struk"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoPrintEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {paymentMethod === 'QRIS' && qrisPhase === 'waiting_real' ? (
                <button
                  disabled
                  className="w-full py-3 bg-[#B8905A]/50 text-white/80 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Menunggu Pelanggan Bayar QRIS
                </button>
              ) : (
                <button
                  onClick={
                    paymentMethod === 'QRIS' && qrisPhase === 'waiting_simulated' && pendingQrisInvoice
                      ? () => handleConfirmSimulatedQris(pendingQrisInvoice)
                      : handleCompleteSale
                  }
                  disabled={paymentMethod === 'QRIS' && qrisPhase === 'loading'}
                  className="w-full py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {autoPrintEnabled ? 'Selesaikan Transaksi & Auto-Print Struk' : 'Selesaikan Transaksi Kasir'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Struk Kasir Thermal Modal */}
      {showStrukModal && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl text-slate-900 font-mono text-xs space-y-3 relative overflow-hidden">
            {/* Auto-Print Simulation Banner */}
            {isSimulatingPrint ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 font-sans space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
                    {printStage === 'transmitting' ? 'Mengirim Data ke Thermal Printer 80mm...' : 'Memotong Kertas Struk (Auto-Cutter)...'}
                  </span>
                  <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">ESC/POS</span>
                </div>
                <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                  <div className={`bg-amber-600 h-full transition-all duration-700 ${printStage === 'transmitting' ? 'w-1/2' : 'w-full'}`} />
                </div>
              </div>
            ) : printStage === 'done' || autoPrintEnabled ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-emerald-900 font-sans flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px] leading-tight">Auto-Print Berhasil</p>
                    <p className="text-[10px] text-emerald-700">Struk thermal telah dicetak otomatis</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[10px] font-bold">Thermal OK</span>
              </div>
            ) : null}

            {/* Paper Feed Receipt Simulation Header */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 font-sans">PETCARE ANIMAL CLINIC & SHOP</h3>
              <p className="text-[10px] text-slate-500 font-sans">Jl. Petcare Utama No. 88, Jakarta • Telp: (021) 555-8899</p>
              <p className="text-[9px] text-slate-400">NPWP: 01.234.567.8-012.000</p>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span>No. Struk:</span><span className="font-bold">{completedInvoice.invoiceNo}</span></div>
              <div className="flex justify-between"><span>Tanggal:</span><span>{completedInvoice.date}</span></div>
              <div className="flex justify-between"><span>Kasir:</span><span>{completedInvoice.cashierName}</span></div>
              <div className="flex justify-between"><span>Pelanggan:</span><span>{completedInvoice.customerName}</span></div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5 text-[10px]">
              {completedInvoice.items.map((item: any) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{item.name}</span>
                    <span>Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-slate-500">{item.quantity} x Rp {item.unitPrice.toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>Rp {completedInvoice.subtotal.toLocaleString('id-ID')}</span></div>
              {completedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Diskon:</span><span>- Rp {completedInvoice.discountAmount.toLocaleString('id-ID')}</span></div>
              )}
              <div className="flex justify-between"><span>PPN {activeTaxRatePercent}%:</span><span>Rp {completedInvoice.taxPPN.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between font-bold text-xs text-slate-900 border-t border-slate-200 pt-1">
                <span>TOTAL:</span>
                <span>Rp {completedInvoice.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between"><span>Metode:</span><span>{completedInvoice.paymentMethod}</span></div>
              {completedInvoice.paymentMethod === 'Tunai' && (
                <>
                  <div className="flex justify-between"><span>Diterima:</span><span>Rp {completedInvoice.cashPaid.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Kembalian:</span><span>Rp {completedInvoice.changeAmount.toLocaleString('id-ID')}</span></div>
                </>
              )}
            </div>

            <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-1 text-[9px] text-slate-500 font-sans">
              <p className="font-bold">Terima kasih atas kunjungan Anda!</p>
              {completedInvoice.loyaltyPointsEarned > 0 ? (
                <p className="text-emerald-700 font-bold">Poin Loyalty Diterima: +{completedInvoice.loyaltyPointsEarned} Poin</p>
              ) : (
                <p>Status: Pembeli Umum (Non-Member)</p>
              )}
              <p>Barang yang sudah dibeli tidak dapat ditukar.</p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 font-sans">
              <button
                onClick={() => setShowStrukModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Selesai & Tutup
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => runSimulatedPrint(completedInvoice.invoiceNo)}
                  disabled={isSimulatingPrint}
                  className="px-3 py-1.5 bg-[#E1D6BE]/50 hover:bg-[#E1D6BE] text-[#1B2A45] text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-[#E1D6BE]"
                  title="Simulasikan cetak ulang ke Thermal Printer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#B8905A]" />
                  <span>Cetak Ulang</span>
                </button>
                <button
                  onClick={() => {
                    window.print();
                    addToast('Mencetak struk kasir thermal via browser dialog...', 'info');
                  }}
                  className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Cetak via dialog sistem browser"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D9B98A]" />
                  <span>Print Browser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Member Registration Modal */}
      {showQuickRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#B8905A]" /> Registrasi Member Baru Cepat (POS)
              </h3>
              <button
                onClick={() => setShowQuickRegisterModal(false)}
                className="text-xs font-bold text-[#6B6656] hover:bg-[#E1D6BE]/40 px-2 py-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickRegister} className="space-y-3 text-xs">
              <p className="text-[11px] text-[#6B6656]">
                Daftarkan pembeli agar langsung mendapatkan poin loyalty dan promo khusus member pada transaksi ini.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-[#1B2A45] block">
                  Nama Lengkap Pemilik <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1B2A45] block">
                  No. WhatsApp / HP <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1B2A45] block">
                  Alamat Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kemang, Jakarta Selatan"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickRegisterModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#D9B98A]" /> Simpan & Pilih di Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Drawer Settlement / End of Shift Modal */}
      {showSettlementModal && (
        <CashDrawerSettlementModal onClose={() => setShowSettlementModal(false)} />
      )}

      {/* Live Camera Barcode Scanner Modal */}
      {showBarcodeScannerModal && (
        <BarcodeCameraScanner
          onClose={() => setShowBarcodeScannerModal(false)}
          onScanItem={(scannedItem) => handleAddToCart(scannedItem)}
        />
      )}
    </div>
  );
};
