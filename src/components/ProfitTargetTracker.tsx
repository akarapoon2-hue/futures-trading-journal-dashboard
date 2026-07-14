import { useMemo } from 'react';
import { Target, CheckCircle2, TriangleAlert } from 'lucide-react';
import type { ParsedData } from '../types';

interface ProfitTargetTrackerProps {
  data: ParsedData;
  profitTarget?: number;
}

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const original = String(value ?? '').trim();
  const isNegative =
    original.startsWith('(') &&
    original.endsWith(')');

  const cleaned = original.replace(/[$,%\s,()]/g, '');
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -parsed : parsed;
};

const formatCurrency = (value: number): string => {
  const absoluteValue = Math.abs(value);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(absoluteValue);

  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;

  return formatted;
};

export default function ProfitTargetTracker({
  data,
  profitTarget = 6000
}: ProfitTargetTrackerProps) {
  const result = useMemo(() => {
    if (!data?.rows?.length) {
      return {
        hasData: false,
        currentProfit: 0
      };
    }

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

    if (!pnlColumn) {
      return {
        hasData: false,
        currentProfit: 0
      };
    }

    const currentProfit = data.rows.reduce(
      (sum, row) => sum + parseNumber(row[pnlColumn]),
      0
    );

    return {
      hasData: true,
      currentProfit
    };
  }, [data]);

  const remainingProfit = Math.max(
    0,
    profitTarget - result.currentProfit
  );

  const progressPercent =
    profitTarget > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (result.currentProfit / profitTarget) * 100
          )
        )
      : 0;

  const targetReached =
    result.hasData &&
    result.currentProfit >= profitTarget;

  const status =
    !result.hasData
      ? 'NO DATA'
      : targetReached
        ? 'TARGET REACHED'
        : progressPercent >= 75
          ? 'NEAR TARGET'
          : 'IN PROGRESS';

  const statusClass =
    status === 'TARGET REACHED'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : status === 'NEAR TARGET'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        : status === 'NO DATA'
          ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
          : 'border-sky-500/30 bg-sky-500/10 text-sky-400';

  const StatusIcon =
    status === 'TARGET REACHED'
      ? CheckCircle2
      : status === 'NEAR TARGET'
        ? TriangleAlert
        : Target;

  return (
    <section className="space-y-5 border border-white/10 bg-[#121212] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            Profit Target Tracker
          </h3>

          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Track progress toward the active account profit target
          </p>
        </div>

        <div
          className={`flex items-center gap-2 border px-3 py-2 text-xs font-black tracking-wider ${statusClass}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Profit target
          </p>

          <p className="mt-2 font-sans text-2xl font-black tabular-nums text-[#E5C158]">
            {formatCurrency(profitTarget)}
          </p>
        </div>

        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Current profit
          </p>

          <p
            className={`mt-2 font-sans text-2xl font-black tabular-nums ${
              !result.hasData
                ? 'text-slate-500'
                : result.currentProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
            }`}
          >
            {result.hasData
              ? formatCurrency(result.currentProfit)
              : '—'}
          </p>
        </div>

        <div className="border border-white/10 bg-[#0A0A0A] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Remaining profit
          </p>

          <p className="mt-2 font-sans text-2xl font-black tabular-nums text-[#F5F5F5]">
            {result.hasData
              ? formatCurrency(remainingProfit)
              : '—'}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Target progress</span>

          <span>
            {result.hasData
              ? `${progressPercent.toFixed(1)}%`
              : 'No data'}
          </span>
        </div>

        <div className="h-3 overflow-hidden border border-white/10 bg-black">
          <div
            className={`h-full transition-all duration-500 ${
              targetReached
                ? 'bg-emerald-500'
                : progressPercent >= 75
                  ? 'bg-amber-500'
                  : 'bg-[#E5C158]'
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