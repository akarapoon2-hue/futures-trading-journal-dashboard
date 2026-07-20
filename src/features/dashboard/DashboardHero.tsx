interface DashboardHeroProps {
  accountName: string;
  lastSync: string;
}

export default function DashboardHero({
  accountName,
  lastSync,
}: DashboardHeroProps) {
  return (
    <section className="flex flex-col justify-between gap-5 border border-white/10 bg-[#121212] p-6 lg:flex-row lg:items-end">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E5C158]">
          Portfolio Command Center
        </p>

        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[#F5F5F5] sm:text-3xl">
          Dashboard Overview
        </h1>

        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
          Real-time account status, performance, risk and prop-firm
          objective tracking.
        </p>
      </div>

      <div className="border border-white/10 bg-[#090909] px-5 py-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Active Account
        </p>

        <p className="mt-1 font-mono text-sm font-bold text-[#E5C158]">
          {accountName}
        </p>

        <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          Last sync: {lastSync}
        </p>
      </div>
    </section>
  );
}