import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { hasRequiredRole, isAuthenticated } from '../utils/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    if (requiredRole && !hasRequiredRole(requiredRole)) {
      router.replace('/');
      return;
    }

    setIsReady(true);
  }, [requiredRole, router]);

  if (!isReady) {
    return (
      <main className="layout">
        <div className="empty-state">
          <h2>Checking permissions</h2>
          <p>Please wait while we confirm your access level.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
