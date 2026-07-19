import type {
  Dispatch,
  SetStateAction,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'motion/react';

import {
  Layers,
  TrendingUp,
} from 'lucide-react';

import type {
  AccountConfig,
  ChartConfig,
  KPIConfig,
  ParsedData,
} from '../../types';

import {
  templates,
  type Template,
} from '../../templates';

import TradeForm from '../../components/trades/TradeForm';
import DataImporter from '../../components/DataImporter';
import DailyLossTracker from '../../components/DailyLossTracker';
import TrailingDrawdownTracker from '../../components/TrailingDrawdownTracker';
import ConsistencyTracker from '../../components/ConsistencyTracker';
import ProfitTargetTracker from '../../components/ProfitTargetTracker';
import KPIStats from '../../components/KPIStats';
import DashboardCharts from '../../components/DashboardCharts';
import TradingHeatmap from '../../components/TradingHeatmap';
import DataTable from '../../components/DataTable';

interface JournalContentProps {
  activeAccountId: string | null;
  userId: string;

  data: ParsedData | null;
  kpis: KPIConfig[];
  charts: ChartConfig[];

  selectedTemplateId: string;
  accountConfig: AccountConfig;

  enableImport: boolean;

  onTradeSaved: () => void | Promise<void>;
  onTemplateSwitch: (templateId: string) => void;
  onCustomDataLoaded: (newData: ParsedData) => void;

  setKPIs: Dispatch<SetStateAction<KPIConfig[]>>;
  setCharts: Dispatch<SetStateAction<ChartConfig[]>>;
}

export default function JournalContent({
  activeAccountId,
  userId,
  data,
  kpis,
  charts,
  selectedTemplateId,
  accountConfig,
  enableImport,
  onTradeSaved,
  onTemplateSwitch,
  onCustomDataLoaded,
  setKPIs,
  setCharts,
}: JournalContentProps) {
  return (
    <>
      {/* Add New Trade */}
      {activeAccountId && (
        <section
          id="trade-form-section"
          className="space-y-4"
        >
          <TradeForm
            accountId={activeAccountId}
            userId={userId}
            onSaved={onTradeSaved}
          />
        </section>
      )}

      {/* Dataset Preset */}
      <section className="space-y-4 border border-white/10 bg-[#121212] p-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E5C158]">
              <Layers className="h-3.5 w-3.5" />
              Active Dataset Preset
            </span>

            <h2 className="mt-1.5 text-xl font-bold uppercase italic tracking-tight text-[#F5F5F5]">
              Choose a Pre-compiled Dataset Template
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {templates.map((template: Template) => {
            const isActive =
              selectedTemplateId === template.id;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() =>
                  onTemplateSwitch(template.id)
                }
                className={`relative border p-5 text-left transition-all ${
                  isActive
                    ? 'border-[#E5C158] bg-[#E5C158] font-black text-black'
                    : 'border-white/10 bg-[#0A0A0A] text-[#F5F5F5] hover:bg-white/5'
                }`}
              >
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {template.name}
                </h3>

                <p
                  className={`mt-1 line-clamp-2 text-[11px] leading-relaxed ${
                    isActive
                      ? 'text-black/70'
                      : 'text-slate-400'
                  }`}
                >
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Import Custom Data */}
      {enableImport && (
        <section
          id="importer-section"
          className="animate-slideIn"
        >
          <DataImporter
            onDataLoaded={onCustomDataLoaded}
            currentSourceName={data?.sourceName}
          />
        </section>
      )}

      {/* Journal Analytics */}
      {data ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={data.sourceName}
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            transition={{
              duration: 0.25,
            }}
            className="space-y-8"
          >
            {/* Risk Management */}
            <section
              id="risk-section"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DailyLossTracker
                  data={data}
                  dailyLossLimit={
                    accountConfig.dailyLossLimit
                  }
                />

                <TrailingDrawdownTracker
                  data={data}
                  startingBalance={
                    accountConfig.startingBalance
                  }
                  drawdownAmount={
                    accountConfig.trailingDrawdown
                  }
                />
              </div>

              <ConsistencyTracker
                data={data}
                consistencyLimit={
                  accountConfig.consistencyLimit
                }
              />

              <ProfitTargetTracker
                data={data}
                profitTarget={
                  accountConfig.profitTarget
                }
              />
            </section>

            {/* KPI Section */}
            <section id="kpis-section">
              <KPIStats
                data={data}
                kpis={kpis}
                onKPIsChange={setKPIs}
                startingBalance={
                  accountConfig.startingBalance
                }
              />
            </section>

            {/* Charts */}
            <section
              id="charts-section"
              className="space-y-8"
            >
              <DashboardCharts
                data={data}
                charts={charts}
                onChartsChange={setCharts}
                startingBalance={
                  accountConfig.startingBalance
                }
              />
            </section>

            {/* Heatmap */}
            <section
              id="heatmap-section"
              className="space-y-8"
            >
              <TradingHeatmap data={data} />
            </section>

            {/* Trades Table */}
            <section id="table-section">
              <DataTable data={data} />
            </section>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="border border-dashed border-white/20 bg-[#121212] py-20 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-[#E5C158]" />

          <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
            No active dataset initialized
          </p>

          <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
            Loading data from Supabase Cloud...
          </p>
        </div>
      )}
    </>
  );
}