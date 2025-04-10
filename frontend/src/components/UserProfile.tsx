import { useState, useEffect } from 'react';
import { User, fetchUserPosts, Tweet, fetchUserProfile, checkFollowStatus, toggleFollow, getImageUrl, deletePost, checkBlockStatus, toggleBlockUser } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import TweetCard from './TweetCard';
import ConfirmModal from '../ui/ConfirmModal';
import { FollowRequests } from './FollowRequests';
import Avatar from '../ui/Avatar';

function formatContent(content: string): string {
    let maxLength;
    if (window.innerWidth < 640) { // sm
        maxLength = 40;
    } else if (window.innerWidth < 768) { // md
        maxLength = 60;
    } else { // lg et plus
        maxLength = 75;
    }

    const words = content.split(' ');
    let currentLine = '';
    let formattedContent = '';

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const space = i < words.length - 1 ? ' ' : '';

        if ((currentLine + word + space).length > maxLength) {
            if (currentLine) {
                formattedContent += currentLine.trim() + '\n';
            }
            if (word.length > maxLength) {
                // Si le mot est plus long que maxLength, on le coupe
                let remainingWord = word;
                while (remainingWord.length > 0) {
                    formattedContent += remainingWord.slice(0, maxLength) + '\n';
                    remainingWord = remainingWord.slice(maxLength);
                }
            } else {
                currentLine = word + space;
            }
        } else {
            currentLine += word + space;
        }
    }

    if (currentLine) {
        formattedContent += currentLine.trim();
    }

    return formattedContent;
}

