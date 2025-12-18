// apps/control-plane/src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  token: string | null; // Add token to context
  login: (token: string, email: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthResponseSchema = z.object({
  token: z.string(),
  email: z.string().email(),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [token, setToken] = useState<string | null>(null); // State for token
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('ztag_token');
    const userEmail = localStorage.getItem('ztag_user_email');
    if (storedToken && userEmail) {
      setIsAuthenticated(true);
      setUser({ email: userEmail });
      setToken(storedToken); // Set token from local storage
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken: string, email: string) => {
    localStorage.setItem('ztag_token', newToken);
    localStorage.setItem('ztag_user_email', email);
    setIsAuthenticated(true);
    setUser({ email });
    setToken(newToken); // Update token state
    router.push('/'); // Redirect to dashboard after login
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('ztag_token');
    localStorage.removeItem('ztag_user_email');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null); // Clear token state
    router.push('/login'); // Redirect to login page after logout
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
