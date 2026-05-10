import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/redesign.css';
import '../styles/layout.css';
import '../styles/AdminDashboard.css';
import '../styles/product-management-styles.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import { MessageProvider } from '../hooks/useMessage';
import Toast from '../components/Toast';
import ErrorBoundary from '../components/ErrorBoundary';
import { useRouter } from 'next/router';
import { CartProvider } from '../context/CartContext';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hidePublicChrome = router.pathname.startsWith('/admin') || router.pathname.startsWith('/dashboard');

  return (
    <AuthProvider>
      <CartProvider>
        <MessageProvider>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </Head>
          <div className="page-wrapper">
            {!hidePublicChrome && <Navbar />}
            <Toast />
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
            {!hidePublicChrome && <Footer />}
          </div>
        </MessageProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default MyApp;
