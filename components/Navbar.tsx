import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { clearAuthToken } from '../utils/auth';
import { useCartCount } from '../hooks/useCartCount';

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';

type AuthState = {
  isAuthenticated: boolean;
  role: 'ADMIN' | 'USER' | null;
};

const Navbar = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const cartCount = useCartCount();
  const router = useRouter();

  // Mark as client-side rendered to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track auth state changes and reload page on login (only on home page)
  useEffect(() => {
    if (!isClient) return;
    
    // First time loading, just set the prev state
    if (prevAuthState === null) {
      setPrevAuthState(isAuthenticated);
      return;
    }

    // Refresh page when authentication state changes from false to true (login success)
    // Only reload on home page to avoid interfering with checkout or other pages
    if (isAuthenticated && !prevAuthState && user && router.pathname === '/') {
      // Small delay to ensure state is fully updated before refresh
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Update prev state for next comparison
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

  const handleSignOut = useCallback(() => {
    signOut();
    void router.push('/', undefined, { scroll: true });
  }, [signOut, router]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const term = searchValue.trim();

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

  return (
    <header className="navbar">
      <nav className="navbar-inner">
        <div className="nav-primary">
          <Link className="logo" href="/">
            <span>Shop</span>
            <span className="logo-glow">Lite</span>
          </Link>
          <form className="nav-search" onSubmit={handleSearchSubmit} role="search">
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
        <div className="nav-links">
          <Link className="nav-link" href="/product/featured">
            Featured
          </Link>
          <Link className="nav-link" href="/cart" style={{ position: 'relative' }}>
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
            <Link className="nav-link" href="/admin">
              Dashboard
            </Link>
          )}
          {isClient && (
            isAuthenticated ? (
              <button className="button button-ghost" type="button" onClick={handleSignOut}>
                Sign Out
              </button>
            ) : (
              <Link className="button button-primary" href="/login">
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
