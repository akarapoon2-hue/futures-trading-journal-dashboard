import {
  Activity,
  Clock,
  Coins,
  Database,
  LogOut,
  RefreshCw,
  Settings,
  TrendingUp,
  User,
  Wifi,
} from 'lucide-react';

import tradexaLogo from '../../assets/logo/logo.svg';

interface AccountInfo {
  name: string;
  currentBalance: number;
  tradeCount: number;
  totalPnL: number;
  lastSync: string;
}

interface DashboardHeaderProps {
  email: string;
  accountInfo: AccountInfo | null;
  accountLoading: boolean;
  canReset: boolean;
  onOpenSettings: () => void;
  onOpenBackup: () => void;
  onReset: () => void;
  onLogout: () => void | Promise<void>;
}

export default function DashboardHeader({
  email,
  accountInfo,
  accountLoading,
  canReset,
  onOpenSettings,
  onOpenBackup,
  onReset,
  onLogout,
}: DashboardHeaderProps) {
  const totalPnL = accountInfo?.totalPnL ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0A] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <img
          src={tradexaLogo}
          alt="TRADEXA"
          className="h-16 w-auto"
        />

        {accountLoading ? (
          <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-6 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E5C158] border-t-transparent" />
            <span className="font-mono text-[10px] text-slate-400">
              Loading...
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6 border border-white/10 bg-[#121212] px-6 py-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Wifi className="h-4 w-4 text-[#10b981]" />
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#10b981]" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#10b981]">
                Live
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono text-xs text-[#F5F5F5]">
                {accountInfo?.name || 'No Account'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-[#E5C158]" />
              <span className="font-mono text-xs text-[#E5C158]">
                ${accountInfo?.currentBalance?.toLocaleString() || '0'}
              </span>
            </div>

            <div
              className={`flex items-center gap-2 ${
                totalPnL >= 0 ? 'text-[#10b981]' : 'text-red-400'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">
                {totalPnL >= 0 ? '+' : ''}
                {totalPnL.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono text-xs text-slate-400">
                {accountInfo?.tradeCount || 0} trades
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-[10px] text-slate-500">
                {accountInfo?.lastSync || '--:--:--'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border border-white/10 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E5C158] text-xs font-bold text-black">
              {email.charAt(0).toUpperCase() || 'U'}
            </div>

            <span className="max-w-[100px] truncate font-mono text-xs text-slate-400">
              {email}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] transition-all hover:border-[#E5C158] hover:bg-white/5 hover:text-[#E5C158]"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>

          <button
            type="button"
            onClick={onOpenBackup}
            className="flex items-center gap-1.5 border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] transition-all hover:border-[#E5C158] hover:bg-white/5 hover:text-[#E5C158]"
          >
            <Database className="h-3.5 w-3.5" />
            Backup
          </button>

          {canReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] transition-all hover:border-[#E5C158] hover:bg-white/5 hover:text-[#E5C158]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex items-center gap-1.5 border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] transition-all hover:border-red-400 hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}