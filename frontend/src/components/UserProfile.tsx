import { useState, useEffect } from 'react';
import { User, fetchUserPosts, Tweet, fetchUserProfile, checkFollowStatus, toggleFollow, getImageUrl, deletePost } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import TweetCard from './TweetCard';
import ConfirmModal from './ConfirmModal';

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
    const [confirmUnfollowOpen, setConfirmUnfollowOpen] = useState(false);

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

                // Vérifier le statut de suivi
                if (currentUser && currentUser.id !== userId) {
                    const followStatus = await checkFollowStatus(userId);
                    setIsFollowing(followStatus.isFollowing);
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

        try {
            if (isFollowing) {
                // Ouvrir la modal de confirmation pour ne plus suivre
                setConfirmUnfollowOpen(true);
            } else {
                // Suivre directement
                const result = await toggleFollow(userId);
                setIsFollowing(result.isFollowing);
            }
        } catch (error) {
            console.error('Erreur lors du changement de statut de suivi:', error);
        }
    };

    const confirmUnfollow = async () => {
        try {
            const result = await toggleFollow(userId);
            setIsFollowing(result.isFollowing);
            setConfirmUnfollowOpen(false);
        } catch (error) {
            console.error('Erreur lors du désabonnement:', error);
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
        <div className="fixed inset-0 overflow-y-auto">
            <div className="min-h-screen text-center">
                <div className="fixed inset-0" onClick={onClose}></div>
                <div className="relative inline-block w-full max-w-2xl transform overflow-hidden bg-white text-left align-middle shadow-xl transition-all h-full min-h-screen">
                    {/* Bouton de fermeture */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-50 p-2 rounded-full hover:bg-gray-100 bg-white border border-gray-200 shadow-sm cursor-pointer"
                        title="Retour"
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
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
                            <img
                                src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                                alt={user.name || 'Avatar par défaut'}
                                className="w-32 h-32 rounded-full border-4 border-white object-cover"
                            />
                        </div>
                    </div>

                    {/* Informations de l'utilisateur */}
                    <div className="mt-15 px-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                                <h1 className="text-xl font-bold">{user.name}</h1>
                                {currentUser && currentUser.id !== userId && (
                                    <Button
                                        variant="full"
                                        onClick={handleToggleFollow}
                                        className="flex items-center space-x-2"
                                    >
                                        {isFollowing ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                </svg>
                                                <span>Ne plus suivre</span>
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
                                )}
                            </div>
                            <p className="text-gray-500">@{user.mention}</p>
                            <p className="text-gray-700 whitespace-pre-line">{formattedBiography || 'Aucune biographie'}</p>
                        </div>
                    </div>

                    {/* Tweets */}
                    <div className="mt-8 divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
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
                    </div>
                </div>
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
        </div>
    );
} 