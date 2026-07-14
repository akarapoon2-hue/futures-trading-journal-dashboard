import React, { useMemo } from 'react';
import { ParsedData } from '../types';

interface TradingHeatmapProps {
  data: ParsedData;
  onDataLoaded?: (newData: ParsedData) => void;
  currentSourceName?: string;
}

const normalizeDate = (value: unknown): string => {
  if (!value) return '';
  const text = String(value).trim();

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const parsedDate = new Date(`${text}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return '';
  return parsedDate.toISOString().split('T')[0];
};

const parseNumber = (value: unknown): number => {
  const original = String(value ?? '').trim();
  const isNegative = original.startsWith('(') && original.endsWith(')');
  const cleaned = original.replace(/[$,%\s,()]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? (isNegative ? -number : number) : 0;
};

export default function TradingHeatmap({ 
  data, 
  onDataLoaded,  // รับไว้แต่ไม่ต้องใช้
  currentSourceName 
}: TradingHeatmapProps) {
  const dailySums = useMemo(() => {
    const sums: Record<string, number> = {};
    if (!data?.rows?.length) return sums;

    const dateCol = data.columns.find(c => /date|day|timestamp|วันที่/i.test(c.name))?.name;
    const pnlCol = data.columns.find(c => /pnl|p&l|profit|กำไร|ขาดทุน/i.test(c.name))?.name;

    if (!dateCol || !pnlCol) return sums;

    data.rows.forEach(row => {
      const dateKey = normalizeDate(row[dateCol]);
      if (!dateKey) return;
      sums[dateKey] = (sums[dateKey] ?? 0) + parseNumber(row[pnlCol]);
    });
    return sums;
  }, [data]);

  const calendar = useMemo(() => {
    const dates = Object.keys(dailySums).sort();
    const ref = dates.length > 0 ? new Date(`${dates[dates.length - 1]}T12:00:00`) : new Date();
    const year = ref.getFullYear();
    const month = ref.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    return {
      year,
      month,
      monthLabel: ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells: [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
    };
  }, [dailySums]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // ✅ ใช้ currentSourceName ใน title
  const displayTitle = currentSourceName 
    ? `Trading Activity Heatmap - ${currentSourceName}`
    : 'Trading Activity Heatmap';

  return (
    <div className="bg-[#121212] border border-white/10 p-6 rounded-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C158] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#E5C158]"></span>
            {displayTitle}
          </h3>
          <p className="mt-1 text-[10px] font-mono uppercase text-slate-500">
            {calendar.monthLabel}
          </p>
        </div>
        
        {/* Stats Summary */}
        {Object.keys(dailySums).length > 0 && (
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500/20 border border-emerald-500/40"></span>
              Profitable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-rose-500/20 border border-rose-500/40"></span>
              Losing
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-white/5 border border-white/10"></span>
              No Trade
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-1 text-center text-[9px] font-mono uppercase text-slate-500">
            {day}
          </div>
        ))}

        {calendar.cells.map((day, idx) => {
          if (!day) return <div key={`blank-${idx}`} className="aspect-square" />;
          
          const dateKey = `${calendar.year}-${String(calendar.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const pnl = dailySums[dateKey];
          const hasData = pnl !== undefined;
          
          const cellClass = hasData 
            ? (pnl > 0 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30' 
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30')
            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10';

          return (
            <div 
              key={dateKey} 
              className={`group relative aspect-square border p-2 transition-all duration-200 cursor-default ${cellClass}`}
              title={hasData ? `${dateKey}: ${formatCurrency(pnl)}` : `${dateKey}: No trading activity`}
            >
              <span className="text-[10px] font-mono">{day}</span>
              {hasData && (
                <span className="absolute bottom-1 right-1 text-[8px] font-mono opacity-80">
                  {formatCurrency(pnl)}
                </span>
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-white/20 bg-black px-2 py-1 text-[9px] font-mono text-white group-hover:block">
                {dateKey}: {hasData ? formatCurrency(pnl) : 'No trading activity'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(dailySums).length === 0 && (
        <div className="mt-4 border border-amber-500/30 p-3 text-[10px] font-mono text-amber-400">
          ⚠️ No trading data found. Make sure your data has Date and P&L columns.
        </div>
      )}
    </div>
  );
}