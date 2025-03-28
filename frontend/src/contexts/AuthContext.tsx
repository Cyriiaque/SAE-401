import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getCurrentUser, logout, checkUserStatus } from '../lib/loaders';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Vérifier si l'utilisateur est banni
      if (currentUser.isbanned) {
        logout();
        setUser(null);
      } else {
        setUser(currentUser);
      }
    }
  }, []);

  // Vérifier périodiquement le statut de bannissement
  useEffect(() => {
    if (!user) return;

    const checkBanStatus = async () => {
      try {
        const updatedUser = await checkUserStatus(user.id);
        if (updatedUser.isbanned) {
          logout();
          setUser(null);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de bannissement:', error);
      }
    };

    const interval = setInterval(checkBanStatus, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
} 