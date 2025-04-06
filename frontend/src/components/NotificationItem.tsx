import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Notification, getImageUrl, markNotificationAsRead } from '../lib/loaders';

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: number) => void;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
    const [isRead, setIsRead] = useState(notification.is_read);

    const handleMarkAsRead = async () => {
        if (!isRead) {
            try {
                await markNotificationAsRead(notification.id);
                setIsRead(true);
                onMarkAsRead(notification.id);
            } catch (error) {
                console.error('Erreur lors du marquage de la notification comme lue:', error);
            }
        }
    };

    // Formatage de la date relative (il y a X heures/minutes)
    const formattedDate = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: fr
    });

    return (
        <div
            className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${isRead ? '' : 'bg-orange-50'}`}
            onClick={handleMarkAsRead}
        >
            {/* Version desktop */}
            <div className="hidden md:flex items-center space-x-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    <img
                        src={notification.source.avatar ? getImageUrl(notification.source.avatar) : '/default_pp.webp'}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default_pp.webp';
                        }}
                    />
                </div>

                {/* Point noir pour les notifications non lues */}
                {!isRead && (
                    <div className="w-2.5 h-2.5 bg-black rounded-full flex-shrink-0 ml-1"></div>
                )}

                <div className="flex-1 flex items-center justify-between">
                    {/* Contenu */}
                    <p className={`${isRead ? 'text-gray-700' : 'text-black font-medium'}`}>
                        {notification.content}
                    </p>

                    {/* Date et statut */}
                    <div className="flex flex-col items-end space-y-1 ml-2 flex-shrink-0">
                        <span className="text-sm text-gray-500">{formattedDate}</span>
                    </div>
                </div>
            </div>

            {/* Version mobile */}
            <div className="flex flex-col md:hidden">
                <div className="flex items-start space-x-3 mb-2">
                    {/* Avatar et point */}
                    <div className="flex items-center relative">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                            <img
                                src={notification.source.avatar ? getImageUrl(notification.source.avatar) : '/default_pp.webp'}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/default_pp.webp';
                                }}
                            />
                        </div>
                        {!isRead && (
                            <div className="w-2.5 h-2.5 bg-black rounded-full flex-shrink-0 ml-3"></div>
                        )}
                    </div>

                    <div className="flex flex-col">

                        {/* Contenu */}
                        <p className={`${isRead ? 'text-gray-700' : 'text-black font-medium'}`}>
                            {notification.content}
                        </p>

                        {/* Date et statut */}
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500">{formattedDate}</span>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
} 