import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import { fetchUserPosts, Tweet, deletePost } from '../lib/loaders';
import UserProfile from '../components/UserProfile';

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

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(false);
    const [formattedBiography, setFormattedBiography] = useState(user?.biography ? formatContent(user.biography) : '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const loadPosts = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await fetchUserPosts(user.id);
            setPosts(response.posts);
        } catch (error) {
            console.error('Erreur lors du chargement des posts:', error);
        }
        setLoading(false);
    };

    const handleDeleteClick = (postId: number) => {
        setPostToDelete(postId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!postToDelete) return;

        try {
            await deletePost(postToDelete);
            setPosts(posts.filter(post => post.id !== postToDelete));
            setDeleteDialogOpen(false);
            setPostToDelete(null);
        } catch (error) {
            console.error('Erreur lors de la suppression du post:', error);
        }
    };

    const refreshPosts = () => {
        loadPosts();
    };

    const handleUserProfileClick = (userId: number) => {
        setSelectedUserId(userId);
    };

    const handleCloseUserProfile = () => {
        setSelectedUserId(null);
    };

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [user?.id]);

    useEffect(() => {
        const handleTweetPublished = (event: CustomEvent<Tweet>) => {
            const newTweet = event.detail;
            if (newTweet.user?.id === user?.id) {
                setPosts(prevPosts => [newTweet, ...prevPosts]);
            }
        };

        window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
        return () => {
            window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
        };
    }, [user?.id]);

    useEffect(() => {
        const handleResize = () => {
            if (user?.biography) {
                setFormattedBiography(formatContent(user.biography));
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [user?.biography]);

    if (!user) {
        navigate('/signin');
        return null;
    }

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-2xl mx-auto">
                    {/* En-tête mobile */}
                    <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex-1 text-center">
                                <h1 className="text-xl font-bold">Profil</h1>
                            </div>
                            <button
                                onClick={refreshPosts}
                                className="p-2 rounded-full hover:bg-gray-100"
                                title="Rafraîchir les posts"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5 text-[#F05E1D]"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.990"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* En-tête desktop */}
                    <div className="hidden lg:block border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex-1 text-center">
                                <h1 className="text-xl font-bold">Profil</h1>
                            </div>
                            <button
                                onClick={refreshPosts}
                                className="flex items-center gap-2 px-4 py-2 border border-[#F05E1D] rounded-full text-[#F05E1D] hover:bg-[#F05E1D]/10"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.990"
                                    />
                                </svg>
                                Rafraîchir les posts
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Bannière */}
                        <div className="h-48 bg-gray-200">
                            {user.banner ? (
                                <img
                                    src={user.banner}
                                    alt="Bannière"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error('Erreur de chargement de la bannière:', e);
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400">Aucune bannière</span>
                                </div>
                            )}
                        </div>

                        {/* Photo de profil */}
                        <div className="absolute -bottom-16 left-4">
                            <img
                                src={user.avatar || '/default_pp.webp'}
                                alt={user.name || 'Avatar par défaut'}
                                className="w-32 h-32 rounded-full border-4 border-white object-cover"
                            />
                        </div>

                        {/* Bouton de modification du profil */}
                        <div className="absolute top-4 right-4">
                            <Button
                                variant="outline"
                                size="default"
                                onClick={() => {/* TODO: Implémenter la modification du profil */ }}
                            >
                                Modifier le profil
                            </Button>
                        </div>
                    </div>

                    {/* Informations de l'utilisateur */}
                    <div className="mt-20 px-4">
                        <div className="flex flex-col space-y-2">
                            <h1 className="text-xl font-bold">{user.name}</h1>
                            <p className="text-gray-500">@{user.mention}</p>
                            <p className="text-gray-700 whitespace-pre-line">{formattedBiography || 'Aucune biographie'}</p>
                        </div>
                    </div>

                    {/* Tweets */}
                    <div className="mt-8 divide-y divide-gray-200">
                        {posts.map((post) => (
                            <div key={post.id}>
                                <TweetCard
                                    tweet={post}
                                    onDelete={handleDeleteClick}
                                    onUserProfileClick={handleUserProfileClick}
                                />
                            </div>
                        ))}
                        {loading && (
                            <div className="p-4 text-center text-gray-500">
                                Chargement...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setPostToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le post"
                message="Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible."
            />

            {/* Profil utilisateur */}
            {selectedUserId && (
                <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
                    <UserProfile
                        userId={selectedUserId}
                        onClose={handleCloseUserProfile}
                    />
                </div>
            )}
        </div>
    );
} 