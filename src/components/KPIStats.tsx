import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, BarChart2, CheckCircle, Hash, HelpCircle, X } from 'lucide-react';
import { ParsedData, KPIConfig } from '../types';

interface KPIStatsProps {
  data: ParsedData;
  kpis: KPIConfig[];
  onKPIsChange: (kpis: KPIConfig[]) => void;
  startingBalance?: number; // ✅ เพิ่ม Props นี้
}

const COLORS = [
  { name: 'emerald', label: 'Green', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-emerald-400', marker: 'bg-emerald-400' },
  { name: 'indigo', label: 'Blue', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-indigo-400', marker: 'bg-indigo-400' },
  { name: 'rose', label: 'Red', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-rose-400', marker: 'bg-rose-400' },
  { name: 'amber', label: 'Gold', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-[#E5C158]', marker: 'bg-[#E5C158]' },
  { name: 'sky', label: 'Sky', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-sky-400', marker: 'bg-sky-400' },
  { name: 'slate', label: 'Classic', bg: 'bg-[#121212] border-white/10 text-[#F5F5F5]', text: 'text-slate-400', marker: 'bg-slate-400' },
];

export default function KPIStats({ 
  data, 
  kpis, 
  onKPIsChange,
  startingBalance = 100000 // ✅ กำหนดค่าเริ่มต้น
}: KPIStatsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColumn, setNewColumn] = useState('');
  const [newType, setNewType] = useState<KPIConfig['type']>('sum');
  const [newFormat, setNewFormat] = useState<KPIConfig['format']>('number');
  const [newColor, setNewColor] = useState('indigo');

  // Find numerical columns for math aggregation
  const numericalColumns = data.columns.filter(c => c.type === 'number');

  const calculateKPI = (kpi: KPIConfig): number => {
    const colName = kpi.column || 'P&L';
    const values = data.rows
      .map(row => Number(row[colName]))
      .filter(val => !isNaN(val));

    if (values.length === 0 && kpi.type !== 'count' && kpi.type !== 'max_drawdown' && kpi.type !== 'current_balance' && kpi.type !== 'daily_loss') return 0;

    switch (kpi.type) {
      case 'sum':
        return values.reduce((sum, curr) => sum + curr, 0);
      case 'avg':
        return values.reduce((sum, curr) => sum + curr, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return data.rows.length;
      case 'win_rate': {
        const trades = values.filter(v => v !== 0);
        if (trades.length === 0) return 0;
        const wins = trades.filter(v => v > 0).length;
        return (wins / trades.length) * 100;
      }
      case 'profit_factor': {
        const gains = values.filter(v => v > 0).reduce((s, v) => s + v, 0);
        const losses = Math.abs(values.filter(v => v < 0).reduce((s, v) => s + v, 0));
        if (losses === 0) return gains > 0 ? 99.9 : 0;
        return gains / losses;
      }
      case 'max_drawdown': {
        let running = startingBalance; // ✅ ใช้ startingBalance
        let peak = startingBalance; // ✅ ใช้ startingBalance
        let maxDD = 0;
        const sortedRows = [...data.rows].sort((a, b) => {
          const aDate = Date.parse(a.Date);
          const bDate = Date.parse(b.Date);
          if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
          return 0;
        });
        sortedRows.forEach(row => {
          const pnl = Number(row[colName]);
          if (!isNaN(pnl)) {
            running += pnl;
            if (running > peak) {
              peak = running;
            }
            const dd = peak - running;
            if (dd > maxDD) {
              maxDD = dd;
            }
          }
        });
        return maxDD;
      }
      case 'current_balance': {
        const netPnl = values.reduce((sum, curr) => sum + curr, 0);
        return startingBalance + netPnl; // ✅ ใช้ startingBalance แทน 100000
      }
      case 'daily_loss': {
        if (data.rows.length === 0) return 0;

        const dates = data.rows
          .map(row => String(row.Date))
          .filter(Boolean);

        const latestDate = [...dates].sort((a, b) => Date.parse(b) - Date.parse(a))[0];

        const dailyPnl = data.rows
          .filter(row => String(row.Date) === latestDate)
          .map(row => Number(row[colName]))
          .filter(v => !isNaN(v))
          .reduce((sum, v) => sum + v, 0);

        return Math.max(0, -dailyPnl);
      }
      default:
        return 0;
    }
  };

  const formatValue = (value: number, format: KPIConfig['format']): string => {
    if (isNaN(value)) return 'N/A';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    }
  };

  const handleAddKPI = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetColumn = newType === 'count' ? (data.columns[0]?.name || '') : newColumn;
    if (!newTitle.trim() || (!targetColumn && newType !== 'count')) return;

    const newKPI: KPIConfig = {
      id: `kpi-${Date.now()}`,
      title: newTitle,
      column: targetColumn,
      type: newType,
      format: newFormat,
      color: newColor,
    };

    onKPIsChange([...kpis, newKPI]);
    setNewTitle('');
    setNewColumn('');
    setIsAdding(false);
  };

  const handleDeleteKPI = (id: string) => {
    onKPIsChange(kpis.filter(k => k.id !== id));
  };

  const getKPIIcon = (type: string, color: string) => {
    const iconColors: Record<string, string> = {
      emerald: 'text-emerald-400',
      indigo: 'text-indigo-400',
      rose: 'text-rose-400',
      amber: 'text-[#E5C158]',
      sky: 'text-sky-400',
      slate: 'text-slate-400',
    };
    
    const cls = `w-4 h-4 ${iconColors[color] || 'text-[#E5C158]'}`;

    switch (type) {
      case 'sum':
        return <DollarSign className={cls} />;
      case 'avg':
        return <BarChart2 className={cls} />;
      case 'count':
        return <Hash className={cls} />;
      default:
        return <CheckCircle className={cls} />;
    }
  };

  const getCardStyle = (colorName: string) => {
    const col = COLORS.find(c => c.name === colorName) || COLORS[1];
    return col.bg;
  };

  const getTextColorStyle = (colorName: string) => {
    const col = COLORS.find(c => c.name === colorName) || COLORS[1];
    return col.text;
  };

  const getMarkerStyle = (colorName: string) => {
    const col = COLORS.find(c => c.name === colorName) || COLORS[1];
    return col.marker;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#E5C158]"></span>
          Analytical Coordinates (KPIs)
        </h2>
        
        <button
          onClick={() => {
            setIsAdding(true);
            // Default to first numeric column if available
            if (numericalColumns.length > 0) {
              setNewColumn(numericalColumns[0].name);
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider border border-white/20 hover:border-[#E5C158] transition-all rounded-none"
          id="btn-add-kpi"
        >
          <Plus className="w-4 h-4" />
          Add Metric Card
        </button>
      </div>

      {/* KPI Cards Grid */}
      {kpis.length === 0 ? (
        <div className="text-center p-12 bg-[#121212] rounded-none border border-dashed border-white/10">
          <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">No Key Metrics Instantiated</p>
          <p className="text-[11px] text-slate-500 mt-1 mb-4">Formulate custom math aggregations based on active spreadsheet metrics.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-bold uppercase tracking-wider text-xs rounded-none transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Formulate First Metric
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpis-container">
          {kpis.map((kpi) => {
            const val = calculateKPI(kpi);
            const cardStyle = getCardStyle(kpi.color);
            const markerStyle = getMarkerStyle(kpi.color);
            const textColorStyle = getTextColorStyle(kpi.color);
            const formattedValue = formatValue(val, kpi.format);

            // ✅ กำหนดสีแบบไดนามิกสำหรับ daily_loss
            const isLatestDayPnL = kpi.type === 'daily_loss';
            const dynamicValueColor = isLatestDayPnL
              ? val === 0
                ? 'text-emerald-400'
                : 'text-rose-400'
              : textColorStyle;

            return (
              <div
                key={kpi.id}
                className={`p-6 rounded-none border transition-all hover:border-[#E5C158] relative group flex flex-col justify-between ${cardStyle}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {kpi.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-[#0A0A0A] border border-white/10 rounded-none">
                      {getKPIIcon(kpi.type, kpi.color)}
                    </div>
                    <button
                      onClick={() => handleDeleteKPI(kpi.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-[#0A0A0A] hover:bg-[#E5C158]/10 text-slate-500 hover:text-[#E5C158] rounded-none border border-white/10 transition-all ml-1"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className={`text-3xl font-black tracking-tighter font-mono ${dynamicValueColor}`}>
                    {formattedValue}
                  </p>
                  <p className="text-[9px] mt-1.5 uppercase font-mono tracking-widest text-slate-500 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${markerStyle}`}></span>
                    {kpi.type} OF {kpi.column}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add KPI Modal Popup */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="add-kpi-modal">
          <div className="bg-[#121212] rounded-none border border-white/20 p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Formulate custom metric</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-white/5 text-slate-400 hover:text-[#F5F5F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddKPI} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Metric Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOTAL REVENUE"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Calculation</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const type = e.target.value as KPIConfig['type'];
                      setNewType(type);
                      if (type === 'count' || type === 'profit_factor') {
                        setNewFormat('number');
                      } else if (type === 'win_rate') {
                        setNewFormat('percent');
                      } else if (type === 'max_drawdown' || type === 'current_balance' || type === 'daily_loss') {
                        setNewFormat('currency');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#FF3E00]"
                  >
                    <option value="sum">SUM (TOTAL)</option>
                    <option value="avg">AVERAGE</option>
                    <option value="min">MINIMUM</option>
                    <option value="max">MAXIMUM</option>
                    <option value="count">COUNT (ROWS)</option>
                    <option value="win_rate">WIN RATE %</option>
                    <option value="profit_factor">PROFIT FACTOR</option>
                    <option value="max_drawdown">MAX DRAWDOWN</option>
                    <option value="current_balance">PROP ACCOUNT BALANCE</option>
                    <option value="daily_loss">DAILY LOSS LIMIT CHECK</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as KPIConfig['format'])}
                    disabled={newType === 'count'}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] disabled:opacity-40"
                  >
                    <option value="number">DECIMAL (1,234.5)</option>
                    <option value="currency">CURRENCY ($1,234.5)</option>
                    <option value="percent">PERCENT (12.3%)</option>
                  </select>
                </div>
              </div>

              {newType !== 'count' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Spreadsheet column</label>
                  <select
                    required
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#FF3E00]"
                  >
                    {numericalColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                    {numericalColumns.length === 0 && (
                      <option disabled value="">
                        No numerical columns found
                      </option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Indicator Highlight Accent</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setNewColor(col.name)}
                      className={`px-3 py-1.5 rounded-none border text-[10px] font-mono uppercase transition-all ${
                        newColor === col.name
                          ? 'bg-[#E5C158] border-[#E5C158] text-black font-bold'
                          : 'bg-[#0A0A0A] border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

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
                  disabled={newType !== 'count' && numericalColumns.length === 0}
                  className="px-4 py-2.5 bg-[#E5C158] hover:bg-[#C9A23E] text-black text-xs font-bold uppercase tracking-wider rounded-none transition-colors disabled:opacity-40"
                >
                  Create Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}