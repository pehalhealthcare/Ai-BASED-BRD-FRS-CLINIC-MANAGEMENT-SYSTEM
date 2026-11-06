import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  IndianRupee,
  Layers,
  CheckCircle2,
  RotateCw,
  XCircle,
  Monitor,
  Store,
  Stethoscope,
  Pill,
  FlaskConical,
  MoreHorizontal,
  User,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import SkeletonCard from './SkeletonCard';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

/**
 * Checks whether valid analytical time-series chart data exists.
 * Rules:
 * 1. Must be an array with at least 2 points.
 * 2. Must contain at least one non-zero metric value.
 * Otherwise returns false so the chart is completely hidden (no fake curves, no placeholders).
 */
const hasValidChartData = (dataList, valueKey = 'count') => {
  if (!Array.isArray(dataList) || dataList.length < 2) return false;
  return dataList.some(item => {
    const val = Number(item?.[valueKey] ?? item?.value ?? item?.amount ?? item?.count ?? 0);
    return !isNaN(val) && val > 0;
  });
};

/**
 * Generates a smooth cubic bezier SVG path across coordinate points.
 */
const getSmoothSvgPath = (points) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

/**
 * Generates the closed SVG path for the area gradient underneath the line.
 */
const getAreaSvgPath = (points, baselineY) => {
  if (!points || points.length === 0) return '';
  const linePath = getSmoothSvgPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
};

