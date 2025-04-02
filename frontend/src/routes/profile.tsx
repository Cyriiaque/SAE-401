import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import EditProfileModal from '../components/EditProfileModal';
import {
    fetchUserPosts,
    Tweet,
    deletePost,
    updateUser,
    getImageUrl,
    fetchBlockedUsers,
    toggleBlockUser,
    togglePinPost
} from '../lib/loaders';
import UserProfile from '../components/UserProfile';
import { User } from '../lib/loaders';

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
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(false);
    const [formattedBiography, setFormattedBiography] = useState(user?.biography ? formatContent(user.biography) : '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
    const [pinnedPost, setPinnedPost] = useState<Tweet | null>(null);
    const [regularPosts, setRegularPosts] = useState<Tweet[]>([]);

    const loadPosts = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await fetchUserPosts(user.id);

            // Séparer les posts épinglés des posts réguliers
            const pinned = response.posts.find(post => post.isPinned);
            const regular = response.posts.filter(post => !post.isPinned);

            setPinnedPost(pinned || null);
            setRegularPosts(regular);
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

            // Mettre à jour les états en fonction du post supprimé
            if (pinnedPost && pinnedPost.id === postToDelete) {
                setPinnedPost(null);
            }

            setRegularPosts(regularPosts.filter(post => post.id !== postToDelete));
            setPosts(posts.filter(post => post.id !== postToDelete));

            setDeleteDialogOpen(false);
            setPostToDelete(null);
        } catch (error) {
            console.error('Erreur lors de la suppression du post:', error);
        }
    };

    const handleTogglePin = async (postId: number) => {
        try {
            const result = await togglePinPost(postId);

            // Si on vient d'épingler un post
            if (result.isPinned) {
                // Trouver le post qui vient d'être épinglé
                const newPinnedPost = posts.find(p => p.id === postId);
                if (newPinnedPost) {
                    // Mettre à jour le post avec isPinned = true
                    const updatedPost = { ...newPinnedPost, isPinned: true };

                    // Définir ce post comme le pinnedPost
                    setPinnedPost(updatedPost);

                    // Retirer ce post des posts réguliers
                    setRegularPosts(regularPosts.filter(p => p.id !== postId));

                    // Mettre à jour la liste complète
                    setPosts(posts.map(p => p.id === postId ? updatedPost : { ...p, isPinned: false }));
                }
            } else {
                // Si on vient de désépingler un post
                if (pinnedPost && pinnedPost.id === postId) {
                    // Créer une version désépinglée du post
                    const unpinnedPost = { ...pinnedPost, isPinned: false };

                    // Ajouter ce post aux posts réguliers
                    setRegularPosts([unpinnedPost, ...regularPosts]);

                    // Supprimer le post épinglé
                    setPinnedPost(null);

                    // Mettre à jour la liste complète
                    setPosts(posts.map(p => p.id === postId ? unpinnedPost : p));
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'épinglage/désépinglage du post:', error);
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

    const handleUpdateProfile = async (updatedUser: Partial<User>) => {
        if (!user) return;

        try {
            const updatedUserData = await updateUser(user.id, updatedUser);

            // Mettre à jour le localStorage avec toutes les informations de l'utilisateur
            const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
            const mergedUserData = {
                ...currentUserData,
                ...updatedUserData,
                avatar: updatedUserData.avatar || currentUserData.avatar,
                banner: updatedUserData.banner || currentUserData.banner,
                biography: updatedUserData.biography || currentUserData.biography,
                email: updatedUserData.email || currentUserData.email,
                id: updatedUserData.id || currentUserData.id,
                isVerified: updatedUserData.isVerified ?? currentUserData.isVerified,
                isbanned: updatedUserData.isbanned ?? currentUserData.isbanned,
                mention: updatedUserData.mention || currentUserData.mention,
                name: updatedUserData.name || currentUserData.name,
                postReload: updatedUserData.postReload ?? currentUserData.postReload,
                roles: updatedUserData.roles || currentUserData.roles
            };

            localStorage.setItem('user', JSON.stringify(mergedUserData));

            // Mettre à jour l'utilisateur dans le contexte d'authentification
            setUser(mergedUserData);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
        }
    };

    const loadBlockedUsers = async () => {
        if (!user) return;

        setLoadingBlockedUsers(true);
        try {
            const response = await fetchBlockedUsers();
            setBlockedUsers(response.blockedUsers);
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs bloqués:', error);
        } finally {
            setLoadingBlockedUsers(false);
        }
    };

    const handleToggleBlockedUsersList = async () => {
        setShowBlockedUsers(!showBlockedUsers);

        // Charger la liste des utilisateurs bloqués si elle n'a pas déjà été chargée
        if (!showBlockedUsers && blockedUsers.length === 0) {
            await loadBlockedUsers();
        }
    };

    const handleUnblockUser = async (userId: number) => {
        try {
            await toggleBlockUser(userId);
            // Actualiser la liste des utilisateurs bloqués
            await loadBlockedUsers();

            // Déclencher un événement personnalisé pour informer d'autres composants du changement de statut de blocage
            const blockEvent = new CustomEvent('userBlockStatusChanged', {
                detail: { userId, isBlocked: false }
            });
            window.dispatchEvent(blockEvent);
        } catch (error) {
            console.error('Erreur lors du déblocage de l\'utilisateur:', error);
        }
    };

    useEffect(() => {
        if (user) {
            // Mettre à jour la biographie formatée
            setFormattedBiography(user.biography ? formatContent(user.biography) : '');

            // Recharger les posts
            loadPosts();
        }
    }, [user]);

    useEffect(() => {
        const handleTweetPublished = (event: CustomEvent<Tweet>) => {
            const newTweet = event.detail;
            if (newTweet.user?.id === user?.id) {
                setRegularPosts(prevPosts => [newTweet, ...prevPosts]);
                setPosts(prevPosts => [newTweet, ...prevPosts]);
            }
        };

        const handleRetweetCreated = (event: CustomEvent<Tweet>) => {
            const newRetweet = event.detail;
            // Si l'utilisateur actuel est celui qui a retweeté
            if (newRetweet.retweetedBy?.id === user?.id) {
                setRegularPosts(prevPosts => [newRetweet, ...prevPosts]);
                setPosts(prevPosts => [newRetweet, ...prevPosts]);
            }
        };

        window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
        window.addEventListener('retweetCreated', handleRetweetCreated as EventListener);

        return () => {
            window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
            window.removeEventListener('retweetCreated', handleRetweetCreated as EventListener);
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

    const PinButton = ({ post }: { post: Tweet }) => (
        <button
            onClick={() => handleTogglePin(post.id)}
            className="flex items-center text-gray-500 hover:text-orange transition-colors"
            title={post.isPinned ? "Désépingler" : "Épingler sur le profil"}
        >
            {post.isPinned ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.447 9.559a1.8 1.8 0 0 1-.25.82a2 2 0 0 1-.56.63a.7.7 0 0 1-.34.13l-1.76.23a1 1 0 0 0-.52.26c-.53.51-1.07 1-1.81 1.78l-.85.84a.93.93 0 0 0-.23.41l-.94 3.78a.6.6 0 0 1 0 .12a2 2 0 0 1-1.44 1.15h-.36a2.3 2.3 0 0 1-.58-.08a1.94 1.94 0 0 1-.81-.49l-2.54-2.53l-4.67 4.67a.75.75 0 0 1-1.06-1.06l4.67-4.67l-2.5-2.5a2 2 0 0 1-.48-.82a1.8 1.8 0 0 1-.05-.95a1.94 1.94 0 0 1 .39-.85a2 2 0 0 1 .75-.58h.12l3.74-1a1 1 0 0 0 .44-.25c1.39-1.37 1.87-1.85 2.63-2.67a.86.86 0 0 0 .23-.5l.24-1.77a.7.7 0 0 1 .13-.35a2 2 0 0 1 2.28-.69a2 2 0 0 1 .72.46l4.88 4.9a2 2 0 0 1 .57 1.55z" />
                    </svg>
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m17.942 6.076l2.442 2.442a1.22 1.22 0 0 1-.147 1.855l-1.757.232a1.7 1.7 0 0 0-.94.452c-.72.696-1.453 1.428-2.674 2.637c-.21.212-.358.478-.427.769l-.94 3.772a1.22 1.22 0 0 1-1.978.379l-3.04-3.052l-3.052-3.04a1.22 1.22 0 0 1 .379-1.978l3.747-.964a1.8 1.8 0 0 0 .77-.44c1.379-1.355 1.88-1.855 2.66-2.698c.233-.25.383-.565.428-.903l.232-1.783a1.22 1.22 0 0 1 1.856-.146zm-9.51 9.498L3.256 20.75" />
                    </svg>
                </>
            )}
        </button>
    );

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-2xl mx-auto">
                    {/* En-tête mobile */}
                    <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex-1 text-center">
                                <h1 className="ml-8 text-xl font-bold">Profil</h1>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    onClick={() => setIsEditProfileModalOpen(true)}
                                    variant="outline"
                                    className="p-2"
                                    title="Éditer le profil"
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
                                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                        />
                                    </svg>
                                </Button>
                                <Button
                                    onClick={refreshPosts}
                                    variant="outline"
                                    className="p-2"
                                    title="Rafraîchir les posts"
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
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* En-tête desktop */}
                    <div className="hidden lg:block border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex-1 pl-4">
                                <h1 className="text-xl font-bold">Profil</h1>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    onClick={() => setIsEditProfileModalOpen(true)}
                                    variant="outline"
                                    className="flex items-center gap-2"
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
                                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                        />
                                    </svg>
                                    Éditer le profil
                                </Button>
                                <Button
                                    onClick={refreshPosts}
                                    variant="outline"
                                    className="flex items-center gap-2"
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
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Bannière */}
                        <div className="h-48 bg-gray-200">
                            {user.banner ? (
                                <img
                                    src={getImageUrl(user.banner) || ''}
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
                                src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
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

                            {/* Bouton pour afficher les utilisateurs bloqués */}
                            <div className="mt-4 flex justify-end">
                                <Button
                                    onClick={handleToggleBlockedUsersList}
                                    variant={showBlockedUsers ? "danger" : "outline"}
                                    className="flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    {showBlockedUsers ? "Masquer les utilisateurs bloqués" : "Afficher les utilisateurs bloqués"}
                                </Button>
                            </div>

                            {/* Liste des utilisateurs bloqués */}
                            {showBlockedUsers && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <h2 className="text-lg font-semibold mb-4">Utilisateurs bloqués</h2>

                                    {loadingBlockedUsers ? (
                                        <div className="flex justify-center p-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange"></div>
                                        </div>
                                    ) : blockedUsers.length === 0 ? (
                                        <p className="text-gray-500 text-center">Vous n'avez bloqué aucun utilisateur</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {blockedUsers.map(blockedUser => (
                                                <li key={blockedUser.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleUserProfileClick(blockedUser.id)}>
                                                        <img
                                                            src={blockedUser.avatar ? getImageUrl(blockedUser.avatar) : '/default_pp.webp'}
                                                            alt={`Avatar de ${blockedUser.name}`}
                                                            className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                                                        />
                                                        <div>
                                                            <div className="font-medium">{blockedUser.name}</div>
                                                            <div className="text-sm text-gray-500">@{blockedUser.mention}</div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleUnblockUser(blockedUser.id)}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Débloquer
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tweets épinglés */}
                    {pinnedPost && (
                        <div className="mt-6">
                            <div className="px-4 py-2 text-sm font-medium text-gray-600 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-orange" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21.447 9.559a1.8 1.8 0 0 1-.25.82a2 2 0 0 1-.56.63a.7.7 0 0 1-.34.13l-1.76.23a1 1 0 0 0-.52.26c-.53.51-1.07 1-1.81 1.78l-.85.84a.93.93 0 0 0-.23.41l-.94 3.78a.6.6 0 0 1 0 .12a2 2 0 0 1-1.44 1.15h-.36a2.3 2.3 0 0 1-.58-.08a1.94 1.94 0 0 1-.81-.49l-2.54-2.53l-4.67 4.67a.75.75 0 0 1-1.06-1.06l4.67-4.67l-2.5-2.5a2 2 0 0 1-.48-.82a1.8 1.8 0 0 1-.05-.95a1.94 1.94 0 0 1 .39-.85a2 2 0 0 1 .75-.58h.12l3.74-1a1 1 0 0 0 .44-.25c1.39-1.37 1.87-1.85 2.63-2.67a.86.86 0 0 0 .23-.5l.24-1.77a.7.7 0 0 1 .13-.35a2 2 0 0 1 2.28-.69a2 2 0 0 1 .72.46l4.88 4.9a2 2 0 0 1 .57 1.55z" />
                                </svg>
                                Post épinglé
                            </div>
                            <div className="border-b border-gray-200">
                                <div className="relative">
                                    <div className="absolute right-4 top-4 z-10">
                                        <PinButton post={pinnedPost} />
                                    </div>
                                    <TweetCard
                                        tweet={pinnedPost}
                                        onDelete={handleDeleteClick}
                                        onUserProfileClick={handleUserProfileClick}
                                        onPostUpdated={(updatedTweet) => {
                                            // Mettre à jour le tweet épinglé
                                            setPinnedPost(updatedTweet);
                                            setPosts(prev => prev.map(p => p.id === updatedTweet.id ? updatedTweet : p));
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tweets réguliers */}
                    <div className="mt-4">
                        {regularPosts.length === 0 && !pinnedPost && !loading ? (
                            <div className="text-center text-gray-500 py-8">
                                Aucun post à afficher
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {regularPosts.map((post) => (
                                    <div key={post.id} className="relative">
                                        <div className="absolute right-4 top-4 z-10">
                                            <PinButton post={post} />
                                        </div>
                                        <TweetCard
                                            tweet={post}
                                            onDelete={handleDeleteClick}
                                            onUserProfileClick={handleUserProfileClick}
                                            onPostUpdated={(updatedTweet) => {
                                                setRegularPosts(prev => prev.map(p => p.id === updatedTweet.id ? updatedTweet : p));
                                                setPosts(prev => prev.map(p => p.id === updatedTweet.id ? updatedTweet : p));
                                            }}
                                        />
                                    </div>
                                ))}
                                {loading && (
                                    <div className="p-4 text-center text-gray-500">
                                        Chargement...
                                    </div>
                                )}
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
                <div
                    className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto"
                    onClick={handleCloseUserProfile}
                >
                    <div
                        className="w-full max-w-2xl mx-auto my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <UserProfile
                            userId={selectedUserId}
                            onClose={handleCloseUserProfile}
                        />
                    </div>
                </div>
            )}

            {/* Modal d'édition de profil */}
            {user && (
                <EditProfileModal
                    isOpen={isEditProfileModalOpen}
                    onClose={() => setIsEditProfileModalOpen(false)}
                    user={user}
                    onSave={handleUpdateProfile}
                />
            )}
        </div>
    );
} 