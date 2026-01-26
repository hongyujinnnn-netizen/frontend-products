import type { FormEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '../services/auth';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn({ username, password });
      window.location.href = '/dashboard';
    } catch (_err) {
      setError('Unable to log in with those credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="layout">
      <section className="split">
        <article className="panel">
          <span className="badge">Returning customer</span>
          <h1 className="page-title">Welcome back to ShopLite</h1>
          <p className="page-subtitle">
            Sign in to manage orders, track fulfillment, and keep your catalog in sync.
          </p>
          <ul className="list">
            <li className="list-item">
              <strong>Real-time inventory</strong>
              <span className="form-hint">Stay in control of stock levels</span>
            </li>
            <li className="list-item">
              <strong>Insightful dashboards</strong>
              <span className="form-hint">Understand sales with curated charts</span>
            </li>
            <li className="list-item">
              <strong>Secure admin tools</strong>
              <span className="form-hint">Minimal friction for your team</span>
            </li>
          </ul>
        </article>
        <form className="form" onSubmit={handleSubmit}>
          <div>
            <h2>Sign in</h2>
            <p className="form-hint">Use the credentials provided by your administrator.</p>
          </div>
          <label className="form-label" htmlFor="username">
            Username
            <input
              id="username"
              className="form-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="form-label" htmlFor="password">
            Password
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="form-hint">
            Need an account? <Link href="/register">Register here</Link>.
          </p>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
