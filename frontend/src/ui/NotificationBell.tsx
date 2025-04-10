import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchUnreadNotificationsCount } from '../lib/loaders';

// Interface pour le composant NotificationBadge
interface NotificationBadgeProps {
    count: number;
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}

// Composant NotificationBadge intégré
function NotificationBadge({
    count,
    children,
    onClick,
}: NotificationBadgeProps) {
    return (
        <div className="relative inline-block" onClick={onClick}>
            {children}
            {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </div>
    );
}

// Composant NotificationBell principal
export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    // Charger le nombre de notifications non lues
    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                setLoading(true);
                const count = await fetchUnreadNotificationsCount();
                setUnreadCount(count);
            } catch (error) {
                console.error('Erreur lors du chargement des notifications non lues:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUnreadCount();

        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Link
            to="/notifications"
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Notifications"
        >
            <NotificationBadge count={loading ? 0 : unreadCount}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
            </NotificationBadge>
        </Link>
    );
} 