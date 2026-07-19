import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resetMessages = () => {
    setMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('กรุณากรอกอีเมล');
      return;
    }

    if (mode !== 'forgot' && password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
        return;
      }

      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim() || cleanEmail.split('@')[0],
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ');
        } else {
          setMessage('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี');
        }

        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/`,
        }
      );

      if (error) throw error;

      setMessage('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md border border-white/10 bg-[#121212] p-8">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#E5C158]">
            Futures Trading Platform
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-[-0.06em]">
            FUTURES
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '1px #E5C158' }}
            >
              PROP
            </span>
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {mode === 'login' && 'เข้าสู่ระบบเพื่อเปิด Trading Dashboard'}
            {mode === 'register' && 'สร้างบัญชี FuturesProp ใหม่'}
            {mode === 'forgot' && 'ขอลิงก์สำหรับตั้งรหัสผ่านใหม่'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider">
                ชื่อผู้ใช้
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none transition focus:border-[#E5C158]"
                placeholder="Akkaraphoun"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none transition focus:border-[#E5C158]"
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>

          {mode !== 'forgot' && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none transition focus:border-[#E5C158]"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
              />
            </label>
          )}

          {mode === 'register' && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider">
                Confirm Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className="w-full border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none transition focus:border-[#E5C158]"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {errorMessage && (
            <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E5C158] px-4 py-3 text-sm font-black uppercase tracking-wider text-black transition hover:bg-[#C9A23E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'กำลังดำเนินการ...'
              : mode === 'login'
                ? 'Login'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-center text-xs">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => changeMode('forgot')}
                className="block w-full text-slate-400 hover:text-[#E5C158]"
              >
                ลืมรหัสผ่าน
              </button>

              <button
                type="button"
                onClick={() => changeMode('register')}
                className="block w-full font-bold text-[#E5C158]"
              >
                ยังไม่มีบัญชี — สมัครสมาชิก
              </button>
            </>
          )}

          {mode !== 'login' && (
            <button
              type="button"
              onClick={() => changeMode('login')}
              className="font-bold text-[#E5C158]"
            >
              กลับไปหน้า Login
            </button>
          )}
        </div>
      </section>
    </main>
  );
}