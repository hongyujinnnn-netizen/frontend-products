import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/AdminDashboard.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hidePublicChrome = router.pathname.startsWith('/admin') || router.pathname.startsWith('/dashboard');

  return (
    <AuthProvider>
      <div className="page-wrapper">
        {!hidePublicChrome && <Navbar />}
        <Component {...pageProps} />
        {!hidePublicChrome && <Footer />}
      </div>
    </AuthProvider>
  );
}

export default MyApp;