interface UserProfileProps {
    userId: number;
    onClose: () => void;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(true);
    const [formattedBiography, setFormattedBiography] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [confirmUnfollowOpen, setConfirmUnfollowOpen] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockedByUser, setIsBlockedByUser] = useState(false);
    const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
    const [showFollowRequests, setShowFollowRequests] = useState(false);

    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                // Charger les informations de l'utilisateur
                const userData = await fetchUserProfile(userId);
                setUser(userData);
                setFormattedBiography(userData.biography ? formatContent(userData.biography) : '');

                // Charger les posts de l'utilisateur
                const postsData = await fetchUserPosts(userId);
                setPosts(postsData.posts);

                // Vérifier si le paramètre is_private est renvoyé par l'API
                // @ts-ignore - La propriété is_private est ajoutée côté serveur
                if (postsData.is_private) {
                    // Si le compte est privé, forcer l'état isPrivate à true quelle que soit la valeur dans userData
                    setUser(prev => ({
                        ...prev!,
                        isPrivate: true
                    }));
                }

                // Vérifier le statut de suivi
                if (currentUser && currentUser.id !== userId) {
                    const followStatus = await checkFollowStatus(userId);
                    setIsFollowing(followStatus.isFollowing);
                    setIsPending(followStatus.isPending);
                    setIsBlockedByUser(followStatus.isBlockedByTarget);

                    // Vérifier le statut de blocage
                    const blockStatus = await checkBlockStatus(userId);
                    setIsBlocked(blockStatus.isBlocked);
                }
            } catch (error) {
                console.error('Erreur lors du chargement du profil:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserProfile();
    }, [userId, currentUser?.id]);

    useEffect(() => {
        const handleResize = () => {
            if (user?.biography) {
                setFormattedBiography(formatContent(user.biography));
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [user?.biography]);

    const handleToggleFollow = async () => {
        if (!currentUser || currentUser.id === userId) return;

        // Si l'utilisateur cible a bloqué l'utilisateur courant, ne pas permettre le suivi
        if (isBlockedByUser) {
            alert("Vous ne pouvez pas suivre cet utilisateur car il vous a bloqué.");
            return;
        }

        try {
            if (isFollowing) {
                // Ouvrir la modal de confirmation pour ne plus suivre
                setConfirmUnfollowOpen(true);
            } else if (isPending) {
                // Si en attente, annuler la demande
                const result = await toggleFollow(userId);
                setIsPending(result.isPending);
                setIsFollowing(result.isFollowing);
            } else {
                // Suivre directement
                const result = await toggleFollow(userId);
                setIsFollowing(result.isFollowing);
                setIsPending(result.isPending);

                // Recharger les posts si l'utilisateur est en mode privé et qu'on vient de le suivre
                if (result.isFollowing && user?.isPrivate) {
                    const postsData = await fetchUserPosts(userId);
                    setPosts(postsData.posts);
                }
            }
        } catch (error) {
            console.error('Erreur lors du changement de statut de suivi:', error);
        }
    };

    const handleToggleBlock = async () => {
        if (!currentUser || currentUser.id === userId) return;

        try {
            if (isBlocked) {
                // Débloquer directement
                const result = await toggleBlockUser(userId);
                setIsBlocked(result.isBlocked);
            } else {
                // Ouvrir la modal de confirmation pour bloquer
                setConfirmBlockOpen(true);
            }
        } catch (error) {
            console.error('Erreur lors du changement de statut de blocage:', error);
        }
    };

    const confirmUnfollow = async () => {
        try {
            const result = await toggleFollow(userId);
            setIsFollowing(result.isFollowing);
            setIsPending(result.isPending);

            // Si on ne suit plus un utilisateur privé, vider les posts
            if (!result.isFollowing && user?.isPrivate) {
                setPosts([]);
            }

            setConfirmUnfollowOpen(false);
        } catch (error) {
            console.error('Erreur lors du désabonnement:', error);
        }
    };

    const confirmBlock = async () => {
        try {
            const result = await toggleBlockUser(userId);
            setIsBlocked(result.isBlocked);

            // Si le blocage a réussi, l'utilisateur ne suit plus l'utilisateur bloqué
            if (result.isBlocked && isFollowing) {
                setIsFollowing(false);
            }

            setConfirmBlockOpen(false);

            // Déclencher un événement personnalisé pour informer d'autres composants du changement de statut de blocage
            const blockEvent = new CustomEvent('userBlockStatusChanged', {
                detail: { userId, isBlocked: result.isBlocked }
            });
            window.dispatchEvent(blockEvent);
        } catch (error) {
            console.error('Erreur lors du blocage:', error);
        }
    };

    const handlePostUpdated = (updatedPost: Tweet) => {
        setPosts(prev => prev.map(post =>
            post.id === updatedPost.id ? updatedPost : post
        ));
    };

    const handleDeletePost = async (postId: number) => {
        try {
            await deletePost(postId);
            setPosts(prev => prev.filter(post => post.id !== postId));
        } catch (error) {
            console.error('Erreur lors de la suppression du post:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            </div>
        );
    }

    if (!user) {
        return <div>Utilisateur non trouvé</div>;
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto overflow-hidden bg-white shadow-xl min-h-screen">
            {/* Bouton de fermeture */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-gray-100 bg-white border border-gray-200 shadow-sm cursor-pointer"
                title="Fermer"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>

            {/* Bannière */}
            <div className="h-48 bg-gray-200 relative">
                {user.banner ? (
                    <img
                        src={getImageUrl(user.banner)}
                        alt="Bannière"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">Aucune bannière</span>
                    </div>
                )}

                {/* Photo de profil */}
                <div className="absolute -bottom-16 left-4">
                    <Avatar
                        src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                        alt={user.name || 'Avatar par défaut'}
                        size="lg"
                        className="border-4 border-white"
                    />
                </div>
            </div>

            {/* Informations de l'utilisateur */}
            <div className="mt-20 px-4">
                <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold">{user.name}</h1>
                        {currentUser && currentUser.id !== userId && !isBlockedByUser && (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    variant={isFollowing || isPending ? "outline" : "full"}
                                    onClick={handleToggleFollow}
                                    className="flex items-center justify-center space-x-2"
                                    disabled={isBlocked}
                                >
                                    {isFollowing ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                            <span>Ne plus suivre</span>
                                        </>
                                    ) : isPending ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>En attente...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Suivre</span>
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant={isBlocked ? "danger" : "outline"}
                                    onClick={handleToggleBlock}
                                    className="flex items-center justify-center space-x-2"
                                >
                                    {isBlocked ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <span>Débloquer</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                            <span>Bloquer</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                        {currentUser && currentUser.id === userId && (
                            <Button
                                variant="outline"
                                onClick={() => setShowFollowRequests(true)}
                                className="flex items-center justify-center space-x-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span>Demandes d'abonnement</span>
                            </Button>
                        )}
                        {currentUser && currentUser.id !== userId && isBlockedByUser && (
                            <div className="flex items-center text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>Vous êtes bloqué par cet utilisateur</span>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-500">@{user.mention}</p>
                    <p className="text-gray-700 whitespace-pre-line">{formattedBiography || 'Aucune biographie'}</p>
                </div>
            </div>

            {/* Tweets */}
            <div className="mt-8 divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
                {/* Si l'utilisateur courant a bloqué ou est bloqué par cet utilisateur, afficher un message */}
                {(isBlocked || isBlockedByUser) ? (
                    <div className="p-4 text-center text-gray-500">
                        {isBlocked
                            ? "Vous avez bloqué cet utilisateur. Ses posts ne sont pas visibles."
                            : "Vous êtes bloqué par cet utilisateur. Ses posts ne sont pas visibles."}
                    </div>
                ) : user.isPrivate && (!currentUser || user.id !== currentUser.id && !isFollowing) ? (
                    <div className="p-8 text-center">
                        <div className="mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Ce compte est privé</h3>
                        <p className="mt-2 text-gray-500">
                            Suivez cet utilisateur pour voir ses posts.
                        </p>
                    </div>
                ) : (
                    <>
                        {posts.map((post) => (
                            <div key={post.id}>
                                <TweetCard
                                    tweet={post}
                                    onDelete={handleDeletePost}
                                    onPostUpdated={handlePostUpdated}
                                />
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                                Aucun post
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de confirmation de désabonnement */}
            <ConfirmModal
                isOpen={confirmUnfollowOpen}
                onClose={() => setConfirmUnfollowOpen(false)}
                onConfirm={confirmUnfollow}
                title="Ne plus suivre"
                message="Êtes-vous sûr de vouloir arrêter de suivre cet utilisateur ?"
                confirmText="Ne plus suivre"
                variant="full"
            />

            {/* Modal de confirmation de blocage */}
            <ConfirmModal
                isOpen={confirmBlockOpen}
                onClose={() => setConfirmBlockOpen(false)}
                onConfirm={confirmBlock}
                title="Bloquer l'utilisateur"
                message={`Êtes-vous sûr de vouloir bloquer ${user.name} ? Vous ne verrez plus ses posts et il ne pourra plus interagir avec vos posts.`}
                confirmText="Bloquer"
                variant="danger"
            />

            {/* Modal des demandes d'abonnement */}
            {showFollowRequests && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl mx-auto my-auto bg-white rounded-lg shadow-xl">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Demandes d'abonnement</h2>
                            <button
                                onClick={() => setShowFollowRequests(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <FollowRequests />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 