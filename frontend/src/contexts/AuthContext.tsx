import { createContext, useContext, useState, ReactNode } from 'react';
import { User, login, logout, register } from '../lib/loaders';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, fullName: string, username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async (email: string, password: string) => {
    const response = await login({ email, password });
    setUser(response.user);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleRegister = async (email: string, password: string, fullName: string, username: string) => {
    const response = await register({ email, password, name: fullName, mention: username });
    setUser(response.user);
  };

  return (
    <AuthContext.Provider value={{ user, login: handleLogin, logout: handleLogout, register: handleRegister }}>
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