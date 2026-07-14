import { useEffect, useState } from 'react';
import { Save, Settings, X } from 'lucide-react';
import type { AccountConfig } from '../types';

interface DashboardSettingsProps {
  open: boolean;
  config: AccountConfig;
  onClose: () => void;
  onSave: (config: AccountConfig) => void;
}

const INPUT_CLASS =
  'w-full border border-white/10 bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#E5C158]';

export default function DashboardSettings({
  open,
  config,
  onClose,
  onSave
}: DashboardSettingsProps) {
  const [draft, setDraft] = useState<AccountConfig>(config);

  useEffect(() => {
    if (open) {
      setDraft(config);
    }
  }, [config, open]);

  if (!open) return null;

  const updateNumber = (
    key: keyof AccountConfig,
    value: string
  ) => {
    const parsed = Number(value);

    setDraft(previous => ({
      ...previous,
      [key]: Number.isFinite(parsed) ? parsed : 0
    }));
  };

  const handleSave = () => {
    onSave({
      startingBalance: Math.max(0, draft.startingBalance),
      profitTarget: Math.max(0, draft.profitTarget),
      dailyLossLimit: Math.max(0, draft.dailyLossLimit),
      trailingDrawdown: Math.max(0, draft.trailingDrawdown),
      consistencyLimit: Math.min(
        100,
        Math.max(0, draft.consistencyLimit)
      )
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl border border-white/20 bg-[#121212] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#E5C158]" />

            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
                Account Settings
              </h2>

              <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Prop firm risk and target configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Starting Balance
            </span>

            <input
              type="number"
              min="0"
              step="100"
              value={draft.startingBalance}
              onChange={event =>
                updateNumber(
                  'startingBalance',
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Profit Target
            </span>

            <input
              type="number"
              min="0"
              step="100"
              value={draft.profitTarget}
              onChange={event =>
                updateNumber(
                  'profitTarget',
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Daily Loss Limit
            </span>

            <input
              type="number"
              min="0"
              step="100"
              value={draft.dailyLossLimit}
              onChange={event =>
                updateNumber(
                  'dailyLossLimit',
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Trailing Drawdown
            </span>

            <input
              type="number"
              min="0"
              step="100"
              value={draft.trailingDrawdown}
              onChange={event =>
                updateNumber(
                  'trailingDrawdown',
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Consistency Limit (%)
            </span>

            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={draft.consistencyLimit}
              onChange={event =>
                updateNumber(
                  'consistencyLimit',
                  event.target.value
                )
              }
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/20 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#E5C158] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-[#C9A23E]"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}