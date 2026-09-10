import React, { useState } from 'react';
import { CctvFeed } from './CctvFeed';
import {
  Camera,
  Grid,
  Maximize2,
  X,
  ShieldCheck,
  Thermometer,
  Activity,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface RoomCamera {
  roomNo: string;
  petName: string;
  petSpecies: string;
  ownerName: string;
  roomType: string;
  temperature: number;
  humidity: number;
  statusNotes: string;
  category: 'hotel' | 'icu';
}

export const ROOMS_DATA: RoomCamera[] = [
  {
    roomNo: 'R01',
    petName: 'Milo',
    petSpecies: 'Anjing Golden',
    ownerName: 'Andri Santoso',
    roomType: 'VIP CCTV Suite',
    temperature: 23.5,
    humidity: 52,
    statusNotes: 'Nafsu makan baik, sedang tidur',
    category: 'hotel'
  },
  {
    roomNo: 'R02',
    petName: 'Luna',
    petSpecies: 'Kucing British Shorthair',
    ownerName: 'Siti Rahma',
    roomType: 'Deluxe Cat Suite',
    temperature: 24.1,
    humidity: 50,
    statusNotes: 'Aktif bermain bola wol',
    category: 'hotel'
  },
  {
    roomNo: 'R03',
    petName: 'Max',
    petSpecies: 'French Bulldog',
    ownerName: 'Dewi Lestari',
    roomType: 'Small Suite AC',
    temperature: 23.8,
    humidity: 55,
    statusNotes: 'Jadwal makan malam selesai',
    category: 'hotel'
  },
  {
    roomNo: 'R04',
    petName: 'Oreo',
    petSpecies: 'Kucing Ragdoll',
    ownerName: 'Ahmad Dani',
    roomType: 'Ruang Rawat Inap & ICU',
    temperature: 24.5,
    humidity: 58,
    statusNotes: 'Monitoring infus IV D5% normal',
    category: 'icu'
  },
];

interface CctvMonitorProps {
  onClose?: () => void;
}

export const CctvMonitor: React.FC<CctvMonitorProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hotel' | 'icu'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredRooms = ROOMS_DATA.filter((r) => activeFilter === 'all' || r.category === activeFilter);
  const activeRoomObj = ROOMS_DATA.find((r) => r.roomNo === selectedRoom);

  const handleRefreshFeeds = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Seluruh stream CCTV & sensor telemetri lingkungan berhasil disinkronkan!', 'success');
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1B2A45] p-4 rounded-2xl text-[#FFFDF9] border border-[#B8905A]/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FFFDF9]/10 text-[#D9B98A] rounded-xl border border-white/10">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#FFFDF9] font-display">
                Live CCTV & Surveillance Telemetri
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                4 Stream Online
              </span>
            </div>
            <p className="text-xs text-[#E1D6BE]">
              Pemantauan visual waktu-nyata kamar Pet Hotel, ICU Rawat Inap, sensor suhu & deteksi gerakan aktif.
            </p>
          </div>
        </div>

        {/* Filter Tabs & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-2xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Semua ({ROOMS_DATA.length})
            </button>
            <button
              onClick={() => setActiveFilter('hotel')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'hotel'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-2xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Pet Hotel
            </button>
            <button
              onClick={() => setActiveFilter('icu')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'icu'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-2xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ICU & Inap
            </button>
          </div>

          <button
            onClick={handleRefreshFeeds}
            className={`p-2 bg-white/10 hover:bg-white/20 text-[#FFFDF9] rounded-xl border border-white/15 transition-all cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Seluruh Feed Kamera"
          >
            <RefreshCw className="w-4 h-4 text-[#D9B98A]" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-[#FFFDF9] rounded-xl border border-white/15 cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of CCTV Feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRooms.map((r) => (
          <CctvFeed
            key={r.roomNo}
            roomNo={r.roomNo}
            petName={r.petName}
            petSpecies={r.petSpecies}
            ownerName={r.ownerName}
            roomType={r.roomType}
            temperature={r.temperature}
            humidity={r.humidity}
            statusNotes={r.statusNotes}
            onOpenFullscreen={() => setSelectedRoom(r.roomNo)}
          />
        ))}
      </div>

      {/* Fullscreen Popup Modal */}
      {selectedRoom && activeRoomObj && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRoom(null);
          }}
        >
          <div 
            className="relative w-full max-w-5xl bg-[#0F172A] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl space-y-3 p-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-500 animate-pulse" />
                <h4 className="font-bold text-white text-sm">
                  Layar Penuh CCTV — {activeRoomObj.roomNo} ({activeRoomObj.petName} - {activeRoomObj.petSpecies})
                </h4>
                <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-xs">
                  {activeRoomObj.roomType}
                </span>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-1">
              <CctvFeed
                roomNo={activeRoomObj.roomNo}
                petName={activeRoomObj.petName}
                petSpecies={activeRoomObj.petSpecies}
                ownerName={activeRoomObj.ownerName}
                roomType={activeRoomObj.roomType}
                temperature={activeRoomObj.temperature}
                humidity={activeRoomObj.humidity}
                statusNotes={activeRoomObj.statusNotes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
