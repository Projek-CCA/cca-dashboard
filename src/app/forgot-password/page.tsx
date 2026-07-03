'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [email]);

  if (sent) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-mark">CCA</div>
            <h1>Check your email</h1>
            <p className="login-subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            </p>
          </div>
          <p className="login-footer">
            <Link href="/login">Back to log in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-mark">CCA</div>
          <h1>Reset password</h1>
          <p className="login-subtitle">Enter your email and we'll send you a reset link.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@cca.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="login-footer">
            <Link href="/login">Back to log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
