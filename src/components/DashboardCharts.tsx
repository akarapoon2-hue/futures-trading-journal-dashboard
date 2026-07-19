import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart
} from 'recharts';
import { Plus, Trash2, LayoutGrid, X, AlertCircle } from 'lucide-react';
import { ParsedData, ChartConfig } from '../types';

const COLORS = [
  '#E5C158', '#10b981', '#3b82f6', '#8b5cf6',
  '#eab308', '#f43f5e', '#0ea5e9', '#f5f5f9',
  '#f97316', '#14b8a6', '#8b5cf6', '#ec4899'
];

// Pie Colors คงที่
const PIE_COLORS: Record<string, string> = {
  'Wins': '#10b981',
  'Losses': '#ef4444',
  'Break Even': '#eab308',
  'No Data': '#444444'
};

const PALETTES = COLORS.map(hex => ({
  hex,
  label: {
    '#E5C158': 'Gold Accent',
    '#10b981': 'Emerald Green',
    '#3b82f6': 'Ocean Blue',
    '#8b5cf6': 'Amethyst Purple',
    '#eab308': 'Amber Yellow',
    '#f43f5e': 'Rose Red',
    '#0ea5e9': 'Sky Blue',
    '#f5f5f9': 'Classic White',
    '#f97316': 'Orange',
    '#14b8a6': 'Teal',
    '#ec4899': 'Pink'
  }[hex] || hex
}));

interface DashboardChartsProps {
  data: ParsedData;
  charts: ChartConfig[];
  onChartsChange: (charts: ChartConfig[]) => void;
  startingBalance?: number;
}

// =============================================
// Utility Functions
// =============================================

