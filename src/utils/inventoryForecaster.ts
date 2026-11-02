// ponytail: replaced 848-line seasonal forecasting engine with stock vs minStock comparison.
// Upgrade path: integrate real demand history when a client provides 6+ months of data.
import { StockItem } from '../types';

export type ClinicalCategory = string;
export type UrgencyLevel = 'Kritis' | 'Tinggi' | 'Waspada' | 'Optimal';
export type SeasonScenario =
  | 'pancaroba_hujan'
  | 'liburan_boarding'
  | 'kemarau_normal'
  | 'wabah_gi_parvo';

export interface CriticalSupplyConfig { sku: string; name: string; [key: string]: any }

export interface SupplyForecastMetric {
  id: string;
  sku: string;
  name: string;
  category: ClinicalCategory;
  currentStock: number;
  unit: string;
  unitPrice: number;
  supplierName: string;
  avgDailyDemand: number;
  adjustedDailyDemand: number;
  demandStdDev: number;
  leadTimeDays: number;
  serviceLevel: number;
  zScore: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedReorderQty: number;
  stockoutHorizonDays: number;
  stockoutRiskPercent: number;
  urgency: UrgencyLevel;
  totalEstimatedCost: number;
  clinicalIndication: string;
  riskOfStockout: string;
  seasonalityImpactDescription: string;
  historicalDemand: { dateLabel: string; actual: number; predicted: number }[];
  projectedTrajectory: {
    day: number; dateLabel: string;
    projectedStockWithoutPO: number; projectedStockWithPO: number;
    predictedDailyConsumption: number; ropThreshold: number; safetyStockLevel: number;
  }[];
}

export interface AIForecastSummary {
  totalCriticalItemsTracked: number;
  criticalStockoutAlertsCount: number;
  urgentReorderCount: number;
  watchListCount: number;
  healthyCount: number;
  estimatedTotalReorderCost: number;
  dominantSeasonScenario: SeasonScenario;
  seasonScenarioName: string;
  seasonDescription: string;
  overallStockHealthIndex: number;
  items: SupplyForecastMetric[];
}

export interface GeminiForecastingInsights {
  executiveSummary: string;
  epidemiologicalRiskFactors: string[];
  clinicalPriorityRankings: { sku: string; name: string; priorityReason: string; immediateAction: string }[];
  supplierOptimizationAdvice: string[];
  budgetImpactAnalysis: string;
  preparedTimestamp: string;
}

export const CRITICAL_MEDICAL_SUPPLIES_CONFIG: CriticalSupplyConfig[] = [];
export const CRITICAL_RETAIL_SUPPLIES_CONFIG: CriticalSupplyConfig[] = [];

export function getZScore(_serviceLevel: number): number { return 1.65; }

// Stub — imported by some components but never called.
export function calculateSupplyForecast(
  _config: CriticalSupplyConfig,
  _currentStock: number,
  _scenario: SeasonScenario,
  _leadTimeBuffer = 0,
  _serviceLevel = 0.95
): SupplyForecastMetric {
  throw new Error('calculateSupplyForecast: use generateAllCriticalSuppliesForecast instead');
}

const SCENARIO_LABELS: Record<SeasonScenario, { name: string; desc: string }> = {
  pancaroba_hujan: { name: 'Musim Pancaroba & Hujan', desc: 'Lonjakan infeksi kulit, Otitis, dan Gastroenteritis/Parvo.' },
  liburan_boarding: { name: 'Musim Liburan & Boarding', desc: 'Lonjakan reservasi penitipan, vaksinasi, dan sterilisasi elektif.' },
  kemarau_normal: { name: 'Musim Kemarau / Baseline', desc: 'Aktivitas klinik pada beban standar.' },
  wabah_gi_parvo: { name: 'Waspada Wabah GI & Parvo', desc: 'Lonjakan kebutuhan cairan infus, antiemetik, dan rapid test kit.' },
};

export function generateAllCriticalSuppliesForecast(
  stockItems: StockItem[],
  scenario: SeasonScenario = 'kemarau_normal',
  _leadTimeBuffer = 0,
  serviceLevel = 0.95
): AIForecastSummary {
  const items: SupplyForecastMetric[] = stockItems.map((s) => {
    const min = s.minStock || 1;
    const ratio = s.stock / min;
    const urgency: UrgencyLevel =
      s.stock <= 0 ? 'Kritis' :
      ratio < 1 ? 'Tinggi' :
      ratio < 2 ? 'Waspada' : 'Optimal';
    const suggestedReorderQty = Math.max(0, min * 2 - s.stock);
    const stockoutHorizonDays = s.stock <= 0 ? 0 : Math.round(s.stock); // ~1 unit/day default
    return {
      id: s.id, sku: s.sku, name: s.name, category: s.category,
      currentStock: s.stock, unit: s.unit, unitPrice: s.purchasePrice,
      supplierName: s.supplierName,
      avgDailyDemand: 1, adjustedDailyDemand: 1, demandStdDev: 0,
      leadTimeDays: 3, serviceLevel, zScore: 1.65,
      safetyStock: Math.ceil(min * 0.5), reorderPoint: min,
      suggestedReorderQty, stockoutHorizonDays,
      stockoutRiskPercent: s.stock <= 0 ? 100 : Math.max(0, Math.round((1 - ratio) * 100)),
      urgency,
      totalEstimatedCost: suggestedReorderQty * s.purchasePrice,
      clinicalIndication: s.category,
      riskOfStockout: urgency === 'Kritis' ? 'Stok habis — segera reorder.' : '',
      seasonalityImpactDescription: 'Tidak ada penyesuaian musiman (gunakan data historis untuk forecasting lanjutan).',
      historicalDemand: [], projectedTrajectory: [],
    };
  });

  const criticals = items.filter(i => i.urgency === 'Kritis').length;
  const urgent = items.filter(i => i.urgency === 'Tinggi').length;
  const watch = items.filter(i => i.urgency === 'Waspada').length;
  const healthy = items.filter(i => i.urgency === 'Optimal').length;

  return {
    totalCriticalItemsTracked: items.length,
    criticalStockoutAlertsCount: criticals,
    urgentReorderCount: urgent,
    watchListCount: watch,
    healthyCount: healthy,
    estimatedTotalReorderCost: items
      .filter(i => i.urgency === 'Kritis' || i.urgency === 'Tinggi')
      .reduce((sum, i) => sum + i.totalEstimatedCost, 0),
    dominantSeasonScenario: scenario,
    seasonScenarioName: SCENARIO_LABELS[scenario].name,
    seasonDescription: SCENARIO_LABELS[scenario].desc,
    overallStockHealthIndex: Math.round((healthy / Math.max(items.length, 1)) * 100),
    items,
  };
}

export function createPurchaseOrderFromForecast(
  forecastItems: SupplyForecastMetric[],
  supplierName = 'PharmaVet Nusantara'
) {
  const targets = forecastItems.filter(i => i.urgency === 'Kritis' || i.urgency === 'Tinggi');
  const poItems = targets.map(item => ({
    itemName: `${item.name} [${item.sku}]`,
    quantity: item.suggestedReorderQty,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: item.suggestedReorderQty * item.unitPrice,
  }));
  return {
    supplierName,
    items: poItems,
    totalAmount: poItems.reduce((acc, i) => acc + i.total, 0),
    notes: `Reorder otomatis berdasarkan stok aktual vs minimum (${targets.length} item kritis).`,
  };
}
