import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getWishlistItems } from '../utils/wishlist';

const POPULAR_SEARCHES = ['headphones', 'watch', 'coffee mug'];

const Wordmark = () => (
  <span className="mobile-wordmark">
    Shop<span className="mobile-wordmark-accent">Lite</span>
  </span>
);

const Navbar = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { itemCount: cartCount } = useCart();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const update = () => setWishlistCount(getWishlistItems().length);
    update();
    window.addEventListener('wishlistUpdated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('wishlistUpdated', update);
      window.removeEventListener('storage', update);
    };
  }, [isClient]);

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
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  // Body scroll lock when drawer open
  useEffect(() => {
    if (!isClient) return;
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMenuOpen, isClient]);

  // Escape key closes drawer and search
  useEffect(() => {
    if (!isClient) return;
    if (!isMenuOpen && !isSearchOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen, isSearchOpen, isClient]);

  const profileLabel = useMemo(() => {
    const fallbackLabel = user?.role === 'ADMIN' ? 'Admin' : 'User';
    const raw = user?.username?.trim() || user?.email?.split('@')[0] || fallbackLabel;
    return raw.length > 16 ? `${raw.slice(0, 16)}...` : raw;
  }, [user?.email, user?.username, user?.role]);

  const profileInitial = profileLabel.charAt(0).toUpperCase();
  const isFeaturedActive = router.pathname === '/product/featured';
  const isWishlistActive = router.pathname === '/wishlist';
  const isCartActive = router.pathname === '/cart';
  const isHomeActive = router.pathname === '/';
  const isOrdersActive = router.pathname === '/dashboard';
  const isAdminActive = router.pathname === '/admin';

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

  const submitPopular = useCallback(
    (term: string) => {
      setSearchValue(term);
      setIsSearchOpen(false);
      void router.push({ pathname: '/search', query: { q: term } }, undefined, { scroll: true });
    },
    [router]
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((p) => !p);
    setIsSearchOpen(false);
  }, []);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((p) => !p);
    setIsMenuOpen(false);
  }, []);

  const onOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setIsMenuOpen(false);
  };

  const onCloseKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsMenuOpen(false);
      setIsSearchOpen(false);
    }
  };

  const cartBadgeText = cartCount > 9 ? '9+' : String(cartCount);

  const navItem = (href: string, icon: ReactNode, label: string, active: boolean, badge?: { count: number; tone: 'red' | 'gray' }) => (
    <Link href={href} className={`mobile-drawer-link ${active ? 'is-active' : ''}`} onClick={closeMenu}>
      <span className="mobile-drawer-link-icon" aria-hidden="true">{icon}</span>
      <span className="mobile-drawer-link-label">{label}</span>
      {badge && badge.count > 0 && (
        <span className={`mobile-drawer-badge mobile-drawer-badge-${badge.tone}`}>
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      )}
    </Link>
  );

  return (
    <>
      <style>{`
        :root {
          --sl-color-primary: #111827;
          --sl-color-primary-soft: #374151;
          --sl-color-text-muted: #6B7280;
          --sl-color-text-subtle: #9CA3AF;
          --sl-color-surface-alt: #F3F4F6;
          --sl-color-surface-soft: #F9FAFB;
          --sl-color-border-soft: #F3F4F6;
          --sl-color-accent: #6366F1;
          --sl-color-danger: #EF4444;
        }

        .sl-desktop {
          display: block;
        }

        .sl-mobile {
          display: none;
        }

        .sl-desktop .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 0;
          background: transparent;
          backdrop-filter: saturate(180%) blur(18px);
          -webkit-backdrop-filter: saturate(180%) blur(18px);
          transition: padding .2s ease, background .2s ease;
        }

        .sl-desktop .navbar.is-scrolled { padding: 0; }

        .sl-desktop .navbar-inner {
          width: min(100% - 48px, 1320px);
          max-width: 1320px;
          min-height: 76px;
          margin: 16px auto;
          padding: 0 16px 0 20px;
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.84);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 24px;
          box-shadow:
            0 18px 48px rgba(15, 23, 42, 0.09),
            inset 0 1px 0 rgba(255,255,255,0.7);
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease, border-radius .2s ease;
        }

        .sl-desktop .navbar.is-scrolled .navbar-inner {
          border-color: rgba(245, 158, 11, 0.34);
          box-shadow:
            0 16px 38px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(251, 191, 36, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.78);
        }

        .sl-desktop .nav-primary {
          display: flex;
          align-items: center;
          flex-direction: row;
          flex-wrap: nowrap;
          width: 100%;
          min-height: 74px;
          gap: 12px;
          transition: min-height .2s ease;
          animation: none;
        }

        .sl-desktop .navbar.is-scrolled .nav-primary { min-height: 72px; }

        .sl-desktop .nav-brand { display: flex; align-items: center; flex-shrink: 0; width: auto; }

        .sl-desktop .logo {
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

        .sl-desktop .logo-glow { color: #7c2d12; }

        .sl-desktop .logo-badge {
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

        .sl-desktop .nav-search-desktop {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          width: 320px;
          min-width: 280px;
          max-width: 340px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
          gap: 0;
        }

        .sl-desktop .nav-search-shell {
          display: flex; align-items: center; gap: 6px; width: 100%;
          height: 40px;
          padding: 0 6px 0 10px;
          background: rgba(0, 0, 0, 0.04);
          border: none;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04);
          transition: background 220ms ease, box-shadow 220ms ease;
        }

        .sl-desktop .nav-search-shell:hover {
          background: rgba(0, 0, 0, 0.06);
        }

        .sl-desktop .nav-search-shell:focus-within {
          background: #ffffff;
          box-shadow:
            0 0 0 4px rgba(0, 0, 0, 0.06),
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .sl-desktop .nav-search-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; color: #86868B; flex: 0 0 auto;
          transition: color 220ms ease;
        }

        .sl-desktop .nav-search-shell:focus-within .nav-search-icon {
          color: #515154;
        }

        .sl-desktop .nav-search-input {
          flex: 1; min-width: 0; height: 100%; padding: 0 4px;
          border: none; border-radius: 0;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: #1d1d1f;
          background: transparent; outline: none;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        }

        .sl-desktop .nav-search-input::placeholder {
          color: #86868B;
          transition: color 220ms ease;
        }

        .sl-desktop .nav-search-shell:focus-within .nav-search-input::placeholder {
          color: #b0b0b5;
        }

        .sl-desktop .nav-search-button {
          width: 28px; height: 28px; padding: 0;
          border: none; border-radius: 8px;
          background: rgba(0, 0, 0, 0.06);
          color: #515154;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.85);
          pointer-events: none;
          transition: opacity 220ms ease, transform 220ms ease, background 220ms ease;
        }

        .sl-desktop .nav-search-shell.has-value .nav-search-button {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }

        .sl-desktop .nav-search-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .sl-desktop .nav-search-button svg {
          width: 14px; height: 14px;
        }

        .sl-desktop .nav-links {
          display: flex; align-items: center; gap: 6px; padding: 0;
          flex-direction: row;
          flex-wrap: nowrap;
          width: auto;
          max-height: none;
          opacity: 1;
          pointer-events: auto;
          transform: none;
          overflow: visible;
          justify-content: flex-start;
          animation: none;
          flex: 0 0 auto;
          margin-left: auto;
        }

        .sl-desktop .nav-link {
          position: relative; display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 650; color: #334155; text-decoration: none;
          padding: 9px 11px; border-radius: 999px;
          width: auto;
          min-height: auto;
          border: none;
          background: transparent;
          justify-content: flex-start;
          transition: background .18s ease, color .18s ease, transform .18s ease;
        }
        .sl-desktop .nav-link::after { content: none; }
        .sl-desktop .nav-link:hover { background: rgba(241,245,249,0.95); color: #0f172a; transform: translateY(-1px); }
        .sl-desktop .nav-link.is-active { background: rgba(245, 158, 11, 0.14); color: #92400e; }
        .sl-desktop .nav-link-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; color: currentColor; flex: 0 0 auto; }

        .sl-desktop .nav-actions { margin-left: 0; display: flex; align-items: center; width: auto; justify-content: flex-start; padding-top: 0; animation: none; flex: 0 0 auto; }
        .sl-desktop .nav-profile {
          display: flex; align-items: center; gap: 10px; text-decoration: none;
          padding: 7px 10px 7px 8px; border-radius: 18px;
          background: rgba(248,250,252,0.98);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .sl-desktop .nav-profile:hover { background: #fff; transform: translateY(-1px); box-shadow: 0 12px 26px rgba(15,23,42,.08); }
        .sl-desktop .nav-profile-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 10px 18px rgba(217,119,6,.2);
        }
        .sl-desktop .nav-profile-text { display: flex; flex-direction: column; line-height: 1.2; }
        .sl-desktop .nav-profile-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
        .sl-desktop .nav-profile-name { font-size: 13px; color: #0f172a; font-weight: 700; }

        .sl-desktop .button-primary {
          height: 42px; padding: 0 16px; border-radius: 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fffdf7; font-size: 13px; font-weight: 700; text-decoration: none;
          display: inline-flex; align-items: center;
          box-shadow: 0 14px 26px rgba(217,119,6,.2);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }
        .sl-desktop .button-primary:hover { opacity: .96; transform: translateY(-1px); box-shadow: 0 16px 30px rgba(217,119,6,.28); }

        .sl-desktop .navbar svg {
          width: 18px;
          height: 18px;
          max-width: 22px;
          max-height: 22px;
          flex: 0 0 auto;
        }

        .sl-desktop .nav-link-icon svg {
          width: 16px;
          height: 16px;
          max-width: 18px;
          max-height: 18px;
        }

        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
        }

        /* Mobile bar — hidden on desktop */
        @media (min-width: 861px) {
          .sl-desktop { display: block; }
          .sl-mobile { display: none; }
        }

        @media (min-width: 1200px) {
          .sl-desktop .nav-search-desktop {
            width: 340px;
          }
        }

        @media (max-width: 860px) {
          /* Hide desktop navbar markup */
          .sl-desktop { display: none; }

          /* Mobile bar */
          .sl-mobile {
            display: block;
          }

          .mobile-nav {
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: saturate(180%) blur(12px);
            -webkit-backdrop-filter: saturate(180%) blur(12px);
            border-bottom: 0.5px solid var(--sl-color-border-soft);
          }

          .sl-mobile svg {
            width: 19px;
            height: 19px;
            max-width: 22px;
            max-height: 22px;
            flex: 0 0 auto;
          }

          .mobile-nav-bar {
            height: 56px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .mobile-wordmark-link {
            text-decoration: none;
            color: var(--sl-color-primary);
            display: inline-flex;
            align-items: center;
          }

          .mobile-wordmark {
            font-size: 19px;
            font-weight: 500;
            color: var(--sl-color-primary);
            letter-spacing: -0.01em;
          }
          .mobile-wordmark-accent { color: var(--sl-color-accent); }

          .mobile-actions { display: flex; align-items: center; gap: 4px; }

          .mobile-icon-button {
            position: relative;
            width: 38px; height: 38px;
            min-width: 44px; min-height: 44px;
            margin: -3px; padding: 3px;
            display: inline-flex; align-items: center; justify-content: center;
            background: transparent; border: none; border-radius: 9999px;
            color: var(--sl-color-primary-soft);
            cursor: pointer;
            text-decoration: none;
          }
          .mobile-icon-button-inner {
            width: 38px; height: 38px;
            display: inline-flex; align-items: center; justify-content: center;
            border-radius: 9999px;
            transition: background .12s ease;
          }
          .mobile-icon-button:active .mobile-icon-button-inner,
          .mobile-icon-button.is-active .mobile-icon-button-inner {
            background: var(--sl-color-surface-alt);
          }
          .mobile-icon-button svg { width: 19px; height: 19px; }
          .mobile-icon-button.mobile-menu-button { color: var(--sl-color-primary); }
          .mobile-icon-button.mobile-menu-button svg { width: 20px; height: 20px; }

          .mobile-icon-button.mobile-wishlist-active svg { color: #DC2626; fill: #DC2626; }

          .mobile-cart-badge {
            position: absolute;
            top: 1px;
            right: 1px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            background: var(--sl-color-danger);
            color: #fff;
            font-size: 10px;
            font-weight: 500;
            line-height: 1;
            border: 1.5px solid #fff;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }

          /* Search panel */
          .mobile-search-panel {
            border-top: 0.5px solid var(--sl-color-border-soft);
            padding: 0 12px 12px;
            transform: translateY(-8px);
            opacity: 0;
            max-height: 0;
            overflow: hidden;
            transition: transform 180ms ease-out, opacity 180ms ease-out, max-height 180ms ease-out, padding 180ms ease-out;
          }
          .mobile-search-panel.is-open {
            transform: translateY(0);
            opacity: 1;
            max-height: 200px;
            padding: 12px;
          }

          .mobile-search-form { display: block; }
          .mobile-search-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
            background: var(--sl-color-surface-soft);
            border-radius: 9999px;
            padding: 10px 14px;
            gap: 8px;
          }
          .mobile-search-input-wrap svg { width: 16px; height: 16px; color: var(--sl-color-text-muted); flex: 0 0 auto; }
          .mobile-search-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            font-size: 14px;
            color: var(--sl-color-primary);
            min-width: 0;
          }
          .mobile-search-input::placeholder { color: var(--sl-color-text-subtle); }

          .mobile-popular {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 10px;
          }
          .mobile-popular-pill {
            padding: 5px 10px;
            background: var(--sl-color-surface-alt);
            color: var(--sl-color-text-muted);
            border: none;
            border-radius: 9999px;
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
          }

          /* Drawer */
          .mobile-drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.45);
            z-index: 200;
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms ease-out;
          }
          .mobile-drawer-overlay.is-open { opacity: 1; pointer-events: auto; }

          .mobile-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(86vw, 360px);
            background: #fff;
            z-index: 201;
            transform: translateX(100%);
            transition: transform 200ms ease-out;
            display: flex;
            flex-direction: column;
            box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
          }
          .mobile-drawer.is-open { transform: translateX(0); }

          .mobile-drawer-header {
            height: 56px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 0.5px solid var(--sl-color-border-soft);
            flex-shrink: 0;
          }

          .mobile-drawer-close {
            width: 38px; height: 38px;
            min-width: 44px; min-height: 44px;
            margin: -3px; padding: 3px;
            display: inline-flex; align-items: center; justify-content: center;
            background: transparent; border: none; cursor: pointer;
          }
          .mobile-drawer-close-inner {
            width: 38px; height: 38px;
            display: inline-flex; align-items: center; justify-content: center;
            background: var(--sl-color-surface-alt);
            border-radius: 9999px;
            color: var(--sl-color-primary);
          }
          .mobile-drawer-close svg { width: 18px; height: 18px; }

          .mobile-drawer-body {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .mobile-profile-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: var(--sl-color-surface-soft);
            border-radius: 12px;
            margin-bottom: 16px;
            text-decoration: none;
            color: inherit;
          }
          .mobile-profile-avatar {
            width: 32px; height: 32px;
            background: var(--sl-color-accent);
            color: #fff;
            border-radius: 9999px;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 13px; font-weight: 500;
            flex-shrink: 0;
          }
          .mobile-profile-text { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
          .mobile-profile-name { font-size: 13px; font-weight: 500; color: var(--sl-color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .mobile-profile-link { font-size: 11px; color: var(--sl-color-text-subtle); }
          .mobile-profile-chevron { margin-left: auto; color: var(--sl-color-text-subtle); }
          .mobile-profile-chevron svg { width: 16px; height: 16px; }

          .mobile-auth-buttons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
          .mobile-btn {
            display: inline-flex; align-items: center; justify-content: center;
            height: 42px;
            border-radius: 10px;
            font-size: 14px; font-weight: 500;
            text-decoration: none;
            cursor: pointer;
          }
          .mobile-btn-primary { background: var(--sl-color-primary); color: #fff; border: none; }
          .mobile-btn-outline { background: #fff; color: var(--sl-color-primary); border: 1px solid var(--sl-color-surface-alt); }

          .mobile-drawer-nav { display: flex; flex-direction: column; gap: 2px; }
          .mobile-drawer-link {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 14px;
            border-radius: 8px;
            text-decoration: none;
            color: var(--sl-color-primary);
            font-size: 14px;
            font-weight: 400;
            background: transparent;
            border: none;
            cursor: pointer;
            font-family: inherit;
            text-align: left;
            width: 100%;
          }
          .mobile-drawer-link.is-active { background: var(--sl-color-surface-alt); font-weight: 500; }
          .mobile-drawer-link-icon { display: inline-flex; width: 18px; height: 18px; color: var(--sl-color-primary-soft); flex: 0 0 auto; }
          .mobile-drawer-link-icon svg { width: 18px; height: 18px; }
          .mobile-drawer-link-label { flex: 1; }
          .mobile-drawer-badge {
            display: inline-flex; align-items: center; justify-content: center;
            min-width: 20px; height: 20px; padding: 0 6px;
            border-radius: 9999px; font-size: 11px; font-weight: 500;
            line-height: 1;
          }
          .mobile-drawer-badge-gray { background: var(--sl-color-surface-alt); color: var(--sl-color-text-muted); }
          .mobile-drawer-badge-red { background: var(--sl-color-danger); color: #fff; }

          .mobile-drawer-divider { border-top: 0.5px solid var(--sl-color-border-soft); margin: 16px 0; }

          .mobile-drawer-link.mobile-signout { color: var(--sl-color-danger); }
          .mobile-drawer-link.mobile-signout .mobile-drawer-link-icon { color: var(--sl-color-danger); }

          @media (prefers-reduced-motion: reduce) {
            .mobile-search-panel, .mobile-drawer, .mobile-drawer-overlay { transition: none; }
          }
        }
      `}</style>

      {/* Desktop navbar (untouched) */}
      <div className="sl-desktop">
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
                <div className={`nav-search-shell ${searchValue ? 'has-value' : ''}`}>
                  <span className="nav-search-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" />
                    </svg>
                  </span>
                  <input
                    aria-label="Search products"
                    className="nav-search-input"
                    placeholder="Search"
                    autoComplete="off"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  <button className="nav-search-button" type="submit" aria-label="Submit search" tabIndex={searchValue ? 0 : -1}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </form>

              <div className="nav-links" id="primary-navigation">
                <Link className={`nav-link ${isFeaturedActive ? 'is-active' : ''}`} href="/product/featured">
                  <span className="nav-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M12 3l2.7 5.47 6.03.88-4.37 4.26 1.03 6.02L12 16.8 6.61 19.63l1.03-6.02L3.27 9.35l6.03-.88L12 3z" fill="currentColor" />
                    </svg>
                  </span>
                  Featured
                </Link>
                <Link className={`nav-link ${isWishlistActive ? 'is-active' : ''}`} href="/wishlist">
                  <span className="nav-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M12 20.5l-1.1-1C5.14 14.24 2 11.39 2 7.85 2 5.1 4.16 3 6.9 3c1.56 0 3.06.73 4.1 1.87C12.04 3.73 13.54 3 15.1 3 17.84 3 20 5.1 20 7.85c0 3.54-3.14 6.39-8.9 11.66l-1.1 1z" fill="currentColor" />
                    </svg>
                  </span>
                  Wishlist
                </Link>
                <Link className={`nav-link ${isCartActive ? 'is-active' : ''}`} href="/cart" style={{ position: 'relative' }}>
                  <span className="nav-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M3 5h2l2.2 9.2a1 1 0 0 0 .98.8h8.93a1 1 0 0 0 .97-.76L21 8H7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="10" cy="19" r="1.6" fill="currentColor" />
                      <circle cx="17" cy="19" r="1.6" fill="currentColor" />
                    </svg>
                  </span>
                  Cart
                  {isClient && cartCount > 0 && (
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                      {cartCount}
                    </span>
                  )}
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link className={`nav-link ${isAdminActive ? 'is-active' : ''}`} href="/admin">
                    <span className="nav-link-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" fill="currentColor" />
                      </svg>
                    </span>
                    Dashboard
                  </Link>
                )}
              </div>

              <div className="nav-actions">
                {isClient &&
                  (isAuthenticated ? (
                    <Link className="nav-profile" href="/dashboard" title="Open your dashboard">
                      <span className="nav-profile-avatar" aria-hidden="true">{profileInitial}</span>
                      <span className="nav-profile-text">
                        <span className="nav-profile-label">Profile</span>
                        <span className="nav-profile-name">{profileLabel}</span>
                      </span>
                    </Link>
                  ) : (
                    <Link className="button button-primary" href="/login">Start Shopping</Link>
                  ))}
              </div>
            </div>
          </nav>
        </header>
      </div>

      {/* Mobile navbar */}
      <div className="sl-mobile">
        <header className="mobile-nav">
          <div className="mobile-nav-bar">
          <Link className="mobile-wordmark-link" href="/" aria-label="ShopLite home">
            <Wordmark />
          </Link>

          <div className="mobile-actions">
            <button
              type="button"
              className={`mobile-icon-button ${isSearchOpen ? 'is-active' : ''}`}
              onClick={toggleSearch}
              aria-expanded={isSearchOpen}
              aria-controls="mobile-search-panel"
              aria-label={isSearchOpen ? 'Close search' : 'Open search'}
            >
              <span className="mobile-icon-button-inner">
                {isSearchOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </svg>
                )}
              </span>
            </button>

            {!isSearchOpen && (
              <Link
                href="/wishlist"
                className={`mobile-icon-button ${isClient && wishlistCount > 0 ? 'mobile-wishlist-active' : ''}`}
                aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}
              >
                <span className="mobile-icon-button-inner">
                  {isClient && wishlistCount > 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 20.5l-1.1-1C5.14 14.24 2 11.39 2 7.85 2 5.1 4.16 3 6.9 3c1.56 0 3.06.73 4.1 1.87C12.04 3.73 13.54 3 15.1 3 17.84 3 20 5.1 20 7.85c0 3.54-3.14 6.39-8.9 11.66l-1.1 1z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </span>
              </Link>
            )}

            <Link href="/cart" className="mobile-icon-button" aria-label={`Cart${cartCount > 0 ? ` (${cartCount})` : ''}`}>
              <span className="mobile-icon-button-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              {isClient && cartCount > 0 && <span className="mobile-cart-badge">{cartBadgeText}</span>}
            </Link>

            <button
              type="button"
              className="mobile-icon-button mobile-menu-button"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-drawer"
              aria-label="Open menu"
            >
              <span className="mobile-icon-button-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </span>
            </button>
          </div>
          </div>

          {/* Search panel */}
          <div className={`mobile-search-panel ${isSearchOpen ? 'is-open' : ''}`} id="mobile-search-panel" aria-hidden={!isSearchOpen}>
            <form className="mobile-search-form" onSubmit={handleSearchSubmit} role="search">
              <div className="mobile-search-input-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
                <input
                  type="search"
                  className="mobile-search-input"
                  placeholder="Search products..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoComplete="off"
                  aria-label="Search products"
                />
              </div>
            </form>
            <div className="mobile-popular" role="list" aria-label="Popular searches">
              {POPULAR_SEARCHES.map((term) => (
                <button key={term} type="button" className="mobile-popular-pill" onClick={() => submitPopular(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Drawer overlay + panel */}
        {isClient && (
          <>
          <div
            className={`mobile-drawer-overlay ${isMenuOpen ? 'is-open' : ''}`}
            onClick={onOverlayClick}
            aria-hidden={!isMenuOpen}
          />
          <aside
            className={`mobile-drawer ${isMenuOpen ? 'is-open' : ''}`}
            id="mobile-drawer"
            role="dialog"
            aria-modal={isMenuOpen}
            aria-label="Main menu"
            aria-hidden={!isMenuOpen}
          >
            <div className="mobile-drawer-header">
              <Link className="mobile-wordmark-link" href="/" onClick={closeMenu} aria-label="ShopLite home">
                <Wordmark />
              </Link>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={closeMenu}
                onKeyDown={onCloseKey}
                aria-label="Close menu"
              >
                <span className="mobile-drawer-close-inner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="mobile-drawer-body">
              {isAuthenticated ? (
                <Link className="mobile-profile-card" href="/dashboard" onClick={closeMenu}>
                  <span className="mobile-profile-avatar" aria-hidden="true">{profileInitial}</span>
                  <span className="mobile-profile-text">
                    <span className="mobile-profile-name">{profileLabel}</span>
                    <span className="mobile-profile-link">View profile</span>
                  </span>
                  <span className="mobile-profile-chevron" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </Link>
              ) : (
                <div className="mobile-auth-buttons">
                  <Link className="mobile-btn mobile-btn-primary" href="/login" onClick={closeMenu}>Sign in</Link>
                  <Link className="mobile-btn mobile-btn-outline" href="/register" onClick={closeMenu}>Create account</Link>
                </div>
              )}

              <nav className="mobile-drawer-nav" aria-label="Primary">
                {navItem('/', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" />
                  </svg>
                ), 'Home', isHomeActive)}
                {navItem('/product/featured', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2l.9-5.5-4-3.9 5.5-.8z" />
                  </svg>
                ), 'Featured', isFeaturedActive)}
                {navItem('/wishlist', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                ), 'Wishlist', isWishlistActive, { count: wishlistCount, tone: 'gray' })}
                {navItem('/cart', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                ), 'Cart', isCartActive, { count: cartCount, tone: 'red' })}
                {navItem('/dashboard', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4l-9-5.19" />
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <line x1="3.27" y1="6.96" x2="12" y2="12.01" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                ), 'Orders', isOrdersActive)}
                {user?.role === 'ADMIN' && navItem('/admin', (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                ), 'Admin', isAdminActive)}
              </nav>

              {isAuthenticated && (
                <>
                  <div className="mobile-drawer-divider" />
                  <button
                    type="button"
                    className="mobile-drawer-link mobile-signout"
                    onClick={() => { closeMenu(); signOut(); }}
                  >
                    <span className="mobile-drawer-link-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                    <span className="mobile-drawer-link-label">Sign out</span>
                  </button>
                </>
              )}
            </div>
          </aside>
          </>
        )}
      </div>
    </>
  );
};

export default Navbar;
