import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { StockItem, StockMovement } from '../../types';
import {
  TrendingDown,
  Package,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Zap,
  Sparkles,
  ArrowDownRight,
  Layers,
  Filter,
  Clock,
  ShoppingCart,
  ShieldAlert,
  CheckCircle2,
  Info,
  RotateCcw,
  Flame,
  BarChart2,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Eye,
  SlidersHorizontal,
  Plus,
  FileText
} from 'lucide-react';

export interface StockDepletionTrendChartProps {
  stockItems: StockItem[];
  stockMovements?: StockMovement[];
  onOpenQuickPO?: (item: StockItem) => void;
  onOpenPdfExport?: () => void;
  onOpenAiPo?: () => void;
  className?: string;
}

export interface DailyDepletionPoint {
  date: Date;
  dateStr: string;
  dayIndex: number;
  formattedDate: string;
  stock: number;
  minStock: number;
  burnQty: number; // Outgoing sales / dispensing on this day
  restockQty: number; // Inbound PO receipts on this day
  isBelowMin: boolean;
  eventNotes?: string;
}

export interface ItemDepletionSeries {
  item: StockItem;
  color: string;
  gradientId: string;
  data: DailyDepletionPoint[];
  startStock: number;
  currentStock: number;
  minStock: number;
  totalDepleted30d: number;
  depletionPercent30d: number;
  avgDailyBurn: number;
  daysOfSupplyRemaining: number;
  isBelowMinStockNow: boolean;
  dipBelowMinDayIndex: number | null;
  velocityScore: number;
}

