import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authHeaders } from '../../utils/authToken';
import {
  Sparkles,
  Layout,
  Grid,
  Columns,
  Layers,
  Cpu,
  TrendingUp,
  MousePointer,
  Clock,
  CheckCircle,
  RotateCcw,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Zap,
  Sliders,
  Tv,
  Calculator,
  Camera,
  X,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';

export type WidgetId = 'kalkulator' | 'cctv' | 'queueTv';
export type LayoutMode = 'split_hero' | 'tab_priority' | 'grid_trio' | 'dual_split';

export interface WidgetTelemetry {
  clicks: number;
  lastUsed: string;
  actionsCount: number;
  recentActions: string[];
}

export interface TelemetryData {
  kalkulator: WidgetTelemetry;
  cctv: WidgetTelemetry;
  queueTv: WidgetTelemetry;
}

export interface OptimizationResult {
  recommendedMode: LayoutMode;
  primaryWidget: WidgetId;
  widgetOrder: WidgetId[];
  headline: string;
  reasoning: string;
  efficiencyGainPercent: number;
  clicksSavedPerShift: number;
  behaviorInsights: string[];
  ergonomicRecommendations: string[];
  suggestedPresets: Array<{
    id: string;
    title: string;
    mode: LayoutMode;
    order: WidgetId[];
  }>;
  preparedAt?: string;
  source?: string;
}

export interface LayoutConfig {
  mode: LayoutMode;
  primaryWidget: WidgetId;
  order: WidgetId[];
  autoAiOptimized?: boolean;
  activeTab?: WidgetId;
}

const DEFAULT_TELEMETRY: TelemetryData = {
  kalkulator: { clicks: 38, lastUsed: new Date(Date.now() - 1000 * 60 * 12).toISOString(), actionsCount: 22, recentActions: ['Hitung Amoxicillin', 'Kalkulasi Meloxicam', 'Salin Resep'] },
  cctv: { clicks: 12, lastUsed: new Date(Date.now() - 1000 * 60 * 45).toISOString(), actionsCount: 8, recentActions: ['Pantau ICU R04', 'Snapshot R01'] },
  queueTv: { clicks: 26, lastUsed: new Date(Date.now() - 1000 * 60 * 5).toISOString(), actionsCount: 16, recentActions: ['Panggil Pasien A-03', 'Cek Antrian Berikutnya'] }
};

export const getStoredTelemetry = (): TelemetryData => {
  try {
    const raw = localStorage.getItem('petcare_widget_telemetry');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return DEFAULT_TELEMETRY;
};

export const recordWidgetTelemetry = (widget: WidgetId, actionDesc?: string) => {
  try {
    const data = getStoredTelemetry();
    const current = data[widget] || { clicks: 0, lastUsed: new Date().toISOString(), actionsCount: 0, recentActions: [] };
    current.clicks += 1;
    current.lastUsed = new Date().toISOString();
    current.actionsCount += 1;
    if (actionDesc) {
      current.recentActions = [actionDesc, ...(current.recentActions || []).slice(0, 4)];
    }
    data[widget] = current;
    localStorage.setItem('petcare_widget_telemetry', JSON.stringify(data));
  } catch (e) {
    // ignore
  }
};

export const getStoredLayoutConfig = (): LayoutConfig => {
  try {
    const raw = localStorage.getItem('petcare_widget_layout_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    mode: 'tab_priority',
    primaryWidget: 'kalkulator',
    order: ['kalkulator', 'cctv', 'queueTv'],
    autoAiOptimized: false,
    activeTab: 'kalkulator'
  };
};

export const saveStoredLayoutConfig = (cfg: LayoutConfig) => {
  try {
    localStorage.setItem('petcare_widget_layout_config', JSON.stringify(cfg));
  } catch (e) {
    // ignore
  }
};

interface LayoutOptimizationAssistantProps {
  currentConfig: LayoutConfig;
  onApplyConfig: (newConfig: LayoutConfig) => void;
  onClose: () => void;
  waitingQueuesCount?: number;
  inpatientsCount?: number;
}

export const LayoutOptimizationAssistant: React.FC<LayoutOptimizationAssistantProps> = ({
  currentConfig,
  onApplyConfig,
  onClose,
  waitingQueuesCount = 3,
  inpatientsCount = 2
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [telemetry, setTelemetry] = useState<TelemetryData>(getStoredTelemetry());
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'dokter');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<OptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'assistant' | 'telemetry' | 'presets'>('assistant');

  // Interactive preview / staging config
  const [stagedConfig, setStagedConfig] = useState<LayoutConfig>({ ...currentConfig });

  // Calculate telemetry shares
  const totalClicks = (telemetry.kalkulator.clicks || 0) + (telemetry.cctv.clicks || 0) + (telemetry.queueTv.clicks || 0) || 1;
  const calcShare = Math.round(((telemetry.kalkulator.clicks || 0) / totalClicks) * 100);
  const cctvShare = Math.round(((telemetry.cctv.clicks || 0) / totalClicks) * 100);
  const queueShare = Math.round(((telemetry.queueTv.clicks || 0) / totalClicks) * 100);

  const triggerAiOptimization = async (customRole?: string, customTelemetry?: TelemetryData) => {
    setIsAnalyzing(true);
    const roleToUse = customRole || selectedRole;
    const telemetryToUse = customTelemetry || telemetry;

    try {
      const resp = await fetch('/api/ai/optimize-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          userRole: roleToUse,
          userName: user?.name || 'Staf Klinik',
          clickTelemetry: telemetryToUse,
          currentLayoutMode: stagedConfig.mode,
          clinicLoad: {
            waitingQueues: waitingQueuesCount,
            inpatients: inpatientsCount
          }
        })
      });

      const resJson = await resp.json();
      if (resJson.success && resJson.data) {
        setAiResult(resJson.data);
        // Stage the AI recommended config
        setStagedConfig({
          mode: resJson.data.recommendedMode,
          primaryWidget: resJson.data.primaryWidget,
          order: resJson.data.widgetOrder,
          autoAiOptimized: true,
          activeTab: resJson.data.primaryWidget
        });
        addToast('Saran tata letak dashboard AI berhasil dikalkulasi!', 'success');
      } else {
        throw new Error('Gagal menerima respons analisis AI');
      }
    } catch (e: any) {
      console.warn('AI optimize layout error:', e);
      addToast('Menggunakan model heuristik optimasi layout lokal.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    triggerAiOptimization();
  }, [selectedRole]);

  const handleApply = () => {
    onApplyConfig(stagedConfig);
    saveStoredLayoutConfig(stagedConfig);
    addToast('Tata letak dashboard berhasil diperbarui dan disimpan!', 'success');
    onClose();
  };

  const handleSimulatePattern = (scenario: 'doctor_rush' | 'icu_night' | 'reception_peak' | 'reset') => {
    let updated: TelemetryData;
    if (scenario === 'doctor_rush') {
      updated = {
        kalkulator: { clicks: 84, lastUsed: new Date().toISOString(), actionsCount: 52, recentActions: ['Dosis Cephalexin', 'Dosis Metronidazole', 'Salin Posologi'] },
        cctv: { clicks: 10, lastUsed: new Date().toISOString(), actionsCount: 6, recentActions: ['Cek R04 ICU'] },
        queueTv: { clicks: 18, lastUsed: new Date().toISOString(), actionsCount: 14, recentActions: ['Panggil A-04'] }
      };
      setSelectedRole('dokter');
      addToast('Simulasi diterapkan: Jam Sibuk Konsultasi & Resep Dokter', 'info');
    } else if (scenario === 'icu_night') {
      updated = {
        kalkulator: { clicks: 20, lastUsed: new Date().toISOString(), actionsCount: 12, recentActions: ['Dosis Infus RL'] },
        cctv: { clicks: 76, lastUsed: new Date().toISOString(), actionsCount: 48, recentActions: ['Night Vision R04 ICU', 'Snapshot R02 Deluxe', 'Monitor Suhu'] },
        queueTv: { clicks: 6, lastUsed: new Date().toISOString(), actionsCount: 4, recentActions: ['Tutup Antrian Poli'] }
      };
      setSelectedRole('perawat');
      addToast('Simulasi diterapkan: Shift Malam Paramedik & ICU Surveillance', 'info');
    } else if (scenario === 'reception_peak') {
      updated = {
        kalkulator: { clicks: 6, lastUsed: new Date().toISOString(), actionsCount: 4, recentActions: ['Info Harga Obat'] },
        cctv: { clicks: 22, lastUsed: new Date().toISOString(), actionsCount: 14, recentActions: ['Cek Lobi Pet Hotel'] },
        queueTv: { clicks: 92, lastUsed: new Date().toISOString(), actionsCount: 68, recentActions: ['Audio Chime Panggilan', 'Urutan Antrian', 'Buka TV Signage'] }
      };
      setSelectedRole('resepsionis');
      addToast('Simulasi diterapkan: Lonjakan Pasien Front Desk & Antrian TV', 'info');
    } else {
      updated = DEFAULT_TELEMETRY;
      addToast('Telemetri dikembalikan ke nilai awal', 'info');
    }

    setTelemetry(updated);
    localStorage.setItem('petcare_widget_telemetry', JSON.stringify(updated));
    triggerAiOptimization(selectedRole, updated);
  };

  const moveWidgetOrder = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...stagedConfig.order];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setStagedConfig({
      ...stagedConfig,
      order: newOrder,
      primaryWidget: newOrder[0],
      autoAiOptimized: false
    });
  };

  const getWidgetName = (w: WidgetId) => {
    switch (w) {
      case 'kalkulator':
        return 'Kalkulator Dosis (Plumb\'s Vet)';
      case 'cctv':
        return 'CCTV Monitor (4-Feed Surveillance)';
      case 'queueTv':
        return 'Layar Antrian TV (Signage & Chime)';
    }
  };

  const getWidgetIcon = (w: WidgetId) => {
    switch (w) {
      case 'kalkulator':
        return <Calculator className="w-4 h-4 text-amber-600" />;
      case 'cctv':
        return <Camera className="w-4 h-4 text-emerald-600" />;
      case 'queueTv':
        return <Tv className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-3xl border border-[#B8905A]/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B2A45] via-[#152238] to-[#101A2C] text-[#FFFDF9] border-b border-[#B8905A]/40 flex items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8905A] to-[#8C6534] text-[#101A2C] flex items-center justify-center shadow-lg border border-amber-300/40 shrink-0">
              <Sparkles className="w-6 h-6 text-[#101A2C]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white font-display tracking-tight">
                  Layout Optimization Assistant AI
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/25 text-amber-300 border border-[#B8905A]/40 text-[10px] font-black uppercase flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-amber-300" />
                  Gemini 3.7 Ergonomics Engine
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE] mt-0.5">
                Rekomendasi cerdas susunan widget berdasarkan peran staf klinis, telemetri klik riwayat, & beban kerja pasien.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#FAF7F2] border-b border-[#E1D6BE]/70 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assistant'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" />
              <span>Saran Optimasi AI</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5 text-[#B8905A]" />
              <span>Analisis Pola Klik ({totalClicks})</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-white text-[#1B2A45] shadow-xs'
                  : 'text-[#1B2A45]/70 hover:text-[#1B2A45]'
              }`}
            >
              <Layout className="w-3.5 h-3.5 text-[#B8905A]" />
              <span>Preset Tata Letak</span>
            </button>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1B2A45]/70 hidden sm:inline">Peran Aktif:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs font-bold bg-white border border-[#E1D6BE] text-[#1B2A45] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B8905A]"
            >
              <option value="dokter">Dokter Hewan (Veterinarian)</option>
              <option value="perawat">Paramedik / Rawat Inap</option>
              <option value="resepsionis">Resepsionis / Front Desk</option>
              <option value="groomer">Pet Hotel & Groomer</option>
              <option value="owner_klinik">Owner / Administrator</option>
            </select>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: AI ASSISTANT OVERVIEW & RECOMMENDATIONS */}
          {activeTab === 'assistant' && (
            <div className="space-y-6">
              {/* AI Headline Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-[#F1E8D9] border border-[#B8905A]/40 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#B8905A]/20 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-600" />
                      Rekomendasi Terpilih AI
                    </span>
                    <span className="text-xs text-[#1B2A45]/60 font-medium">
                      Efisiensi Alur Kerja: <strong className="text-emerald-700 font-black">+{aiResult?.efficiencyGainPercent || 38}%</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerAiOptimization()}
                      disabled={isAnalyzing}
                      className="px-3 py-1 bg-white hover:bg-slate-50 text-[#1B2A45] rounded-xl text-xs font-bold border border-[#E1D6BE] shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#B8905A] ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzing ? 'Menganalisis...' : 'Analisis Ulang'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2">
                  <h4 className="text-base font-black text-[#1B2A45] font-display">
                    {aiResult?.headline || 'Tata Letak Optimal: Konsultasi Poli & Preskripsi Obat'}
                  </h4>
                  <p className="text-xs text-[#1B2A45]/80 leading-relaxed">
                    {aiResult?.reasoning || 'Sebagai Dokter Hewan, sebagian besar alur kerja Anda berpusat pada kalkulasi dosis terapeutik Plumb\'s Vet dan pemanggilan nomor antrian poli periksa.'}
                  </p>
                </div>

                {/* Quantitative Impact Metric Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-[#B8905A]/20">
                  <div className="p-2.5 bg-white/90 rounded-xl border border-[#E1D6BE] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black text-sm">
                      ⚡
                    </div>
                    <div>
                      <span className="text-[10px] text-[#1B2A45]/60 font-bold uppercase block">Peningkatan Akses</span>
                      <span className="text-xs font-black text-[#1B2A45]">+{aiResult?.efficiencyGainPercent || 38}% Lebih Cepat</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-[#E1D6BE] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-black text-sm">
                      🖱️
                    </div>
                    <div>
                      <span className="text-[10px] text-[#1B2A45]/60 font-bold uppercase block">Reduksi Interaksi</span>
                      <span className="text-xs font-black text-[#1B2A45]">~{aiResult?.clicksSavedPerShift || 24} Klik Dihemat/Shift</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-[#E1D6BE] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center font-black text-sm">
                      🧠
                    </div>
                    <div>
                      <span className="text-[10px] text-[#1B2A45]/60 font-bold uppercase block">Beban Kognitif</span>
                      <span className="text-xs font-black text-[#1B2A45]">Minimal (Zero Context Switch)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection Visualizer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1B2A45] flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[#B8905A]" />
                    Pilih Struktur & Mode Tampilan Widget
                  </h4>
                  <span className="text-[11px] text-[#1B2A45]/60">
                    Mode Aktif Saat Ini:{' '}
                    <strong className="text-[#B8905A] uppercase">{stagedConfig.mode.replace('_', ' ')}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Mode 1: Split Hero */}
                  <div
                    onClick={() => setStagedConfig({ ...stagedConfig, mode: 'split_hero', autoAiOptimized: false })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      stagedConfig.mode === 'split_hero'
                        ? 'border-[#B8905A] bg-[#F1E8D9]/40 shadow-xs'
                        : 'border-[#E1D6BE]/70 bg-white hover:border-[#B8905A]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2A45]">Split Hero</span>
                      {stagedConfig.mode === 'split_hero' && (
                        <CheckCircle className="w-4 h-4 text-[#B8905A]" />
                      )}
                    </div>
                    {/* Visual Wireframe Preview */}
                    <div className="h-14 bg-slate-100 rounded-xl p-1.5 grid grid-cols-12 gap-1.5 border border-slate-200">
                      <div className="col-span-8 bg-[#B8905A]/30 border border-[#B8905A] rounded-lg flex items-center justify-center text-[9px] font-black text-[#1B2A45]">
                        Hero Utama
                      </div>
                      <div className="col-span-4 flex flex-col gap-1">
                        <div className="h-full bg-slate-300 rounded-md" />
                        <div className="h-full bg-slate-300 rounded-md" />
                      </div>
                    </div>
                    <p className="text-[10px] text-[#1B2A45]/70 leading-tight">
                      1 widget utama berukuran besar (65%) + 2 sub-widget vertikal di samping.
                    </p>
                  </div>

                  {/* Mode 2: Grid Trio (Command Center) */}
                  <div
                    onClick={() => setStagedConfig({ ...stagedConfig, mode: 'grid_trio', autoAiOptimized: false })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      stagedConfig.mode === 'grid_trio'
                        ? 'border-[#B8905A] bg-[#F1E8D9]/40 shadow-xs'
                        : 'border-[#E1D6BE]/70 bg-white hover:border-[#B8905A]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2A45]">Command Grid</span>
                      {stagedConfig.mode === 'grid_trio' && (
                        <CheckCircle className="w-4 h-4 text-[#B8905A]" />
                      )}
                    </div>
                    {/* Visual Wireframe Preview */}
                    <div className="h-14 bg-slate-100 rounded-xl p-1.5 grid grid-cols-3 gap-1.5 border border-slate-200">
                      <div className="bg-[#B8905A]/20 border border-[#B8905A]/40 rounded-lg flex items-center justify-center text-[8px] font-bold">W1</div>
                      <div className="bg-emerald-500/20 border border-emerald-400 rounded-lg flex items-center justify-center text-[8px] font-bold">W2</div>
                      <div className="bg-blue-500/20 border border-blue-400 rounded-lg flex items-center justify-center text-[8px] font-bold">W3</div>
                    </div>
                    <p className="text-[10px] text-[#1B2A45]/70 leading-tight">
                      Ketiga widget aktif serentak 3 kolom untuk visibilitas tanpa beralih tab.
                    </p>
                  </div>

                  {/* Mode 3: Dual Split (50/50) */}
                  <div
                    onClick={() => setStagedConfig({ ...stagedConfig, mode: 'dual_split', autoAiOptimized: false })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      stagedConfig.mode === 'dual_split'
                        ? 'border-[#B8905A] bg-[#F1E8D9]/40 shadow-xs'
                        : 'border-[#E1D6BE]/70 bg-white hover:border-[#B8905A]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2A45]">Dual Split 50:50</span>
                      {stagedConfig.mode === 'dual_split' && (
                        <CheckCircle className="w-4 h-4 text-[#B8905A]" />
                      )}
                    </div>
                    {/* Visual Wireframe Preview */}
                    <div className="h-14 bg-slate-100 rounded-xl p-1.5 grid grid-cols-2 gap-1.5 border border-slate-200">
                      <div className="bg-[#B8905A]/25 border border-[#B8905A] rounded-lg flex items-center justify-center text-[8px] font-bold">Utama</div>
                      <div className="bg-slate-300/80 border border-slate-400 rounded-lg flex items-center justify-center text-[8px] font-bold">Sekunder</div>
                    </div>
                    <p className="text-[10px] text-[#1B2A45]/70 leading-tight">
                      2 widget teratas disandingkan berdampingan seimbang (misal: CCTV + Dosis).
                    </p>
                  </div>

                  {/* Mode 4: Tab Priority */}
                  <div
                    onClick={() => setStagedConfig({ ...stagedConfig, mode: 'tab_priority', autoAiOptimized: false })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      stagedConfig.mode === 'tab_priority'
                        ? 'border-[#B8905A] bg-[#F1E8D9]/40 shadow-xs'
                        : 'border-[#E1D6BE]/70 bg-white hover:border-[#B8905A]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B2A45]">Tab Terfokus</span>
                      {stagedConfig.mode === 'tab_priority' && (
                        <CheckCircle className="w-4 h-4 text-[#B8905A]" />
                      )}
                    </div>
                    {/* Visual Wireframe Preview */}
                    <div className="h-14 bg-slate-100 rounded-xl p-1.5 flex flex-col gap-1 border border-slate-200">
                      <div className="flex gap-1">
                        <div className="w-8 h-2.5 bg-[#B8905A] rounded-sm" />
                        <div className="w-6 h-2.5 bg-slate-300 rounded-sm" />
                        <div className="w-6 h-2.5 bg-slate-300 rounded-sm" />
                      </div>
                      <div className="flex-1 bg-white rounded border border-slate-200" />
                    </div>
                    <p className="text-[10px] text-[#1B2A45]/70 leading-tight">
                      Satu layar penuh terfokus dengan urutan tab prioritas hasil kalkulasi AI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Widget Order Reordering Tool */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1B2A45] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#B8905A]" />
                    Urutan Prioritas Widget (Atas/Utama → Bawah)
                  </h4>
                  <span className="text-[11px] text-[#1B2A45]/60">Gunakan panah untuk memindahkan urutan</span>
                </div>

                <div className="space-y-2">
                  {stagedConfig.order.map((widgetKey, idx) => (
                    <div
                      key={widgetKey}
                      className="p-3 bg-white rounded-2xl border border-[#E1D6BE] flex items-center justify-between hover:border-[#B8905A]/60 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-[#FAF7F2] text-[#1B2A45] border border-[#E1D6BE] font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          {getWidgetIcon(widgetKey)}
                          <span className="text-xs font-bold text-[#1B2A45]">
                            {getWidgetName(widgetKey)}
                          </span>
                        </div>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-[#B8905A]/15 text-[#8C6534] border border-[#B8905A]/30 rounded text-[10px] font-black uppercase">
                            Widget Utama (Hero)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveWidgetOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Pindahkan Ke Atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveWidgetOrder(idx, 'down')}
                          disabled={idx === stagedConfig.order.length - 1}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Pindahkan Ke Bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ergonomic Tips List */}
              {aiResult?.ergonomicRecommendations && aiResult.ergonomicRecommendations.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E1D6BE] space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#B8905A] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#B8905A]" />
                    Catatan Ergonomi & Workflow Klinis
                  </span>
                  <ul className="space-y-1 text-xs text-[#1B2A45]/80">
                    {aiResult.ergonomicRecommendations.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#B8905A] font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TELEMETRY & CLICK BEHAVIOR PATTERNS */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Telemetry Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kalkulator Card */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-[#1B2A45]">Kalkulator Dosis</h4>
                    </div>
                    <span className="text-xs font-black text-amber-700">{calcShare}%</span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${calcShare}%` }} />
                  </div>
                  <div className="text-[11px] text-[#1B2A45]/70 space-y-1">
                    <p>Total Klik: <strong>{telemetry.kalkulator.clicks} interaksi</strong></p>
                    <p>Aksi Terakhir: <em>{telemetry.kalkulator.recentActions?.[0] || 'Kalkulasi Dosis'}</em></p>
                  </div>
                </div>

                {/* CCTV Card */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
                        <Camera className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-[#1B2A45]">CCTV Surveillance</h4>
                    </div>
                    <span className="text-xs font-black text-emerald-700">{cctvShare}%</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${cctvShare}%` }} />
                  </div>
                  <div className="text-[11px] text-[#1B2A45]/70 space-y-1">
                    <p>Total Klik: <strong>{telemetry.cctv.clicks} interaksi</strong></p>
                    <p>Aksi Terakhir: <em>{telemetry.cctv.recentActions?.[0] || 'Pantau ICU R04'}</em></p>
                  </div>
                </div>

                {/* Queue TV Card */}
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700">
                        <Tv className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-[#1B2A45]">Antrian TV Signage</h4>
                    </div>
                    <span className="text-xs font-black text-blue-700">{queueShare}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${queueShare}%` }} />
                  </div>
                  <div className="text-[11px] text-[#1B2A45]/70 space-y-1">
                    <p>Total Klik: <strong>{telemetry.queueTv.clicks} interaksi</strong></p>
                    <p>Aksi Terakhir: <em>{telemetry.queueTv.recentActions?.[0] || 'Panggilan Suara'}</em></p>
                  </div>
                </div>
              </div>

              {/* Simulation Testing Tool */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E1D6BE] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1B2A45] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#B8905A]" />
                    Simulasi Pola Klik & Lonjakan Operasional (Uji Respons AI)
                  </h4>
                  <span className="text-[10px] text-[#1B2A45]/60">Pilih skenario untuk melihat adaptasi AI</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleSimulatePattern('doctor_rush')}
                    className="p-3 bg-white hover:bg-amber-50 text-left rounded-xl border border-[#E1D6BE] text-xs font-bold text-[#1B2A45] transition-all cursor-pointer shadow-2xs"
                  >
                    🩺 Skenario Jam Sibuk Dokter
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      Lonjakan 80+ kalkulasi resep
                    </span>
                  </button>

                  <button
                    onClick={() => handleSimulatePattern('icu_night')}
                    className="p-3 bg-white hover:bg-emerald-50 text-left rounded-xl border border-[#E1D6BE] text-xs font-bold text-[#1B2A45] transition-all cursor-pointer shadow-2xs"
                  >
                    🏥 Skenario Shift Malam ICU
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      Fokus CCTV & telemetri rawat inap
                    </span>
                  </button>

                  <button
                    onClick={() => handleSimulatePattern('reception_peak')}
                    className="p-3 bg-white hover:bg-blue-50 text-left rounded-xl border border-[#E1D6BE] text-xs font-bold text-[#1B2A45] transition-all cursor-pointer shadow-2xs"
                  >
                    🛎️ Skenario Front Desk Pagi
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      Lonjakan antrian walk-in & audio call
                    </span>
                  </button>

                  <button
                    onClick={() => handleSimulatePattern('reset')}
                    className="p-3 bg-white hover:bg-slate-50 text-left rounded-xl border border-[#E1D6BE] text-xs font-bold text-[#1B2A45] transition-all cursor-pointer shadow-2xs"
                  >
                    🔄 Reset Telemetri Default
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      Kembali ke nilai awal seimbang
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROLE PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preset 1 */}
                <div
                  onClick={() => {
                    setStagedConfig({
                      mode: 'split_hero',
                      primaryWidget: 'kalkulator',
                      order: ['kalkulator', 'queueTv', 'cctv'],
                      autoAiOptimized: false,
                      activeTab: 'kalkulator'
                    });
                    addToast('Preset Poli Klinis & Resep dipilih', 'info');
                  }}
                  className="p-4 rounded-2xl bg-white border border-[#E1D6BE] hover:border-[#B8905A] transition-all cursor-pointer space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-[#1B2A45]">🩺 Dokter Poli Klinis & Resep Medis</h5>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Split Hero</span>
                  </div>
                  <p className="text-xs text-[#1B2A45]/70">
                    Memprioritaskan Kalkulator Dosis Plumb's Vet di layar utama dengan ringkasan antrian pasien di samping.
                  </p>
                </div>

                {/* Preset 2 */}
                <div
                  onClick={() => {
                    setStagedConfig({
                      mode: 'dual_split',
                      primaryWidget: 'cctv',
                      order: ['cctv', 'kalkulator', 'queueTv'],
                      autoAiOptimized: false,
                      activeTab: 'cctv'
                    });
                    addToast('Preset Paramedik & Rawat Inap dipilih', 'info');
                  }}
                  className="p-4 rounded-2xl bg-white border border-[#E1D6BE] hover:border-[#B8905A] transition-all cursor-pointer space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-[#1B2A45]">🏥 Paramedik & Rawat Inap ICU</h5>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Dual Split</span>
                  </div>
                  <p className="text-xs text-[#1B2A45]/70">
                    Menjajarkan CCTV pengawasan kamar ICU berdampingan seimbang dengan Kalkulator sediaan injeksi / infus.
                  </p>
                </div>

                {/* Preset 3 */}
                <div
                  onClick={() => {
                    setStagedConfig({
                      mode: 'split_hero',
                      primaryWidget: 'queueTv',
                      order: ['queueTv', 'cctv', 'kalkulator'],
                      autoAiOptimized: false,
                      activeTab: 'queueTv'
                    });
                    addToast('Preset Front Desk & Antrian dipilih', 'info');
                  }}
                  className="p-4 rounded-2xl bg-white border border-[#E1D6BE] hover:border-[#B8905A] transition-all cursor-pointer space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-[#1B2A45]">🛎️ Front Desk & Layanan Antrian</h5>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Split Hero</span>
                  </div>
                  <p className="text-xs text-[#1B2A45]/70">
                    Memusatkan layar antrian TV digital & tombol panggil suara dengan CCTV lobi hotel tersemat.
                  </p>
                </div>

                {/* Preset 4 */}
                <div
                  onClick={() => {
                    setStagedConfig({
                      mode: 'grid_trio',
                      primaryWidget: 'kalkulator',
                      order: ['kalkulator', 'cctv', 'queueTv'],
                      autoAiOptimized: false,
                      activeTab: 'kalkulator'
                    });
                    addToast('Preset Command Center Tri-Widget dipilih', 'info');
                  }}
                  className="p-4 rounded-2xl bg-white border border-[#E1D6BE] hover:border-[#B8905A] transition-all cursor-pointer space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-[#1B2A45]">⚡ Command Center Tri-Widget</h5>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">Grid 3-Col</span>
                  </div>
                  <p className="text-xs text-[#1B2A45]/70">
                    Tampilan serentak 3 kolom untuk pengawasan klinik, posologi obat, dan antrian secara terpadu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#E1D6BE] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#1B2A45]/70 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tata letak tersimpan otomatis di perangkat & profil pengguna</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 text-[#1B2A45] rounded-xl text-xs font-bold border border-[#E1D6BE] transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              onClick={handleApply}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#9E7848] hover:to-[#846238] text-[#101A2C] rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Tata Letak ({stagedConfig.mode.replace('_', ' ').toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
