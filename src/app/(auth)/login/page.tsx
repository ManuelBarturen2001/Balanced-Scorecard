"use client";

import { LoginForm } from '@/components/auth/LoginForm';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function LoginPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Si el usuario ya está autenticado, redirigir al dashboard
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    // Mostrar un spinner mientras se verifica el estado de autenticación
    // o si el usuario ya está autenticado (mientras se redirige)
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-foreground">Cargando Sistema Web de Balanced Scorecard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginPageContent />
    </AuthProvider>
  );
}