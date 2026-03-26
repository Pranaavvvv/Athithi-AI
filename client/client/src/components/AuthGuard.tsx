'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/services/api';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'forbidden'>(false);

  useEffect(() => {
    // Backend uses an httpOnly JWT cookie; we can't read it from localStorage.
    // So we validate auth + role using the backend `/users/dashboard` endpoint.
    const validate = async () => {
      try {
        const res = await authAPI.get('/users/dashboard');
        const data = res.data;

        if (!data?.user || !data?.user?.role) {
          router.push('/auth');
          return;
        }

        setIsAuthorized(true);
      } catch {
        router.push('/auth');
      }
    };

    validate();
  }, [router, allowedRoles]);

  // Render a sleek dark mode loading state while verifying token/role
  if (!isAuthorized) {
    if (isAuthorized === false && typeof window !== 'undefined' && window.location.pathname !== '/auth') {
       // We only show loading if we are still verifying.
    }
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F13', color: '#16D39A', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite' }}>sync</span>
          <span>Verifying Access...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
