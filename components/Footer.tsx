import Link from 'next/link';
import { useCallback } from 'react';

const footerColumns = [
  {
    heading: 'Product',
    links: [
      { href: '/', label: 'Overview' },
      { href: '/product/featured', label: 'Catalog' },
      { href: '/admin', label: 'Admin tools' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/wishlist', label: 'Wishlist' },
      { href: '/cart', label: 'Cart' },
      { href: '/login', label: 'Sign in' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();
  const handleBackToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="footer-logo" href="/">
              Shop<span>Lite</span>
            </Link>
            <p className="footer-tagline">
              Premium storefront UI for modern teams. Launch fast, ship confidently.
            </p>
            <div className="footer-status">
              <span className="status-dot" aria-hidden="true" />
              <span>Storefront online</span>
            </div>
          </div>
          <div className="footer-cta">
            <p className="footer-cta-title">Ready to launch your next drop?</p>
            <p className="footer-cta-subtitle">
              Curated templates, real-time inventory, and a checkout that feels effortless.
            </p>
            <div className="footer-cta-actions">
              <Link className="button button-primary" href="/product/featured">
                Browse products
              </Link>
              <Link className="button button-ghost" href="/admin">
                Open admin
              </Link>
            </div>
          </div>
        </div>
        <div className="footer-divider" />
        <div className="footer-inner">
          <div className="footer-columns">
            {footerColumns.map((column) => (
              <div className="footer-column" key={column.heading}>
                <span className="footer-heading">{column.heading}</span>
                <div className="footer-column-links">
                  {column.links.map((link) => (
                    <Link key={link.label} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="footer-links-group">
            <span className="footer-heading">Company</span>
            <div className="footer-column-links">
              <Link href="/">About</Link>
              <Link href="/">Careers</Link>
              <Link href="/">Contact</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} ShopLite. All rights reserved.</span>
          <div className="footer-meta-links">
            <Link href="/">Privacy</Link>
            <Link href="/">Terms</Link>
            <Link href="/">Support</Link>
          </div>
          <button className="footer-top-button" type="button" onClick={handleBackToTop}>
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
