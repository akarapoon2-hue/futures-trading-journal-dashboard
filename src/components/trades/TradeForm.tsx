import { FormEvent, useState, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ✅ Import Constants
import {
  SESSION_OPTIONS,
  SETUP_OPTIONS,
  EMOTION_OPTIONS,
  MISTAKE_OPTIONS,
  DIRECTION_OPTIONS,
  RESULT_OPTIONS,
  SYMBOL_OPTIONS,
  SYMBOL_CONFIG,
  type Direction,
  type Result,
} from '../../constants/trading';

// ✅ Import Utils
import { calculateAll } from '../../utils/tradeCalculator';
import { validateTrade } from '../../utils/tradeValidation';

type TradeFormProps = {
  accountId: string;
  userId: string;
  onSaved?: () => Promise<void> | void;
};

type TradeFormState = {
  tradeDate: string;
  tradeTime: string;
  symbol: string;
  direction: Direction;
  contracts: string;
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  result: Result;
  fees: string;
  setup: string;
  sessionName: string;
  emotion: string;
  mistake: string;
  notes: string;
};

function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

const INITIAL_FORM: TradeFormState = {
  tradeDate: todayLocal(),
  tradeTime: currentTime(),
  symbol: 'MNQ',
  direction: 'LONG',
  contracts: '1',
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  result: 'Win',
  fees: '0',
  setup: '',
  sessionName: '',
  emotion: '',
  mistake: '',
  notes: '',
};

export default function TradeForm({
  accountId,
  userId,
  onSaved,
}: TradeFormProps) {
  const [form, setForm] = useState<TradeFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ✅ คำนวณค่าต่างๆ ด้วย tradeCalculator
  const calculation = useMemo(() => {
    const entry = toNumber(form.entryPrice);
    const exit = toNumber(form.exitPrice);
    const stopLoss = toNumber(form.stopLoss);
    const contracts = toNumber(form.contracts);
    const fees = toNumber(form.fees);

    return calculateAll({
      symbol: form.symbol,
      direction: form.direction,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: stopLoss,
      contracts: contracts,
      fees: fees,
    });
  }, [form.entryPrice, form.exitPrice, form.stopLoss, form.contracts, form.fees, form.symbol, form.direction]);

  const {
    grossPnL,
    netPnL,
    risk,
    rMultiple,
    isSymbolSupported: symbolSupported,
  } = calculation;

  // Risk Preview
  const preview = useMemo(() => {
    const entry = toNumber(form.entryPrice);
    const stopLoss = toNumber(form.stopLoss);
    const contracts = toNumber(form.contracts);
    const symbolKey = form.symbol.trim().toUpperCase();
    const config = SYMBOL_CONFIG[symbolKey];

    if (entry <= 0 || stopLoss <= 0 || contracts <= 0 || !config) {
      return null;
    }

    const diff = form.direction === 'LONG'
      ? entry - stopLoss
      : stopLoss - entry;

    if (diff <= 0) return null;

    const points = diff;
    const tickSize = config.tickSize;

    if (!tickSize) return null;

    const ticks = points / tickSize;
    const riskAmount = points * contracts * config.pointValue;

    return { points, ticks, riskAmount };
  }, [form.entryPrice, form.stopLoss, form.contracts, form.symbol, form.direction]);

  const updateField = <K extends keyof TradeFormState>(
    field: K,
    value: TradeFormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (import.meta.env.DEV) {
      console.log('🔍 TradeForm Debug:');
      console.log('accountId:', accountId);
      console.log('userId:', userId);
    }

    const validation = validateTrade({
      accountId,
      userId,
      tradeDate: form.tradeDate,
      symbol: form.symbol,
      direction: form.direction,
      entryPrice: toNumber(form.entryPrice),
      exitPrice: toNumber(form.exitPrice),
      stopLoss: toNumber(form.stopLoss),
      contracts: toNumber(form.contracts),
      result: form.result,
      grossPnL,
      netPnL,
      risk,
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error || 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    if (!symbolSupported) {
      setErrorMessage(`Symbol "${form.symbol.trim().toUpperCase()}" ไม่รองรับ`);
      return;
    }

    setSaving(true);

    try {
      const entry = toNumber(form.entryPrice);
      const exit = toNumber(form.exitPrice);
      const stopLoss = toNumber(form.stopLoss);
      const contracts = toNumber(form.contracts);
      const fees = toNumber(form.fees);

      const tradeTime = form.tradeTime
        ? `${form.tradeTime}:00`
        : '00:00:00';

      // ✅ ข้อ 2: ใช้ enum จาก constants โดยตรง
      const payload = {
        user_id: userId,
        account_id: accountId,
        trade_date: form.tradeDate,
        trade_time: tradeTime,
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction, // ✅ มาจาก enum Direction

        entry_price: entry,
        exit_price: exit,
        stop_loss: stopLoss,
        contracts: contracts,

        result: form.result, // ✅ มาจาก enum Result
        gross_pnl: grossPnL,
        fees: fees,
        net_pnl: netPnL,
        planned_risk: risk,
        r_multiple: rMultiple,

        setup: form.setup.trim(),
        session_name: form.sessionName.trim(),
        emotion: form.emotion.trim(),
        mistake: form.mistake.trim(),
        notes: form.notes.trim(),
      };

      if (import.meta.env.DEV) {
        console.log('📦 SAVE TRADE PAYLOAD:', payload);
      }

      const { data, error } = await supabase
        .from('trades')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('✅ TRADE SAVED:', data);
      }

      setSuccessMessage('บันทึกรายการเทรดสำเร็จ');

      setForm((prev) => ({
        ...INITIAL_FORM,
        tradeDate: todayLocal(),
        tradeTime: currentTime(),
        symbol: prev.symbol,
        direction: prev.direction,
        contracts: prev.contracts,
        setup: prev.setup,
        sessionName: prev.sessionName,
        emotion: prev.emotion,
      }));

      await onSaved?.();
    } catch (error: unknown) {
      console.error('❌ SAVE TRADE ERROR:', error);

      if (error && typeof error === 'object') {
        const supabaseError = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };

        setErrorMessage(
          [
            supabaseError.message,
            supabaseError.details,
            supabaseError.hint,
            supabaseError.code
              ? `Code: ${supabaseError.code}`
              : '',
          ]
            .filter(Boolean)
            .join(' | ') || 'ไม่สามารถบันทึก Trade ได้'
        );
      } else {
        setErrorMessage(String(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-[#E5C158] disabled:cursor-not-allowed disabled:opacity-50';

  const inputReadonlyClass =
    'w-full border border-white/10 bg-[#121212] px-3 py-2.5 text-sm text-white outline-none cursor-not-allowed opacity-70';

  return (
    <section className="border border-white/10 bg-[#121212] p-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E5C158]">
          Trading Journal
        </p>

        <h2 className="mt-1 text-xl font-black uppercase">
          Add New Trade
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Date */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Date</span>
          <input
            type="date"
            className={inputClass}
            value={form.tradeDate}
            onChange={(event) =>
              updateField('tradeDate', event.target.value)
            }
            disabled={saving}
            required
          />
        </label>

        {/* Time */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Time</span>
          <input
            type="time"
            className={inputClass}
            value={form.tradeTime}
            onChange={(event) =>
              updateField('tradeTime', event.target.value)
            }
            disabled={saving}
          />
        </label>

        {/* Symbol */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Symbol</span>
          <select
            className={inputClass}
            value={form.symbol}
            onChange={(event) =>
              updateField('symbol', event.target.value)
            }
            disabled={saving}
          >
            {SYMBOL_OPTIONS.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>

        {/* Direction */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Direction</span>
          <select
            className={inputClass}
            value={form.direction}
            onChange={(event) =>
              updateField('direction', event.target.value as Direction)
            }
            disabled={saving}
          >
            {DIRECTION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* ✅ ข้อ 3: min="1" Contracts */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Contracts</span>
          <input
            type="number"
            min="1"
            step="1"
            className={inputClass}
            value={form.contracts}
            onChange={(event) =>
              updateField('contracts', event.target.value)
            }
            disabled={saving}
          />
        </label>

        {/* ✅ ข้อ 3: min="0" Entry */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Entry</span>
          <input
            type="number"
            min="0"
            step="0.25"
            className={inputClass}
            value={form.entryPrice}
            onChange={(event) =>
              updateField('entryPrice', event.target.value)
            }
            disabled={saving}
            placeholder="0.00"
          />
        </label>

        {/* ✅ ข้อ 3: min="0" Exit */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Exit</span>
          <input
            type="number"
            min="0"
            step="0.25"
            className={inputClass}
            value={form.exitPrice}
            onChange={(event) =>
              updateField('exitPrice', event.target.value)
            }
            disabled={saving}
            placeholder="0.00"
          />
        </label>

        {/* ✅ ข้อ 3: min="0" Stop Loss */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Stop Loss</span>
          <input
            type="number"
            min="0"
            step="0.25"
            className={inputClass}
            value={form.stopLoss}
            onChange={(event) =>
              updateField('stopLoss', event.target.value)
            }
            disabled={saving}
            placeholder="0.00"
          />
        </label>

        {/* Result */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Result</span>
          <select
            className={inputClass}
            value={form.result}
            onChange={(event) =>
              updateField('result', event.target.value as Result)
            }
            disabled={saving}
          >
            {RESULT_OPTIONS.map((result) => (
              <option key={result} value={result}>
                {result}
              </option>
            ))}
          </select>
        </label>

        {/* Gross P&L - Readonly */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Gross P&amp;L</span>
          <input
            type="text"
            className={inputReadonlyClass}
            value={formatNumber(grossPnL)}
            readOnly
          />
        </label>

        {/* ✅ ข้อ 3: min="0" Fees */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Fees</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.fees}
            onChange={(event) =>
              updateField('fees', event.target.value)
            }
            disabled={saving}
          />
        </label>

        {/* Net P&L - Readonly */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Net P&amp;L</span>
          <input
            type="text"
            className={inputReadonlyClass}
            value={formatNumber(netPnL)}
            readOnly
          />
        </label>

        {/* Planned Risk - Readonly */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Planned Risk</span>
          <input
            type="text"
            className={inputReadonlyClass}
            value={formatNumber(risk)}
            readOnly
          />
        </label>

        {/* R-Multiple - Readonly */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">R-Multiple</span>
          <input
            type="text"
            className={inputReadonlyClass}
            value={formatNumber(rMultiple)}
            readOnly
          />
        </label>

        {/* Risk Preview */}
        {preview && (
          <div className="md:col-span-2 lg:col-span-4 border border-[#E5C158]/20 bg-[#E5C158]/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5C158]">
              Risk Preview
            </p>
            <div className="mt-1 flex gap-6 text-xs font-mono text-slate-300">
              <span>Points: <span className="text-white">{preview.points.toFixed(2)}</span></span>
              <span>Ticks: <span className="text-white">{preview.ticks.toFixed(1)}</span></span>
              <span>Risk: <span className="text-[#E5C158]">${preview.riskAmount.toFixed(2)}</span></span>
            </div>
          </div>
        )}

        {/* Setup */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Setup</span>
          <select
            className={inputClass}
            value={form.setup}
            onChange={(event) =>
              updateField('setup', event.target.value)
            }
            disabled={saving}
          >
            <option value="">Select Setup...</option>
            {SETUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* Session */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Session</span>
          <select
            className={inputClass}
            value={form.sessionName}
            onChange={(event) =>
              updateField('sessionName', event.target.value)
            }
            disabled={saving}
          >
            <option value="">Select Session...</option>
            {SESSION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* Emotion */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Emotion</span>
          <select
            className={inputClass}
            value={form.emotion}
            onChange={(event) =>
              updateField('emotion', event.target.value)
            }
            disabled={saving}
          >
            <option value="">Select Emotion...</option>
            {EMOTION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* Mistake */}
        <label>
          <span className="mb-2 block text-xs font-bold uppercase">Mistake</span>
          <select
            className={inputClass}
            value={form.mistake}
            onChange={(event) =>
              updateField('mistake', event.target.value)
            }
            disabled={saving}
          >
            <option value="">Select Mistake...</option>
            {MISTAKE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* Notes */}
        <label className="md:col-span-2 lg:col-span-4">
          <span className="mb-2 block text-xs font-bold uppercase">Notes</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={form.notes}
            onChange={(event) =>
              updateField('notes', event.target.value)
            }
            disabled={saving}
            placeholder="Additional notes..."
          />
        </label>

        {errorMessage && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 md:col-span-2 lg:col-span-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 md:col-span-2 lg:col-span-4">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#E5C158] px-5 py-3 text-sm font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 lg:col-span-4"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Trade...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Trade
            </>
          )}
        </button>
      </form>
    </section>
  );
}