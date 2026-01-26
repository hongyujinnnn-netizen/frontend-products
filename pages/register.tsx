import type { FormEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '../services/auth';

const RegisterPage: NextPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signUp({ username, email, password });
      router.replace('/dashboard');
    } catch (_err) {
      setError('We could not create your account. Try again shortly.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="layout">
      <section className="split">
        <article className="panel">
          <span className="badge">New to ShopLite?</span>
          <h1 className="page-title">Set up your merchant account</h1>
          <p className="page-subtitle">
            Unlock fast product onboarding, streamlined checkout, and actionable analytics backed
            by a production-ready API.
          </p>
          <div className="metric-grid">
            <div className="card stat">
              <span className="stat-label">Setup time</span>
              <span className="stat-value">10 min</span>
              <p className="form-hint">Connect products and launch today.</p>
            </div>
            <div className="card stat">
              <span className="stat-label">Payment ready</span>
              <span className="stat-value">Yes</span>
              <p className="form-hint">Token-based auth with granular roles.</p>
            </div>
          </div>
        </article>
        <form className="form" onSubmit={handleSubmit}>
          <div>
            <h2>Create your credentials</h2>
            <p className="form-hint">We will send onboarding instructions to your email.</p>
          </div>
          <label className="form-label" htmlFor="register-username">
            Username
            <input
              id="register-username"
              className="form-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="form-label" htmlFor="register-email">
            Email
            <input
              id="register-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="form-label" htmlFor="register-password">
            Password
            <input
              id="register-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="form-hint">
            Already registered? <Link href="/login">Sign in</Link> instead.
          </p>
        </form>
      </section>
    </main>
  );
};

export default RegisterPage;
