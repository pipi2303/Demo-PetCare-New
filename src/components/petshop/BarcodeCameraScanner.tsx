import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  X,
  Camera,
  Flashlight,
  Volume2,
  VolumeX,
  CheckCircle2,
  Package,
  Barcode,
  Search,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { StockItem } from '../../types';

interface BarcodeCameraScannerProps {
  onClose: () => void;
  onScanItem: (item: StockItem) => void;
}

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({
  onClose,
  onScanItem
}) => {
  const { stockItems = [] } = useData();
  const { addToast } = useToast();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [lastScannedItem, setLastScannedItem] = useState<StockItem | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play scanner beep
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // A6 high pitch scanner beep
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  };

  // Start webcam if permission allowed
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('Camera access not available or denied:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleBarcodeDetected = (code: string) => {
    const clean = code.trim().toLowerCase();
    const matched = stockItems.find(
      (item) =>
        item.sku.toLowerCase() === clean ||
        item.name.toLowerCase().includes(clean) ||
        (item.batchNumber && item.batchNumber.toLowerCase() === clean)
    );

    if (matched) {
      playScanBeep();
      setLastScannedItem(matched);
      onScanItem(matched);
      addToast(`Produk terdeteksi: ${matched.name} (Rp ${matched.sellingPrice.toLocaleString('id-ID')})`, 'success');
    } else {
      addToast(`Barcode "${code}" tidak ditemukan di database produk!`, 'error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode) return;
    handleBarcodeDetected(manualCode);
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#B8905A]/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-md">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white font-display">
                Scanner Barcode POS
              </h3>
              <p className="text-[11px] text-[#E1D6BE]/80">Pratinjau kamera saja — pindai lewat Klik Cepat atau ketik kode manual di bawah</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-[#E1D6BE]/70 hover:text-white rounded-lg cursor-pointer"
              title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#D9B98A]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#E1D6BE]/70 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="p-5 space-y-4 text-[#101A2C]">
          <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-700">
            {/* Live Video Feed or Fallback Animation */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Target Reticle Overlay */}
            <div className="relative z-10 w-48 h-32 border-2 border-[#D9B98A] rounded-xl flex flex-col items-center justify-between p-2 shadow-2xl backdrop-blur-[1px]">
              {/* Corner Indicators */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#B8905A] -translate-x-0.5 -translate-y-0.5" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#B8905A] translate-x-0.5 -translate-y-0.5" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#B8905A] -translate-x-0.5 translate-y-0.5" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#B8905A] translate-x-0.5 translate-y-0.5" />

              <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                PRATINJAU KAMERA
              </span>
            </div>

            {/* Kejujuran fitur: kamera di sini hanya pratinjau visual — belum
                ada decoding barcode otomatis dari frame video (tidak pakai
                BarcodeDetector/library pemindai). Deteksi sungguhan terjadi
                lewat tombol Klik Cepat di katalog atau input manual di
                bawah, bukan dari overlay ini. */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-xl">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Deteksi Otomatis Belum Tersedia
              </span>
              <span className="font-mono text-amber-300 font-bold">Gunakan Klik Cepat / Manual</span>
            </div>
          </div>

          {/* Last Scanned Item Banner */}
          {lastScannedItem && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">{lastScannedItem.name}</h4>
                  <p className="text-[11px] text-emerald-700">SKU: {lastScannedItem.sku} • Rp {lastScannedItem.sellingPrice.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg">
                Masuk Keranjang
              </span>
            </div>
          )}

          {/* Quick Barcode Simulators / Fast Taps */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Pindai Cepat Produk Katalog (Klik Langsung):</span>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {stockItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleBarcodeDetected(item.sku)}
                  className="p-2 bg-slate-50 hover:bg-[#B8905A]/15 border border-slate-200 hover:border-[#B8905A] rounded-xl text-left transition-all cursor-pointer group flex items-start gap-2"
                >
                  <Barcode className="w-4 h-4 text-slate-500 group-hover:text-[#B8905A] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.sku} • Rp {item.sellingPrice.toLocaleString('id-ID')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Barcode Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200 flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ketik SKU / Barcode manual..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A] font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white font-bold rounded-xl text-xs hover:brightness-110 cursor-pointer shadow-xs"
            >
              Scan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
