import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/loaders';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, setUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const userData = getCurrentUser();
                    if (userData) {
                        setUser(userData);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de l\'authentification:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [setUser]);

    if (isLoading) {
        return <div>Chargement...</div>;
    }

    if (!user) {
        return <Navigate to="/signin" replace />;
    }

    return <>{children}</>;
} 