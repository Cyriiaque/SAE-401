import { useState, useEffect } from 'react';
import { User, fetchUserPosts, Tweet, fetchUserProfile } from '../lib/loaders';
import Button from '../ui/buttons';
import TweetCard from './TweetCard';

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
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(true);
    const [formattedBiography, setFormattedBiography] = useState('');

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
            } catch (error) {
                console.error('Erreur lors du chargement du profil:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserProfile();
    }, [userId]);

    useEffect(() => {
        const handleResize = () => {
            if (user?.biography) {
                setFormattedBiography(formatContent(user.biography));
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [user?.biography]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F05E1D]"></div>
            </div>
        );
    }

    if (!user) {
        return <div>Utilisateur non trouvé</div>;
    }

    return (
        <div className="fixed inset-0 overflow-y-auto">
            <div className="min-h-screen text-center">
                <div className="fixed inset-0 bg-black/30" onClick={onClose}></div>
                <div className="relative inline-block w-full max-w-2xl transform overflow-hidden bg-white text-left align-middle shadow-xl transition-all">
                    {/* Bouton de fermeture */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-50 p-2 rounded-full hover:bg-gray-100 bg-white border border-gray-200 shadow-sm"
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

                        {/* Photo de profil */}
                        <div className="absolute -bottom-16 left-4">
                            <img
                                src={user.avatar || '/default_pp.webp'}
                                alt={user.name || 'Avatar par défaut'}
                                className="w-32 h-32 rounded-full border-4 border-white object-cover"
                            />
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
                    <div className="mt-8 divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
                        {posts.map((post) => (
                            <div key={post.id}>
                                <TweetCard tweet={post} />
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
        </div>
    );
} 