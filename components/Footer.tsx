import Link from 'next/link';

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
      { href: '/cart', label: 'Cart' },
      { href: '/login', label: 'Sign in' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link className="footer-logo" href="/">
              Shop<span>Lite</span>
            </Link>
            <p>Built with Next.js & Spring Boot</p>
          </div>
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
        </div>
        <div className="footer-meta">
          <span>© {year} ShopLite</span>
          <div className="footer-meta-links">
            <Link href="/">Privacy</Link>
            <Link href="/">Terms</Link>
            <Link href="/">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
