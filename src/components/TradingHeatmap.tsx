import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ParsedData } from '../types';

interface TradingHeatmapProps {
  data: ParsedData;
  onDayClick?: (date: string) => void;
}

interface HeatmapTrade {
  trade_date: string;
  net_pnl: number;
  result: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const normalizeDate = (value: string): string => {
  if (!value) return '';
  const clean = value.includes('T') ? value.split('T')[0] : value.split(' ')[0];
  return clean;
};

const formatCurrency = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${value.toFixed(2)}`;
};

export default function TradingHeatmap({
  data,
  onDayClick,
}: TradingHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ✅ แปลง ParsedData rows เป็น HeatmapTrade[] format
  const trades = useMemo<HeatmapTrade[]>(() => {
    if (!data?.rows || data.rows.length === 0) {
      return [];
    }

    return data.rows.map((row) => ({
      trade_date: String(
        row.Date ??
        row.TradeDate ??
        row.trade_date ??
        '',
      ),
      net_pnl: Number(
        row['P&L'] ??
        row.Net ??
        row.NetPnl ??
        row.net_pnl ??
        0,
      ),
      result: String(
        row.Result ??
        row.WinLoss ??
        row.result ??
        '',
      ),
    }));
  }, [data]);

  // ✅ สร้างข้อมูลรายวันจาก trades
  const dailyData = useMemo(() => {
    const result: Record<string, { pnl: number; count: number; result: string }> = {};
    
    if (!trades || trades.length === 0) return result;

    trades.forEach(trade => {
      const date = normalizeDate(trade.trade_date || '');
      if (!date) return;
      
      const pnl = trade.net_pnl || 0;
      const resultType = trade.result?.toLowerCase() || 'none';
      
      if (!result[date]) {
        result[date] = { pnl: 0, count: 0, result: 'none' };
      }
      
      result[date].pnl += pnl;
      result[date].count++;
      
      // เก็บ result แบบมี priority: loss > win > breakeven
      if (resultType === 'loss') {
        result[date].result = 'loss';
      } else if (resultType === 'win' && result[date].result !== 'loss') {
        result[date].result = 'win';
      } else if ((resultType === 'break even' || resultType === 'miss entry') && result[date].result === 'none') {
        result[date].result = 'breakeven';
      }
    });
    
    return result;
  }, [trades]);

  // ✅ สร้างปฏิทินรายเดือน
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: { day: number; date: string; hasTrade: boolean; pnl: number; count: number; result: string }[] = [];
    
    // Empty cells for first week
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: '', hasTrade: false, pnl: 0, count: 0, result: 'none' });
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = dailyData[date] || { pnl: 0, count: 0, result: 'none' };
      
      days.push({
        day,
        date,
        hasTrade: data.count > 0,
        pnl: data.pnl,
        count: data.count,
        result: data.result,
      });
    }
    
    return days;
  }, [year, month, dailyData]);

  // ✅ สรุปสัปดาห์
  const weekSummaries = useMemo(() => {
    const weeks: { weekNumber: number; pnl: number; count: number; days: typeof calendarDays }[] = [];
    let currentWeek: typeof calendarDays = [];
    
    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      
      if (currentWeek.length === 7 || index === calendarDays.length - 1) {
        const weekNumber = Math.floor(index / 7) + 1;
        const pnl = currentWeek.reduce((sum, d) => sum + d.pnl, 0);
        const count = currentWeek.reduce((sum, d) => sum + d.count, 0);
        
        weeks.push({
          weekNumber,
          pnl,
          count,
          days: [...currentWeek],
        });
        
        currentWeek = [];
      }
    });
    
    return weeks;
  }, [calendarDays]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: string, hasTrade: boolean) => {
    if (hasTrade && onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <section className="bg-[#121212] border border-white/10 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            Trading Activity Calendar
          </h3>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {MONTHS[month]} {year}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 border border-white/10 hover:border-[#E5C158] transition-all text-slate-400 hover:text-[#E5C158]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1.5 border border-white/10 hover:border-[#E5C158] transition-all text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-[#E5C158]"
          >
            Today
          </button>
          
          <button
            onClick={goToNextMonth}
            className="p-2 border border-white/10 hover:border-[#E5C158] transition-all text-slate-400 hover:text-[#E5C158]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider">
        <span className="text-slate-500">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-emerald-500/20 border border-emerald-500/30"></span>
          <span className="text-emerald-400">Win</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-red-500/20 border border-red-500/30"></span>
          <span className="text-red-400">Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/30"></span>
          <span className="text-yellow-400">Break Even</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-[#0A0A0A] border border-white/10"></span>
          <span className="text-slate-500">No Trade</span>
        </div>
      </div>

      {/* Calendar Grid - Day Names */}
      <div className="grid grid-cols-7 gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Weeks */}
      <div className="space-y-1">
        {weekSummaries.map((week) => (
          <div key={week.weekNumber} className="grid grid-cols-8 gap-1">
            {/* Days */}
            {week.days.map((day, index) => {
              const isToday = day.date === new Date().toISOString().split('T')[0];
              
              if (day.day === 0) {
                return (
                  <div key={`empty-${index}`} className="aspect-square bg-[#0A0A0A] border border-white/5" />
                );
              }
              
              let bgColor = 'bg-[#0A0A0A] border-white/10';
              let textColor = 'text-slate-400';
              let pnlColor = 'text-slate-400';
              
              if (day.hasTrade) {
                if (day.result === 'win') {
                  bgColor = 'bg-emerald-500/20 border-emerald-500/30';
                  textColor = 'text-emerald-400';
                  pnlColor = 'text-emerald-400';
                } else if (day.result === 'loss') {
                  bgColor = 'bg-red-500/20 border-red-500/30';
                  textColor = 'text-red-400';
                  pnlColor = 'text-red-400';
                } else {
                  bgColor = 'bg-yellow-500/20 border-yellow-500/30';
                  textColor = 'text-yellow-400';
                  pnlColor = 'text-yellow-400';
                }
              }
              
              if (isToday) {
                bgColor += ' ring-1 ring-[#E5C158]';
              }
              
              return (
                <button
                  key={day.date || `empty-${index}`}
                  onClick={() => handleDayClick(day.date, day.hasTrade)}
                  className={`aspect-square p-1 border flex flex-col items-center justify-center transition-all hover:ring-1 hover:ring-[#E5C158] ${bgColor} ${
                    day.hasTrade ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className={`text-xs font-bold ${textColor}`}>
                    {day.day}
                  </span>
                  {day.hasTrade && (
                    <>
                      <span className={`text-[8px] font-mono ${pnlColor}`}>
                        {formatCurrency(day.pnl)}
                      </span>
                      <span className="text-[7px] font-mono text-slate-500">
                        {day.count} trade{day.count > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
            
            {/* Week Summary */}
            <div className="col-span-1 flex flex-col items-center justify-center border border-white/10 bg-[#0A0A0A] p-1 min-h-[60px]">
              <span className="text-[8px] font-mono text-slate-500">Week {week.weekNumber}</span>
              <span className={`text-[9px] font-mono font-bold ${week.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(week.pnl)}
              </span>
              {week.count > 0 && (
                <span className="text-[7px] font-mono text-slate-500">
                  {week.count} trades
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {Object.keys(dailyData).length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Trading Days</p>
            <p className="text-lg font-black text-[#F5F5F5]">
              {Object.keys(dailyData).filter(date => dailyData[date].count > 0).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Total Trades</p>
            <p className="text-lg font-black text-[#F5F5F5]">
              {Object.values(dailyData).reduce((sum, d) => sum + d.count, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Total P&L</p>
            <p className={`text-lg font-black ${Object.values(dailyData).reduce((sum, d) => sum + d.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(Object.values(dailyData).reduce((sum, d) => sum + d.pnl, 0))}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}