const normalizeDate = (value: unknown): string => {
  if (!value) return '';
  
  const raw = String(value).trim();
  const clean = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  
  let match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  
  match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  
  const date = new Date(raw);
  return isNaN(date.getTime()) ? '' : 
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const parsePnL = (value: unknown): number => {
  const str = String(value ?? '0');
  const cleaned = str
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(/\(/g, '-')
    .replace(/\)/g, '');
  return parseFloat(cleaned) || 0;
};

// ✅ parseR() - ลบ R และ r ทั้งหมด
const parseR = (value: unknown): number => {
  const str = String(value ?? '0');
  const cleaned = str
    .replace(/[Rr]/g, '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '');
  return parseFloat(cleaned) || 0;
};

const normalizeResult = (value: unknown): string => {
  return String(value ?? '').trim().toLowerCase();
};

// ✅ Tooltip Formatter - แก้ไขแล้ว (ลบ name === 'value' ออก)
const formatTooltipValue = (
  value: number,
  name: string,
  chartType?: string
) => {
  const lower = (chartType ?? "").toLowerCase();

  // ---------- Win Rate ----------
  if (lower.includes("win rate")) {
    return `${value.toFixed(1)}%`;
  }

  // ---------- R ----------
  if (
    lower.includes("r distribution") ||
    lower.includes("monthly r") ||
    lower.includes("r curve")
  ) {
    return `${value.toFixed(2)}R`;
  }

  // ---------- Equity ----------
  if (lower.includes("equity")) {
    return `$${value.toFixed(2)}`;
  }

  // ---------- Trades ----------
  if (name === "count" || name === "Trades") {
    return `${value} trades`;
  }

  // ---------- PnL ----------
  if (name === "pnl" || name === "PnL") {
    return `$${value.toFixed(2)}`;
  }

  return value.toFixed(2);
};

// ✅ Hash function สำหรับสีจากชื่อ
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// =============================================
// Main Component
// =============================================

export default function DashboardCharts({ 
  data, 
  charts, 
  onChartsChange,
  startingBalance = 100000
}: DashboardChartsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newChart, setNewChart] = useState({
    title: '',
    type: 'bar' as ChartConfig['type'],
    xKey: '',
    yKey: '',
    color: '#E5C158'
  });
  const modalRef = useRef<HTMLDivElement>(null);

  // ✅ Color cache สำหรับ Multi-line
  const colorCache = useMemo(() => new Map<string, string>(), []);
  const getColorForName = useCallback((name: string): string => {
    if (!colorCache.has(name)) {
      colorCache.set(name, hashStringToColor(name));
    }
    return colorCache.get(name)!;
  }, [colorCache]);

  const { numericalColumns, categoricalColumns } = useMemo(() => ({
    numericalColumns: data.columns.filter(c => c.type === 'number'),
    categoricalColumns: data.columns.filter(c => c.type === 'string' || c.type === 'date')
  }), [data.columns]);

  // =============================================
  // Chart Data Generators
  // =============================================

  // ✅ Win Rate Trend - ใช้ result และ winRate แทน value
  const generateWinRateTrendData = (chart: ChartConfig, data: ParsedData, xAxisKey: string) => {
    const sortedRows = [...data.rows].sort((a, b) => {
      const aDate = Date.parse(normalizeDate(a[xAxisKey]));
      const bDate = Date.parse(normalizeDate(b[xAxisKey]));
      return !isNaN(aDate) && !isNaN(bDate) ? aDate - bDate : 0;
    });

    const dailyWins: Record<string, { wins: number, total: number }> = {};
    sortedRows.forEach(row => {
      const date = normalizeDate(row[xAxisKey]) || 'No Date';
      const result = normalizeResult(row.Result ?? row.result);
      
      if (result === 'win') {
        if (!dailyWins[date]) dailyWins[date] = { wins: 0, total: 0 };
        dailyWins[date].wins++;
        dailyWins[date].total++;
      } else if (result === 'loss') {
        if (!dailyWins[date]) dailyWins[date] = { wins: 0, total: 0 };
        dailyWins[date].total++;
      }
    });

    const sortedDates = Object.keys(dailyWins).sort((a, b) => {
      const aDate = Date.parse(a);
      const bDate = Date.parse(b);
      return !isNaN(aDate) && !isNaN(bDate) ? aDate - bDate : a.localeCompare(b);
    });
    
    let rollingWins = 0, rollingTotal = 0;
    const trendData = sortedDates.map(date => {
      rollingWins += dailyWins[date].wins;
      rollingTotal += dailyWins[date].total;
      return {
        name: date,
        winRate: Number(((rollingTotal > 0 ? rollingWins / rollingTotal : 0) * 100).toFixed(1))
      };
    });
    
    return { ...chart, chartData: trendData };
  };

  // Equity Curve
  const generateEquityData = (chart: ChartConfig, data: ParsedData, xAxisKey: string, yAxisKey: string) => {
    const dailyGrouped: Record<string, number> = {};
    data.rows.forEach(row => {
      const date = normalizeDate(row[xAxisKey]) || '(No Date)';
      dailyGrouped[date] = (dailyGrouped[date] || 0) + parsePnL(row[yAxisKey]);
    });

    const sortedDates = Object.keys(dailyGrouped).sort((a, b) => {
      const aDate = Date.parse(a);
      const bDate = Date.parse(b);
      return !isNaN(aDate) && !isNaN(bDate) ? aDate - bDate : a.localeCompare(b, undefined, { numeric: true });
    });

    let runningSum = startingBalance;
    const equityData = sortedDates.map(date => ({
      name: date,
      value: Number((runningSum += dailyGrouped[date]).toFixed(2))
    }));
    
    return {
      ...chart,
      chartData: equityData.length > 0 ? equityData : [{ name: 'Start', value: startingBalance }]
    };
  };

  // Equity by Category - เริ่มที่ 0 (relative equity)
  const generateEquityByCategory = (chart: ChartConfig, data: ParsedData, xAxisKey: string) => {
    const grouped: Record<string, { pnl: number, days: string[] }> = {};
    
    data.rows.forEach(row => {
      const key = String(row[xAxisKey] !== undefined ? row[xAxisKey] : 'Unspecified');
      if (!key.trim()) return;
      
      const date = normalizeDate(row.Date ?? row.trade_date ?? '');
      if (!date) return;
      
      if (!grouped[key]) grouped[key] = { pnl: 0, days: [] };
      
      const pnl = parsePnL(row['P&L'] ?? row.net_pnl ?? 0);
      grouped[key].pnl += pnl;
      if (!grouped[key].days.includes(date)) {
        grouped[key].days.push(date);
      }
    });

    const allDates = [...new Set(data.rows.map(row => normalizeDate(row.Date ?? row.trade_date ?? '')))]
      .filter(d => d)
      .sort();
    
    const result: { name: string, [key: string]: number | string }[] = [];
    let runningTotals: Record<string, number> = {};
    
    Object.keys(grouped).forEach(key => {
      runningTotals[key] = 0;
    });
    
    allDates.forEach(date => {
      const entry: { name: string, [key: string]: number | string } = { name: date };
      
      Object.keys(grouped).forEach(key => {
        const dayPnl = data.rows
          .filter(row => {
            const rowDate = normalizeDate(row.Date ?? row.trade_date ?? '');
            const rowKey = String(row[xAxisKey] !== undefined ? row[xAxisKey] : 'Unspecified');
            return rowDate === date && rowKey === key;
          })
          .reduce((sum, row) => sum + parsePnL(row['P&L'] ?? row.net_pnl ?? 0), 0);
        
        runningTotals[key] += dayPnl;
        entry[key] = Number(runningTotals[key].toFixed(2));
      });
      
      result.push(entry);
    });

    return { ...chart, chartData: result, isMultiLine: true };
  };

  // Monthly R Curve
  const generateMonthlyRCurve = (chart: ChartConfig, data: ParsedData) => {
    const monthlyR: Record<string, { totalR: number, count: number }> = {};
    
    data.rows.forEach(row => {
      const date = normalizeDate(row.Date ?? row.trade_date ?? '');
      if (!date) return;
      
      const month = date.slice(0, 7);
      const r = parseR(row['R-Multiple'] ?? row.r_multiple ?? 0);
      
      if (!monthlyR[month]) monthlyR[month] = { totalR: 0, count: 0 };
      monthlyR[month].totalR += r;
      monthlyR[month].count++;
    });

    const chartData = Object.entries(monthlyR)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        name: month,
        value: data.count > 0 ? Number((data.totalR / data.count).toFixed(2)) : 0,
        count: data.count
      }));

    return { ...chart, chartData };
  };

  // R Distribution
  const generateRDistributionData = (chart: ChartConfig, data: ParsedData) => {
    const bins: Record<string, number> = {
      '< -5R': 0,
      '-5R~-3R': 0,
      '-3R~-2R': 0,
      '-2R~-1R': 0,
      'BE': 0,
      '1R~2R': 0,
      '2R~3R': 0,
      '3R~5R': 0,
      '> 5R': 0
    };

    data.rows.forEach(row => {
      const r = parseR(row['R-Multiple'] ?? row.r_multiple ?? 0);
      
      if (r < -5) bins['< -5R']++;
      else if (r >= -5 && r < -3) bins['-5R~-3R']++;
      else if (r >= -3 && r < -2) bins['-3R~-2R']++;
      else if (r >= -2 && r < -0.5) bins['-2R~-1R']++;
      else if (r >= -0.5 && r <= 0.5) bins['BE']++;
      else if (r > 0.5 && r <= 2) bins['1R~2R']++;
      else if (r > 2 && r <= 3) bins['2R~3R']++;
      else if (r > 3 && r <= 5) bins['3R~5R']++;
      else if (r > 5) bins['> 5R']++;
    });

    const chartData = Object.entries(bins)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return { ...chart, chartData };
  };

  // Performance Chart - เก็บ totalR แยก
  const generatePerformanceData = (chart: ChartConfig, data: ParsedData, xAxisKey: string) => {
    const grouped: Record<string, { totalPnL: number, totalR: number, count: number, wins: number }> = {};
    
    data.rows.forEach(row => {
      let key = String(row[xAxisKey] !== undefined ? row[xAxisKey] : 'Unspecified');
      if (!key.trim()) key = 'Unspecified';
      
      if (!grouped[key]) grouped[key] = { totalPnL: 0, totalR: 0, count: 0, wins: 0 };
      
      const pnl = parsePnL(row['P&L'] ?? row.net_pnl ?? 0);
      const r = parseR(row['R-Multiple'] ?? row.r_multiple ?? 0);
      
      grouped[key].totalPnL += pnl;
      grouped[key].totalR += r;
      grouped[key].count++;
      
      const result = normalizeResult(row.Result ?? row.result);
      if (result === 'win') grouped[key].wins++;
    });

    const chartData = Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        pnl: Number(data.totalPnL.toFixed(2)),
        avgR: data.count > 0 ? Number((data.totalR / data.count).toFixed(2)) : 0,
        count: data.count,
        winRate: data.count > 0 ? Number(((data.wins / data.count) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10);

    return { ...chart, chartData };
  };

  const generateDefaultChartData = (chart: ChartConfig, data: ParsedData, xAxisKey: string, yAxisKey: string) => {
    const grouped: Record<string, number> = {};
    const titleLower = chart.title.toLowerCase();

    data.rows.forEach(row => {
      let xVal = String(row[xAxisKey] !== undefined ? row[xAxisKey] : '(Empty)');
      
      if (titleLower.includes('monthly') && xVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const dateObj = new Date(xVal + "T00:00:00");
        if (!isNaN(dateObj.getTime())) {
          xVal = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        }
      }

      grouped[xVal] = (grouped[xVal] || 0) + parsePnL(row[yAxisKey]);
    });

    let chartData = Object.entries(grouped).map(([key, value]) => ({
      name: key,
      value: Number(value.toFixed(2))
    }));

    chartData.sort((a, b) => {
      const aDate = Date.parse(a.name);
      const bDate = Date.parse(b.name);
      return !isNaN(aDate) && !isNaN(bDate) ? aDate - bDate : a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    if (chart.type === 'pie' && chartData.length > 7) {
      const sortedByVal = [...chartData].sort((a, b) => b.value - a.value);
      const topSix = sortedByVal.slice(0, 6);
      const otherSum = sortedByVal.slice(6).reduce((sum, item) => sum + item.value, 0);
      chartData = [...topSix, { name: 'Other', value: Number(otherSum.toFixed(2)) }];
    }

    return { ...chart, chartData };
  };

  // =============================================
  // chartsData - ใช้ useMemo
  // =============================================
  const chartsData = useMemo(() => {
    return charts.map((chart) => {
      const { xAxisKey, yAxisKey, type, title } = chart;
      const titleLower = title.toLowerCase();

      // Win/Loss Pie
      if (titleLower.includes('win/loss') || (type === 'pie' && yAxisKey === 'P&L')) {
        const wins = data.rows.filter(row => {
          const result = normalizeResult(row.Result ?? row.result);
          return result === 'win';
        }).length;

        const losses = data.rows.filter(row => {
          const result = normalizeResult(row.Result ?? row.result);
          return result === 'loss';
        }).length;

        const breakEven = data.rows.filter(row => {
          const result = normalizeResult(row.Result ?? row.result);
          return result === 'break even' || result === 'be' || result === 'miss entry';
        }).length;

        const chartData = [];
        if (wins > 0) chartData.push({ name: 'Wins', value: wins });
        if (losses > 0) chartData.push({ name: 'Losses', value: losses });
        if (breakEven > 0) chartData.push({ name: 'Break Even', value: breakEven });

        return {
          ...chart,
          chartData: chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }],
          isPie: true
        };
      }

      // R Distribution
      if (titleLower.includes('r distribution') || titleLower.includes('r histogram')) {
        return generateRDistributionData(chart, data);
      }

      // Monthly R Curve
      if (titleLower.includes('monthly r') || titleLower.includes('r curve')) {
        return generateMonthlyRCurve(chart, data);
      }

      // Equity by Category
      if (titleLower.includes('equity by') || titleLower.includes('equity curve by')) {
        return generateEquityByCategory(chart, data, xAxisKey);
      }

      // Performance Charts
      if (titleLower.includes('setup') || titleLower.includes('session') || titleLower.includes('symbol')) {
        return generatePerformanceData(chart, data, xAxisKey);
      }

      if (titleLower.includes('win rate trend')) {
        return generateWinRateTrendData(chart, data, xAxisKey);
      }

      if (titleLower.includes('equity') || titleLower.includes('cumulative')) {
        return generateEquityData(chart, data, xAxisKey, yAxisKey);
      }

      return generateDefaultChartData(chart, data, xAxisKey, yAxisKey);
    });
  }, [data, charts, startingBalance]);

  // =============================================
  // Handlers
  // =============================================

  const handleAddChart = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const { title, type, xKey, yKey, color } = newChart;

    if (!title.trim() || !xKey || !yKey) {
      return;
    }

    onChartsChange([
      ...charts,
      {
        id: `chart-${Date.now()}`,
        title: title.trim(),
        type,
        xAxisKey: xKey,
        yAxisKey: yKey,
        color,
      }
    ]);

    setNewChart({ title: '', type: 'bar', xKey: '', yKey: '', color: '#E5C158' });
    setIsAdding(false);
  }, [newChart, charts, onChartsChange]);

  const handleDeleteChart = useCallback((id: string) => {
    onChartsChange(charts.filter(chart => chart.id !== id));
  }, [charts, onChartsChange]);

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsAdding(false);
    }
  }, []);

  // =============================================
  // Render Chart
  // =============================================

  const renderChart = (chart: ChartConfig & { chartData: any[], isPie?: boolean, isMultiLine?: boolean }) => {
    if (chart.chartData.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-slate-500">
          <AlertCircle className="w-5 h-5 mb-1.5 text-slate-600" />
          NO DATA AVAILABLE
        </div>
      );
    }

    // ✅ tooltipProps พร้อม formatter ที่แก้ไขแล้ว
    const tooltipProps = {
      contentStyle: { 
        backgroundColor: '#121212', 
        borderRadius: '0px', 
        border: '1px solid rgba(255,255,255,0.15)', 
        color: '#F5F5F5' 
      },
      labelStyle: { 
        fontWeight: 'bold', 
        color: '#F5F5F5', 
        fontSize: '11px', 
        fontFamily: 'Space Grotesk' 
      },
      itemStyle: { 
        fontSize: '11px', 
        fontFamily: 'Fira Code' 
      },
      formatter: (value: unknown, name: unknown) => {
        const rawValue = Array.isArray(value)
          ? value[0]
          : value;

        const numericValue = Number(rawValue ?? 0);
        const seriesName = String(name ?? '');

        return [
          formatTooltipValue(
            Number.isFinite(numericValue) ? numericValue : 0,
            seriesName,
            chart.title.toLowerCase()
          ),
          seriesName,
        ];
      }
    };

    // Pie Chart
    if (chart.type === 'pie' || chart.isPie) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipProps} />
            <Pie
              data={chart.chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              label={({ name, value }) => `${name} (${value})`}
              labelLine={false}
            >
              {chart.chartData.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={PIE_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Multi-line Equity by Category
    if (chart.isMultiLine) {
      const keys = Object.keys(chart.chartData[0]).filter(k => k !== 'name');
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#888888', fontSize: 9, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              interval={Math.floor(chart.chartData.length / 10)}
            />
            <YAxis 
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip {...tooltipProps} />
            {keys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getColorForName(key)}
                strokeWidth={2}
                dot={{ r: 1 }}
                name={key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // ✅ Win Rate Trend - ใช้ winRate แทน value
    if (chart.title.toLowerCase().includes('win rate trend')) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip {...tooltipProps} />
            <Line 
              type="monotone" 
              dataKey="winRate" 
              stroke={chart.color} 
              strokeWidth={3} 
              dot={{ r: 2, strokeWidth: 1 }} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // ✅ Performance Chart - แยกแกน Y สำหรับ PnL, Trades, Win Rate
    if (chart.chartData.length > 0 && 'winRate' in chart.chartData[0]) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#888888', fontSize: 9, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <YAxis 
              yAxisId="trades"
              orientation="right"
              hide
              domain={[0, 'auto']}
            />
            <Tooltip {...tooltipProps} />
            <Bar 
              yAxisId="trades"
              dataKey="count" 
              fill="#64748b" 
              opacity={0.25} 
              radius={[4, 4, 0, 0]} 
              maxBarSize={35} 
              name="Trades"
            />
            <Bar 
              yAxisId="left" 
              dataKey="pnl" 
              fill={chart.color} 
              radius={[4, 4, 0, 0]} 
              maxBarSize={35} 
              name="PnL"
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="winRate" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={{ r: 3 }} 
              name="Win Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    const commonProps = {
      data: chart.chartData,
      margin: { top: 10, right: 10, left: -10, bottom: 0 }
    };

    const chartMap = {
      bar: BarChart,
      'stacked-bar': BarChart,
      area: AreaChart,
      line: LineChart
    };

    const ChartComponent = chartMap[chart.type] || BarChart;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip {...tooltipProps} />
          
          {chart.type === 'bar' && <Bar dataKey="value" fill={chart.color} radius={0} maxBarSize={45} />}
          {chart.type === 'stacked-bar' && <Bar dataKey="value" fill={chart.color} radius={0} maxBarSize={45} />}
          {chart.type === 'area' && (
            <>
              <defs>
                <linearGradient id={`color-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chart.color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={chart.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#color-${chart.id})`} />
            </>
          )}
          {chart.type === 'line' && <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={3} dot={{ r: 2, strokeWidth: 1 }} activeDot={{ r: 5 }} />}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  // =============================================
  // Main Render
  // =============================================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#E5C158]"></span>
          Analytical Compilers & Visuals
        </h2>
        
        <button
          onClick={() => {
            setIsAdding(true);
            if (categoricalColumns.length) setNewChart(prev => ({ ...prev, xKey: categoricalColumns[0].name }));
            if (numericalColumns.length) setNewChart(prev => ({ ...prev, yKey: numericalColumns[0].name }));
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider border border-white/20 hover:border-[#E5C158] transition-all rounded-none"
        >
          <Plus className="w-4 h-4" />
          Create Chart View
        </button>
      </div>

      {charts.length === 0 ? (
        <div className="text-center p-12 bg-[#121212] rounded-none border border-dashed border-white/10">
          <LayoutGrid className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">No Custom Plots Initialized</p>
          <p className="text-[11px] text-slate-500 mt-1 mb-4">Coordinate dimensions and metric series to paint real-time bar, line, or area plots.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-bold uppercase tracking-wider text-xs rounded-none transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Plot First Series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartsData.map(({ chartData, ...chart }) => (
            <div
              key={chart.id}
              className="bg-[#121212] rounded-none border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#F5F5F5]">{chart.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-widest">
                    {chart.isMultiLine ? 'EQUITY CURVE BY CATEGORY' : 
                     chart.title.toLowerCase().includes('setup') || 
                     chart.title.toLowerCase().includes('session') || 
                     chart.title.toLowerCase().includes('symbol') ? 'PERFORMANCE ANALYSIS' :
                     `SUM OF ${chart.yAxisKey} BY ${chart.xAxisKey}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteChart(chart.id)}
                  className="p-1.5 text-slate-500 hover:text-[#E5C158] hover:bg-[#E5C158]/10 rounded-none border border-transparent hover:border-white/10 transition-all"
                  title="Delete chart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="h-[280px] w-full">
                {renderChart({ ...chart, chartData })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Chart Modal */}
      {isAdding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={handleModalClick}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md space-y-6 border border-white/20 bg-[#121212] p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
                Deploy custom chart plot
              </h3>

              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddChart} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Chart Title
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Setup Performance"
                  value={newChart.title}
                  onChange={(event) =>
                    setNewChart((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-xs text-[#F5F5F5] outline-none focus:border-[#E5C158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    X-Axis
                  </label>

                  <select
                    required
                    value={newChart.xKey}
                    onChange={(event) =>
                      setNewChart((current) => ({
                        ...current,
                        xKey: event.target.value,
                      }))
                    }
                    className="w-full border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-xs text-[#F5F5F5] outline-none focus:border-[#E5C158]"
                  >
                    <option value="">Select column...</option>

                    {categoricalColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name} ({column.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Y-Axis
                  </label>

                  <select
                    required
                    value={newChart.yKey}
                    onChange={(event) =>
                      setNewChart((current) => ({
                        ...current,
                        yKey: event.target.value,
                      }))
                    }
                    className="w-full border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-xs text-[#F5F5F5] outline-none focus:border-[#E5C158]"
                  >
                    <option value="">Select column...</option>

                    {numericalColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}

                    {numericalColumns.length === 0 && (
                      <option disabled>No numeric columns</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Plot Type
                </label>

                <select
                  value={newChart.type}
                  onChange={(event) =>
                    setNewChart((current) => ({
                      ...current,
                      type: event.target.value as ChartConfig['type'],
                    }))
                  }
                  className="w-full border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-xs text-[#F5F5F5] outline-none focus:border-[#E5C158]"
                >
                  <option value="bar">BAR GRAPH</option>
                  <option value="line">LINE GRAPH</option>
                  <option value="area">AREA WAVE PLOT</option>
                  <option value="pie">PIE SECTOR MATRIX</option>
                </select>
              </div>

              {newChart.type !== 'pie' && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Series Color
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.hex}
                        type="button"
                        onClick={() =>
                          setNewChart((current) => ({
                            ...current,
                            color: palette.hex,
                          }))
                        }
                        className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase transition-all ${
                          newChart.color === palette.hex
                            ? 'border-[#E5C158] bg-[#E5C158] font-bold text-black'
                            : 'border-white/10 bg-[#0A0A0A] text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: palette.hex }}
                        />

                        {palette.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="border border-white/20 bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={numericalColumns.length === 0}
                  className="bg-[#E5C158] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-[#C9A23E] disabled:opacity-40"
                >
                  Plot Series
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}