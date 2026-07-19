import { FormEvent, useState } from 'react';
import { Building2, Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FirstAccountSetupProps = {
  userId: string;
  onCreated: () => Promise<void> | void;
};

type AccountForm = {
  name: string;
  propFirm: string;
  startingBalance: string;
  profitTarget: string;
  dailyLossLimit: string;
  trailingDrawdown: string;
  consistencyLimit: string;
};

const INITIAL_FORM: AccountForm = {
  name: '',
  propFirm: '',
  startingBalance: '100000',
  profitTarget: '6000',
  dailyLossLimit: '1000',
  trailingDrawdown: '3000',
  consistencyLimit: '40',
};

function toPositiveNumber(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export default function FirstAccountSetup({
  userId,
  onCreated,
}: FirstAccountSetupProps) {
  const [form, setForm] = useState<AccountForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateField = (field: keyof AccountForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const accountName = form.name.trim();

    if (!accountName) {
      setErrorMessage('กรุณากรอกชื่อบัญชีเทรด');
      return;
    }

    const startingBalance = toPositiveNumber(form.startingBalance);
    const profitTarget = toPositiveNumber(form.profitTarget);
    const dailyLossLimit = toPositiveNumber(form.dailyLossLimit);
    const trailingDrawdown = toPositiveNumber(form.trailingDrawdown);
    const consistencyLimit = toPositiveNumber(form.consistencyLimit);

    if (startingBalance <= 0) {
      setErrorMessage('Starting Balance ต้องมากกว่า 0');
      return;
    }

    if (consistencyLimit > 100) {
      setErrorMessage('Consistency Limit ต้องไม่เกิน 100%');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('accounts').insert({
        user_id: userId,
        name: accountName,
        prop_firm: form.propFirm.trim(),
        starting_balance: startingBalance,
        profit_target: profitTarget,
        daily_loss_limit: dailyLossLimit,
        trailing_drawdown: trailingDrawdown,
        consistency_limit: consistencyLimit,
        status: 'active',
      });

      if (error) {
        throw error;
      }

      await onCreated();
    } catch (error: unknown) {
      console.error("CREATE ACCOUNT ERROR");
      console.log(JSON.stringify(error, null, 2));
      console.dir(error);

      if (error && typeof error === 'object') {
        const supabaseError = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };

        const parts = [
          supabaseError.message,
          supabaseError.details,
          supabaseError.hint,
          supabaseError.code ? `Code: ${supabaseError.code}` : '',
        ].filter(Boolean);

        setErrorMessage(
          parts.join(' | ') || 'ไม่สามารถสร้างบัญชีเทรดได้'
        );
      } else {
        setErrorMessage(String(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-[#E5C158]';

  return (
    <section className="border border-white/10 bg-[#121212] p-6 md:p-8">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center border border-[#E5C158]/40 bg-[#E5C158]/10">
          <Building2 className="h-5 w-5 text-[#E5C158]" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E5C158]">
            Initial account setup
          </p>

          <h2 className="mt-1 text-xl font-black uppercase tracking-tight">
            สร้างบัญชีเทรดบัญชีแรก
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            กำหนดข้อมูลตามบัญชี Prop Firm ที่คุณใช้งานจริง
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Account Name
          </span>

          <input
            type="text"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className={inputClass}
            placeholder="เช่น Topstep 100K"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Prop Firm
          </span>

          <input
            type="text"
            value={form.propFirm}
            onChange={(event) => updateField('propFirm', event.target.value)}
            className={inputClass}
            placeholder="เช่น Topstep, Apex"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Starting Balance
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.startingBalance}
            onChange={(event) =>
              updateField('startingBalance', event.target.value)
            }
            className={inputClass}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Profit Target
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.profitTarget}
            onChange={(event) =>
              updateField('profitTarget', event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Daily Loss Limit
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.dailyLossLimit}
            onChange={(event) =>
              updateField('dailyLossLimit', event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase">
            Trailing Drawdown
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.trailingDrawdown}
            onChange={(event) =>
              updateField('trailingDrawdown', event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase">
            Consistency Limit (%)
          </span>

          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.consistencyLimit}
            onChange={(event) =>
              updateField('consistencyLimit', event.target.value)
            }
            className={inputClass}
          />
        </label>

        {errorMessage && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 md:col-span-2">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#E5C158] px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition hover:bg-[#C9A23E] disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              Create Trading Account
            </>
          )}
        </button>
      </form>
    </section>
  );
}