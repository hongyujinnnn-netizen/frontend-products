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

  // Mark as client-side rendered to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Force light theme for Apple-style UI
  useEffect(() => {
    if (!isClient) return;
    document.documentElement.setAttribute('data-theme', 'light');
    window.localStorage.setItem('theme', 'light');
  }, [isClient]);

  // Track auth state changes and reload page on login (only on home page)
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

    if (!router.query.search && !router.query.q) {
      setSearchValue('');
    }
  }, [router.pathname, router.query.q, router.query.search]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (router.pathname !== '/search') {
      return;
    }
    const term = searchValue.trim();
    const handle = window.setTimeout(() => {
      if (!term) {
        return;
      }
      void router.replace(
        {
          pathname: '/search',
          query: { q: term },
        },
        undefined,
        { scroll: false, shallow: true }
      );
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
        if (router.pathname === '/search') {
          void router.push('/', undefined, { scroll: true });
        }
        return;
      }

      void router.push(
        {
          pathname: '/search',
          query: { q: term },
        },
        undefined,
        { scroll: true }
      );
    },
    [router, searchValue]
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
    setIsSearchOpen(false);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    setIsMenuOpen(false);
  }, []);

  return (
    <header className="navbar">
      <nav className="navbar-inner">
        <div className="nav-primary">
          <div className="nav-brand">
            <Link className="logo" href="/">
              <span>Shop</span>
              <span className="logo-glow">Lite</span>
            </Link>
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
                <span className="nav-toggle-line" />
                <span className="nav-toggle-line" />
                <span className="nav-toggle-line" />
                <span className="sr-only">Toggle navigation</span>
              </button>
            </div>
          </div>
          <form className="nav-search nav-search-desktop" onSubmit={handleSearchSubmit} role="search">
            <input
              aria-label="Search products"
              className="nav-search-input"
              placeholder="Search the catalog"
              autoComplete="off"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <button className="nav-search-button" type="submit">
              Search
            </button>
          </form>
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
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <button className="nav-search-button" type="submit">
              Search
            </button>
          </form>
        </div>
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
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
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
            {isClient && (
              isAuthenticated ? (
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
              )
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
