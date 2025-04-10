import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import NotificationItem from '../ui/NotificationItem';
import { Notification, fetchNotifications, markAllNotificationsAsRead } from '../lib/loaders';

export default function Notifications() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }

        const loadNotifications = async () => {
            try {
                setLoading(true);
                // Charger les notifications sans les marquer comme lues
                const response = await fetchNotifications();
                setNotifications(response.notifications);

                // Compter les notifications non lues
                const unreadNotifications = response.notifications.filter(notif => !notif.is_read);
                setUnreadCount(unreadNotifications.length);
            } catch (error) {
                console.error('Erreur lors du chargement des notifications:', error);
                setError('Erreur lors du chargement des notifications');
            } finally {
                setLoading(false);
            }
        };

        loadNotifications();

        // Retourner une fonction cleanup qui sera exécutée quand le composant se démonte
        // ou quand l'effet est réexécuté (ce qui arrive quand on rafraîchit la page)
        return () => {
            // Marquer toutes les notifications comme lues quand on quitte la page
            if (user && unreadCount > 0) {
                markAllNotificationsAsRead().catch(error => {
                    console.error('Erreur lors du marquage des notifications comme lues:', error);
                });
            }
        };
    }, [user, navigate, unreadCount]);

    const handleMarkAsRead = (notificationId: number) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            )
        );

        // Mettre à jour le nombre de notifications non lues
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-2xl mx-auto">
                    {/* En-tête */}
                    <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <div className="p-4 flex justify-center items-center">
                            <h1 className="text-xl font-bold">Notifications</h1>
                        </div>
                    </div>

                    {/* Contenu */}
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-500">{error}</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-lg font-medium">Aucune notification</p>
                            <p className="mt-2">Vous n'avez pas encore reçu de notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {notifications.map(notification => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={handleMarkAsRead}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
