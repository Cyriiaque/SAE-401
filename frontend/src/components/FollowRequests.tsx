import React, { useEffect, useState } from 'react';
import { getFollowRequests, respondToFollowRequest } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Avatar from '../ui/Avatar';

interface FollowRequest {
    id: number;
    user: {
        id: number;
        name: string;
        mention: string;
        avatar: string | null;
    };
    created_at: string;
}

export const FollowRequests: React.FC = () => {
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        const fetchRequests = async () => {
            if (!user) return;
            try {
                const data = await getFollowRequests(user.id);
                setRequests(data.followRequests);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [user]);

    const handleResponse = async (requestId: number, accepted: boolean) => {
        try {
            await respondToFollowRequest(requestId, accepted);
            setRequests(requests.filter(req => req.id !== requestId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4">Chargement...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">{error}</div>;
    }

    if (requests.length === 0) {
        return <div className="text-gray-500 p-4">Aucune demande d'abonnement en attente</div>;
    }

    return (
        <div className="space-y-4">
            {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center space-x-4">
                        <Avatar
                            src={request.user.avatar || '/default-avatar.png'}
                            alt={request.user.name}
                            size="md"
                        />
                        <div>
                            <div className="font-semibold">{request.user.name}</div>
                            <div className="text-sm text-gray-500">@{request.user.mention}</div>
                            <div className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleResponse(request.id, true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Accepter
                        </button>
                        <button
                            onClick={() => handleResponse(request.id, false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                            Refuser
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}; 