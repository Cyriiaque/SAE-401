import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import TweetCard from '../components/TweetCard';
import { fetchUserPosts, Tweet } from '../lib/loaders';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(false);

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

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [user?.id]);

    if (!user) {
        navigate('/signin');
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="relative">
                {/* Bannière */}
                <div className="h-48 bg-gray-200">
                    {user.banner && (
                        <img
                            src={user.banner}
                            alt="Bannière"
                            className="w-full h-full object-cover"
                        />
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
                <h1 className="text-xl font-bold">{user.name}</h1>
                <p className="text-gray-500">@{user.mention}</p>
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                    {user.biography || 'Aucune biographie'}
                </div>
            </div>

            {/* Tweets */}
            <div className="mt-8 divide-y divide-gray-200">
                {posts.map((post) => (
                    <TweetCard key={post.id} tweet={post} />
                ))}
                {loading && (
                    <div className="p-4 text-center text-gray-500">
                        Chargement...
                    </div>
                )}
            </div>
        </div>
    );
} 