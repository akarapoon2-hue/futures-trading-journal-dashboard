import type { ReactNode } from 'react';

import DashboardHero from './DashboardHero';

import {
  Activity,
  Banknote,
  CircleDollarSign,
  Goal,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import type {
  AccountConfig,
  ParsedData,
} from '../../types';

interface AccountInfo {
  name: string;
  startingBalance: number;
  currentBalance: number;
  tradeCount: number;
  totalPnL: number;
  lastSync: string;
}

interface DashboardOverviewProps {
  accountInfo: AccountInfo | null;
  accountConfig: AccountConfig;
  data: ParsedData | null;
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function MetricCard({
  label,
  value,
  description,
  icon,
  valueClassName = 'text-[#F5F5F5]',
}: MetricCardProps) {
  return (
    <article className="border border-white/10 bg-[#121212] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${valueClassName}`}
          >
            {value}
          </p>
        </div>

        <div className="border border-white/10 bg-[#090909] p-2 text-[#E5C158]">
          {icon}
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function DashboardOverview({
  accountInfo,
  accountConfig,
  data,
}: DashboardOverviewProps) {
  const startingBalance =
    accountInfo?.startingBalance ??
    accountConfig.startingBalance ??
    0;

  const currentBalance =
    accountInfo?.currentBalance ??
    startingBalance;

  const totalPnL =
    accountInfo?.totalPnL ??
    currentBalance - startingBalance;

  const tradeCount =
    accountInfo?.tradeCount ??
    data?.rows?.length ??
    0;

  const profitTarget =
    accountConfig.profitTarget ?? 0;

  const remainingTarget = Math.max(
    profitTarget - totalPnL,
    0,
  );

  const profitProgress =
    profitTarget > 0
      ? Math.max(
          0,
          Math.min(
            (totalPnL / profitTarget) * 100,
            100,
          ),
        )
      : 0;

  const drawdownLimit =
    accountConfig.trailingDrawdown ?? 0;

  const currentDrawdown = Math.max(
    startingBalance - currentBalance,
    0,
  );

  const drawdownRemaining = Math.max(
    drawdownLimit - currentDrawdown,
    0,
  );

  const pnlClassName =
    totalPnL >= 0
      ? 'text-emerald-400'
      : 'text-rose-400';

  const drawdownStatusClassName =
    currentDrawdown <= drawdownLimit
      ? 'text-emerald-400'
      : 'text-rose-400';

  return (
    <div className="space-y-8">
      <DashboardHero
        accountName={accountInfo?.name ?? 'No active account'}
        lastSync={accountInfo?.lastSync ?? '--:--:--'}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current Balance"
          value={formatCurrency(currentBalance)}
          description={`Starting balance ${formatCurrency(
            startingBalance,
          )}`}
          icon={<Banknote className="h-5 w-5" />}
        />

        <MetricCard
          label="Net Profit & Loss"
          value={`${totalPnL >= 0 ? '+' : ''}${formatCurrency(
            totalPnL,
          )}`}
          description="Realized account performance"
          icon={
            totalPnL >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          valueClassName={pnlClassName}
        />

        <MetricCard
          label="Trades Executed"
          value={tradeCount.toLocaleString()}
          description="Total journal records"
          icon={<Activity className="h-5 w-5" />}
        />

        <MetricCard
          label="Remaining Target"
          value={formatCurrency(remainingTarget)}
          description={`${profitProgress.toFixed(
            1,
          )}% of target completed`}
          icon={<Goal className="h-5 w-5" />}
          valueClassName="text-[#E5C158]"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="border border-white/10 bg-[#121212] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Profit Target Progress
              </p>

              <p className="mt-2 text-xl font-black text-[#F5F5F5]">
                {formatCurrency(totalPnL)}
                <span className="ml-2 text-xs text-slate-500">
                  / {formatCurrency(profitTarget)}
                </span>
              </p>
            </div>

            <CircleDollarSign className="h-6 w-6 text-[#E5C158]" />
          </div>

          <div className="h-2 overflow-hidden bg-[#090909]">
            <div
              className="h-full bg-[#E5C158] transition-all duration-500"
              style={{
                width: `${profitProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500">
            <span>
              {profitProgress.toFixed(1)}% complete
            </span>

            <span>
              {formatCurrency(remainingTarget)} remaining
            </span>
          </div>
        </article>

        <article className="border border-white/10 bg-[#121212] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Drawdown Protection
              </p>

              <p
                className={`mt-2 text-xl font-black ${drawdownStatusClassName}`}
              >
                {formatCurrency(drawdownRemaining)}
                <span className="ml-2 text-xs text-slate-500">
                  buffer remaining
                </span>
              </p>
            </div>

            <ShieldAlert
              className={`h-6 w-6 ${drawdownStatusClassName}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-white/10 bg-[#090909] p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Current Drawdown
              </p>

              <p className="mt-2 font-mono text-base font-bold text-rose-400">
                {formatCurrency(currentDrawdown)}
              </p>
            </div>

            <div className="border border-white/10 bg-[#090909] p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Maximum Allowed
              </p>

              <p className="mt-2 font-mono text-base font-bold text-[#E5C158]">
                {formatCurrency(drawdownLimit)}
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}