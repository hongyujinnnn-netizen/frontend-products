import type { FormEvent } from 'react';
import type { NextPage } from 'next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

// Validation schema for login form
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<LoginFormData> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof LoginFormData] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(formData.username, formData.password);
      void router.push('/', undefined, { scroll: true });
    } catch (err) {
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('Invalid username or password. Please try again.');
        } else if (err.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Login failed. Please try again later.');
        }
      } else {
        setError('Unable to log in. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>ShopLite - Sign In</title>
        <meta name="description" content="Sign in to your ShopLite account to manage orders and inventory." />
      </Head>
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
          <form className="form login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
              <h2>Sign in</h2>
              <p className="form-hint">Enter your credentials to access your account.</p>
            </div>

            {/* Error message alert */}
            {error && (
              <div className="form-error-box" role="alert">
                <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Username field */}
            <div className="form-field">
              <label className="form-label" htmlFor="username">
                Username
                {errors.username && <span className="form-error-inline">{errors.username}</span>}
              </label>
              <input
                id="username"
                className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                disabled={isSubmitting}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
            </div>

            {/* Password field */}
            <div className="form-field">
              <label className="form-label" htmlFor="password">
                Password
                {errors.password && <span className="form-error-inline">{errors.password}</span>}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              className="button button-primary button-large"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Sign up link */}
            <p className="form-footer-hint">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="form-link">
                Create one now
              </Link>
            </p>
          </form>
        </section>
      </main>
    </>
  );
};

export default LoginPage;