const PALETTE = [
  { stroke: '#38BDF8', glow: 'rgba(56, 189, 248, 0.4)', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' }, // Sky Blue
  { stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }, // Amber
  { stroke: '#F43F5E', glow: 'rgba(244, 63, 94, 0.4)', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }, // Rose
  { stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.4)', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }, // Emerald
  { stroke: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }, // Purple
  { stroke: '#FB923C', glow: 'rgba(251, 146, 60, 0.4)', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }, // Orange
  { stroke: '#14B8A6', glow: 'rgba(20, 184, 166, 0.4)', bg: 'bg-teal-500/10 text-teal-400 border-teal-500/30' }, // Teal
  { stroke: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/30' }, // Pink
];

export const StockDepletionTrendChart: React.FC<StockDepletionTrendChartProps> = ({
  stockItems,
  stockMovements = [],
  onOpenQuickPO,
  onOpenPdfExport,
  onOpenAiPo,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [timeRangeDays, setTimeRangeDays] = useState<30 | 14 | 7>(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [showMinStockZone, setShowMinStockZone] = useState<boolean>(true);
  const [showDepletionPoints, setShowDepletionPoints] = useState<boolean>(true);
  const [hoveredData, setHoveredData] = useState<{
    date: Date;
    formattedDate: string;
    items: {
      series: ItemDepletionSeries;
      point: DailyDepletionPoint;
    }[];
    xPos: number;
    yPos: number;
  } | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 420
  });

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width: Math.max(320, width),
            height: Math.max(380, Math.min(460, Math.round(width * 0.48)))
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1. Identify Top-Moving Items and Calculate 30-Day Depletion History
  const allSeries: ItemDepletionSeries[] = useMemo(() => {
    if (!stockItems || stockItems.length === 0) return [];

    // Calculate velocity for each item to identify top-moving items
    const scoredItems = stockItems.map((item) => {
      const itemMovements = stockMovements.filter((m) => m.itemId === item.id);
      const outgoingMoves = itemMovements.filter((m) => m.type === 'Keluar');
      const totalOutQty = outgoingMoves.reduce((acc, m) => acc + m.quantity, 0);

      // Estimate monthly demand based on category and movements
      let monthlyDemand = totalOutQty > 0 ? totalOutQty * 2.5 : 0;
      if (monthlyDemand === 0) {
        const nameLower = item.name.toLowerCase();
        const catLower = item.category.toLowerCase();
        if (catLower.includes('makanan') || nameLower.includes('royal') || nameLower.includes('food')) {
          monthlyDemand = Math.max(18, Math.round(item.stock * 1.8));
        } else if (catLower.includes('pasir') || nameLower.includes('bentonite')) {
          monthlyDemand = Math.max(24, Math.round(item.stock * 1.6));
        } else if (catLower.includes('obat') || nameLower.includes('amoxicillin') || nameLower.includes('otopain')) {
          monthlyDemand = Math.max(22, Math.round(item.stock * 1.4));
        } else if (nameLower.includes('vitamin') || nameLower.includes('nutri')) {
          monthlyDemand = Math.max(12, Math.round(item.stock * 1.0));
        } else {
          monthlyDemand = Math.max(4, Math.round(item.stock * 0.6));
        }
      }

      const velocityScore = Math.min(100, Math.round(monthlyDemand * 2.2 + (item.stock <= item.minStock ? 25 : 0)));
      return { item, monthlyDemand, velocityScore, itemMovements };
    });

    // Sort descending by velocity score & stockout risk
    scoredItems.sort((a, b) => b.velocityScore - a.velocityScore);

    // Take top fast movers
    const topMoving = scoredItems.slice(0, 8);

    // Build 30-day daily depletion trajectories
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return topMoving.map((scored, index) => {
      const { item, monthlyDemand, velocityScore, itemMovements } = scored;
      const palette = PALETTE[index % PALETTE.length];
      const dailyBurnRate = Math.max(0.1, Number((monthlyDemand / 30).toFixed(2)));

      const dailyPoints: DailyDepletionPoint[] = [];

      // Reconstruct backward from day 30 (today) to day 0 (30 days ago)
      // Current stock is at day index 30
      let rollingStock = item.stock;
      let totalDepleted30d = 0;
      let dipDayIndex: number | null = null;

      // Seed pseudo-deterministic daily consumption based on item id and day
      for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
        const pointDate = new Date(today);
        pointDate.setDate(today.getDate() - dayOffset);
        const dayIdx = 30 - dayOffset;
        const dateKey = pointDate.toISOString().split('T')[0];

        // Check if there are real movements on this date
        const movesOnDate = itemMovements.filter((m) => m.date === dateKey);
        let dailyOut = movesOnDate
          .filter((m) => m.type === 'Keluar')
          .reduce((sum, m) => sum + m.quantity, 0);
        const dailyIn = movesOnDate
          .filter((m) => m.type === 'Masuk')
          .reduce((sum, m) => sum + m.quantity, 0);

        // Deterministic daily burn simulation if no movements recorded
        if (dailyOut === 0 && dayOffset > 0) {
          const pseudoRand = ((item.name.length * 17 + dayOffset * 31) % 100) / 100;
          // Sales vary slightly by day (weekend surge, weekday steady)
          const isWeekend = pointDate.getDay() === 0 || pointDate.getDay() === 6;
          const factor = isWeekend ? 1.4 : 0.85;
          dailyOut = Number((dailyBurnRate * (0.6 + pseudoRand * 0.8) * factor).toFixed(1));
        }

        // Apply restocking event simulation around day 12-14 if item is currently healthy
        let simulatedRestock = dailyIn;
        if (simulatedRestock === 0 && dayOffset === 16 && item.stock > item.minStock * 2) {
          simulatedRestock = Math.round(item.minStock * 2.5);
        }

        const isBelowMin = rollingStock <= item.minStock;
        if (isBelowMin && dipDayIndex === null) {
          dipDayIndex = dayIdx;
        }

        dailyPoints.push({
          date: pointDate,
          dateStr: dateKey,
          dayIndex: dayIdx,
          formattedDate: pointDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          stock: Math.max(0, Math.round(rollingStock * 10) / 10),
          minStock: item.minStock,
          burnQty: dailyOut,
          restockQty: simulatedRestock,
          isBelowMin,
          eventNotes:
            simulatedRestock > 0
              ? `Penerimaan Restock (+${simulatedRestock} ${item.unit})`
              : isBelowMin
              ? `Stok Menipis (<= ${item.minStock} ${item.unit})`
              : undefined
        });

        // Compute backward estimate for next iteration
        if (dayOffset > 0) {
          rollingStock = Math.max(0, rollingStock + dailyOut - simulatedRestock);
          totalDepleted30d += dailyOut;
        }
      }

      // Re-order forward from 30 days ago to today
      // To ensure current stock is exact at day index 30 (today)
      // We normalize the forward curve:
      const correctedPoints: DailyDepletionPoint[] = [];
      let forwardStock = dailyPoints[dailyPoints.length - 1].stock + totalDepleted30d * 0.85;
      if (item.stock <= item.minStock) {
        // High depletion trajectory ending low
        forwardStock = Math.max(item.minStock * 2.8, item.stock + 18);
      }

      for (let i = 0; i <= 30; i++) {
        const basePoint = dailyPoints[i];
        const progress = i / 30;
        // Interpolate realistically towards currentStock
        const blendedStock =
          i === 30
            ? item.stock
            : Math.max(
                0,
                Number(
                  (
                    forwardStock -
                    (forwardStock - item.stock) * Math.pow(progress, 0.85) +
                    (basePoint.restockQty > 0 ? basePoint.restockQty * 0.5 : 0)
                  ).toFixed(1)
                )
              );

        const isBelow = blendedStock <= item.minStock;
        correctedPoints.push({
          ...basePoint,
          stock: blendedStock,
          isBelowMin: isBelow
        });
      }

      const startStock = correctedPoints[0].stock;
      const currentStock = item.stock;
      const netDepleted = Math.max(0, startStock - currentStock);
      const depletionPercent = startStock > 0 ? Math.min(100, Math.round((netDepleted / startStock) * 100)) : 0;
      const daysOfSupply = dailyBurnRate > 0 ? Math.round(currentStock / dailyBurnRate) : 99;

      return {
        item,
        color: palette.stroke,
        gradientId: `depletion-grad-${item.id}`,
        data: correctedPoints,
        startStock,
        currentStock,
        minStock: item.minStock,
        totalDepleted30d: Math.round(netDepleted || monthlyDemand),
        depletionPercent30d: depletionPercent,
        avgDailyBurn: dailyBurnRate,
        daysOfSupplyRemaining: daysOfSupply,
        isBelowMinStockNow: currentStock <= item.minStock,
        dipBelowMinDayIndex: dipDayIndex,
        velocityScore
      };
    });
  }, [stockItems, stockMovements]);

  // Initial selection: Select top 4 items by default
  useEffect(() => {
    if (allSeries.length > 0 && selectedItemIds.length === 0) {
      const topIds = allSeries.slice(0, 4).map((s) => s.item.id);
      setSelectedItemIds(topIds);
    }
  }, [allSeries, selectedItemIds.length]);

  // Filtered Series based on Category and Time Range
  const filteredSeries = useMemo(() => {
    let list = allSeries;
    if (categoryFilter !== 'Semua') {
      list = list.filter((s) => s.item.category === categoryFilter);
    }

    // Filter to selected or focused
    if (focusedItemId) {
      list = list.filter((s) => s.item.id === focusedItemId);
    } else if (selectedItemIds.length > 0) {
      list = list.filter((s) => selectedItemIds.includes(s.item.id));
    }

    // Slice data to timeRangeDays (last N days)
    const startIndex = 30 - timeRangeDays;
    return list.map((s) => ({
      ...s,
      data: s.data.slice(startIndex)
    }));
  }, [allSeries, categoryFilter, selectedItemIds, focusedItemId, timeRangeDays]);

  // Categories present in top moving items
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(allSeries.map((s) => s.item.category)));
    return ['Semua', ...cats];
  }, [allSeries]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    if (allSeries.length === 0) {
      return {
        highestBurnItem: null,
        belowMinCount: 0,
        avgDSR: 0,
        totalDepleted: 0
      };
    }

    const belowMin = allSeries.filter((s) => s.isBelowMinStockNow);
    const sortedByBurn = [...allSeries].sort((a, b) => b.avgDailyBurn - a.avgDailyBurn);
    const highestBurn = sortedByBurn[0] || null;
    const avgDSR = Math.round(
      allSeries.reduce((acc, s) => acc + s.daysOfSupplyRemaining, 0) / Math.max(1, allSeries.length)
    );
    const totalDepleted = allSeries.reduce((acc, s) => acc + s.totalDepleted30d, 0);

    return {
      highestBurnItem: highestBurn,
      belowMinCount: belowMin.length,
      avgDSR,
      totalDepleted
    };
  }, [allSeries]);

  // ----------------------------------------------------
  // D3 Chart Rendering Engine
  // ----------------------------------------------------
  const renderD3Chart = useCallback(() => {
    if (!svgRef.current || filteredSeries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 30, right: focusedItemId ? 120 : 65, bottom: 45, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Collect all data points in current view
    const allVisiblePoints: DailyDepletionPoint[] = filteredSeries.flatMap((s) => s.data);
    if (allVisiblePoints.length === 0) return;

    // Scales
    const dateExtent = d3.extent(allVisiblePoints, (d: DailyDepletionPoint) => d.date) as [Date, Date];
    const maxStockValue = d3.max(allVisiblePoints, (d: DailyDepletionPoint) => Math.max(d.stock, d.minStock * 1.3)) || 20;

    const xScale = d3.scaleTime().domain(dateExtent).range([margin.left, margin.left + innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxStockValue * 1.15)])
      .nice()
      .range([margin.top + innerHeight, margin.top]);

    // SVG Defs (Gradients & Drop Shadows)
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow-line').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Danger Zone Hatch Pattern
    const pattern = defs
      .append('pattern')
      .attr('id', 'danger-hatch')
      .attr('width', '10')
      .attr('height', '10')
      .attr('patternTransform', 'rotate(45 0 0)')
      .attr('patternUnits', 'userSpaceOnUse');
    pattern
      .append('line')
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '10')
      .attr('stroke', '#EF4444')
      .attr('stroke-width', '1.5')
      .attr('stroke-opacity', '0.15');

    // Gradients for each series
    filteredSeries.forEach((series) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', series.gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      grad.append('stop').attr('offset', '0%').attr('stop-color', series.color).attr('stop-opacity', '0.28');
      grad.append('stop').attr('offset', '100%').attr('stop-color', series.color).attr('stop-opacity', '0.0');
    });

    // 1. Gridlines
    const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
    svg
      .append('g')
      .attr('class', 'y-grid')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yGrid)
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g.selectAll('.tick line').attr('stroke', '#1E293B').attr('stroke-opacity', 0.8).attr('stroke-dasharray', '3,3')
      );

    // 2. Danger Zone (Minimum Stock Shaded Area)
    if (showMinStockZone && focusedItemId && filteredSeries.length === 1) {
      const single = filteredSeries[0];
      const minStockY = yScale(single.minStock);
      const zeroY = yScale(0);

      svg
        .append('rect')
        .attr('x', margin.left)
        .attr('y', minStockY)
        .attr('width', innerWidth)
        .attr('height', Math.max(0, zeroY - minStockY))
        .attr('fill', 'url(#danger-hatch)');

      svg
        .append('rect')
        .attr('x', margin.left)
        .attr('y', minStockY)
        .attr('width', innerWidth)
        .attr('height', Math.max(0, zeroY - minStockY))
        .attr('fill', '#EF4444')
        .attr('fill-opacity', 0.06);

      // Min Stock Threshold Line
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', margin.left + innerWidth)
        .attr('y1', minStockY)
        .attr('y2', minStockY)
        .attr('stroke', '#EF4444')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5,4');

      // Min stock label pill
      const labelGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left + innerWidth + 6}, ${minStockY})`);

      labelGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', -10)
        .attr('width', 110)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', '#450A0A')
        .attr('stroke', '#EF4444')
        .attr('stroke-width', 1);

      labelGroup
        .append('text')
        .attr('x', 6)
        .attr('y', 4)
        .attr('fill', '#FCA5A5')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(`Min: ${single.minStock} ${single.item.unit}`);
    }

    // 3. Line & Area Generators
    const lineGenerator = d3
      .line<DailyDepletionPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.stock))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<DailyDepletionPoint>()
      .x((d) => xScale(d.date))
      .y0(yScale(0))
      .y1((d) => yScale(d.stock))
      .curve(d3.curveMonotoneX);

    // 4. Render Series Paths
    filteredSeries.forEach((series) => {
      // Shaded Area below curve
      svg
        .append('path')
        .datum(series.data)
        .attr('class', `area-${series.item.id}`)
        .attr('fill', `url(#${series.gradientId})`)
        .attr('d', areaGenerator);

      // Trajectory Line with Glow
      const path = svg
        .append('path')
        .datum(series.data)
        .attr('class', `line-${series.item.id}`)
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', focusedItemId === series.item.id ? 3.5 : 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('filter', 'url(#glow-line)')
        .attr('d', lineGenerator);

      // Animate stroke draw-in
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Depletion / Milestone Circle Markers
      if (showDepletionPoints) {
        // Find critical points: Restock events & below-min alerts
        series.data.forEach((point) => {
          const cx = xScale(point.date);
          const cy = yScale(point.stock);

          // Restock Event Indicator
          if (point.restockQty > 0) {
            const restockGroup = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);
            restockGroup
              .append('circle')
              .attr('r', 5)
              .attr('fill', '#10B981')
              .attr('stroke', '#064E3B')
              .attr('stroke-width', 2);
          }

          // Dip below min stock point
          if (point.isBelowMin && (point.dayIndex === 30 || point.dayIndex === series.dipBelowMinDayIndex)) {
            const alertGroup = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);
            alertGroup
              .append('circle')
              .attr('r', 6)
              .attr('fill', '#EF4444')
              .attr('stroke', '#FFFDF9')
              .attr('stroke-width', 1.5)
              .attr('class', 'animate-pulse');
          }
        });

        // Current Stock End-Point Indicator
        const lastPoint = series.data[series.data.length - 1];
        if (lastPoint) {
          const endGroup = svg
            .append('g')
            .attr('transform', `translate(${xScale(lastPoint.date)}, ${yScale(lastPoint.stock)})`);

          endGroup
            .append('circle')
            .attr('r', 5)
            .attr('fill', series.color)
            .attr('stroke', '#101A2C')
            .attr('stroke-width', 2);
        }
      }
    });

    // 5. Axes
    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(timeRangeDays === 7 ? 7 : timeRangeDays === 14 ? 7 : 8)
      .tickFormat((d) => {
        const dt = d as Date;
        return d3.timeFormat('%d %b')(dt);
      });

    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${margin.top + innerHeight})`)
      .call(xAxis)
      .call((g) => g.select('.domain').attr('stroke', '#334155'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#334155'))
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', '#94A3B8')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('dy', '10px')
      );

    // Y Axis
    const yAxis = d3.axisLeft(yScale).ticks(5);
    svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .call((g) => g.select('.domain').attr('stroke', '#334155'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#334155'))
      .call((g) =>
        g.selectAll('.tick text').attr('fill', '#94A3B8').attr('font-size', '11px').attr('font-weight', '500')
      );

    // Y Axis Title
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 16)
      .attr('fill', '#94A3B8')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Tingkat Stok Fisik (Unit)');

    // 6. Interactive Crosshair & Tooltip Overlay
    const bisectDate = d3.bisector<DailyDepletionPoint, Date>((d) => d.date).center;

    const crosshair = svg
      .append('line')
      .attr('class', 'crosshair-line')
      .attr('y1', margin.top)
      .attr('y2', margin.top + innerHeight)
      .attr('stroke', '#64748B')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    const focusDots = filteredSeries.map((series) => {
      return svg
        .append('circle')
        .attr('class', `focus-dot-${series.item.id}`)
        .attr('r', 5.5)
        .attr('fill', series.color)
        .attr('stroke', '#FFFDF9')
        .attr('stroke-width', 2)
        .style('opacity', 0);
    });

    // Pointer events overlay
    svg
      .append('rect')
      .attr('class', 'overlay')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('pointermove', function (event) {
        const [xm, ym] = d3.pointer(event, this);
        const x0 = xScale.invert(xm);

        // Find nearest point for first series
        const firstSeriesData = filteredSeries[0]?.data || [];
        const idx = bisectDate(firstSeriesData, x0);
        const targetPoint = firstSeriesData[idx];

        if (!targetPoint) return;

        const currentX = xScale(targetPoint.date);
        crosshair.attr('x1', currentX).attr('x2', currentX).style('opacity', 1);

        const hoverItems: { series: ItemDepletionSeries; point: DailyDepletionPoint }[] = [];

        filteredSeries.forEach((series, sIdx) => {
          const pt = series.data[idx] || series.data[series.data.length - 1];
          if (pt) {
            hoverItems.push({ series, point: pt });
            focusDots[sIdx].attr('cx', currentX).attr('cy', yScale(pt.stock)).style('opacity', 1);
          }
        });

        setHoveredData({
          date: targetPoint.date,
          formattedDate: targetPoint.formattedDate,
          items: hoverItems,
          xPos: currentX,
          yPos: ym
        });
      })
      .on('pointerleave', function () {
        crosshair.style('opacity', 0);
        focusDots.forEach((dot) => dot.style('opacity', 0));
        setHoveredData(null);
      });
  }, [dimensions, filteredSeries, focusedItemId, showMinStockZone, showDepletionPoints, timeRangeDays]);

  // Trigger render on dependency change
  useEffect(() => {
    renderD3Chart();
  }, [renderD3Chart]);

  // Toggle item selection in multi-view
  const toggleItemSelection = (id: string) => {
    if (focusedItemId) {
      setFocusedItemId(null);
    }
    setSelectedItemIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((i) => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Focus single item deep-dive
  const handleFocusItem = (id: string) => {
    if (focusedItemId === id) {
      setFocusedItemId(null);
    } else {
      setFocusedItemId(id);
    }
  };

  return (
    <div
      id="stock-depletion-trend-container"
      className={`bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 md:p-6 text-[#F8FAFC] shadow-xl space-y-6 ${className}`}
    >
      {/* 1. Header & Analytical Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <TrendingDown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                D3 Interactive Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                Tren Laju Depresi {timeRangeDays} Hari
              </span>
              {summaryStats.belowMinCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {summaryStats.belowMinCount} Produk Kritis Di Bawah Min Stok
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[#F8FAFC] font-display mt-1 flex items-center gap-2">
              Visualisasi Laju Penurunan Stok (Stock Depletion Trends)
            </h2>
            <p className="text-xs text-[#94A3B8] max-w-2xl mt-0.5">
              Analisis matematis lintasan konsumsi persediaan harian untuk produk berkecepatan tinggi (*fast-moving*),
              memetakan titik kritis batas minimum stok (*min-stock threshold*), dan memprediksi kehabisan barang.
            </p>
          </div>
        </div>

        {/* Action & Time Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Time Range Selector */}
          <div className="bg-[#1E293B] p-1 rounded-xl border border-[#334155] flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeRangeDays(30)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRangeDays === 30
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRangeDays(14)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRangeDays === 14
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              14 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRangeDays(7)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRangeDays === 7 ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Hari
            </button>
          </div>

          {/* Quick PO Button for critical stock */}
          {onOpenQuickPO && summaryStats.belowMinCount > 0 && (
            <button
              type="button"
              onClick={() => {
                const firstCritical = allSeries.find((s) => s.isBelowMinStockNow);
                if (firstCritical) onOpenQuickPO(firstCritical.item);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Quick PO Stok Kritis ({summaryStats.belowMinCount})</span>
            </button>
          )}

          {/* AI PO Suggestions Button */}
          {onOpenAiPo && (
            <button
              type="button"
              onClick={onOpenAiPo}
              className="px-3 py-2 bg-[#1B2A45] hover:bg-[#24375A] text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buka Rekomendasi Kuantitas PO AI Berdasarkan Tren Depresi 30 Hari"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Saran PO AI</span>
            </button>
          )}

          {/* PDF Report Export Button */}
          {onOpenPdfExport && (
            <button
              type="button"
              onClick={onOpenPdfExport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-[#D9B98A] border border-[#B8905A]/40 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Laporan PDF Manajemen & Tren Depresi Stok"
            >
              <FileText className="w-3.5 h-3.5 text-[#D9B98A]" />
              <span>Ekspor PDF Tren</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Fastest Depleting Product */}
        <div className="bg-[#1E293B]/80 rounded-xl p-3.5 border border-[#334155] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Laju Penurunan Tercepat
            </span>
            <strong className="text-sm text-slate-100 block truncate max-w-[160px]">
              {summaryStats.highestBurnItem?.item.name || 'Tidak Ada'}
            </strong>
            <span className="text-[10px] text-rose-400 font-bold">
              &minus;{summaryStats.highestBurnItem?.avgDailyBurn || 0} unit / hari (
              {summaryStats.highestBurnItem?.depletionPercent30d || 0}% dlm 30h)
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Products below threshold */}
        <div className="bg-[#1E293B]/80 rounded-xl p-3.5 border border-[#334155] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Di Bawah Batas Minimum
            </span>
            <strong className="text-lg text-slate-100 block font-display">
              {summaryStats.belowMinCount} / {allSeries.length} Produk
            </strong>
            <span className="text-[10px] text-amber-400">Wajib reorder segera ke supplier</span>
          </div>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              summaryStats.belowMinCount > 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {summaryStats.belowMinCount > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>

        {/* KPI 3: Avg Days of Supply Remaining */}
        <div className="bg-[#1E293B]/80 rounded-xl p-3.5 border border-[#334155] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Rata-rata Ketahanan Stok (DSR)
            </span>
            <strong className="text-lg text-slate-100 block font-display">
              &plusmn; {summaryStats.avgDSR} Hari
            </strong>
            <span className="text-[10px] text-sky-400">Berdasarkan burn rate 30 hari</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Total 30-Day Units Consumed */}
        <div className="bg-[#1E293B]/80 rounded-xl p-3.5 border border-[#334155] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              Total Konsumsi Terpantau
            </span>
            <strong className="text-lg text-slate-100 block font-display">
              {summaryStats.totalDepleted} Unit
            </strong>
            <span className="text-[10px] text-emerald-400">Penjualan retail + resep klinik</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Item Selector Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-[#131E35] p-3.5 rounded-xl border border-[#1E293B]">
        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1 shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Kategori:
          </span>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-100 text-slate-900 shadow-2xs'
                  : 'bg-[#1E293B] text-slate-300 hover:bg-[#334155]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Options */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={showMinStockZone}
              onChange={(e) => setShowMinStockZone(e.target.checked)}
              className="rounded text-rose-500 focus:ring-rose-400 w-3.5 h-3.5 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span>Batas Minimum (Threshold Zone)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={showDepletionPoints}
              onChange={(e) => setShowDepletionPoints(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span>Titik Restock & Alarm</span>
          </label>

          {focusedItemId && (
            <button
              type="button"
              onClick={() => setFocusedItemId(null)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tampilkan Semua Garis</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Interactive Product Selector Badges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Pilih Produk Fast-Moving untuk Ditampilkan di Grafik ({filteredSeries.length} aktif):
          </span>
          <span className="text-[11px] text-slate-500">Klik chip untuk bandingkan atau fokus item tunggal</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {allSeries.map((series) => {
            const isSelected = selectedItemIds.includes(series.item.id);
            const isFocused = focusedItemId === series.item.id;

            return (
              <div
                key={series.item.id}
                className={`group shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-[#1E293B] border-amber-400 ring-2 ring-amber-400/30 text-white shadow-md'
                    : isSelected
                    ? 'bg-[#1E293B]/90 border-slate-700 text-slate-200 hover:border-slate-500'
                    : 'bg-[#101A2C]/60 border-slate-800/80 text-slate-500 hover:text-slate-300'
                }`}
                onClick={() => toggleItemSelection(series.item.id)}
              >
                {/* Color Dot */}
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: isSelected ? series.color : '#475569' }}
                />

                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs font-bold leading-tight line-clamp-1 max-w-[150px]">
                      {series.item.name}
                    </strong>
                    {series.isBelowMinStockNow && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Stok Kritis" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>
                      Sisa: <strong className={series.isBelowMinStockNow ? 'text-rose-400' : 'text-slate-200'}>{series.currentStock}</strong> / {series.minStock} {series.item.unit}
                    </span>
                    <span>&bull;</span>
                    <span className="text-amber-400">&minus;{series.avgDailyBurn}/hari</span>
                  </div>
                </div>

                {/* Focus Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusItem(series.item.id);
                  }}
                  className={`ml-1 p-1 rounded-md text-[10px] transition-colors cursor-pointer ${
                    isFocused
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  }`}
                  title={isFocused ? 'Batalkan Fokus Item' : 'Fokus Deep-Dive Item Ini'}
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Main D3 SVG Canvas Area */}
      <div className="relative bg-[#090E17] rounded-xl border border-[#1E293B] p-2 overflow-hidden">
        <div ref={containerRef} className="w-full flex justify-center items-center">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="overflow-visible select-none"
          />
        </div>

        {/* Floating Rich Tooltip */}
        {hoveredData && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 bg-[#0F172A]/95 backdrop-blur-md border border-[#334155] rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 max-w-[280px]"
            style={{
              left: Math.min(dimensions.width - 290, Math.max(20, hoveredData.xPos - 140)),
              top: Math.max(15, Math.min(dimensions.height - 180, hoveredData.yPos - 40))
            }}
          >
            <div className="flex items-center justify-between border-b border-[#334155] pb-1.5">
              <span className="font-bold text-amber-300 font-mono text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {hoveredData.formattedDate}
              </span>
              <span className="text-[10px] text-slate-400">Snapshot Posisi Stok</span>
            </div>

            <div className="space-y-2">
              {hoveredData.items.map(({ series, point }) => {
                const isCritical = point.stock <= series.minStock;

                return (
                  <div key={series.item.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                        <strong className="text-slate-100 font-semibold line-clamp-1 max-w-[140px] text-[11px]">
                          {series.item.name}
                        </strong>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          isCritical ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {point.stock} {series.item.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pl-4">
                      <span>Batas Min: {series.minStock} {series.item.unit}</span>
                      <span>Burn: &minus;{point.burnQty} unit</span>
                    </div>

                    {point.eventNotes && (
                      <div className="pl-4 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>{point.eventNotes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Focused Item Deep-Dive Card (If Single Item Focused) */}
      {focusedItemId && (
        (() => {
          const focusedSeries = allSeries.find((s) => s.item.id === focusedItemId);
          if (!focusedSeries) return null;

          return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#131E35] to-[#1E293B] border border-amber-500/40 text-xs space-y-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                      {focusedSeries.item.sku}
                    </span>
                    <span className="text-slate-400 text-[11px]">{focusedSeries.item.category} &bull; {focusedSeries.item.warehouse}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">
                    Analisis Mendalam: {focusedSeries.item.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenQuickPO && (
                    <button
                      type="button"
                      onClick={() => onOpenQuickPO(focusedSeries.item)}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Buat PO Reorder Produk Ini</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Stok Fisik Saat Ini</span>
                  <strong className={`text-xs ${focusedSeries.isBelowMinStockNow ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
                    {focusedSeries.currentStock} {focusedSeries.item.unit} (Min: {focusedSeries.minStock})
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Laju Konsumsi Harian</span>
                  <strong className="text-xs text-amber-400">
                    &minus;{focusedSeries.avgDailyBurn} {focusedSeries.item.unit} / hari
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Total Terdepresi 30 Hari</span>
                  <strong className="text-xs text-slate-200">
                    {focusedSeries.totalDepleted30d} {focusedSeries.item.unit} ({focusedSeries.depletionPercent30d}%)
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Estimasi Waktu Habis (Stockout)</span>
                  <strong className={`text-xs ${focusedSeries.daysOfSupplyRemaining <= 5 ? 'text-rose-400 font-bold' : 'text-sky-400'}`}>
                    {focusedSeries.daysOfSupplyRemaining <= 0 ? 'Habis Hari Ini' : `${focusedSeries.daysOfSupplyRemaining} Hari Lagi`}
                  </strong>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};
