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
  const [isScrolled, setIsScrolled] = useState(false);
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

  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  const profileLabel = useMemo(() => {
    const fallbackLabel = user?.role === 'ADMIN' ? 'Admin' : 'User';
    const raw = user?.username?.trim() || user?.email?.split('@')[0] || fallbackLabel;
    return raw.length > 16 ? `${raw.slice(0, 16)}...` : raw;
  }, [user?.email, user?.username, user?.role]);

  const profileInitial = profileLabel.charAt(0).toUpperCase();
  const isFeaturedActive = router.pathname === '/product/featured';
  const isWishlistActive = router.pathname === '/wishlist';
  const isCartActive = router.pathname === '/cart';
  const isDashboardActive = router.pathname === '/admin';

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
          padding: 14px 0 10px;
          background:
            linear-gradient(180deg, rgba(247, 249, 252, 0.95) 0%, rgba(247, 249, 252, 0.82) 100%);
          backdrop-filter: saturate(180%) blur(18px);
          -webkit-backdrop-filter: saturate(180%) blur(18px);
          transition: padding .2s ease, background .2s ease;
        }

        .navbar.is-scrolled {
          padding: 10px 0 8px;
        }

        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 24px;
          box-shadow:
            0 18px 50px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.7);
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease, border-radius .2s ease;
        }

        .navbar.is-scrolled .navbar-inner {
          border-color: rgba(245, 158, 11, 0.34);
          box-shadow:
            0 16px 38px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(251, 191, 36, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.78);
        }

        .nav-primary {
          display: flex;
          align-items: center;
          min-height: 72px;
          gap: 18px;
          transition: min-height .2s ease;
        }

        .navbar.is-scrolled .nav-primary {
          min-height: 64px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .logo {
          font-size: 22px;
          font-weight: 700;
          font-style: italic;
          font-family: Georgia, 'Times New Roman', serif;
          letter-spacing: -0.5px;
          text-decoration: none;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1;
        }

        .logo-glow {
          color: #7c2d12;
        }

        .logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.14);
          color: #92400e;
          font-size: 10px;
          font-style: normal;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
          border: 1px solid rgba(245, 158, 11, 0.18);
        }

        .nav-search-desktop {
          flex: 1;
          display: flex;
          align-items: center;
          max-width: 520px;
          margin-left: 12px;
        }

        .nav-search-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 6px;
          background: rgba(248, 250, 252, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .nav-search-shell:focus-within {
          border-color: rgba(245, 158, 11, 0.45);
          box-shadow:
            0 0 0 4px rgba(245, 158, 11, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.85);
          background: #fff;
        }

        .nav-search-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          color: #94a3b8;
          flex: 0 0 auto;
        }

        .nav-search-input {
          flex: 1;
          min-width: 0;
          height: 44px;
          padding: 0 4px 0 0;
          border: none;
          border-radius: 0;
          font-size: 14px;
          color: #0f172a;
          background: transparent;
          outline: none;
          transition: color .18s ease;
        }

        .nav-search-input:focus {
          transform: none;
          box-shadow: none;
          background: transparent;
        }

        .nav-search-button {
          height: 44px;
          padding: 0 18px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fffdf7;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .01em;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 12px 24px rgba(217,119,6,.2);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .nav-search-button:hover {
          opacity: .96;
          transform: translateY(-1px);
          box-shadow: 0 16px 28px rgba(217,119,6,.28);
        }

        .nav-brand-actions {
          display: none;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .nav-search-toggle,
        .nav-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255,255,255,0.86);
          border-radius: 14px;
          cursor: pointer;
          color: #0f172a;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
          padding: 0;
        }

        .nav-search-toggle:hover,
        .nav-toggle:hover {
          background: rgba(255,251,235,0.98);
          border-color: rgba(245,158,11,.24);
          transform: translateY(-1px);
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
          background: #0f172a;
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
          gap: 8px;
          padding: 0 0 16px;
        }

        .nav-links-mobile {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          margin-top: 0;
          padding: 0;
          border: none;
          border-radius: 20px;
          background: transparent;
          box-shadow: none;
          transition: max-height .28s ease, opacity .2s ease, padding .2s ease, margin-top .2s ease;
        }

        .nav-links-mobile.is-open {
          max-height: 420px;
          opacity: 1;
          pointer-events: auto;
        }

        @media (min-width: 861px) {
          .nav-links-mobile {
            max-height: none;
            overflow: visible;
            opacity: 1;
            pointer-events: auto;
            margin-top: 0;
            padding: 0 0 16px;
          }
        }

        .nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 14px;
          transition: background .18s ease, color .18s ease, transform .18s ease;
        }

        .nav-link:hover {
          background: rgba(241,245,249,0.95);
          color: #0f172a;
          transform: translateY(-1px);
        }

        .nav-link.is-active {
          background: rgba(245, 158, 11, 0.14);
          color: #92400e;
        }

        .nav-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: currentColor;
          flex: 0 0 auto;
        }

        .nav-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
        }

        .nav-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          padding: 7px 10px 7px 8px;
          border-radius: 18px;
          background: rgba(248,250,252,0.98);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .nav-profile:hover {
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15,23,42,.08);
        }

        .nav-profile-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 10px 18px rgba(217,119,6,.2);
        }

        .nav-profile-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .nav-profile-label {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .nav-profile-name {
          font-size: 13px;
          color: #0f172a;
          font-weight: 700;
        }

        .button-primary {
          height: 42px;
          padding: 0 18px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fffdf7;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 14px 26px rgba(217,119,6,.2);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .button-primary:hover {
          opacity: .96;
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(217,119,6,.28);
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
          opacity: 0;
          transition: max-height .25s ease, padding .25s ease, opacity .18s ease;
          padding: 0 0;
        }

        .nav-search-mobile.is-open {
          max-height: 76px;
          opacity: 1;
          padding: 0 0 14px;
        }

        @media (max-width: 860px) {
          .navbar-inner {
            padding: 0 14px;
            border-radius: 22px;
          }

          .nav-primary {
            justify-content: space-between;
            min-height: 64px;
            gap: 12px;
          }

          .nav-brand {
            min-width: 0;
            height: 64px;
          }

          .logo {
            font-size: 18px;
            gap: 8px;
          }

          .nav-search-desktop {
            display: none !important;
            width: 0;
            max-width: 0;
            margin-left: 0;
            overflow: hidden;
            pointer-events: none;
          }

          .nav-brand-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex: 0 0 auto;
            gap: 8px;
            margin-left: auto;
            height: 64px;
          }

          .nav-search-toggle,
          .nav-toggle {
            width: 40px;
            height: 40px;
            border-radius: 13px;
          }

          .nav-search-mobile {
            display: flex;
            align-items: center;
            gap: 0;
            width: 100%;
            margin-top: -2px;
          }

          .nav-search-mobile .nav-search-shell {
            width: 100%;
          }

          .nav-search-mobile .nav-search-input {
            flex: 1 1 auto;
            min-width: 0;
          }

          .nav-search-mobile .nav-search-button {
            flex: 0 0 auto;
          }

          .nav-search-mobile.is-open {
            max-height: 84px;
            padding: 0 0 12px;
          }

          .nav-search-input {
            height: 40px;
            font-size: 13px;
          }

          .nav-search-button {
            height: 40px;
            padding: 0 14px;
            font-size: 13px;
            border-radius: 14px;
          }

          .nav-links {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .nav-links-mobile {
            display: flex;
          }

          .nav-links-mobile.is-open {
            display: flex;
            max-height: 420px;
            opacity: 1;
            margin-top: 6px;
            padding: 12px;
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
          }

          .nav-link {
            font-size: 14px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(248,250,252,0.95);
            border: 1px solid rgba(148, 163, 184, 0.14);
            color: #0f172a;
          }

          .nav-links-mobile .nav-link.is-active {
            background: rgba(245, 158, 11, 0.16);
            border-color: rgba(245, 158, 11, 0.22);
            color: #92400e;
          }

          .nav-actions {
            margin-left: 0;
            padding: 0;
            width: 100%;
            display: flex;
            border-left: none;
          }

          .nav-profile {
            width: 100%;
            padding: 12px 14px;
            border-radius: 16px;
            background: rgba(248,250,252,0.98);
            border: 1px solid rgba(148, 163, 184, 0.14);
            box-sizing: border-box;
          }

          .nav-profile-avatar {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .nav-profile-label {
            font-size: 10px;
          }

          .nav-profile-name {
            font-size: 13px;
          }

          .button-primary {
            height: 42px;
            font-size: 14px;
            width: 100%;
            justify-content: center;
            border-radius: 14px;
          }
        }

        @media (max-width: 480px) {
          .navbar {
            padding: 10px 0 8px;
          }

          .navbar-inner {
            padding: 0 12px;
            border-radius: 18px;
          }

          .nav-primary {
            min-height: 58px;
            gap: 10px;
          }

          .nav-brand {
            height: 58px;
          }

          .logo {
            font-size: 16px;
            gap: 6px;
          }

          .logo-badge {
            padding: 4px 7px;
            font-size: 9px;
          }

          .nav-brand-actions {
            height: 58px;
            gap: 6px;
          }

          .nav-search-toggle,
          .nav-toggle {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }
        }
      `}</style>

      <header className={`navbar ${isScrolled ? 'is-scrolled' : ''}`}>
        <nav className="navbar-inner">
          <div className="nav-primary">
            <div className="nav-brand">
              <Link className="logo" href="/">
                <span className="logo-glow">ShopLite</span>
                <span className="logo-badge">Store</span>
              </Link>
            </div>

            <form className="nav-search nav-search-desktop" onSubmit={handleSearchSubmit} role="search">
              <div className="nav-search-shell">
                <span className="nav-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
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
              </div>
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
            <div className="nav-search-shell">
              <span className="nav-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
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
            </div>
          </form>

          <div className={`nav-links nav-links-mobile ${isMenuOpen ? 'is-open' : ''}`} id="primary-navigation">
            <Link className={`nav-link ${isFeaturedActive ? 'is-active' : ''}`} href="/product/featured" onClick={closeMenu}>
              <span className="nav-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 3l2.7 5.47 6.03.88-4.37 4.26 1.03 6.02L12 16.8 6.61 19.63l1.03-6.02L3.27 9.35l6.03-.88L12 3z" fill="currentColor" />
                </svg>
              </span>
              Featured
            </Link>
            <Link className={`nav-link ${isWishlistActive ? 'is-active' : ''}`} href="/wishlist" onClick={closeMenu}>
              <span className="nav-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 20.5l-1.1-1C5.14 14.24 2 11.39 2 7.85 2 5.1 4.16 3 6.9 3c1.56 0 3.06.73 4.1 1.87C12.04 3.73 13.54 3 15.1 3 17.84 3 20 5.1 20 7.85c0 3.54-3.14 6.39-8.9 11.66l-1.1 1z" fill="currentColor" />
                </svg>
              </span>
              Wishlist
            </Link>
            <Link className={`nav-link ${isCartActive ? 'is-active' : ''}`} href="/cart" style={{ position: 'relative' }} onClick={closeMenu}>
              <span className="nav-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M3 5h2l2.2 9.2a1 1 0 0 0 .98.8h8.93a1 1 0 0 0 .97-.76L21 8H7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19" r="1.6" fill="currentColor" />
                  <circle cx="17" cy="19" r="1.6" fill="currentColor" />
                </svg>
              </span>
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
              <Link className={`nav-link ${isDashboardActive ? 'is-active' : ''}`} href="/admin" onClick={closeMenu}>
                <span className="nav-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" fill="currentColor" />
                  </svg>
                </span>
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
                    Start Shopping
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
