'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [redirect, setRedirect] = useState('/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read redirect param from URL on client mount — avoids useSearchParams SSR bailout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('redirect');
    if (r) setRedirect(r);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data: { error?: string; redirect?: string };
      try {
        data = await response.json();
      } catch {
        // Server returned non-JSON (HTML error page, redirect, etc.)
        setError('Server error. Please try again. If this persists, contact support.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      setLoading(false);

      if (data.redirect) {
        router.push(data.redirect);
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch {
      // Network-level failure (DNS, connection refused, etc.)
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }, [email, password, redirect, router]);

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-mark">CCA</div>
          <h1>Content Coach Academy</h1>
          <p className="login-subtitle">Internal workspace</p>
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
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="login-footer">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
