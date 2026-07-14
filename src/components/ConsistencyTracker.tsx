import { useMemo } from 'react';
import { ShieldCheck, TriangleAlert, ShieldX } from 'lucide-react';
import type { ParsedData } from '../types';

interface ConsistencyTrackerProps {
  data: ParsedData;
  consistencyLimit?: number;
}

const normalizeDate = (value: unknown): string => {
  if (!value) return '';

  const raw = String(value).trim();
  const clean = raw.includes('T')
    ? raw.split('T')[0]
    : raw.split(' ')[0];

  let match = clean.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/
  );

  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  match = clean.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-');
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const original = String(value ?? '').trim();
  const isNegative =
    original.startsWith('(') &&
    original.endsWith(')');

  const cleaned = original.replace(
    /[$,%\s,()]/g,
    ''
  );

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -parsed : parsed;
};

// ✅ แก้ไข formatCurrency ให้แสดงเครื่องหมาย +/-
const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);

  return (
    (value > 0 ? '+' : value < 0 ? '-' : '') +
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    })
      .format(abs)
      .replace('$', '$')
  );
};

export default function ConsistencyTracker({
  data,
  consistencyLimit = 40
}: ConsistencyTrackerProps) {
  const result = useMemo(() => {
    const emptyResult = {
      hasData: false,
      netProfit: 0,
      highestProfitDay: 0,
      highestProfitDate: '',
      consistencyPercent: 0,
      requiredNetProfit: 0,
      additionalProfitNeeded: 0
    };

    if (!data?.rows?.length) {
      return emptyResult;
    }

    const dateColumn =
      data.columns.find(column => {
        const name = column.name
          .toLowerCase()
          .replace(/[^a-z0-9ก-๙]/g, '');

        return (
          column.type === 'date' ||
          name === 'date' ||
          name === 'tradedate' ||
          name === 'entrydate' ||
          name.includes('วันที่')
        );
      })?.name ??
      ['Date', 'Trade Date', 'Entry Date', 'วันที่'].find(
        key => key in data.rows[0]
      );

    const pnlColumn =
      data.columns.find(column => {
        const name = column.name
          .toLowerCase()
          .replace(/[^a-z0-9ก-๙]/g, '');

        return (
          name === 'pnl' ||
          name === 'netpnl' ||
          name === 'profit' ||
          name === 'profitloss' ||
          name.includes('pnl') ||
          name.includes('profit') ||
          name.includes('กำไร') ||
          name.includes('ขาดทุน')
        );
      })?.name ??
      [
        'P&L',
        'P&L ($)',
        'PnL',
        'Net P&L',
        'Profit',
        'Profit/Loss'
      ].find(key => key in data.rows[0]);

    if (!dateColumn || !pnlColumn) {
      return emptyResult;
    }

    const dailyPnL: Record<string, number> = {};

    data.rows.forEach(row => {
      const date = normalizeDate(row[dateColumn]);

      if (!date) return;

      dailyPnL[date] =
        (dailyPnL[date] ?? 0) +
        parseNumber(row[pnlColumn]);
    });

    // ✅ คำนวณ Net Profit (รวมทั้งบวกและลบ)
    const netProfit = Object.values(dailyPnL).reduce(
      (sum, pnl) => sum + pnl,
      0
    );

    // หาวันที่ทำกำไรสูงสุด (เฉพาะวันที่ P&L > 0)
    const profitableDays = Object.entries(dailyPnL)
      .filter(([, pnl]) => pnl > 0);

    const highestDay = profitableDays.reduce(
      (best, current) =>
        current[1] > best[1] ? current : best,
      ['', 0] as [string, number]
    );

    const highestProfitDate = highestDay[0];
    const highestProfitDay = highestDay[1];

    // ✅ คำนวณ Consistency โดยใช้ Net Profit
    const consistencyPercent =
      netProfit > 0
        ? (highestProfitDay / netProfit) * 100
        : 0;

    const limitRatio = consistencyLimit / 100;

    const requiredNetProfit =
      limitRatio > 0
        ? highestProfitDay / limitRatio
        : 0;

    const additionalProfitNeeded = Math.max(
      0,
      requiredNetProfit - netProfit
    );

    return {
      hasData: true,
      netProfit,
      highestProfitDay,
      highestProfitDate,
      consistencyPercent,
      requiredNetProfit,
      additionalProfitNeeded
    };
  }, [data, consistencyLimit]);

  const status =
    !result.hasData
      ? 'NO DATA'
      : result.consistencyPercent <= consistencyLimit
        ? 'PASS'
        : result.consistencyPercent <= consistencyLimit + 10
          ? 'WARNING'
          : 'FAILED';

  const statusClass =
    status === 'PASS'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : status === 'WARNING'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        : status === 'NO DATA'
          ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-400';

  const StatusIcon =
    status === 'PASS'
      ? ShieldCheck
      : status === 'WARNING'
        ? TriangleAlert
        : status === 'NO DATA'
          ? ShieldX
          : ShieldX;

  // ✅ แก้ไข Progress Bar ให้แสดงตามสัดส่วนของ Limit
  const progressPercent =
    consistencyLimit > 0
      ? Math.min(
          100,
          (result.consistencyPercent / consistencyLimit) * 100
        )
      : 0;

  return (
    <section className="space-y-5 border border-white/10 bg-[#121212] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            Consistency Rule Tracker
          </h3>

          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Highest profitable day must not exceed{' '}
            <span className="text-[#E5C158]">
              {consistencyLimit}%
            </span>{' '}
            of net profit
          </p>
        </div>

        <div
          className={`flex items-center gap-2 border px-3 py-2 text-xs font-black tracking-wider ${statusClass}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Net profit
          </p>

          <p
            className={`mt-2 text-2xl font-black ${
              !result.hasData
                ? 'text-slate-500'
                : result.netProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
            }`}
          >
            {formatCurrency(result.netProfit)}
          </p>
        </div>

        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Highest profit day
          </p>

          <p className={`mt-2 text-2xl font-black ${!result.hasData ? 'text-slate-500' : 'text-[#F5F5F5]'}`}>
            {result.hasData ? formatCurrency(result.highestProfitDay) : '—'}
          </p>

          <p className="mt-1 text-[9px] font-mono text-slate-500">
            {result.hasData ? (result.highestProfitDate || 'No profitable day') : 'No data'}
          </p>
        </div>

        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Current consistency
          </p>

          <p
            className={`mt-2 text-2xl font-black ${
              !result.hasData
                ? 'text-slate-500'
                : status === 'PASS'
                  ? 'text-emerald-400'
                  : status === 'WARNING'
                    ? 'text-amber-400'
                    : 'text-rose-400'
            }`}
          >
            {result.hasData ? `${result.consistencyPercent.toFixed(1)}%` : '—'}
          </p>
        </div>

        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Additional profit needed
          </p>

          <p className={`mt-2 text-2xl font-black ${!result.hasData ? 'text-slate-500' : 'text-[#E5C158]'}`}>
            {result.hasData ? formatCurrency(result.additionalProfitNeeded) : '—'}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Consistency usage</span>

          <span>
            {result.hasData 
              ? `${result.consistencyPercent.toFixed(1)}% / ${consistencyLimit}%`
              : 'No data'}
          </span>
        </div>

        <div className="h-3 overflow-hidden border border-white/10 bg-black">
          <div
            className={`h-full transition-all duration-500 ${
              !result.hasData
                ? 'bg-slate-500'
                : status === 'PASS'
                  ? 'bg-emerald-500'
                  : status === 'WARNING'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
            }`}
            style={{
              width: `${result.hasData ? progressPercent : 0}%`
            }}
          />
        </div>
      </div>
    </section>
  );
}