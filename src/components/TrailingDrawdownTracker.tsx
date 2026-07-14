import { useMemo } from 'react';
import { ShieldCheck, TriangleAlert, ShieldX } from 'lucide-react';
import { ParsedData } from '../types';

interface TrailingDrawdownTrackerProps {
  data: ParsedData;
  startingBalance: number;
  drawdownAmount: number;
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

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
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

  const number = Number(cleaned);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return isParenthesesNegative
    ? -number
    : number;
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export default function TrailingDrawdownTracker({
  data,
  startingBalance,
  drawdownAmount,
}: TrailingDrawdownTrackerProps) {
  const result = useMemo(() => {
    if (!data?.rows?.length) {
      return {
        currentBalance: startingBalance,
        peakBalance: startingBalance,
        trailingFloor: startingBalance - drawdownAmount
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
        currentBalance: startingBalance,
        peakBalance: startingBalance,
        trailingFloor: startingBalance - drawdownAmount
      };
    }

    const sortedRows = [...data.rows].sort((a, b) => {
      const aDate = Date.parse(normalizeDate(a[dateColumn]));
      const bDate = Date.parse(normalizeDate(b[dateColumn]));

      if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
        return 0;
      }

      return aDate - bDate;
    });

    let currentBalance = startingBalance;
    let peakBalance = startingBalance;

    sortedRows.forEach(row => {
      currentBalance += parseNumber(row[pnlColumn]);

      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
    });

    return {
      currentBalance,
      peakBalance,
      trailingFloor: peakBalance - drawdownAmount
    };
  }, [data, startingBalance, drawdownAmount]);

  const distanceToFloor =
    result.currentBalance - result.trailingFloor;

  const bufferPercent = Math.max(
    0,
    Math.min(
      100,
      (distanceToFloor / drawdownAmount) * 100
    )
  );

  const status =
    distanceToFloor <= 0
      ? 'FAILED'
      : bufferPercent <= 25
        ? 'DANGER'
        : bufferPercent <= 50
          ? 'WARNING'
          : 'SAFE';

  const statusClass =
    status === 'SAFE'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : status === 'WARNING'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        : 'border-rose-500/30 bg-rose-500/10 text-rose-400';

  const StatusIcon =
    status === 'SAFE'
      ? ShieldCheck
      : status === 'FAILED'
        ? ShieldX
        : TriangleAlert;

  return (
    <section className="space-y-5 border border-white/10 bg-[#121212] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            Trailing Drawdown Tracker
          </h3>

          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Dynamic floor based on peak account balance
          </p>
        </div>

        <div
          className={`flex items-center gap-2 border px-3 py-2 text-xs font-black tracking-wider ${statusClass}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-h-[112px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-black uppercase tracking-widest text-slate-500">
            Current balance
          </p>

          <p className="mt-auto whitespace-nowrap font-mono text-[clamp(1.05rem,1.5vw,1.35rem)] font-black tabular-nums text-[#F5F5F5]">
            {formatCurrency(result.currentBalance)}
          </p>
        </div>

        <div className="flex min-h-[112px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-black uppercase tracking-widest text-slate-500">
            Peak balance
          </p>

          <p className="mt-auto whitespace-nowrap font-mono text-[clamp(1.05rem,1.5vw,1.35rem)] font-black tabular-nums text-emerald-400">
            {formatCurrency(result.peakBalance)}
          </p>
        </div>

        <div className="flex min-h-[112px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-black uppercase tracking-widest text-slate-500">
            Trailing floor
          </p>

          <p className="mt-auto whitespace-nowrap font-mono text-[clamp(1.05rem,1.5vw,1.35rem)] font-black tabular-nums text-rose-400">
            {formatCurrency(result.trailingFloor)}
          </p>
        </div>

        <div className="flex min-h-[112px] flex-col border border-white/10 bg-[#0A0A0A] p-4">
          <p className="min-h-[32px] text-[10px] font-black uppercase tracking-widest text-slate-500">
            Distance to floor
          </p>

          <p
            className={`mt-auto whitespace-nowrap font-mono text-[clamp(1.05rem,1.5vw,1.35rem)] font-black tabular-nums ${
              distanceToFloor > 0
                ? 'text-[#E5C158]'
                : 'text-rose-400'
            }`}
          >
            {formatCurrency(distanceToFloor)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Drawdown buffer remaining</span>
          <span>{bufferPercent.toFixed(1)}%</span>
        </div>

        <div className="h-3 overflow-hidden border border-white/10 bg-black">
          <div
            className={`h-full transition-all duration-500 ${
              bufferPercent <= 25
                ? 'bg-rose-500'
                : bufferPercent <= 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            style={{
              width: `${bufferPercent}%`
            }}
          />
        </div>
      </div>
    </section>
  );
}