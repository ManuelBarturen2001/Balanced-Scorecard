"use client";

import { LoginForm } from '@/components/auth/LoginForm';
import { AuthProvider } from '@/hooks/useAuth'; // Ensure AuthProvider wraps this

export default function LoginPage() {
  return (
    // AuthProvider should ideally be in a layout that wraps (auth) routes
    // or at the root. For this single page, wrapping here is fine for context.
    <AuthProvider> 
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </AuthProvider>
  );
}
