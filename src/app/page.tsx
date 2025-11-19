'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthForm } from '@/components/shared/AuthForm';
import { AuthService } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const user = AuthService.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        // Role-based routing
        if (user.role === 'super_admin' || user.role === 'org_admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleAuthSuccess = () => {
    // AuthService.signIn will handle storing the user
    // Redirect will happen automatically via useEffect
    const user = AuthService.getCurrentUser();
    if (user) {
      // Role-based routing
      if (user.role === 'super_admin' || user.role === 'org_admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Router will handle redirect
  }

  return <AuthForm onSuccess={handleAuthSuccess} />;
}

