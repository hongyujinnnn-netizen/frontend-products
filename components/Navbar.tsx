import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useCartCount } from '../hooks/useCartCount';

const Navbar = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const cartCount = useCartCount();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    document.documentElement.setAttribute('data-theme', 'light');
    window.localStorage.setItem('theme', 'light');
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    if (prevAuthState === null) {
      setPrevAuthState(isAuthenticated);
      return;
    }
    if (isAuthenticated && !prevAuthState && user && router.pathname === '/') {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => clearTimeout(timer);
    }
    setPrevAuthState(isAuthenticated);
  }, [isAuthenticated, isClient, prevAuthState, user, router.pathname]);

  useEffect(() => {
    if (router.pathname === '/search' && typeof router.query.q === 'string') {
      setSearchValue(router.query.q);
      return;
    }
    if (router.pathname === '/' && typeof router.query.search === 'string') {
      setSearchValue(router.query.search);
      return;
    }
    if (!router.query.search && !router.query.q) setSearchValue('');
  }, [router.pathname, router.query.q, router.query.search]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (router.pathname !== '/search') return;
    const term = searchValue.trim();
    const handle = window.setTimeout(() => {
      if (!term) return;
      void router.replace({ pathname: '/search', query: { q: term } }, undefined, { scroll: false, shallow: true });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [router, router.pathname, searchValue]);

  const profileLabel = useMemo(() => {
    const fallbackLabel = user?.role === 'ADMIN' ? 'Admin' : 'User';
    const raw = user?.username?.trim() || user?.email?.split('@')[0] || fallbackLabel;
    return raw.length > 16 ? `${raw.slice(0, 16)}...` : raw;
  }, [user?.email, user?.username, user?.role]);

  const profileInitial = profileLabel.charAt(0).toUpperCase();

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const term = searchValue.trim();
      setIsSearchOpen(false);
      setIsMenuOpen(false);
      if (!term) {
        if (router.pathname === '/search') void router.push('/', undefined, { scroll: true });
        return;
      }
      void router.push({ pathname: '/search', query: { q: term } }, undefined, { scroll: true });
    },
    [router, searchValue]
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((p) => !p);
    setIsSearchOpen(false);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((p) => !p);
    setIsMenuOpen(false);
  }, []);

  return (
    <>
      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }

        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .nav-primary {
          display: flex;
          align-items: center;
          height: 52px;
          gap: 12px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .logo {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.4px;
          text-decoration: none;
          color: #1d1d1f;
          display: flex;
          align-items: center;
          gap: 1px;
        }

        .logo-glow {
          color: var(--color-primary, #2563eb);
        }

        .nav-search-desktop {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          max-width: 480px;
          margin-left: auto;
        }

        .nav-search-input {
          flex: 1;
          height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(0,0,0,0.18);
          border-radius: 20px;
          font-size: 13px;
          background: #f5f5f7;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }

        .nav-search-input:focus {
          border-color: var(--color-primary, #2563eb);
          box-shadow: 0 0 0 3px rgba(37,99,235,.12);
          background: #fff;
        }

        .nav-search-button {
          height: 34px;
          padding: 0 14px;
          border: none;
          border-radius: 20px;
          background: var(--color-primary, #2563eb);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity .15s;
        }

        .nav-search-button:hover {
          opacity: .85;
        }

        .nav-brand-actions {
          display: none;
          align-items: center;
          gap: 4px;
          margin-left: auto;
        }

        .nav-search-toggle,
        .nav-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #1d1d1f;
          transition: background .15s;
          padding: 0;
        }

        .nav-search-toggle:hover,
        .nav-toggle:hover {
          background: rgba(0,0,0,0.06);
        }

        .nav-search-toggle svg {
          width: 18px;
          height: 18px;
        }

        .nav-toggle-lines {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 18px;
        }

        .nav-toggle-line {
          display: block;
          height: 2px;
          width: 18px;
          background: #1d1d1f;
          border-radius: 2px;
          transition: transform .22s ease, opacity .22s ease;
          transform-origin: center;
        }

        .nav-toggle.is-open .nav-toggle-line:nth-child(1) {
          transform: translateY(6px) rotate(45deg);
        }

        .nav-toggle.is-open .nav-toggle-line:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }

        .nav-toggle.is-open .nav-toggle-line:nth-child(3) {
          transform: translateY(-6px) rotate(-45deg);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 0 8px;
        }

        .nav-link {
          position: relative;
          font-size: 13px;
          font-weight: 500;
          color: #1d1d1f;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background .15s, color .15s;
        }

        .nav-link:hover {
          background: rgba(0,0,0,0.05);
        }

        .nav-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
        }

        .nav-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 20px;
          transition: background .15s;
        }

        .nav-profile:hover {
          background: rgba(0,0,0,0.05);
        }

        .nav-profile-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--color-primary, #2563eb);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-profile-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .nav-profile-label {
          font-size: 10px;
          color: #6e6e73;
          font-weight: 500;
        }

        .nav-profile-name {
          font-size: 12px;
          color: #1d1d1f;
          font-weight: 600;
        }

        .button-primary {
          height: 32px;
          padding: 0 16px;
          border-radius: 20px;
          background: var(--color-primary, #2563eb);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity .15s;
        }

        .button-primary:hover {
          opacity: .85;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border-width: 0;
        }

        .nav-search-mobile {
          display: none;
          overflow: hidden;
          max-height: 0;
          transition: max-height .25s ease, padding .25s ease;
          padding: 0 0;
        }

        .nav-search-mobile.is-open {
          max-height: 60px;
          padding: 8px 0 10px;
        }

        @media (max-width: 768px) {
          .nav-primary {
            height: 48px;
          }

          .nav-search-desktop {
            display: none;
          }

          .nav-brand-actions {
            display: flex;
          }

          .nav-search-mobile {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .nav-search-mobile .nav-search-input {
            flex: 1;
          }

          .nav-links {
            display: none;
            flex-direction: column;
            align-items: stretch;
            gap: 2px;
            padding: 8px 0 12px;
            border-top: 1px solid rgba(0,0,0,0.07);
          }

          .nav-links.is-open {
            display: flex;
          }

          .nav-link {
            font-size: 15px;
            padding: 10px 12px;
            border-radius: 10px;
          }

          .nav-actions {
            margin-left: 0;
            padding: 4px 0 0;
          }

          .nav-profile {
            padding: 8px 12px;
            border-radius: 10px;
          }

          .nav-profile-avatar {
            width: 34px;
            height: 34px;
            font-size: 15px;
          }

          .nav-profile-label {
            font-size: 11px;
          }

          .nav-profile-name {
            font-size: 14px;
          }

          .button-primary {
            height: 40px;
            font-size: 15px;
            width: 100%;
            justify-content: center;
            border-radius: 10px;
          }
        }
      `}</style>

      <header className="navbar">
        <nav className="navbar-inner">
          <div className="nav-primary">
            <div className="nav-brand">
              <Link className="logo" href="/">
                <span>Shop</span>
                <span className="logo-glow">Lite</span>
              </Link>
            </div>

            <form className="nav-search nav-search-desktop" onSubmit={handleSearchSubmit} role="search">
              <input
                aria-label="Search products"
                className="nav-search-input"
                placeholder="Search the catalog"
                autoComplete="off"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <button className="nav-search-button" type="submit">
                Search
              </button>
            </form>

            <div className="nav-brand-actions">
              <button
                className={`nav-search-toggle ${isSearchOpen ? 'is-open' : ''}`}
                type="button"
                onClick={toggleSearch}
                aria-expanded={isSearchOpen}
                aria-controls="mobile-search"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Toggle search</span>
              </button>

              <button
                className={`nav-toggle ${isMenuOpen ? 'is-open' : ''}`}
                type="button"
                onClick={toggleMenu}
                aria-expanded={isMenuOpen}
                aria-controls="primary-navigation"
              >
                <span className="nav-toggle-lines" aria-hidden="true">
                  <span className="nav-toggle-line" />
                  <span className="nav-toggle-line" />
                  <span className="nav-toggle-line" />
                </span>
                <span className="sr-only">Toggle navigation</span>
              </button>
            </div>
          </div>

          <form
            className={`nav-search nav-search-mobile ${isSearchOpen ? 'is-open' : ''}`}
            id="mobile-search"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <input
              aria-label="Search products"
              className="nav-search-input"
              placeholder="Search the catalog"
              autoComplete="off"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button className="nav-search-button" type="submit">
              Search
            </button>
          </form>

          <div className={`nav-links ${isMenuOpen ? 'is-open' : ''}`} id="primary-navigation">
            <Link className="nav-link" href="/product/featured" onClick={closeMenu}>
              Featured
            </Link>
            <Link className="nav-link" href="/wishlist" onClick={closeMenu}>
              Wishlist
            </Link>
            <Link className="nav-link" href="/cart" style={{ position: 'relative' }} onClick={closeMenu}>
              Cart
              {isClient && cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
            {user?.role === 'ADMIN' && (
              <Link className="nav-link" href="/admin" onClick={closeMenu}>
                Dashboard
              </Link>
            )}
            <div className="nav-actions">
              {isClient &&
                (isAuthenticated ? (
                  <Link className="nav-profile" href="/dashboard" title="Open your dashboard" onClick={closeMenu}>
                    <span className="nav-profile-avatar" aria-hidden="true">
                      {profileInitial}
                    </span>
                    <span className="nav-profile-text">
                      <span className="nav-profile-label">Profile</span>
                      <span className="nav-profile-name">{profileLabel}</span>
                    </span>
                  </Link>
                ) : (
                  <Link className="button button-primary" href="/login">
                    Sign In
                  </Link>
                ))}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
