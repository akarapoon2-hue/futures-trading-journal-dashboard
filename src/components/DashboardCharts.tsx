import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Plus, Trash2, LayoutGrid, X, AlertCircle } from 'lucide-react';
import { ParsedData, ChartConfig } from '../types';

// Constants
const COLORS = [
  '#E5C158', '#10b981', '#3b82f6', '#8b5cf6',
  '#eab308', '#f43f5e', '#0ea5e9', '#f5f5f5'
];

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
    '#f5f5f5': 'Classic White'
  }[hex] || hex
}));

interface DashboardChartsProps {
  data: ParsedData;
  charts: ChartConfig[];
  onChartsChange: (charts: ChartConfig[]) => void;
  startingBalance?: number;
}

// Utility functions
const normalizeDate = (value: unknown): string => {
  if (!value) return '';
  
  const raw = String(value).trim();
  const clean = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  
  // YYYY-MM-DD or YYYY/MM/DD
  let match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
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

  // Memoized column data
  const { numericalColumns, categoricalColumns } = useMemo(() => ({
    numericalColumns: data.columns.filter(c => c.type === 'number'),
    categoricalColumns: data.columns.filter(c => c.type === 'string' || c.type === 'date')
  }), [data.columns]);

  // ============================================
  // Helper functions - ประกาศก่อน chartsData
  // ============================================
  
  const generateWinRateTrendData = (chart: ChartConfig, data: ParsedData, xAxisKey: string, yAxisKey: string) => {
    const sortedRows = [...data.rows].sort((a, b) => {
      const aDate = Date.parse(normalizeDate(a[xAxisKey]));
      const bDate = Date.parse(normalizeDate(b[xAxisKey]));
      return !isNaN(aDate) && !isNaN(bDate) ? aDate - bDate : 0;
    });

    const dailyWins: Record<string, { wins: number, total: number }> = {};
    sortedRows.forEach(row => {
      const date = normalizeDate(row[xAxisKey]) || 'No Date';
      const pnl = parsePnL(row[yAxisKey]);
      if (pnl !== 0) {
        if (!dailyWins[date]) dailyWins[date] = { wins: 0, total: 0 };
        dailyWins[date].total++;
        if (pnl > 0) dailyWins[date].wins++;
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
        value: Number(((rollingTotal > 0 ? rollingWins / rollingTotal : 0) * 100).toFixed(1))
      };
    });
    
    return { ...chart, chartData: trendData };
  };

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

    // Pie chart optimization
    if (chart.type === 'pie' && chartData.length > 7) {
      const sortedByVal = [...chartData].sort((a, b) => b.value - a.value);
      const topSix = sortedByVal.slice(0, 6);
      const otherSum = sortedByVal.slice(6).reduce((sum, item) => sum + item.value, 0);
      chartData = [...topSix, { name: 'Other', value: Number(otherSum.toFixed(2)) }];
    }

    return { ...chart, chartData };
  };

  // ============================================
  // chartsData - ใช้ helper functions ที่ประกาศไว้แล้ว
  // ============================================
  const chartsData = useMemo(() => {
    return charts.map((chart) => {
      const { xAxisKey, yAxisKey, type, title } = chart;
      const titleLower = title.toLowerCase();

      // Special chart types
      if (titleLower.includes('win/loss') || (type === 'pie' && yAxisKey === 'P&L')) {
        const { wins, losses } = data.rows.reduce((acc, row) => {
          const pnl = parsePnL(row[yAxisKey]);
          if (pnl > 0) acc.wins++;
          else if (pnl < 0) acc.losses++;
          return acc;
        }, { wins: 0, losses: 0 });
        
        return {
          ...chart,
          chartData: [
            { name: 'Wins', value: wins },
            { name: 'Losses', value: losses }
          ]
        };
      }

      if (titleLower.includes('win rate trend')) {
        return generateWinRateTrendData(chart, data, xAxisKey, yAxisKey);
      }

      if (titleLower.includes('equity') || titleLower.includes('cumulative')) {
        return generateEquityData(chart, data, xAxisKey, yAxisKey);
      }

      // Default aggregation
      return generateDefaultChartData(chart, data, xAxisKey, yAxisKey);
    });
  }, [data, charts, startingBalance]);

  // Handlers
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

  // Click outside handler
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsAdding(false);
    }
  }, []);

  // ============================================
  // ✅ แยก PieChart ออกจาก ChartComponent
  // ============================================
  const renderChart = (chart: ChartConfig & { chartData: any[] }) => {
    if (chart.chartData.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-slate-500">
          <AlertCircle className="w-5 h-5 mb-1.5 text-slate-600" />
          NO DATA AVAILABLE
        </div>
      );
    }

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
        color: chart.color, 
        fontSize: '11px', 
        fontFamily: 'Fira Code' 
      }
    };

    // ✅ Pie Chart แยกต่างหาก
    if (chart.type === 'pie') {
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
              label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {chart.chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // ✅ Bar, Line, Area Charts
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

  // ============================================
  // ✅ return เดิมที่มี UI ครบถ้วน
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Empty State */}
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
                    SUM OF <span className="font-bold text-[#E5C158]">{chart.yAxisKey}</span> BY <span className="font-bold">{chart.xAxisKey}</span>
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
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={handleModalClick}
        >
          <div ref={modalRef} className="bg-[#121212] rounded-none border border-white/20 p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Deploy custom chart plot</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-white/5 text-slate-400 hover:text-[#F5F5F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChart} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Chart Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales breakdown by Rep"
                  value={newChart.title}
                  onChange={(e) => setNewChart(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">X-Axis (Group Dimension)</label>
                  <select
                    required
                    value={newChart.xKey}
                    onChange={(e) => setNewChart(prev => ({ ...prev, xKey: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                  >
                    <option value="">Select column...</option>
                    {categoricalColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name} ({col.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Y-Axis (Series Value)</label>
                  <select
                    required
                    value={newChart.yKey}
                    onChange={(e) => setNewChart(prev => ({ ...prev, yKey: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                  >
                    <option value="">Select column...</option>
                    {numericalColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                    {numericalColumns.length === 0 && (
                      <option disabled>No numeric columns</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Plot type</label>
                <select
                  value={newChart.type}
                  onChange={(e) => setNewChart(prev => ({ ...prev, type: e.target.value as ChartConfig['type'] }))}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                >
                  <option value="bar">BAR GRAPH</option>
                  <option value="line">LINE GRAPH</option>
                  <option value="area">AREA WAVE PLOT</option>
                  <option value="pie">PIE SECTOR MATRIX</option>
                </select>
              </div>

              {newChart.type !== 'pie' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Series Color Accent</label>
                  <div className="flex flex-wrap gap-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.hex}
                        type="button"
                        onClick={() => setNewChart(prev => ({ ...prev, color: palette.hex }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-[10px] font-mono uppercase transition-all ${
                          newChart.color === palette.hex
                            ? 'bg-[#E5C158] border-[#E5C158] text-black font-bold'
                            : 'bg-[#0A0A0A] border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.hex }}></span>
                        {palette.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-none border border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={numericalColumns.length === 0}
                  className="px-4 py-2.5 bg-[#E5C158] hover:bg-[#C9A23E] text-black text-xs font-bold uppercase tracking-wider rounded-none transition-colors disabled:opacity-40"
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