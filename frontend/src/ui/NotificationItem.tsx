import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Notification, getImageUrl, markNotificationAsRead, respondToFollowRequest } from '../lib/loaders';
import Button from './buttons';
import Avatar from './Avatar';

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: number) => void;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
    const [isRead, setIsRead] = useState(notification.is_read);
    const [isResponding, setIsResponding] = useState(false);

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

    const handleFollowRequestResponse = async (accepted: boolean) => {
        if (isResponding) return;

        try {
            setIsResponding(true);
            const interactionId = notification.id;
            await respondToFollowRequest(interactionId, accepted);
            handleMarkAsRead();
        } catch (error) {
            console.error('Erreur lors de la réponse à la demande d\'abonnement:', error);
        } finally {
            setIsResponding(false);
        }
    };

    // Formatage de la date relative (il y a X heures/minutes)
    const formattedDate = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: fr
    });

    // Vérifier si c'est une notification de demande d'abonnement
    const isFollowRequest = notification.content.includes('souhaite suivre votre compte privé');

    // Déterminer le contenu à afficher en fonction du statut de validation
    const getResponseContent = () => {
        if (notification.is_validated === true) {
            return (
                <div className="font-medium flex items-center text-green">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Demande acceptée
                </div>
            );
        } else if (notification.is_validated === false) {
            return (
                <div className="flex items-center text-red font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Demande refusée
                </div>
            );
        } else if (isFollowRequest && !isRead) {
            return (
                <div className="flex space-x-2 mt-2">
                    <Button
                        onClick={() => {
                            handleFollowRequestResponse(true);
                        }}
                        disabled={isResponding}
                        variant="full"
                        size="sm"
                    >
                        {isResponding ? 'Traitement...' : 'Accepter'}
                    </Button>
                    <Button
                        onClick={() => {
                            handleFollowRequestResponse(false);
                        }}
                        disabled={isResponding}
                        variant="danger"
                        size="sm"
                    >
                        {isResponding ? 'Traitement...' : 'Refuser'}
                    </Button>
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${isRead ? '' : 'bg-orange-50'}`}
        >
            {/* Version desktop */}
            <div className="hidden md:flex items-center space-x-3">
                {/* Avatar */}
                <Avatar
                    src={notification.source.avatar ? getImageUrl(notification.source.avatar) : '/default_pp.webp'}
                    alt="Avatar"
                    size="md"
                />

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
                        {getResponseContent()}
                    </div>
                </div>
            </div>

            {/* Version mobile */}
            <div className="flex flex-col md:hidden">
                <div className="flex items-start space-x-3 mb-2">
                    {/* Avatar et point */}
                    <div className="flex items-center relative">
                        <div className="flex items-center relative">
                            <Avatar
                                src={notification.source.avatar ? getImageUrl(notification.source.avatar) : '/default_pp.webp'}
                                alt="Avatar"
                                size="md"
                            />
                        </div>
                        {!isRead && (
                            <div className="w-2.5 h-2.5 bg-black rounded-full flex-shrink-0 ml-3"></div>
                        )}
                    </div>

                    <div className="flex flex-col flex-1">
                        {/* Contenu */}
                        <p className={`${isRead ? 'text-gray-700' : 'text-black font-medium'}`}>
                            {notification.content}
                        </p>

                        {/* Date et statut */}
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500">{formattedDate}</span>
                            {getResponseContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 