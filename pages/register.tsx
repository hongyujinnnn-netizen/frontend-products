import type { FormEvent } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { signUp } from '../services/auth';
import { z } from 'zod';

// Validation schema for register form
const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage: NextPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    try {
      registerSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<RegisterFormData> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof RegisterFormData] = issue.message as any;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleChange = (field: keyof RegisterFormData, value: string) => {
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
      await signUp({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      router.push('/');
    } catch (err) {
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          setError('This username or email is already registered. Please try another.');
        } else if (err.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Account creation failed. Please try again later.');
        }
      } else {
        setError('We could not create your account. Try again shortly.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>ShopLite · Create Account</title>
        <meta name="description" content="Create a new ShopLite account to start selling online." />
      </Head>
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
          <form className="form login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
              <h2>Create your credentials</h2>
              <p className="form-hint">We will send onboarding instructions to your email.</p>
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
              <label className="form-label" htmlFor="register-username">
                Username
                {errors.username && <span className="form-error-inline">{errors.username}</span>}
              </label>
              <input
                id="register-username"
                className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                autoComplete="username"
                placeholder="Choose a unique username"
                disabled={isSubmitting}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
            </div>

            {/* Email field */}
            <div className="form-field">
              <label className="form-label" htmlFor="register-email">
                Email
                {errors.email && <span className="form-error-inline">{errors.email}</span>}
              </label>
              <input
                id="register-email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                autoComplete="email"
                placeholder="your@email.com"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>

            {/* Password field */}
            <div className="form-field">
              <label className="form-label" htmlFor="register-password">
                Password
                {errors.password && <span className="form-error-inline">{errors.password}</span>}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="register-password"
                  className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 8 chars with uppercase & number"
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
              <p className="form-hint" style={{ marginTop: '0.3rem' }}>
                ✓ At least 8 characters, 1 uppercase letter, 1 number
              </p>
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
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Sign in link */}
            <p className="form-footer-hint">
              Already registered?{' '}
              <Link href="/login" className="form-link">
                Sign in instead
              </Link>
            </p>
          </form>
        </section>
      </main>
    </>
  );
};

export default RegisterPage;
