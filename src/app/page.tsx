"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; 
import { AuthProvider } from '@/hooks/useAuth'; 

function HomePageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      if (!loading) {
        console.log('dejo login')
        if (user) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
        console.log('todo ok por ahora')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [user, loading, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error.message}</span>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{error.stack}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Cargando Sistema Web de Balanced Scorecard...</p>
      {/* You could add a spinner here */}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePageContent />
    </AuthProvider>
  )
}
