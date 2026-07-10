import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Plus, Trash2, LayoutGrid, Palette, HelpCircle, X, Info } from 'lucide-react';
import { ParsedData, ChartConfig } from '../types';

interface DashboardChartsProps {
  data: ParsedData;
  charts: ChartConfig[];
  onChartsChange: (charts: ChartConfig[]) => void;
}

const PALETTES = [
  { hex: '#E5C158', label: 'Gold Accent' },
  { hex: '#10b981', label: 'Emerald Green' },
  { hex: '#3b82f6', label: 'Ocean Blue' },
  { hex: '#8b5cf6', label: 'Amethyst Purple' },
  { hex: '#eab308', label: 'Amber Yellow' },
  { hex: '#f43f5e', label: 'Rose Red' },
  { hex: '#0ea5e9', label: 'Sky Blue' },
  { hex: '#f5f5f5', label: 'Classic White' },
];

export default function DashboardCharts({ data, charts, onChartsChange }: DashboardChartsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ChartConfig['type']>('bar');
  const [newXKey, setNewXKey] = useState('');
  const [newYKey, setNewYKey] = useState('');
  const [newColor, setNewColor] = useState('#E5C158');

  const numericalColumns = data.columns.filter(c => c.type === 'number');
  const categoricalColumns = data.columns.filter(c => c.type === 'string' || c.type === 'date');

  // Aggregation logic to prepare clean data for Recharts
  const prepareChartData = (chart: ChartConfig) => {
    const { xAxisKey, yAxisKey, type, title } = chart;
    const titleLower = title.toLowerCase();

    // 1. Win/Loss Pie Chart Special Aggregation
    if (titleLower.includes('win/loss') || titleLower.includes('win / loss') || (type === 'pie' && yAxisKey === 'P&L')) {
      let wins = 0;
      let losses = 0;
      data.rows.forEach(row => {
        const pnl = Number(row[yAxisKey]);
        if (!isNaN(pnl)) {
          if (pnl > 0) wins++;
          else if (pnl < 0) losses++;
        }
      });
      return [
        { name: 'Wins', value: wins },
        { name: 'Losses', value: losses }
      ];
    }

    // 2. Win Rate Trend Special Aggregation (Rolling cumulative win rate)
    if (titleLower.includes('win rate trend') || titleLower.includes('win trend')) {
      const sortedRows = [...data.rows].sort((a, b) => {
        const aDate = Date.parse(a.Date);
        const bDate = Date.parse(b.Date);
        if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
        return 0;
      });

      let rollingWins = 0;
      let rollingTotal = 0;
      
      // Group by date to show daily progressive win rate
      const dailyWins: Record<string, { wins: number, total: number }> = {};
      sortedRows.forEach(row => {
        const d = String(row.Date || 'No Date');
        const pnl = Number(row[yAxisKey]) || 0;
        if (pnl !== 0) {
          if (!dailyWins[d]) {
            dailyWins[d] = { wins: 0, total: 0 };
          }
          dailyWins[d].total++;
          if (pnl > 0) {
            dailyWins[d].wins++;
          }
        }
      });

      const sortedDates = Object.keys(dailyWins).sort((a, b) => Date.parse(a) - Date.parse(b));
      
      const trendData: { name: string, value: number }[] = [];
      sortedDates.forEach(date => {
        rollingWins += dailyWins[date].wins;
        rollingTotal += dailyWins[date].total;
        const rate = rollingTotal > 0 ? (rollingWins / rollingTotal) * 100 : 0;
        trendData.push({
          name: date,
          value: Number(rate.toFixed(1))
        });
      });
      
      return trendData;
    }

    // 3. Equity Curve (Cumulative Sum over Time)
    if (titleLower.includes('equity') || titleLower.includes('cumulative')) {
      const dailyGrouped: Record<string, number> = {};
      data.rows.forEach(row => {
        const dateVal = String(row[xAxisKey] || '(No Date)');
        const pnl = Number(row[yAxisKey]) || 0;
        dailyGrouped[dateVal] = (dailyGrouped[dateVal] || 0) + pnl;
      });

      const sortedDates = Object.keys(dailyGrouped).sort((a, b) => {
        const aDate = Date.parse(a);
        const bDate = Date.parse(b);
        if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
        return a.localeCompare(b, undefined, { numeric: true });
      });

      let runningSum = 100000;
      const equityData = sortedDates.map(date => {
        runningSum += dailyGrouped[date];
        return {
          name: date,
          value: Number(runningSum.toFixed(2)),
        };
      });
      
      if (equityData.length === 0) {
        return [{ name: 'Start', value: 100000 }];
      }
      return equityData;
    }

    // Group by xAxisKey and sum up yAxisKey
    const grouped: Record<string, number> = {};
    
    data.rows.forEach(row => {
      let xVal = String(row[xAxisKey] !== undefined ? row[xAxisKey] : '(Empty)');
      
      // 4. Special monthly grouping helper
      if (titleLower.includes('monthly') && xAxisKey === 'Date' && xVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const dateObj = new Date(xVal);
        if (!isNaN(dateObj.getTime())) {
          xVal = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        }
      }

      const yVal = Number(row[yAxisKey]);
      const validY = isNaN(yVal) ? 0 : yVal;
      
      if (grouped[xVal] !== undefined) {
        grouped[xVal] += validY;
      } else {
        grouped[xVal] = validY;
      }
    });

    let chartData = Object.entries(grouped).map(([key, value]) => ({
      name: key,
      value: Number(value.toFixed(2)),
    }));

    // If dates or string numbers, sort them so dates flow chronologically
    chartData.sort((a, b) => {
      const aDate = Date.parse(a.name);
      const bDate = Date.parse(b.name);
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return aDate - bDate;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Special limit for Pie chart so it doesn't get cluttered with too many sectors
    if (type === 'pie' && chartData.length > 7) {
      const sortedByVal = [...chartData].sort((a, b) => b.value - a.value);
      const topSix = sortedByVal.slice(0, 6);
      const remaining = sortedByVal.slice(6);
      const otherSum = remaining.reduce((sum, item) => sum + item.value, 0);
      
      return [
        ...topSix,
        { name: 'Other', value: Number(otherSum.toFixed(2)) }
      ];
    }

    return chartData;
  };

  const handleAddChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newXKey || !newYKey) return;

    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: newTitle,
      type: newType,
      xAxisKey: newXKey,
      yAxisKey: newYKey,
      color: newColor,
    };

    onChartsChange([...charts, newChart]);
    setNewTitle('');
    setIsAdding(false);
  };

  const handleDeleteChart = (id: string) => {
    onChartsChange(charts.filter(c => c.id !== id));
  };

  // Predefined gorgeous colors for multi-colored charts (like Pie)
  const pieColors = [
    '#E5C158', // Gold
    '#10b981', // emerald
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#eab308', // amber
    '#f43f5e', // rose
    '#0ea5e9', // sky
    '#f5f5f5', // white
  ];

  const getDailySums = () => {
    const dailySums: Record<string, number> = {};
    data.rows.forEach(row => {
      const d = String(row.Date || '');
      const pnl = Number(row['P&L']) || Number(row['Revenue']) || Number(row['Amount']) || Number(row['Price']) || 0;
      if (d && pnl !== 0) {
        dailySums[d] = (dailySums[d] || 0) + pnl;
      }
    });
    return dailySums;
  };

  const renderHeatmap = () => {
    const dailySums = getDailySums();
    const datesInSheet = Object.keys(dailySums).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/));
    
    let year = 2026;
    let month = 6; // July
    let monthLabel = "July 2026";
    
    if (datesInSheet.length > 0) {
      const sorted = [...datesInSheet].sort((a, b) => Date.parse(b) - Date.parse(a));
      const latestDateObj = new Date(sorted[0]);
      if (!isNaN(latestDateObj.getTime())) {
        year = latestDateObj.getFullYear();
        month = latestDateObj.getMonth();
        monthLabel = latestDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => null);
    const calendarCells = [...blanks, ...daysArray];
    
    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    return (
      <div className="bg-[#121212] border border-white/10 p-6 rounded-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#E5C158] flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#E5C158]"></span>
              Consistency Calendar Heatmap
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-mono tracking-wider">
              DURABLE TRACKING // CURRENT MONTH VIEW: <span className="text-[#F5F5F5] font-bold">{monthLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500/15 border border-emerald-500/40"></span> Profitable Day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500/15 border border-rose-500/40"></span> Losing Day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-white/5 border border-white/10"></span> No Trade
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] font-black uppercase text-slate-500 py-1 font-mono">
              {day}
            </div>
          ))}

          {calendarCells.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`blank-${idx}`} className="aspect-square bg-transparent rounded-none"></div>;
            }

            const paddedDay = String(dayNum).padStart(2, '0');
            const paddedMonth = String(month + 1).padStart(2, '0');
            const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
            const dayPnl = dailySums[dateStr];
            
            let cellClass = "bg-white/5 border border-white/10 hover:bg-white/10";
            let textClass = "text-slate-400";
            let hoverTooltip = "No trading activity";

            if (dayPnl > 0) {
              cellClass = "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer";
              textClass = "text-emerald-300 font-bold";
              hoverTooltip = `Profit: +${formatCurrency(dayPnl)}`;
            } else if (dayPnl < 0) {
              cellClass = "bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-all cursor-pointer";
              textClass = "text-rose-300 font-bold";
              hoverTooltip = `Loss: ${formatCurrency(dayPnl)}`;
            }

            return (
              <div
                key={`day-${dayNum}`}
                className={`relative aspect-square flex flex-col justify-between p-2 rounded-none transition-all duration-200 group/cell ${cellClass}`}
                title={hoverTooltip}
              >
                <span className={`text-[10px] font-mono self-start ${textClass}`}>{dayNum}</span>
                {dayPnl !== undefined && (
                  <span className="text-[8px] font-mono self-end truncate max-w-full text-white/95 tracking-tighter block">
                    {dayPnl > 0 ? `+${formatCurrency(dayPnl)}` : formatCurrency(dayPnl)}
                  </span>
                )}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover/cell:block bg-black text-white text-[9px] font-mono uppercase tracking-wider py-1 px-2 border border-white/20 whitespace-nowrap z-30 shadow-xl">
                  {dateStr} : {hoverTooltip}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
            if (categoricalColumns.length > 0) setNewXKey(categoricalColumns[0].name);
            if (numericalColumns.length > 0) setNewYKey(numericalColumns[0].name);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider border border-white/20 hover:border-[#E5C158] transition-all rounded-none"
          id="btn-add-chart"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-container">
          {charts.map((chart) => {
            const chartData = prepareChartData(chart);

            return (
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

                {/* Render recharts based on type */}
                <div className="h-[280px] w-full" id={`recharts-wrapper-${chart.id}`}>
                  {chartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-slate-500">
                      <Info className="w-5 h-5 mb-1.5 text-slate-600 animate-pulse" />
                      DATA RECONCILIATION ERROR // NO RESULTS FOUND
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#121212', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5' }}
                            labelStyle={{ fontWeight: 'bold', color: '#F5F5F5', fontSize: '11px', fontFamily: 'Space Grotesk' }}
                            itemStyle={{ color: chart.color, fontSize: '11px', fontFamily: 'Fira Code' }}
                          />
                          <Bar dataKey="value" fill={chart.color} radius={0} maxBarSize={45} />
                        </BarChart>
                      ) : chart.type === 'stacked-bar' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#121212', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5' }}
                            labelStyle={{ fontWeight: 'bold', color: '#F5F5F5', fontSize: '11px', fontFamily: 'Space Grotesk' }}
                            itemStyle={{ color: chart.color, fontSize: '11px', fontFamily: 'Fira Code' }}
                          />
                          <Bar dataKey="value" fill={chart.color} radius={0} maxBarSize={45} />
                        </BarChart>
                      ) : chart.type === 'area' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`color-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chart.color} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={chart.color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#121212', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5' }}
                            labelStyle={{ fontWeight: 'bold', color: '#F5F5F5', fontSize: '11px', fontFamily: 'Space Grotesk' }}
                            itemStyle={{ color: chart.color, fontSize: '11px', fontFamily: 'Fira Code' }}
                          />
                          <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#color-${chart.id})`} />
                        </AreaChart>
                      ) : chart.type === 'pie' ? (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent = 0 }) =>
  `${name} (${(percent * 100).toFixed(0)}%)`
}
                            labelLine={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#121212', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5' }}
                            itemStyle={{ fontSize: '11px', fontFamily: 'Fira Code' }}
                          />
                        </PieChart>
                      ) : (
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#121212', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5' }}
                            labelStyle={{ fontWeight: 'bold', color: '#F5F5F5', fontSize: '11px', fontFamily: 'Space Grotesk' }}
                            itemStyle={{ color: chart.color, fontSize: '11px', fontFamily: 'Fira Code' }}
                          />
                          <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={3} dot={{ r: 2, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Consistency Heatmap */}
      {renderHeatmap()}

      {/* Add Chart Modal Popup */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="add-chart-modal">
          <div className="bg-[#121212] rounded-none border border-white/20 p-8 max-w-md w-full shadow-2xl space-y-6">
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
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">X-Axis (Group Dimension)</label>
                  <select
                    required
                    value={newXKey}
                    onChange={(e) => setNewXKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                  >
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
                    value={newYKey}
                    onChange={(e) => setNewYKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                  >
                    {numericalColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                    {numericalColumns.length === 0 && (
                      <option disabled value="">
                        No numeric columns
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Plot type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ChartConfig['type'])}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                >
                  <option value="bar">BAR GRAPH</option>
                  <option value="line">LINE GRAPH</option>
                  <option value="area">AREA WAVE PLOT</option>
                  <option value="pie">PIE SECTOR MATRIX</option>
                </select>
              </div>

              {newType !== 'pie' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Series Color Accent</label>
                  <div className="flex flex-wrap gap-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.hex}
                        type="button"
                        onClick={() => setNewColor(palette.hex)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-[10px] font-mono uppercase transition-all ${
                          newColor === palette.hex
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
