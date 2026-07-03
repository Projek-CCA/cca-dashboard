'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); setLoading(false); return; }
      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [password, confirm]);

  if (success) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-mark">CCA</div>
            <h1>Password updated</h1>
            <p className="login-subtitle">Your password has been reset successfully.</p>
          </div>
          <button className="btn primary login-submit" onClick={() => router.push('/login')}>
            Log in with new password
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-mark">CCA</div>
            <h1>Reset password</h1>
            <p className="login-subtitle">Checking your reset link…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-mark">CCA</div>
          <h1>Set new password</h1>
          <p className="login-subtitle">Enter your new password.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="password">New password</label>
            <input id="password" type="password" placeholder="At least 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />
          </div>
          <div className="login-field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" placeholder="Type the password again" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <p className="login-footer"><Link href="/login">Back to log in</Link></p>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
