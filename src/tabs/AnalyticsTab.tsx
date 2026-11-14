import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Download, 
  Calendar, 
  FileText, 
  Filter, 
  Wallet, 
  Landmark, 
  CreditCard, 
  ArrowDownToLine,
  CheckCircle2,
  Building2,
  Table as TableIcon,
  TrendingDown,
  Layers,
  Package,
  Receipt,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Sparkles,
  PieChart,
  RotateCcw,
  Clock,
  ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StatCard } from '../components/StatCard';
import { subscribeToOrders, Order } from '../lib/orders';
import { subscribeToPayments, PaymentRecord, PaymentPhase, calculatePhaseGstAdjustment } from '../lib/payments';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type MetricsGranularity = 'month' | 'year' | 'custom';

export const parseNumericAmount = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  // Strip currency prefixes: Rs., Rs, INR, ₹, Rupees
  str = str.replace(/^(Rs\.?|INR|₹|Rupees\.?)\s*/i, '');
  // Remove commas
  str = str.replace(/,/g, '').trim();
  // Strip any leading non-digits except dot
  str = str.replace(/^[^\d.]+/, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export interface GrowthMetric {
  rate: number | null; // null when baseline is 0 and current > 0
  displayText: string;  // e.g. "+496.4%", "New Base", "0.0%", "-15.2%"
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
  isNewBase: boolean;
  prevValue: number;
  currValue: number;
  label: string;
  detailNote?: string;
}

export const computeGrowth = (
  curr: number, 
  prev: number, 
  label: string, 
  detailNote?: string
): GrowthMetric => {
  const roundCurr = Math.round(curr);
  const roundPrev = Math.round(prev);

  // Both periods zero
  if (roundPrev === 0 && roundCurr === 0) {
    return {
      rate: 0,
      displayText: '0.0%',
      isPositive: false,
      isNegative: false,
      isNeutral: true,
      isNewBase: false,
      prevValue: 0,
      currValue: 0,
      label,
      detailNote: detailNote || 'No sales in either period'
    };
  }

  // Previous was 0, but current has revenue: baseline / new entry (cannot divide by zero)
  if (roundPrev === 0 && roundCurr > 0) {
    return {
      rate: null,
      displayText: 'New Base',
      isPositive: true,
      isNegative: false,
      isNeutral: false,
      isNewBase: true,
      prevValue: 0,
      currValue: roundCurr,
      label,
      detailNote: detailNote || 'Baseline period established (no prior year records)'
    };
  }

  // Previous had revenue, but current is 0: 100% loss
  if (roundPrev > 0 && roundCurr === 0) {
    return {
      rate: -100,
      displayText: '-100.0%',
      isPositive: false,
      isNegative: true,
      isNeutral: false,
      isNewBase: false,
      prevValue: roundPrev,
      currValue: 0,
      label,
      detailNote
    };
  }

  // Normal percentage comparison
  const rawRate = ((curr - prev) / prev) * 100;
  const isPositive = rawRate > 0;
  const isNegative = rawRate < 0;
  const isNeutral = rawRate === 0;
  const sign = isPositive ? '+' : '';

  return {
    rate: rawRate,
    displayText: `${sign}${rawRate.toFixed(1)}%`,
    isPositive,
    isNegative,
    isNeutral,
    isNewBase: false,
    prevValue: roundPrev,
    currValue: roundCurr,
    label,
    detailNote
  };
};

interface ParsedMetricOrder {
  id: string;
  orderNumber: string;
  customer: string;
  date: Date;
  year: number;
  month: number;
  quarter: number;
  revenue: number;
  units: number;
}

type TimePeriod = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';

export function AnalyticsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Executive Business Metrics Filters
  const [metricsGranularity, setMetricsGranularity] = useState<MetricsGranularity>('month');
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [metricsMonth, setMetricsMonth] = useState<number>(new Date().getMonth());

  const nowInit = new Date();
  const initStart = new Date(nowInit.getFullYear(), nowInit.getMonth(), 1).toISOString().slice(0, 10);
  const initEnd = nowInit.toISOString().slice(0, 10);
  const [metricsCustomStart, setMetricsCustomStart] = useState<string>(initStart);
  const [metricsCustomEnd, setMetricsCustomEnd] = useState<string>(initEnd);

  // Current Date vs Prior Month Benchmark State
  const todayDateObj = useMemo(() => new Date(), []);
  const [benchmarkDay, setBenchmarkDay] = useState<number>(todayDateObj.getDate());
  const [benchmarkScope, setBenchmarkScope] = useState<'single_day' | 'mtd'>('single_day');

  // Payment Report Filters
  const [period, setPeriod] = useState<TimePeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  useEffect(() => {
    const unsubOrders = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    const unsubPayments = subscribeToPayments((fetchedPayments) => {
      setPayments(fetchedPayments);
    });
    return () => {
      unsubOrders();
      unsubPayments();
    };
  }, []);

  // Standard Overview Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let totalRevenueYTD = 0;
    let totalRevenueLastYear = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let orderCountThisMonth = 0;
    let orderCountLastMonth = 0;
    
    const uniqueClientsThisMonth = new Set<string>();
    const uniqueClientsLastMonth = new Set<string>();

    orders.forEach(order => {
      let orderDate = now;
      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }

      const amount = parseNumericAmount(order.amount || order.details?.totalAmount);
      const client = (order.customer || '').trim().toLowerCase();

      if (orderDate.getFullYear() === currentYear) {
        totalRevenueYTD += amount;
      } else if (orderDate.getFullYear() === currentYear - 1) {
        totalRevenueLastYear += amount;
      }

      if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
        thisMonthRevenue += amount;
        orderCountThisMonth++;
        if (client) uniqueClientsThisMonth.add(client);
      } else if (
        (currentMonth > 0 && orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth - 1) ||
        (currentMonth === 0 && orderDate.getFullYear() === currentYear - 1 && orderDate.getMonth() === 11)
      ) {
        lastMonthRevenue += amount;
        orderCountLastMonth++;
        if (client) uniqueClientsLastMonth.add(client);
      }
    });

    const revenueTrend = totalRevenueLastYear > 0 ? ((totalRevenueYTD - totalRevenueLastYear) / totalRevenueLastYear) * 100 : 0;
    const avgOrderValueThisMonth = orderCountThisMonth > 0 ? thisMonthRevenue / orderCountThisMonth : 0;
    const avgOrderValueLastMonth = orderCountLastMonth > 0 ? lastMonthRevenue / orderCountLastMonth : 0;
    const avgOrderTrend = avgOrderValueLastMonth > 0 ? ((avgOrderValueThisMonth - avgOrderValueLastMonth) / avgOrderValueLastMonth) * 100 : 0;
    const newClientsTrend = uniqueClientsLastMonth.size > 0 ? ((uniqueClientsThisMonth.size - uniqueClientsLastMonth.size) / uniqueClientsLastMonth.size) * 100 : 0;
    
    const formatCurrency = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    return {
      revenueYTD: formatCurrency(totalRevenueYTD),
      revenueTrend,
      avgOrderValue: formatCurrency(avgOrderValueThisMonth),
      avgOrderTrend,
      newClients: uniqueClientsThisMonth.size.toString(),
      newClientsTrend,
      totalOrders: orderCountThisMonth.toString(),
      ordersTrend: orderCountLastMonth > 0 ? ((orderCountThisMonth - orderCountLastMonth) / orderCountLastMonth) * 100 : 0
    };
  }, [orders]);

  // Order map by orderId
  const ordersMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach(o => {
      if (o.id) map.set(o.id, o);
      if (o.docId) map.set(o.docId, o);
    });
    return map;
  }, [orders]);

  // Business Metrics Calculations & Data Parsing
  const parsedOrders = useMemo<ParsedMetricOrder[]>(() => {
    return orders.map(o => {
      let d: Date | null = null;
      if (o.date) {
        const parsed = new Date(o.date);
        if (!isNaN(parsed.getTime())) d = parsed;
        else {
          const parts = o.date.split(/[-/]/);
          if (parts.length === 3 && parts[2]?.length === 4) {
            const d2 = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            if (!isNaN(d2.getTime())) d = d2;
          }
        }
      }
      if (!d && o.createdAt?.seconds) {
        d = new Date(o.createdAt.seconds * 1000);
      }
      if (!d && typeof o.createdAt === 'string') {
        const parsed = new Date(o.createdAt);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
      if (!d) d = new Date();

      const revenue = parseNumericAmount(o.amount || o.details?.totalAmount);

      let units = 1;
      if (o.details?.products && Array.isArray(o.details.products) && o.details.products.length > 0) {
        const sum = o.details.products.reduce((acc, p) => acc + Math.max(1, Number(p.quantity) || 1), 0);
        if (sum > 0) units = sum;
      } else if (typeof o.items === 'number' && o.items > 0) {
        units = o.items;
      }

      return {
        id: o.id || o.docId || '',
        orderNumber: o.id || 'N/A',
        customer: o.customer || o.details?.customerName || 'Direct Client',
        date: d,
        year: d.getFullYear(),
        month: d.getMonth(),
        quarter: Math.floor(d.getMonth() / 3),
        revenue,
        units
      };
    });
  }, [orders]);

  // Dynamic available years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const setY = new Set<number>([currentYear, currentYear - 1]);
    parsedOrders.forEach(o => {
      setY.add(o.year);
    });
    return Array.from(setY).sort((a, b) => b - a);
  }, [parsedOrders]);

  // Aggregate helper
  const computeAggregate = (items: ParsedMetricOrder[]) => {
    const totalBills = items.length;
    const totalRevenue = items.reduce((acc, o) => acc + o.revenue, 0);
    const totalUnits = items.reduce((acc, o) => acc + o.units, 0);
    const aov = totalBills > 0 ? totalRevenue / totalBills : 0;
    const bucketSize = totalBills > 0 ? totalUnits / totalBills : 0;
    return {
      totalBills,
      totalRevenue,
      totalUnits,
      aov,
      bucketSize,
      orders: items
    };
  };

  // 12-month data array for Year-wise
  const yearlyMonthlyData = useMemo(() => {
    return MONTH_NAMES.map((mName, mIndex) => {
      const monthOrders = parsedOrders.filter(o => o.year === metricsYear && o.month === mIndex);
      const agg = computeAggregate(monthOrders);

      let prevMIndex = mIndex - 1;
      let prevMYear = metricsYear;
      if (prevMIndex < 0) {
        prevMIndex = 11;
        prevMYear = metricsYear - 1;
      }
      const prevMonthOrders = parsedOrders.filter(o => o.year === prevMYear && o.month === prevMIndex);
      const prevAgg = computeAggregate(prevMonthOrders);

      const momRevenueGrowth = computeGrowth(
        agg.totalRevenue,
        prevAgg.totalRevenue,
        `vs ${MONTH_NAMES_SHORT[prevMIndex]} ${prevMYear}`
      );

      const momBillsGrowth = computeGrowth(
        agg.totalBills,
        prevAgg.totalBills,
        `vs ${MONTH_NAMES_SHORT[prevMIndex]} ${prevMYear}`
      );

      return {
        monthIndex: mIndex,
        monthName: mName,
        monthShort: MONTH_NAMES_SHORT[mIndex],
        ...agg,
        prevMonthRevenue: prevAgg.totalRevenue,
        prevMonthBills: prevAgg.totalBills,
        momRevenueGrowth,
        momBillsGrowth
      };
    });
  }, [parsedOrders, metricsYear]);

  // 4-quarter data array for Year-wise
  const yearlyQuarterlyData = useMemo(() => {
    const quarters = [
      { label: 'Q1 (Jan - Mar)', q: 0, months: [0, 1, 2] },
      { label: 'Q2 (Apr - Jun)', q: 1, months: [3, 4, 5] },
      { label: 'Q3 (Jul - Sep)', q: 2, months: [6, 7, 8] },
      { label: 'Q4 (Oct - Dec)', q: 3, months: [9, 10, 11] },
    ];

    return quarters.map(qItem => {
      const qOrders = parsedOrders.filter(o => o.year === metricsYear && o.quarter === qItem.q);
      const agg = computeAggregate(qOrders);

      let prevQ = qItem.q - 1;
      let prevQYear = metricsYear;
      if (prevQ < 0) {
        prevQ = 3;
        prevQYear = metricsYear - 1;
      }
      const prevQOrders = parsedOrders.filter(o => o.year === prevQYear && o.quarter === prevQ);
      const prevAgg = computeAggregate(prevQOrders);

      const qoqRevenueGrowth = computeGrowth(
        agg.totalRevenue,
        prevAgg.totalRevenue,
        `vs Q${prevQ + 1} (${prevQYear})`
      );

      return {
        ...qItem,
        ...agg,
        prevQuarterRevenue: prevAgg.totalRevenue,
        qoqRevenueGrowth
      };
    });
  }, [parsedOrders, metricsYear]);

  // Primary Business Metrics Object
  const businessMetrics = useMemo(() => {
    if (metricsGranularity === 'month') {
      const currentOrders = parsedOrders.filter(o => o.year === metricsYear && o.month === metricsMonth);
      const current = computeAggregate(currentOrders);

      // Previous Month
      const prevMonth = metricsMonth === 0 ? 11 : metricsMonth - 1;
      const prevYear = metricsMonth === 0 ? metricsYear - 1 : metricsYear;
      const prevMonthOrders = parsedOrders.filter(o => o.year === prevYear && o.month === prevMonth);
      const prevMonthAgg = computeAggregate(prevMonthOrders);

      const momMetric = computeGrowth(
        current.totalRevenue,
        prevMonthAgg.totalRevenue,
        `vs ${MONTH_NAMES_SHORT[prevMonth]} ${prevYear}`,
        `Current Month: ₹${Math.round(current.totalRevenue).toLocaleString('en-IN')} vs Prior Month: ₹${Math.round(prevMonthAgg.totalRevenue).toLocaleString('en-IN')}`
      );

      // Quarter
      const currentQuarter = Math.floor(metricsMonth / 3);
      const currentQuarterOrders = parsedOrders.filter(o => o.year === metricsYear && o.quarter === currentQuarter);
      const currentQuarterAgg = computeAggregate(currentQuarterOrders);

      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const prevQuarterYear = currentQuarter === 0 ? metricsYear - 1 : metricsYear;
      const prevQuarterOrders = parsedOrders.filter(o => o.year === prevQuarterYear && o.quarter === prevQuarter);
      const prevQuarterAgg = computeAggregate(prevQuarterOrders);

      const qoqMetric = computeGrowth(
        currentQuarterAgg.totalRevenue,
        prevQuarterAgg.totalRevenue,
        `Q${currentQuarter + 1} (QTD) vs Q${prevQuarter + 1} (${prevQuarterYear})`,
        `Q${currentQuarter + 1} to-date (₹${Math.round(currentQuarterAgg.totalRevenue).toLocaleString('en-IN')}) vs Q${prevQuarter + 1} Total (₹${Math.round(prevQuarterAgg.totalRevenue).toLocaleString('en-IN')})`
      );

      // YoY (Same month last year)
      const sameMonthLastYearOrders = parsedOrders.filter(o => o.year === metricsYear - 1 && o.month === metricsMonth);
      const sameMonthLastYearAgg = computeAggregate(sameMonthLastYearOrders);

      const yoyMetric = computeGrowth(
        current.totalRevenue,
        sameMonthLastYearAgg.totalRevenue,
        `vs ${MONTH_NAMES_SHORT[metricsMonth]} ${metricsYear - 1}`,
        sameMonthLastYearAgg.totalRevenue === 0
          ? `No sales recorded in ${MONTH_NAMES_SHORT[metricsMonth]} ${metricsYear - 1} (₹0 base)`
          : `Current: ₹${Math.round(current.totalRevenue).toLocaleString('en-IN')} vs Prior Year: ₹${Math.round(sameMonthLastYearAgg.totalRevenue).toLocaleString('en-IN')}`
      );

      return {
        title: `${MONTH_NAMES[metricsMonth]} ${metricsYear}`,
        subTitle: 'Month-wise Sales & Basket Analysis',
        current,
        mom: momMetric,
        qoq: qoqMetric,
        yoy: yoyMetric
      };
    }

    if (metricsGranularity === 'year') {
      const currentOrders = parsedOrders.filter(o => o.year === metricsYear);
      const current = computeAggregate(currentOrders);

      // Prior Year
      const prevYearOrders = parsedOrders.filter(o => o.year === metricsYear - 1);
      const prevYearAgg = computeAggregate(prevYearOrders);

      const yoyMetric = computeGrowth(
        current.totalRevenue,
        prevYearAgg.totalRevenue,
        `vs Year ${metricsYear - 1}`,
        prevYearAgg.totalRevenue === 0
          ? `No sales recorded in Year ${metricsYear - 1} (₹0 base)`
          : `Year ${metricsYear} (₹${Math.round(current.totalRevenue).toLocaleString('en-IN')}) vs Year ${metricsYear - 1} (₹${Math.round(prevYearAgg.totalRevenue).toLocaleString('en-IN')})`
      );

      // Active / latest month MoM
      const now = new Date();
      const effectiveM = (metricsYear === now.getFullYear()) ? now.getMonth() : 11;
      const mData = yearlyMonthlyData[effectiveM] || yearlyMonthlyData[0];

      // Active / latest quarter QoQ
      const effectiveQ = (metricsYear === now.getFullYear()) ? Math.floor(now.getMonth() / 3) : 3;
      const qData = yearlyQuarterlyData[effectiveQ] || yearlyQuarterlyData[0];

      return {
        title: `Full Year ${metricsYear}`,
        subTitle: 'Annual Executive Overview & Growth Trajectory',
        current,
        mom: mData?.momRevenueGrowth || computeGrowth(0, 0, 'MoM Growth'),
        qoq: qData?.qoqRevenueGrowth || computeGrowth(0, 0, 'QoQ Growth'),
        yoy: yoyMetric
      };
    }

    // Custom Granularity
    const sDate = new Date(metricsCustomStart + 'T00:00:00');
    const eDate = new Date(metricsCustomEnd + 'T23:59:59');
    const currentOrders = parsedOrders.filter(o => o.date >= sDate && o.date <= eDate);
    const current = computeAggregate(currentOrders);

    // Prior Equal Period
    const spanMs = Math.max(86400000, eDate.getTime() - sDate.getTime() + 1);
    const prevStart = new Date(sDate.getTime() - spanMs);
    const prevEnd = new Date(sDate.getTime() - 1);
    const prevOrders = parsedOrders.filter(o => o.date >= prevStart && o.date <= prevEnd);
    const prevAgg = computeAggregate(prevOrders);

    const spanDays = Math.round(spanMs / 86400000);
    const periodMetric = computeGrowth(
      current.totalRevenue,
      prevAgg.totalRevenue,
      `vs Prior Equal Span (${spanDays}d)`,
      `Current Span vs Prior ${spanDays} days (₹${Math.round(prevAgg.totalRevenue).toLocaleString('en-IN')})`
    );

    // Same Period Last Year (YoY)
    const yoyStart = new Date(sDate);
    yoyStart.setFullYear(sDate.getFullYear() - 1);
    const yoyEnd = new Date(eDate);
    yoyEnd.setFullYear(eDate.getFullYear() - 1);
    const yoyOrders = parsedOrders.filter(o => o.date >= yoyStart && o.date <= yoyEnd);
    const yoyAgg = computeAggregate(yoyOrders);

    const yoyMetric = computeGrowth(
      current.totalRevenue,
      yoyAgg.totalRevenue,
      'vs Same Dates Last Year',
      yoyAgg.totalRevenue === 0
        ? 'No sales recorded in this date range last year (₹0 base)'
        : `Current vs Last Year Matching Dates (₹${Math.round(yoyAgg.totalRevenue).toLocaleString('en-IN')})`
    );

    // 90-day comparison for QoQ
    const qSpanMs = 90 * 86400000;
    const qoqStart = new Date(sDate.getTime() - qSpanMs);
    const qoqEnd = new Date(sDate.getTime() - 1);
    const qoqOrders = parsedOrders.filter(o => o.date >= qoqStart && o.date <= qoqEnd);
    const qoqAgg = computeAggregate(qoqOrders);

    const qoqMetric = computeGrowth(
      current.totalRevenue,
      qoqAgg.totalRevenue,
      'vs Prior 90-Day Span',
      `Current vs Prior 90 Days (₹${Math.round(qoqAgg.totalRevenue).toLocaleString('en-IN')})`
    );

    const sLabel = sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const eLabel = eDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      title: `${sLabel} — ${eLabel}`,
      subTitle: `Custom Date Window (${spanDays} days)`,
      current,
      mom: periodMetric,
      qoq: qoqMetric,
      yoy: yoyMetric
    };
  }, [metricsGranularity, metricsYear, metricsMonth, metricsCustomStart, metricsCustomEnd, parsedOrders, yearlyMonthlyData, yearlyQuarterlyData]);

  // Current Date vs Previous Month Same Date Revenue Benchmark
  const benchmarkCurrentDateMetrics = useMemo(() => {
    const targetYear = metricsGranularity === 'month' ? metricsYear : todayDateObj.getFullYear();
    const targetMonth = metricsGranularity === 'month' ? metricsMonth : todayDateObj.getMonth();

    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;

    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    const effectiveDay = Math.min(benchmarkDay, daysInTargetMonth);
    const effectivePrevDay = Math.min(benchmarkDay, daysInPrevMonth);

    const curOrders = parsedOrders.filter(o => {
      if (o.year !== targetYear || o.month !== targetMonth) return false;
      const orderDay = o.date.getDate();
      return benchmarkScope === 'single_day' ? orderDay === effectiveDay : orderDay <= effectiveDay;
    });

    const prevOrders = parsedOrders.filter(o => {
      if (o.year !== prevYear || o.month !== prevMonth) return false;
      const orderDay = o.date.getDate();
      return benchmarkScope === 'single_day' ? orderDay === effectivePrevDay : orderDay <= effectivePrevDay;
    });

    const curRevenue = curOrders.reduce((sum, o) => sum + o.revenue, 0);
    const curBills = curOrders.length;
    const curUnits = curOrders.reduce((sum, o) => sum + o.units, 0);

    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.revenue, 0);
    const prevBills = prevOrders.length;
    const prevUnits = prevOrders.reduce((sum, o) => sum + o.units, 0);

    const diffRevenue = curRevenue - prevRevenue;
    const diffBills = curBills - prevBills;

    const curLabel = benchmarkScope === 'single_day'
      ? `${effectiveDay} ${MONTH_NAMES_SHORT[targetMonth]} ${targetYear}`
      : `1–${effectiveDay} ${MONTH_NAMES_SHORT[targetMonth]} ${targetYear} (MTD)`;

    const prevLabel = benchmarkScope === 'single_day'
      ? `${effectivePrevDay} ${MONTH_NAMES_SHORT[prevMonth]} ${prevYear}`
      : `1–${effectivePrevDay} ${MONTH_NAMES_SHORT[prevMonth]} ${prevYear} (MTD)`;

    const growth = computeGrowth(
      curRevenue,
      prevRevenue,
      `${curLabel} vs ${prevLabel}`,
      `Current: ₹${Math.round(curRevenue).toLocaleString('en-IN')} (${curBills} bills) | Previous: ₹${Math.round(prevRevenue).toLocaleString('en-IN')} (${prevBills} bills)`
    );

    return {
      targetYear,
      targetMonth,
      prevYear,
      prevMonth,
      effectiveDay,
      effectivePrevDay,
      curLabel,
      prevLabel,
      curRevenue,
      curBills,
      curUnits,
      prevRevenue,
      prevBills,
      prevUnits,
      diffRevenue,
      diffBills,
      growth,
      isToday: effectiveDay === todayDateObj.getDate() && targetMonth === todayDateObj.getMonth() && targetYear === todayDateObj.getFullYear()
    };
  }, [parsedOrders, metricsGranularity, metricsYear, metricsMonth, benchmarkDay, benchmarkScope, todayDateObj]);

  // Export Business Metrics
  const exportBusinessMetricsExcel = () => {
    const rows: any[] = [];
    if (metricsGranularity === 'year') {
      yearlyMonthlyData.forEach(m => {
        rows.push({
          "Period": m.monthName,
          "Total Bills": m.totalBills,
          "Total Units": m.totalUnits,
          "Bucket Size (Units/Bill)": Number(m.bucketSize.toFixed(2)),
          "Total Revenue (INR)": m.totalRevenue,
          "AOV (INR)": Number(m.aov.toFixed(2)),
          "MoM Revenue Growth %": m.momRevenueGrowth.displayText
        });
      });
    } else {
      businessMetrics.current.orders.forEach(o => {
        rows.push({
          "Order ID": o.orderNumber,
          "Customer": o.customer,
          "Date": o.date.toLocaleDateString('en-IN'),
          "Units": o.units,
          "Order Amount (INR)": o.revenue,
          "Contribution %": businessMetrics.current.totalRevenue > 0
            ? `${((o.revenue / businessMetrics.current.totalRevenue) * 100).toFixed(1)}%`
            : '0%'
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Metrics Report");
    XLSX.writeFile(workbook, `SRK_Business_Metrics_${metricsGranularity}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Date range calculation label
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if (period === 'today') {
      return formatDate(now);
    }
    if (period === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    if (period === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'this_fy') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(year, 3, 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'custom' && (customStartDate || customEndDate)) {
      const startStr = customStartDate ? formatDate(new Date(customStartDate)) : 'Start';
      const endStr = customEndDate ? formatDate(new Date(customEndDate)) : 'Today';
      return `${startStr} to ${endStr}`;
    }
    return 'All Available Time Periods';
  }, [period, customStartDate, customEndDate]);

  // Extract & Filter Received Payment Phases
  const paymentReportData = useMemo(() => {
    const now = new Date();

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'this_week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'this_fy') {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      startDate = new Date(fyStartYear, 3, 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const items: Array<{
      orderId: string;
      customer: string;
      phaseTitle: string;
      sourceType: string;
      bankName: string;
      utrNumber: string;
      date: Date | null;
      dateFormatted: string;
      grossAmount: number;
      gstSubtracted: number;
      netCreditedAmount: number;
      isPRorCash: boolean;
      deliveryDate: string;
    }> = [];

    let totalGross = 0;
    let totalGstSub = 0;
    let totalNetCredited = 0;

    let cashTotal = 0;
    let prBankTotal = 0;
    let sbiBankTotal = 0;
    let unionBankTotal = 0;
    let otherBankTotal = 0;
    let chequeTotal = 0;

    const coveredOrderIds = new Set<string>();

    const getAccountCategory = (srcType: string, bnkName: string) => {
      const bnkUpper = (bnkName || '').toUpperCase();
      const srcUpper = (srcType || '').toUpperCase();

      if (srcUpper.includes('ICICI') || srcUpper.includes('CASH') || bnkUpper.includes('ICICI') || bnkUpper.includes('CASH')) {
        return 'ICICI';
      }
      if (bnkUpper.includes('PNB') || bnkUpper.includes('PR') || srcUpper.includes('PNB') || srcUpper.includes('PR')) {
        return 'PNB';
      }
      if (bnkUpper.includes('SBI') || srcUpper.includes('SBI')) {
        return 'SBI';
      }
      if (bnkUpper.includes('UNION') || srcUpper.includes('UNION')) {
        return 'Union';
      }
      if (srcUpper.includes('CHEQUE') || bnkUpper.includes('CHEQUE')) {
        return 'Cheque';
      }
      return 'Other';
    };

    payments.forEach(record => {
      coveredOrderIds.add(record.orderId);
      const order = ordersMap.get(record.orderId);
      const customerName = order?.customer || order?.details?.customerName || 'N/A';
      const orderDeliveryDate = record.deliveryDate || order?.details?.deliveryDate || 'N/A';

      const parseVal = (str: any) => {
        if (!str) return 0;
        const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
        return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
      };
      const baseGrandTotal = parseVal(record.grandTotal || order?.amount);

      (record.phases || []).forEach((phase) => {
        const phaseStatus = String(phase.status || '').trim().toLowerCase();
        if (phaseStatus !== 'received' && phaseStatus !== 'paid' && phaseStatus !== 'completed') return;

        // Parse phase date with flexible format support
        let pDate: Date | null = null;
        if (phase.date) {
          const trimmed = String(phase.date).trim();
          const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (isoMatch) {
            pDate = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
          } else if (dmyMatch) {
            pDate = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
          } else {
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) pDate = parsed;
          }
        }
        if (!pDate && record.updatedAt?.seconds) {
          pDate = new Date(record.updatedAt.seconds * 1000);
        } else if (!pDate && order?.createdAt?.seconds) {
          pDate = new Date(order.createdAt.seconds * 1000);
        } else if (!pDate && order?.date) {
          const parsedOrderDate = new Date(order.date);
          if (!isNaN(parsedOrderDate.getTime())) pDate = parsedOrderDate;
        }

        // Apply date filter
        if (startDate && pDate && pDate < startDate) return;
        if (endDate && pDate && pDate > endDate) return;

        const srcType = phase.sourceType || 'Bank';
        const bnkName = phase.bankName || '';
        const category = getAccountCategory(srcType, bnkName);

        const adj = calculatePhaseGstAdjustment(phase.amount, srcType, bnkName, 18, baseGrandTotal);
        const gross = adj.grossAmount;
        const gstSub = adj.gstAmount;
        const netCredited = adj.netCreditedAmount;

        // Account breakdown totals
        if (category === 'ICICI') cashTotal += netCredited;
        else if (category === 'PNB') prBankTotal += netCredited;
        else if (category === 'SBI') sbiBankTotal += netCredited;
        else if (category === 'Union') unionBankTotal += netCredited;
        else if (category === 'Cheque') chequeTotal += netCredited;
        else otherBankTotal += netCredited;

        // Check active source filter
        let matchesFilter = true;
        if (selectedSource === 'PNB' || selectedSource === 'PR') matchesFilter = (category === 'PNB');
        else if (selectedSource === 'ICICI' || selectedSource === 'Cash') matchesFilter = (category === 'ICICI');
        else if (selectedSource === 'SBI') matchesFilter = (category === 'SBI');
        else if (selectedSource === 'Union') matchesFilter = (category === 'Union');
        else if (selectedSource === 'Cheque') matchesFilter = (category === 'Cheque');

        if (!matchesFilter) return;

        totalGross += gross;
        totalGstSub += gstSub;
        totalNetCredited += netCredited;

        items.push({
          orderId: record.orderId,
          customer: customerName,
          phaseTitle: phase.title || 'Payment Phase',
          sourceType: srcType,
          bankName: bnkName || category,
          utrNumber: phase.utrNumber || 'N/A',
          date: pDate,
          dateFormatted: pDate ? pDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          grossAmount: gross,
          gstSubtracted: gstSub,
          netCreditedAmount: netCredited,
          isPRorCash: adj.isPRorCash,
          deliveryDate: orderDeliveryDate
        });
      });
    });

    // Fallback for orders that don't have an explicit payment record document in payments collection
    orders.forEach(order => {
      const oId = order.id || order.docId;
      if (!oId || coveredOrderIds.has(oId)) return;

      const parseVal = (str: any) => {
        if (!str) return 0;
        const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
        return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
      };

      const advanceAmt = parseVal(order.details?.advancePayment);
      const totalAmt = parseVal(order.amount || order.details?.totalAmount);

      if (advanceAmt > 0 || (order.status && ['completed', 'dispatched', 'received'].includes(order.status.toLowerCase()))) {
        const phaseAmt = advanceAmt > 0 ? advanceAmt : totalAmt;
        if (phaseAmt <= 0) return;

        let pDate: Date | null = null;
        if (order.date) {
          const parsed = new Date(order.date);
          if (!isNaN(parsed.getTime())) pDate = parsed;
        }
        if (!pDate && order.createdAt?.seconds) {
          pDate = new Date(order.createdAt.seconds * 1000);
        }

        if (startDate && pDate && pDate < startDate) return;
        if (endDate && pDate && pDate > endDate) return;

        // Detect bank and source type dynamically from order details
        const bankDetailsStr = String(order.details?.bankDetails || (order as any).bankName || (order as any).sourceType || '');
        let srcType = (order as any).sourceType || 'Bank';
        let bnkName = (order as any).bankName || '';

        const upperDetails = bankDetailsStr.toUpperCase();
        if (upperDetails.includes('ICICI') || upperDetails.includes('CASH')) {
          srcType = 'ICICI BANK';
          bnkName = 'ICICI';
        } else if (upperDetails.includes('SBI')) {
          srcType = 'Bank';
          bnkName = 'SBI';
        } else if (upperDetails.includes('UNION')) {
          srcType = 'Bank';
          bnkName = 'Union';
        } else if (upperDetails.includes('CHEQUE')) {
          srcType = 'Cheque';
          bnkName = 'Cheque';
        } else if (upperDetails.includes('PNB') || upperDetails.includes('PR')) {
          srcType = 'Bank';
          bnkName = 'PNB';
        }

        const category = getAccountCategory(srcType, bnkName);
        const adj = calculatePhaseGstAdjustment(phaseAmt, srcType, bnkName, 18, totalAmt);

        // Account breakdown totals
        if (category === 'ICICI') cashTotal += adj.netCreditedAmount;
        else if (category === 'PNB') prBankTotal += adj.netCreditedAmount;
        else if (category === 'SBI') sbiBankTotal += adj.netCreditedAmount;
        else if (category === 'Union') unionBankTotal += adj.netCreditedAmount;
        else if (category === 'Cheque') chequeTotal += adj.netCreditedAmount;
        else otherBankTotal += adj.netCreditedAmount;

        // Check active source filter
        let matchesFilter = true;
        if (selectedSource === 'PNB' || selectedSource === 'PR') matchesFilter = (category === 'PNB');
        else if (selectedSource === 'ICICI' || selectedSource === 'Cash') matchesFilter = (category === 'ICICI');
        else if (selectedSource === 'SBI') matchesFilter = (category === 'SBI');
        else if (selectedSource === 'Union') matchesFilter = (category === 'Union');
        else if (selectedSource === 'Cheque') matchesFilter = (category === 'Cheque');

        if (!matchesFilter) return;

        totalGross += adj.grossAmount;
        totalGstSub += adj.gstAmount;
        totalNetCredited += adj.netCreditedAmount;

        items.push({
          orderId: oId,
          customer: order.customer || order.details?.customerName || 'N/A',
          phaseTitle: advanceAmt > 0 ? 'Advance Payment' : 'Initial Payment',
          sourceType: srcType,
          bankName: bnkName || category,
          utrNumber: 'N/A',
          date: pDate,
          dateFormatted: pDate ? pDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          grossAmount: adj.grossAmount,
          gstSubtracted: adj.gstAmount,
          netCreditedAmount: adj.netCreditedAmount,
          isPRorCash: adj.isPRorCash,
          deliveryDate: order.details?.deliveryDate || 'N/A'
        });
      }
    });

    // Sort items by date descending
    items.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });

    return {
      items,
      totals: {
        totalGross,
        totalGstSub,
        totalNetCredited,
        cashTotal,
        prBankTotal,
        sbiBankTotal,
        unionBankTotal,
        otherBankTotal,
        chequeTotal,
        transactionCount: items.length
      }
    };
  }, [payments, ordersMap, period, customStartDate, customEndDate, selectedSource]);

  // Helper currency format for UI
  const fmtUI = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  // Helper currency format for PDF (prevents Unicode '₹' symbol rendering bugs in jsPDF)
  const pdfFmt = (n: number) => `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // PDF Report Generator
  const generatePDFReport = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Header Banner Box (26mm height)
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 297, 26, 'F');

    // Main Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SRK MODULAR — COMPREHENSIVE PAYMENT REPORT', 12, 12);

    // Subtitle & Filter Info on Line 2 inside header box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    const filterLabel = selectedSource === 'ALL' ? 'All Accounts' : `${selectedSource} Bank/Mode`;
    doc.text(`Period: ${dateRangeLabel}    |    Account Filter: ${filterLabel}`, 12, 20);

    // Generation Timestamp on Top Right
    doc.setFontSize(8.5);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 285, 20, { align: 'right' });

    // Summary Section Header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIVED BREAKDOWN SUMMARY', 12, 33);

    const summaryHead = [
      'Total Net Credited',
      'PNB Bank Account',
      'ICICI Bank Account',
      'SBI Bank Account',
      'Union Bank Account',
      'Cheque / Other',
      'Subtracted GST'
    ];

    const summaryBody = [
      [
        pdfFmt(paymentReportData.totals.totalNetCredited),
        pdfFmt(paymentReportData.totals.prBankTotal),
        pdfFmt(paymentReportData.totals.cashTotal),
        pdfFmt(paymentReportData.totals.sbiBankTotal),
        pdfFmt(paymentReportData.totals.unionBankTotal),
        pdfFmt(paymentReportData.totals.chequeTotal + paymentReportData.totals.otherBankTotal),
        pdfFmt(paymentReportData.totals.totalGstSub)
      ]
    ];

    autoTable(doc, {
      startY: 36,
      margin: { left: 12, right: 12 },
      head: [summaryHead],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      bodyStyles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      styles: { cellPadding: 2.5, overflow: 'linebreak' }
    });

    const ledgerStartY = (doc as any).lastAutoTable.finalY + 9;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`ITEMIZED TRANSACTIONS LEDGER (${paymentReportData.totals.transactionCount} Received Payments)`, 12, ledgerStartY);

    // Ledger Table
    const tableRows = paymentReportData.items.map((item, index) => [
      index + 1,
      item.dateFormatted,
      item.orderId,
      item.customer,
      item.phaseTitle,
      item.sourceType === 'Bank' ? `Bank (${item.bankName || 'General'})` : item.sourceType,
      item.utrNumber,
      pdfFmt(item.grossAmount),
      item.gstSubtracted > 0 ? `-${pdfFmt(item.gstSubtracted)}` : 'Rs. 0',
      pdfFmt(item.netCreditedAmount)
    ]);

    autoTable(doc, {
      startY: ledgerStartY + 3,
      margin: { left: 12, right: 12 },
      head: [['#', 'Date', 'Order ID', 'Customer Name', 'Phase Title', 'Mode / Bank', 'UTR / Ref No', 'Gross Recd', 'GST Subtracted', 'Net Credited']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 50 },
        4: { cellWidth: 26 },
        5: { cellWidth: 26 },
        6: { cellWidth: 26 },
        7: { cellWidth: 25, halign: 'right' },
        8: { cellWidth: 25, halign: 'right' },
        9: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
      },
      foot: [[
        { content: 'TOTAL RECEIVED', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
        pdfFmt(paymentReportData.totals.totalGross),
        `-${pdfFmt(paymentReportData.totals.totalGstSub)}`,
        pdfFmt(paymentReportData.totals.totalNetCredited)
      ]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, halign: 'right' }
    });

    const filePeriodName = period.toUpperCase();
    doc.save(`SRK_Payment_Report_${filePeriodName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // CSV / XLSX Export Generator
  const generateXLSXReport = () => {
    const excelRows = paymentReportData.items.map((item, index) => ({
      "S.No": index + 1,
      "Received Date": item.dateFormatted,
      "Order ID": item.orderId,
      "Customer Name": item.customer,
      "Phase Title": item.phaseTitle,
      "Payment Source": item.sourceType,
      "Bank Name": item.bankName || 'N/A',
      "UTR / Cheque Ref": item.utrNumber,
      "Gross Received Amount (INR)": item.grossAmount,
      "GST Subtracted (INR)": item.gstSubtracted,
      "Net Credited Amount (INR)": item.netCreditedAmount,
      "PNB / ICICI GST Exemption": item.isPRorCash ? "Yes" : "No",
      "Order Delivery Date": item.deliveryDate
    }));

    // Add Totals row
    excelRows.push({
      "S.No": "" as any,
      "Received Date": "TOTAL RECEIVED",
      "Order ID": "",
      "Customer Name": "",
      "Phase Title": "",
      "Payment Source": "",
      "Bank Name": "",
      "UTR / Cheque Ref": "",
      "Gross Received Amount (INR)": paymentReportData.totals.totalGross,
      "GST Subtracted (INR)": paymentReportData.totals.totalGstSub,
      "Net Credited Amount (INR)": paymentReportData.totals.totalNetCredited,
      "PNB / ICICI GST Exemption": "",
      "Order Delivery Date": ""
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Report");

    const filePeriodName = period.toUpperCase();
    XLSX.writeFile(workbook, `SRK_Payment_Report_${filePeriodName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Analytics & Financial Reporting
          </h2>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Real-time metric dashboard and bank/cash payment receipts report generator.
          </p>
        </div>
      </div>

      {/* EXECUTIVE BUSINESS METRICS & GROWTH SUITE (AOV, TOTAL BILL, BUCKET SIZE, MoM, QoQ, YoY) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-6">
        {/* Section Header & Interactive Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Sales & Growth Performance Analytics</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  AOV, Total Bills, Bucket Depth & Growth Trajectory ({businessMetrics.subTitle})
                </p>
              </div>
            </div>
          </div>

          {/* Granularity & Time Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented Filter Mode Buttons */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setMetricsGranularity('month')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metricsGranularity === 'month'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Month-wise
              </button>
              <button
                type="button"
                onClick={() => setMetricsGranularity('year')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metricsGranularity === 'year'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Year-wise
              </button>
              <button
                type="button"
                onClick={() => setMetricsGranularity('custom')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metricsGranularity === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>

            {/* Dynamic Selectors Based on Granularity */}
            {metricsGranularity === 'month' && (
              <div className="flex items-center gap-2">
                <select
                  value={metricsMonth}
                  onChange={(e) => setMetricsMonth(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  value={metricsYear}
                  onChange={(e) => setMetricsYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {metricsGranularity === 'year' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">Select Year:</label>
                <select
                  value={metricsYear}
                  onChange={(e) => setMetricsYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>Year {yr}</option>
                  ))}
                </select>
              </div>
            )}

            {metricsGranularity === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={metricsCustomStart}
                  onChange={(e) => setMetricsCustomStart(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={metricsCustomEnd}
                  onChange={(e) => setMetricsCustomEnd(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Export Metrics to Excel */}
            <button
              type="button"
              onClick={exportBusinessMetricsExcel}
              disabled={businessMetrics.current.totalBills === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download metrics as Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              Export .xlsx
            </button>
          </div>
        </div>

        {/* Period Active Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Period:</span>
            <span className="text-sm font-black text-slate-900">{businessMetrics.title}</span>
            <span className="text-xs font-semibold text-slate-500">({businessMetrics.current.totalBills} Bills Processed)</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div>
              Total Invoiced: <span className="font-extrabold text-slate-900">₹{Math.round(businessMetrics.current.totalRevenue).toLocaleString('en-IN')}</span>
            </div>
            <div>
              Total Products: <span className="font-extrabold text-slate-900">{businessMetrics.current.totalUnits} Units</span>
            </div>
          </div>
        </div>

        {/* CURRENT DATE VS PREVIOUS MONTH SAME DATE REVENUE & GROWTH/DECREASE BENCHMARK */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border-2 border-indigo-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Card Header with Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    Current Date Revenue Benchmark
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Day-on-Day / MTD
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Comparing {benchmarkCurrentDateMetrics.curLabel} vs previous month ({benchmarkCurrentDateMetrics.prevLabel})
                </p>
              </div>
            </div>

            {/* Controls: Scope & Day Picker */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Scope Selector: Single Day vs MTD */}
              <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBenchmarkScope('single_day')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    benchmarkScope === 'single_day'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Date ({benchmarkCurrentDateMetrics.effectiveDay}th)
                </button>
                <button
                  type="button"
                  onClick={() => setBenchmarkScope('mtd')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    benchmarkScope === 'mtd'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  MTD (1st–{benchmarkCurrentDateMetrics.effectiveDay}th)
                </button>
              </div>

              {/* Day Picker */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                <label className="text-[11px] font-bold text-slate-500">Day:</label>
                <select
                  value={benchmarkDay}
                  onChange={(e) => setBenchmarkDay(Number(e.target.value))}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}{d === todayDateObj.getDate() ? ' (Today)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset to Today Button */}
              <button
                type="button"
                onClick={() => setBenchmarkDay(todayDateObj.getDate())}
                disabled={benchmarkDay === todayDateObj.getDate()}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  benchmarkDay === todayDateObj.getDate()
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-2xs'
                }`}
                title="Reset day to Today's date"
              >
                <RotateCcw className="w-3 h-3" />
                Today
              </button>
            </div>
          </div>

          {/* Metric Visuals: 3 Main Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Block 1: Current Month Date Revenue */}
            <div className="bg-white/95 p-4 rounded-xl border border-indigo-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-950/70 uppercase tracking-wider">
                    Current Month Date Revenue
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {benchmarkCurrentDateMetrics.curLabel}
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{Math.round(benchmarkCurrentDateMetrics.curRevenue).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total Invoices</span>
                <span className="font-extrabold text-slate-800">
                  {benchmarkCurrentDateMetrics.curBills} Bills ({benchmarkCurrentDateMetrics.curUnits} Units)
                </span>
              </div>
            </div>

            {/* Block 2: Previous Month Same Date Revenue */}
            <div className="bg-white/95 p-4 rounded-xl border border-indigo-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Previous Month Same Date
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {benchmarkCurrentDateMetrics.prevLabel}
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">
                  ₹{Math.round(benchmarkCurrentDateMetrics.prevRevenue).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Prior Invoices</span>
                <span className="font-extrabold text-slate-700">
                  {benchmarkCurrentDateMetrics.prevBills} Bills ({benchmarkCurrentDateMetrics.prevUnits} Units)
                </span>
              </div>
            </div>

            {/* Block 3: Growth or Decrease Result */}
            <div className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${
              benchmarkCurrentDateMetrics.growth.isNewBase
                ? 'bg-indigo-50/80 border-indigo-200'
                : benchmarkCurrentDateMetrics.growth.isPositive
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : benchmarkCurrentDateMetrics.growth.isNegative
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Growth / Decrease Pace
                  </span>
                  {/* Badge */}
                  {benchmarkCurrentDateMetrics.growth.isNewBase ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                      <Sparkles className="w-3 h-3" />
                      New Base
                    </span>
                  ) : benchmarkCurrentDateMetrics.growth.isPositive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Growth
                    </span>
                  ) : benchmarkCurrentDateMetrics.growth.isNegative ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-2xs">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Decrease
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-600 text-white shadow-2xs">
                      Equal (0%)
                    </span>
                  )}
                </div>

                {/* Growth or Decrease Percentage */}
                <div className="flex items-baseline gap-2">
                  <div className={`text-2xl lg:text-3xl font-black tracking-tight ${
                    benchmarkCurrentDateMetrics.growth.isNewBase
                      ? 'text-indigo-700'
                      : benchmarkCurrentDateMetrics.growth.isPositive
                        ? 'text-emerald-700'
                        : benchmarkCurrentDateMetrics.growth.isNegative
                          ? 'text-rose-700'
                          : 'text-slate-700'
                  }`}>
                    {benchmarkCurrentDateMetrics.growth.displayText}
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {benchmarkCurrentDateMetrics.growth.isPositive ? 'Growth' : benchmarkCurrentDateMetrics.growth.isNegative ? 'Decrease' : ''}
                  </span>
                </div>
              </div>

              {/* Variance Footnote */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Net Difference</span>
                <span className={`font-extrabold ${
                  benchmarkCurrentDateMetrics.diffRevenue > 0
                    ? 'text-emerald-700'
                    : benchmarkCurrentDateMetrics.diffRevenue < 0
                      ? 'text-rose-700'
                      : 'text-slate-700'
                }`}>
                  {benchmarkCurrentDateMetrics.diffRevenue > 0 ? '+' : ''}
                  ₹{Math.round(benchmarkCurrentDateMetrics.diffRevenue).toLocaleString('en-IN')}
                  <span className="text-[10px] font-semibold text-slate-500 ml-1">
                    ({benchmarkCurrentDateMetrics.diffBills > 0 ? '+' : ''}{benchmarkCurrentDateMetrics.diffBills} bills)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 PRIMARY EXECUTIVE KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. AOV */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Avg Order Value (AOV)</p>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-black text-slate-900">
                ₹{Math.round(businessMetrics.current.aov).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500">Sales ÷ Total Bills</span>
              <span className="text-[10px] font-bold text-emerald-700 truncate">
                ₹{Math.round(businessMetrics.current.totalRevenue).toLocaleString('en-IN')} / {businessMetrics.current.totalBills} bills
              </span>
            </div>
          </div>

          {/* 2. TOTAL BILL */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Bill Count</p>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-black text-slate-900">
                {businessMetrics.current.totalBills} <span className="text-xs font-bold text-slate-500">Bills</span>
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500">Total Volume</span>
              <span className="text-[10px] font-bold text-blue-700 truncate">
                {businessMetrics.current.totalUnits} items across bills
              </span>
            </div>
          </div>

          {/* 3. BUCKET SIZE */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Bucket Size (Depth)</p>
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-black text-slate-900">
                {businessMetrics.current.bucketSize.toFixed(1)} <span className="text-xs font-bold text-slate-500">Units/Bill</span>
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500">Total Units ÷ Total Bills</span>
              <span className="text-[10px] font-bold text-purple-700 truncate">
                Avg {businessMetrics.current.bucketSize.toFixed(1)} items / order
              </span>
            </div>
          </div>

          {/* 4. MoM GROWTH */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">MoM Growth</p>
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  businessMetrics.mom.isNewBase
                    ? 'bg-indigo-50 text-indigo-600'
                    : businessMetrics.mom.isPositive 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : businessMetrics.mom.isNegative
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                  {businessMetrics.mom.isNewBase ? (
                    <Sparkles className="w-4 h-4" />
                  ) : businessMetrics.mom.isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : businessMetrics.mom.isNegative ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-xl md:text-2xl font-black ${
                  businessMetrics.mom.isNewBase
                    ? 'text-indigo-600'
                    : businessMetrics.mom.isPositive 
                      ? 'text-emerald-600' 
                      : businessMetrics.mom.isNegative
                        ? 'text-rose-600'
                        : 'text-slate-700'
                }`}>
                  {businessMetrics.mom.displayText}
                </p>
                {businessMetrics.mom.isNewBase && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Baseline
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 truncate">{businessMetrics.mom.label}</span>
              <span className="text-[10px] font-bold text-slate-700 truncate" title={businessMetrics.mom.detailNote}>
                Prior: ₹{Math.round(businessMetrics.mom.prevValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 5. QoQ GROWTH */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">QoQ Growth</p>
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  businessMetrics.qoq.isNewBase
                    ? 'bg-indigo-50 text-indigo-600'
                    : businessMetrics.qoq.isPositive 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : businessMetrics.qoq.isNegative
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                  {businessMetrics.qoq.isNewBase ? (
                    <Sparkles className="w-4 h-4" />
                  ) : businessMetrics.qoq.isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : businessMetrics.qoq.isNegative ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-xl md:text-2xl font-black ${
                  businessMetrics.qoq.isNewBase
                    ? 'text-indigo-600'
                    : businessMetrics.qoq.isPositive 
                      ? 'text-emerald-600' 
                      : businessMetrics.qoq.isNegative
                        ? 'text-rose-600'
                        : 'text-slate-700'
                }`}>
                  {businessMetrics.qoq.displayText}
                </p>
                {businessMetrics.qoq.isNewBase && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Baseline
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 truncate">{businessMetrics.qoq.label}</span>
              <span className="text-[10px] font-bold text-slate-700 truncate" title={businessMetrics.qoq.detailNote}>
                Prior: ₹{Math.round(businessMetrics.qoq.prevValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 6. YoY GROWTH */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1.5 mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">YoY Growth</p>
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  businessMetrics.yoy.isNewBase
                    ? 'bg-indigo-50 text-indigo-600'
                    : businessMetrics.yoy.isPositive 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : businessMetrics.yoy.isNegative
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                  {businessMetrics.yoy.isNewBase ? (
                    <Sparkles className="w-4 h-4" />
                  ) : businessMetrics.yoy.isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : businessMetrics.yoy.isNegative ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-xl md:text-2xl font-black ${
                  businessMetrics.yoy.isNewBase
                    ? 'text-indigo-600'
                    : businessMetrics.yoy.isPositive 
                      ? 'text-emerald-600' 
                      : businessMetrics.yoy.isNegative
                        ? 'text-rose-600'
                        : 'text-slate-700'
                }`}>
                  {businessMetrics.yoy.displayText}
                </p>
                {businessMetrics.yoy.isNewBase && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Baseline
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 truncate">{businessMetrics.yoy.label}</span>
              <span className="text-[10px] font-bold text-slate-700 truncate" title={businessMetrics.yoy.detailNote}>
                Prior: ₹{Math.round(businessMetrics.yoy.prevValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* DETAILED DRILLDOWN & TABLES BASED ON MODE */}

        {/* 1. YEAR-WISE DRILLDOWN: 12 Months Matrix & 4 Quarters Breakdown */}
        {metricsGranularity === 'year' && (
          <div className="space-y-6 pt-2">
            {/* 4 Quarters Performance Cards */}
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                Quarterly Pace & Expansion (Year {metricsYear})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {yearlyQuarterlyData.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900">{q.label}</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        q.qoqRevenueGrowth.isNewBase
                          ? 'bg-indigo-100 text-indigo-700'
                          : q.qoqRevenueGrowth.isPositive 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : q.qoqRevenueGrowth.isNegative
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {q.qoqRevenueGrowth.isNewBase ? 'New Base' : `${q.qoqRevenueGrowth.displayText} QoQ`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Revenue</span>
                        <span className="font-extrabold text-slate-800">₹{Math.round(q.totalRevenue).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">AOV</span>
                        <span className="font-extrabold text-slate-800">₹{Math.round(q.aov).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Total Bills</span>
                        <span className="font-extrabold text-slate-800">{q.totalBills} bills</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Bucket Size</span>
                        <span className="font-extrabold text-slate-800">{q.bucketSize.toFixed(1)} u/bill</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 12-Month Performance Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-indigo-600" />
                  12-Month Progression & MoM Trajectory (Year {metricsYear})
                </h4>
                <span className="text-xs font-semibold text-slate-500">Jan — Dec Matrix</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-center">Total Bills</th>
                      <th className="py-3 px-4 text-center">Total Units Sold</th>
                      <th className="py-3 px-4 text-center">Bucket Size (Units/Bill)</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                      <th className="py-3 px-4 text-right">AOV (Average Order)</th>
                      <th className="py-3 px-4 text-center">MoM Revenue Growth</th>
                      <th className="py-3 px-4 text-center">MoM Bills Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {yearlyMonthlyData.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.monthName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-extrabold text-slate-800">{m.totalBills}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{m.totalUnits}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            {m.bucketSize.toFixed(1)} u/bill
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          ₹{Math.round(m.totalRevenue).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                          ₹{Math.round(m.aov).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            m.momRevenueGrowth.isNewBase
                              ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md'
                              : m.momRevenueGrowth.isPositive 
                                ? 'text-emerald-600' 
                                : m.momRevenueGrowth.isNegative 
                                  ? 'text-rose-600' 
                                  : 'text-slate-400'
                          }`}>
                            {m.momRevenueGrowth.displayText}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            m.momBillsGrowth.isNewBase
                              ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md'
                              : m.momBillsGrowth.isPositive 
                                ? 'text-blue-600' 
                                : m.momBillsGrowth.isNegative 
                                  ? 'text-amber-600' 
                                  : 'text-slate-400'
                          }`}>
                            {m.momBillsGrowth.displayText}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. MONTH-WISE DRILLDOWN: Bills Breakdown Table */}
        {metricsGranularity === 'month' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Customer Bills & Product Basket Breakdown ({MONTH_NAMES[metricsMonth]} {metricsYear})
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                {businessMetrics.current.orders.length} Invoices Processed
              </span>
            </div>

            {businessMetrics.current.orders.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500">No customer bills recorded in {MONTH_NAMES[metricsMonth]} {metricsYear}.</p>
                <p className="text-[11px] text-slate-400 mt-1">Select another month or check newly created orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Bill Date</th>
                      <th className="py-3 px-4 text-center">Product Units</th>
                      <th className="py-3 px-4 text-right">Bill Amount (INR)</th>
                      <th className="py-3 px-4 text-right">Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {businessMetrics.current.orders.map((o, idx) => {
                      const share = businessMetrics.current.totalRevenue > 0 
                        ? (o.revenue / businessMetrics.current.totalRevenue) * 100 
                        : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-indigo-600">{o.orderNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{o.customer}</td>
                          <td className="py-3 px-4 text-slate-500 font-semibold">{o.date.toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              {o.units} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            ₹{Math.round(o.revenue).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. CUSTOM RANGE DRILLDOWN */}
        {metricsGranularity === 'custom' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Custom Window Bill Registry ({businessMetrics.title})
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                {businessMetrics.current.orders.length} Bills in Selected Span
              </span>
            </div>

            {businessMetrics.current.orders.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500">No bills found in the selected date window.</p>
                <p className="text-[11px] text-slate-400 mt-1">Adjust start date or end date to broaden your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Bill Date</th>
                      <th className="py-3 px-4 text-center">Units Sold</th>
                      <th className="py-3 px-4 text-right">Bill Amount (INR)</th>
                      <th className="py-3 px-4 text-right">Contribution %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {businessMetrics.current.orders.map((o, idx) => {
                      const share = businessMetrics.current.totalRevenue > 0 
                        ? (o.revenue / businessMetrics.current.totalRevenue) * 100 
                        : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-indigo-600">{o.orderNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{o.customer}</td>
                          <td className="py-3 px-4 text-slate-500 font-semibold">{o.date.toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">{o.units}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            ₹{Math.round(o.revenue).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* PAYMENT REPORT SECTION */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-slate-900">Payment Receipts & Accounts Report</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Download complete payments received across PNB Bank, ICICI Bank, SBI, Union, and Cheque with time period filters.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generatePDFReport}
              disabled={paymentReportData.items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Download PDF Report
            </button>
            <button
              onClick={generateXLSXReport}
              disabled={paymentReportData.items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <TableIcon className="w-4 h-4" />
              Download Excel (XLSX)
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Time Period Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Time Period:
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TimePeriod)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_fy">This Financial Year (Apr - Mar)</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {period === 'custom' && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Account / Source Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Source:
            </div>
            {['ALL', 'PNB', 'ICICI', 'SBI', 'Union', 'Cheque'].map((src) => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedSource === src
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {src === 'ALL' ? 'All Accounts' : src === 'PNB' ? 'PNB Bank' : src === 'ICICI' ? 'ICICI Bank' : src}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Period Display Badge */}
        <div className="text-xs font-bold text-indigo-900 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          Showing Received Payments for: <span className="underline">{dateRangeLabel}</span> ({paymentReportData.totals.transactionCount} transactions)
        </div>

        {/* Account Breakdown Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-indigo-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">Total Net Credited</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {fmtUI(paymentReportData.totals.totalNetCredited)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Actual credited to bank/cash</p>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">PNB Bank Account</span>
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-amber-950">
              {fmtUI(paymentReportData.totals.prBankTotal)}
            </div>
            <p className="text-[11px] text-amber-800/80 font-medium mt-1">Credited to PNB Bank</p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">ICICI Bank Account</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-emerald-950">
              {fmtUI(paymentReportData.totals.cashTotal)}
            </div>
            <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Credited to ICICI Bank</p>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Other Banks / Cheque</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-blue-950">
              {fmtUI(paymentReportData.totals.sbiBankTotal + paymentReportData.totals.unionBankTotal + paymentReportData.totals.otherBankTotal + paymentReportData.totals.chequeTotal)}
            </div>
            <p className="text-[11px] text-blue-800/80 font-medium mt-1">SBI, Union & Cheques</p>
          </div>
        </div>

        {/* GST Subtraction Exemption Summary Note if applicable */}
        {paymentReportData.totals.totalGstSub > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span>
              <strong>Note on GST Exemption Adjustments:</strong> GST worth <strong>{fmtUI(paymentReportData.totals.totalGstSub)}</strong> was subtracted for PNB Bank and ICICI Bank payments in this period.
            </span>
            <span className="font-extrabold text-amber-950">Total Gross: {fmtUI(paymentReportData.totals.totalGross)}</span>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phase Title</th>
                <th className="py-3 px-4">Source / Mode</th>
                <th className="py-3 px-4">UTR / Ref No</th>
                <th className="py-3 px-4 text-right">Gross Recd</th>
                <th className="py-3 px-4 text-right">GST Subtracted</th>
                <th className="py-3 px-4 text-right">Net Credited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {paymentReportData.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No received payment records found for the selected time period or source filter.
                  </td>
                </tr>
              ) : (
                paymentReportData.items.map((item, idx) => {
                  const isIcici = item.sourceType === 'Cash' || item.sourceType === 'ICICI' || item.sourceType === 'ICICI BANK' || item.bankName === 'ICICI';
                  const isPnb = item.bankName === 'PNB' || item.bankName === 'PR' || item.bankName?.toUpperCase() === 'PNB' || item.bankName?.toUpperCase() === 'PR';
                  const modeLabel = isIcici 
                    ? 'ICICI Bank' 
                    : item.sourceType === 'Bank' 
                    ? `Bank (${item.bankName === 'PR' ? 'PNB' : (item.bankName || 'General')})` 
                    : item.sourceType;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">{item.dateFormatted}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-indigo-600">{item.orderId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{item.customer}</td>
                      <td className="py-3 px-4 font-medium">{item.phaseTitle}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          isIcici 
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPnb
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {modeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{item.utrNumber}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">{fmtUI(item.grossAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {item.gstSubtracted > 0 ? `-${fmtUI(item.gstSubtracted)}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{fmtUI(item.netCreditedAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paymentReportData.items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={6} className="py-3 px-4 uppercase tracking-wider">Total Received</td>
                  <td className="py-3 px-4 text-right">{fmtUI(paymentReportData.totals.totalGross)}</td>
                  <td className="py-3 px-4 text-right text-rose-700">-{fmtUI(paymentReportData.totals.totalGstSub)}</td>
                  <td className="py-3 px-4 text-right text-indigo-900 text-sm">{fmtUI(paymentReportData.totals.totalNetCredited)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
