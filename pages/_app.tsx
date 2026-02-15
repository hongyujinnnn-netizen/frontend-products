import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/AdminDashboard.css';
import '../styles/product-management-styles.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import { MessageProvider } from '../hooks/useMessage';
import Toast from '../components/Toast';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hidePublicChrome = router.pathname.startsWith('/admin') || router.pathname.startsWith('/dashboard');

  return (
    <AuthProvider>
      <MessageProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <div className="page-wrapper">
          {!hidePublicChrome && <Navbar />}
          <Toast />
          <Component {...pageProps} />
          {!hidePublicChrome && <Footer />}
        </div>
      </MessageProvider>
    </AuthProvider>
  );
}

export default MyApp;