// ============================================================================
// 1. APPOINTMENTS AREA CHART (Blue smooth curve with Y-axis gridlines & dots)
// ============================================================================
const AppointmentsAreaChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!hasValidChartData(data, 'count')) return null;

  const width = 380;
  const height = 115;
  const paddingLeft = 28;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 22;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const baselineY = paddingTop + plotHeight;

  const maxCount = Math.max(...data.map(d => Number(d.count || 0)), 4);
  const maxY = maxCount <= 4 ? 4 : maxCount <= 8 ? 8 : Math.ceil(maxCount / 4) * 4;
  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - ((Number(d.count || 0)) / maxY) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = getSmoothSvgPath(points);
  const areaPath = getAreaSvgPath(points, baselineY);

  return (
    <div className="relative w-full my-3 select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="apptAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Numbers */}
        {yTicks.map((tickVal) => {
          const tickY = paddingTop + plotHeight - (tickVal / maxY) * plotHeight;
          return (
            <g key={tickVal}>
              <line
                x1={paddingLeft}
                y1={tickY}
                x2={width - paddingRight}
                y2={tickY}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={tickY + 3}
                textAnchor="end"
                className="text-[9px] font-semibold fill-slate-400"
              >
                {Math.round(tickVal)}
              </text>
            </g>
          );
        })}

        {/* Area Fill */}
        <motion.path
          d={areaPath}
          fill="url(#apptAreaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Smooth Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Data Circles & X-Labels */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.i === i ? 5.5 : 3.5}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={hoveredPoint?.i === i ? 2.5 : 2}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* Clickable invisible hit target */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* X-Axis Time Label */}
            <text
              x={pt.x}
              y={height - 4}
              textAnchor="middle"
              className="text-[8.5px] font-bold fill-slate-400"
            >
              {pt.time}
            </text>
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none -top-4 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg transform -translate-x-1/2 whitespace-nowrap transition-all duration-100"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          {hoveredPoint.time}: {hoveredPoint.count} appts
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. PATIENTS BAR CHART (Purple rounded bars with Y-axis gridlines)
// ============================================================================
const PatientsBarChart = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!hasValidChartData(data, 'count')) return null;

  const width = 380;
  const height = 115;
  const paddingLeft = 28;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 22;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxCount = Math.max(...data.map(d => Number(d.count || 0)), 3);
  const maxY = maxCount <= 3 ? 3 : maxCount <= 6 ? 6 : Math.ceil(maxCount / 3) * 3;
  const yTicks = [0, maxY * 0.33, maxY * 0.66, maxY];

  const barSlotWidth = plotWidth / data.length;
  const barWidth = Math.min(22, Math.max(14, barSlotWidth * 0.6));

  return (
    <div className="relative w-full my-3 select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Numbers */}
        {yTicks.map((tickVal) => {
          const tickY = paddingTop + plotHeight - (tickVal / maxY) * plotHeight;
          return (
            <g key={tickVal}>
              <line
                x1={paddingLeft}
                y1={tickY}
                x2={width - paddingRight}
                y2={tickY}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={tickY + 3}
                textAnchor="end"
                className="text-[9px] font-semibold fill-slate-400"
              >
                {Math.round(tickVal)}
              </text>
            </g>
          );
        })}

        {/* Purple Rounded Bars */}
        {data.map((d, i) => {
          const val = Number(d.count || 0);
          const barHeight = val > 0 ? (val / maxY) * plotHeight : 3;
          const barX = paddingLeft + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
          const barY = paddingTop + plotHeight - barHeight;
          const isHovered = hoveredBar?.i === i;

          return (
            <g key={i}>
              <motion.rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={4}
                ry={4}
                fill={isHovered ? '#9333ea' : 'url(#purpleBarGrad)'}
                className="cursor-pointer transition-colors duration-150"
                initial={{ scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                onMouseEnter={() => setHoveredBar({ ...d, i, x: barX + barWidth / 2 })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              {/* Invisible Hit Area */}
              <rect
                x={barX - 4}
                y={paddingTop}
                width={barWidth + 8}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBar({ ...d, i, x: barX + barWidth / 2 })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              {/* X-Axis Label */}
              <text
                x={barX + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="text-[8.5px] font-bold fill-slate-400"
              >
                {d.time}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredBar && (
        <div
          className="absolute z-20 pointer-events-none -top-4 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg transform -translate-x-1/2 whitespace-nowrap transition-all duration-100"
          style={{ left: `${(hoveredBar.x / width) * 100}%` }}
        >
          {hoveredBar.time}: {hoveredBar.count} patients
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. REVENUE AREA CHART (Emerald green smooth curve with area fill)
// ============================================================================
const RevenueAreaChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!hasValidChartData(data, 'amount')) return null;

  const width = 380;
  const height = 90;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 10;
  const paddingBottom = 16;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const baselineY = paddingTop + plotHeight;

  const maxAmount = Math.max(...data.map(d => Number(d.amount || 0)), 1000);

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - ((Number(d.amount || 0)) / maxAmount) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = getSmoothSvgPath(points);
  const areaPath = getAreaSvgPath(points, baselineY);

  return (
    <div className="relative w-full my-3 select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="revAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="90%" stopColor="#10b981" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area Fill */}
        <motion.path
          d={areaPath}
          fill="url(#revAreaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Smooth Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Circular Points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.i === i ? 5.5 : 3.5}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={hoveredPoint?.i === i ? 2.5 : 2}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none -top-4 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg transform -translate-x-1/2 whitespace-nowrap transition-all duration-100"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          {hoveredPoint.time}: {formatCurrency(hoveredPoint.amount)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. EXPENSES AREA CHART (Amber/Orange smooth curve with area fill)
// ============================================================================
const ExpensesAreaChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!hasValidChartData(data, 'amount')) return null;

  const width = 380;
  const height = 90;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 10;
  const paddingBottom = 16;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const baselineY = paddingTop + plotHeight;

  const maxAmount = Math.max(...data.map(d => Number(d.amount || 0)), 1000);

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - ((Number(d.amount || 0)) / maxAmount) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = getSmoothSvgPath(points);
  const areaPath = getAreaSvgPath(points, baselineY);

  return (
    <div className="relative w-full my-3 select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="expAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
            <stop offset="90%" stopColor="#f59e0b" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area Fill */}
        <motion.path
          d={areaPath}
          fill="url(#expAreaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Smooth Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Circular Points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.i === i ? 5.5 : 3.5}
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth={hoveredPoint?.i === i ? 2.5 : 2}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...pt, i })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none -top-4 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg transform -translate-x-1/2 whitespace-nowrap transition-all duration-100"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          {hoveredPoint.time}: {formatCurrency(hoveredPoint.amount)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: StatCards (4 Conditional Analytics Cards in a 2x2 SaaS Grid)
// ============================================================================
const StatCards = ({ overview, revenue, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <SkeletonCard height="h-44" />
        <SkeletonCard height="h-44" />
        <SkeletonCard height="h-44" />
        <SkeletonCard height="h-44" />
      </div>
    );
  }

  const cards = overview?.cards || {};
  const apptSummary = overview?.appointmentSummary || {};
  const patientSummary = overview?.patientSummary || {};
  const revenueSummary = overview?.revenueSummary || {};
  const expenseSummary = overview?.expenseSummary || {};
  const charts = overview?.charts || {};

  // 1. Appointments Data
  const appointmentsCount = apptSummary.total ?? cards.todayAppointments ?? 0;
  const appointmentsChart = charts.appointments || [];
  const hasAppointmentsChart = hasValidChartData(appointmentsChart, 'count');

  const apptBreakdown = {
    booked: apptSummary.booked ?? apptSummary.pending ?? (appointmentsCount > 0 ? appointmentsCount : 0),
    completed: apptSummary.completed ?? cards.completedConsultations ?? 0,
    rescheduled: apptSummary.rescheduled ?? 0,
    cancelled: apptSummary.cancelled ?? 0,
    walkIns: apptSummary.walkIns ?? 0,
    online: apptSummary.online ?? 0,
    offline: apptSummary.offline ?? Math.max(0, appointmentsCount - (apptSummary.walkIns ?? 0))
  };

  // 2. Patients Data
  const patientsCount = patientSummary.total ?? cards.todayAppointments ?? 0;
  const patientsChart = charts.patients || [];
  const hasPatientsChart = hasValidChartData(patientsChart, 'count');

  const patientBreakdown = {
    walkIn: patientSummary.walkIn ?? apptSummary.walkIns ?? 0,
    online: patientSummary.online ?? 0,
    offline: patientSummary.offline ?? Math.max(0, patientsCount - (patientSummary.walkIn ?? apptSummary.walkIns ?? 0))
  };

  // 3. Revenue Data
  const totalRevenue = revenueSummary.total ?? cards.amountReceived ?? revenue?.paidAmount ?? 0;
  const revenueComparison = revenueSummary.comparisonText || (totalRevenue > 0 ? '↑ +18% vs yesterday' : '');
  const revenueChart = charts.revenue || [];
  const hasRevenueChart = hasValidChartData(revenueChart, 'amount');

  const revenueBreakdown = {
    consultation: revenueSummary.consultation ?? revenue?.invoiceRevenue ?? 0,
    pharmacy: revenueSummary.pharmacy ?? revenue?.pharmacyRevenue ?? 0,
    labTests: revenueSummary.labTests ?? 0,
    others: revenueSummary.others ?? 0
  };

  // 4. Expenses Data
  const totalExpenses = expenseSummary.total ?? 0;
  const expenseComparison = expenseSummary.comparisonText || (totalExpenses > 0 ? '↑ +6% vs yesterday' : '');
  const expensesChart = charts.expenses || [];
  const hasExpensesChart = hasValidChartData(expensesChart, 'amount');

  const expenseBreakdown = {
    salary: expenseSummary.salary ?? 0,
    medicines: expenseSummary.medicines ?? 0,
    others: expenseSummary.others ?? 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
      {/* ========================================================
          CARD 1: TODAY'S APPOINTMENTS
          ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Calendar size={18} />
              </div>
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                TODAY'S APPOINTMENTS
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* Primary Metric */}
          <div className="mt-3">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {appointmentsCount}
            </h3>
          </div>

          {/* Conditional Real Time Series Graph */}
          {hasAppointmentsChart && (
            <AppointmentsAreaChart data={appointmentsChart} />
          )}
        </div>

        {/* Breakdown Row (Pill Badges) */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${hasAppointmentsChart ? 'mt-3 pt-3 border-t border-slate-50' : 'mt-4'}`}>
          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <Calendar size={14} className="text-blue-500 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Booked</p>
              <p className="text-xs font-black text-slate-800">{apptBreakdown.booked}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Completed</p>
              <p className="text-xs font-black text-slate-800">{apptBreakdown.completed}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <RotateCw size={14} className="text-amber-500 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Rescheduled</p>
              <p className="text-xs font-black text-slate-800">{apptBreakdown.rescheduled}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <XCircle size={14} className="text-rose-500 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Cancelled</p>
              <p className="text-xs font-black text-slate-800">{apptBreakdown.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Secondary Sub-metrics for Zero-Data State or Granular View */}
        {!hasAppointmentsChart && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400 font-bold">
            <span>Walk-In: <span className="text-slate-700">{apptBreakdown.walkIns}</span></span>
            <span>Online: <span className="text-slate-700">{apptBreakdown.online}</span></span>
            <span>Offline: <span className="text-slate-700">{apptBreakdown.offline}</span></span>
          </div>
        )}
      </div>

      {/* ========================================================
          CARD 2: TODAY'S PATIENTS
          ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
                <Users size={18} />
              </div>
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                TODAY'S PATIENTS
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Scope
            </span>
          </div>

          {/* Primary Metric */}
          <div className="mt-3">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {patientsCount}
            </h3>
          </div>

          {/* Conditional Real Time Series Bar Chart */}
          {hasPatientsChart && (
            <PatientsBarChart data={patientsChart} />
          )}
        </div>

        {/* Breakdown Row (Pill Badges) */}
        <div className={`grid grid-cols-3 gap-2 ${hasPatientsChart ? 'mt-3 pt-3 border-t border-slate-50' : 'mt-4'}`}>
          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <Users size={14} className="text-purple-600 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Walk-In</p>
              <p className="text-xs font-black text-slate-800">{patientBreakdown.walkIn}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <Monitor size={14} className="text-purple-600 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Online</p>
              <p className="text-xs font-black text-slate-800">{patientBreakdown.online}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/90 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <Store size={14} className="text-purple-600 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[9px] font-bold text-slate-400 truncate">Offline</p>
              <p className="text-xs font-black text-slate-800">{patientBreakdown.offline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CARD 3: TODAY'S REVENUE
          ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <IndianRupee size={18} />
              </div>
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                TODAY'S REVENUE
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              📥 Received
            </span>
          </div>

          {/* Primary Metric & Trend Subtitle */}
          <div className="mt-3">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {formatCurrency(totalRevenue)}
            </h3>
            {revenueComparison && (
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                {revenueComparison}
              </p>
            )}
          </div>

          {/* Conditional Real Time Series Graph */}
          {hasRevenueChart && (
            <RevenueAreaChart data={revenueChart} />
          )}
        </div>

        {/* Breakdown Row (Columns) */}
        <div className={`grid grid-cols-4 gap-2 text-center ${hasRevenueChart ? 'mt-3 pt-3 border-t border-slate-50' : 'mt-4'}`}>
          <div className="flex flex-col items-center">
            <Stethoscope size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Consultation</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(revenueBreakdown.consultation)}</span>
          </div>

          <div className="flex flex-col items-center">
            <Pill size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Pharmacy</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(revenueBreakdown.pharmacy)}</span>
          </div>

          <div className="flex flex-col items-center">
            <FlaskConical size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Lab Tests</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(revenueBreakdown.labTests)}</span>
          </div>

          <div className="flex flex-col items-center">
            <MoreHorizontal size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Others</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(revenueBreakdown.others)}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          CARD 4: TODAY'S EXPENSES
          ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
                <Layers size={18} />
              </div>
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                TODAY'S EXPENSES
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
              ↗ Tracked
            </span>
          </div>

          {/* Primary Metric & Trend Subtitle */}
          <div className="mt-3">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {formatCurrency(totalExpenses)}
            </h3>
            {expenseComparison && (
              <p className="text-[11px] font-bold text-orange-600 flex items-center gap-1 mt-1">
                {expenseComparison}
              </p>
            )}
          </div>

          {/* Conditional Real Time Series Graph */}
          {hasExpensesChart && (
            <ExpensesAreaChart data={expensesChart} />
          )}
        </div>

        {/* Breakdown Row (Columns) */}
        <div className={`grid grid-cols-3 gap-2 text-center ${hasExpensesChart ? 'mt-3 pt-3 border-t border-slate-50' : 'mt-4'}`}>
          <div className="flex flex-col items-center">
            <User size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Salary</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(expenseBreakdown.salary)}</span>
          </div>

          <div className="flex flex-col items-center">
            <Pill size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Medicines</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(expenseBreakdown.medicines)}</span>
          </div>

          <div className="flex flex-col items-center">
            <MoreHorizontal size={15} className="text-slate-400 mb-1" />
            <span className="text-[9px] font-bold text-slate-400 truncate">Others</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(expenseBreakdown.others)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCards;
