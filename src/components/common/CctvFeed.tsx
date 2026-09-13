import React, { useState, useEffect } from 'react';
import {
  Camera,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  VolumeX,
  Volume2,
  Moon,
  Sun,
  Activity,
  Download,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface CctvFeedProps {
  roomNo: string;
  petName?: string;
  petSpecies?: string;
  ownerName?: string;
  roomType?: string;
  statusNotes?: string;
  onOpenFullscreen?: () => void;
}

export const CctvFeed: React.FC<CctvFeedProps> = ({
  roomNo,
  petName = 'Milo',
  petSpecies = 'Anjing',
  ownerName = 'Andri Santoso',
  roomType = 'VIP CCTV',
  statusNotes = 'Tenang & sedang beristirahat',
  onOpenFullscreen,
}) => {
  const { addToast } = useToast();
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString('id-ID'));
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(true);
  const [nightVision, setNightVision] = useState(false);

  // Stock pet images for CCTV simulation
  const petImages: Record<string, string> = {
    R01: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=800',
    R02: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800',
    R03: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800',
    R04: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=800',
  };

  const bgUrl =
    petImages[roomNo] ||
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString('id-ID'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTakeSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToast(`Snapshot kamera Kamar ${roomNo} (${petName}) berhasil disimpan ke galeri dokumen!`, 'success');
  };

  const cycleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  return (
    <div className="relative rounded-2xl bg-[#0F172A] border border-[#1E293B] overflow-hidden shadow-lg group select-none transition-all">
      {/* Video Stream Container */}
      <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center">
        <img
          src={bgUrl}
          alt={`CCTV Kamar ${roomNo}`}
          style={{
            transform: `scale(${zoomLevel})`,
            filter: nightVision
              ? 'grayscale(100%) brightness(130%) contrast(140%) sepia(20%) hue-rotate(90deg)'
              : 'contrast(105%) brightness(95%)'
          }}
          className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
        />

        {/* Night Vision Scanlines Overlay */}
        {nightVision && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,255,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
        )}

        {/* Demo Status Overlay - Top Left */}
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black tracking-wider uppercase shadow-md">
            Pratinjau Demo
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-slate-200 text-[10px] font-mono font-bold border border-white/10">
            {roomNo}
          </span>
          {nightVision && (
            <span className="px-2 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <Moon className="w-3 h-3" /> NV ACTIVE
            </span>
          )}
        </div>

        {/* Clock - Top Right (waktu asli perangkat, bukan sensor kamera) */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-mono font-bold border border-white/10">
            {timestamp}
          </div>
        </div>

        {/* Quick Stream Controls Overlay (Hover / Bottom Right) */}
        <div className="absolute top-12 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/15">
          <button
            type="button"
            onClick={cycleZoom}
            className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors text-[10px] font-mono font-bold"
            title="Zoom Digital (1x, 1.5x, 2x)"
          >
            {zoomLevel}x
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNightVision(!nightVision);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              nightVision ? 'bg-emerald-500/40 text-emerald-300' : 'hover:bg-white/20 text-slate-200'
            }`}
            title="Toggle Night Vision Inframerah"
          >
            {nightVision ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors"
            title={isMuted ? 'Nyalakan Audio Ruangan' : 'Matikan Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          <button
            type="button"
            onClick={handleTakeSnapshot}
            className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors"
            title="Ambil Foto Snapshot"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
          </button>
          {onOpenFullscreen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFullscreen();
              }}
              className="p-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition-colors"
              title="Layar Penuh CCTV"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Pet Information Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3.5 flex items-end justify-between text-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{petName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-slate-200 font-semibold">
                {petSpecies}
              </span>
              <span className="text-[10px] text-amber-300 font-medium">({roomType})</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Pemilik: <span className="text-white font-medium">{ownerName}</span> • <span className="italic text-emerald-300">{statusNotes}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold border border-white/15 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#D9B98A]" />
              <span>Snapshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
