import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API_CONFIG from '@/config/api';

interface UserProfile {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  institution_id?: string;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  session: null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session] = useState<null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setProfile(null);
      return;
    }
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ME}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) {
        localStorage.removeItem('accessToken');
        setUser(null);
        setProfile(null);
        return;
      }
      const data = await res.json();
      setUser(data.user || null);
      setProfile(null);
    } catch (e) {
      localStorage.removeItem('accessToken');
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      await refresh();
      setIsLoading(false);
    };
    init();
  }, []);

  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session: null,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refresh,
      }}
    >
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
