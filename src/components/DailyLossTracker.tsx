import { useMemo } from 'react';
import { AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';
import type { ParsedData } from '../types';

interface DailyLossTrackerProps {
  data: ParsedData;
  dailyLossLimit?: number;
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

  const isParenthesesNegative =
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

  return isParenthesesNegative
    ? -parsed
    : parsed;
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export default function DailyLossTracker({
  data,
  dailyLossLimit = 1000
}: DailyLossTrackerProps) {
  const result = useMemo(() => {
    if (!data?.rows?.length) {
      return {
        latestDate: '',
        dailyPnL: 0,
        dailyLoss: 0
      };
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
      return {
        latestDate: '',
        dailyPnL: 0,
        dailyLoss: 0
      };
    }

    const grouped: Record<string, number> = {};

    data.rows.forEach(row => {
      const date = normalizeDate(row[dateColumn]);

      if (!date) return;

      grouped[date] =
        (grouped[date] ?? 0) +
        parseNumber(row[pnlColumn]);
    });

    const dates = Object.keys(grouped).sort();

    if (!dates.length) {
      return {
        latestDate: '',
        dailyPnL: 0,
        dailyLoss: 0
      };
    }

    const latestDate = dates[dates.length - 1];
    const latestDayPnL = grouped[latestDate];
    const dailyLoss = Math.max(0, -latestDayPnL);

    return {
      latestDate,
      dailyPnL: latestDayPnL,
      dailyLoss
    };
  }, [data]);

  const lossUsed = result.dailyLoss;
  const remaining = Math.max(
    0,
    dailyLossLimit - lossUsed
  );

  // ✅ ป้องกันการหารด้วยศูนย์
  const usedPercent =
    dailyLossLimit > 0
      ? Math.min(100, (lossUsed / dailyLossLimit) * 100)
      : 0;

  const status =
    usedPercent >= 100
      ? 'FAILED'
      : usedPercent >= 75
        ? 'DANGER'
        : usedPercent >= 50
          ? 'WARNING'
          : 'SAFE';

  const statusClass =
    status === 'SAFE'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : status === 'WARNING'
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  const StatusIcon =
    status === 'SAFE'
      ? ShieldCheck
      : status === 'FAILED'
        ? ShieldX
        : AlertTriangle;

  // ✅ แก้ไขการแสดง Daily Loss
  const dailyLossText =
    result.dailyLoss === 0
      ? '$0'
      : `-${formatCurrency(result.dailyLoss)}`;

  return (
    <section className="bg-[#121212] border border-white/10 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            Daily Loss Limit Tracker
          </h3>

          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Latest trading day:{' '}
            <span className="text-[#E5C158]">
              {result.latestDate || 'No data'}
            </span>
          </p>
        </div>

        <div
          className={`flex items-center gap-2 border px-3 py-2 text-xs font-black tracking-wider ${statusClass}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status}
        </div>
      </div>

      {/* ✅ แก้ไขโครงสร้างการ์ด */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-h-[104px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Daily Loss Limit
          </p>

          <p className="mt-auto text-3xl font-black leading-none text-white">
            -${dailyLossLimit.toLocaleString()}
          </p>
        </div>

        <div className="flex min-h-[104px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Daily Loss
          </p>

          <p className="mt-auto text-3xl font-black leading-none text-rose-400">
            -${Math.abs(result.dailyLoss).toLocaleString()}
          </p>
        </div>

        <div className="flex min-h-[104px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Remaining Loss Room
          </p>

          <p className="mt-auto text-3xl font-black leading-none text-[#E5C158]">
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Loss limit usage</span>
          <span>{usedPercent.toFixed(1)}%</span>
        </div>

        <div className="h-3 overflow-hidden border border-white/10 bg-black">
          <div
            className={`h-full transition-all duration-500 ${
              usedPercent >= 75
                ? 'bg-rose-500'
                : usedPercent >= 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            style={{
              width: `${usedPercent}%`
            }}
          />
        </div>
      </div>
    </section>
  );
}