import { useEffect, useState, useRef, useCallback } from 'react';
import { User, fetchUsers, updateUser, banUser, getImageUrl, fetchAllPosts, Tweet, togglePostCensorship, searchPosts, deletePost } from '../lib/loaders';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import EditUserModal from '../components/EditUserModal';
import ConfirmModal from '../ui/ConfirmModal';
import TweetCard from '../components/TweetCard';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [confirmBanModalOpen, setConfirmBanModalOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<User | null>(null);
    const [confirmCensorshipModalOpen, setConfirmCensorshipModalOpen] = useState(false);
    const [postToCensor, setPostToCensor] = useState<Tweet | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const lastPostElementRef = useRef<HTMLDivElement | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchMode, setSearchMode] = useState<boolean>(false);
    const [bannedPostsCount, setBannedPostsCount] = useState(0);
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Tweet | null>(null);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        } else if (activeTab === 'content') {
            if (!searchMode || searchQuery.trim() === '') {
                loadPosts();
            }
        }
    }, [activeTab]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            setError('Erreur lors du chargement des utilisateurs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async (pageNum: number = 1, append: boolean = false) => {
        if (pageNum === 1) {
            setLoadingPosts(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);
        setSearchMode(false);
        try {
            const data = await fetchAllPosts(pageNum);

            // Filtrer les posts des utilisateurs bannis
            const bannedPosts = data.posts.filter(post => post.user && post.user.isbanned);
            const filteredPosts = data.posts.filter(post => {
                return !(post.user && post.user.isbanned);
            });

            // Mettre à jour le compteur si c'est une première page ou un ajout
            if (pageNum === 1) {
                setBannedPostsCount(bannedPosts.length);
            } else if (append) {
                setBannedPostsCount(prev => prev + bannedPosts.length);
            }

            if (append) {
                setPosts(prev => [...prev, ...filteredPosts]);
            } else {
                setPosts(filteredPosts);
            }
            setHasMore(data.next_page !== null);
            setPage(pageNum);
        } catch (err) {
            console.error('Erreur détaillée:', err);
            if (err instanceof Error) {
                setError(`Erreur lors du chargement des posts: ${err.message}`);
            } else {
                setError('Erreur inconnue lors du chargement des posts');
            }
        } finally {
            setLoadingPosts(false);
            setLoadingMore(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim() === '') {
            loadPosts();
            return;
        }

        setIsSearching(true);
        setError(null);
        try {
            const data = await searchPosts(searchQuery);

            // Filtrer les posts des utilisateurs bannis
            const bannedPosts = data.posts.filter(post => post.user && post.user.isbanned);
            const filteredPosts = data.posts.filter(post => {
                return !(post.user && post.user.isbanned);
            });

            // Mettre à jour le compteur
            setBannedPostsCount(bannedPosts.length);

            setPosts(filteredPosts);
            setSearchMode(true);
            setHasMore(false);
        } catch (err) {
            console.error('Erreur lors de la recherche:', err);
            if (err instanceof Error) {
                setError(`Erreur lors de la recherche: ${err.message}`);
            } else {
                setError('Erreur inconnue lors de la recherche');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (e.target.value.trim() === '') {
            loadPosts();
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch();
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setBannedPostsCount(0);
        loadPosts();
    };

    const loadMorePosts = useCallback(() => {
        if (!loadingMore && hasMore && !searchMode) {
            const nextPage = page + 1;
            loadPosts(nextPage, true);
        }
    }, [loadingMore, hasMore, page, searchMode]);

    useEffect(() => {
        if (observer.current) {
            observer.current.disconnect();
        }

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !searchMode) {
                loadMorePosts();
            }
        });

        if (lastPostElementRef.current) {
            observer.current.observe(lastPostElementRef.current);
        }

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [loadMorePosts, hasMore, loadingMore, posts, searchMode]);

    if (!user?.roles?.includes('ROLE_ADMIN')) {
        navigate('/');
        return null;
    }

    const handleEdit = (user: User) => {
        setEditingUser(user);
    };

    const handleSave = async (updatedUser: User) => {
        try {
            const savedUser = await updateUser(updatedUser.id, updatedUser);
            setUsers(users.map(user =>
                user.id === savedUser.id ? savedUser : user
            ));
            localStorage.setItem('user', JSON.stringify(savedUser));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    const handleBan = async (user: User) => {
        setUserToBan(user);
        setConfirmBanModalOpen(true);
    };

    const handleBanUser = async (userToBan: User) => {
        try {
            await banUser(userToBan.id);
            const updatedUsers = users.map(user =>
                user.id === userToBan.id ? { ...user, isbanned: !user.isbanned } : user
            );
            setUsers(updatedUsers);
        } catch (error) {
            console.error('Erreur lors du bannissement:', error);
        }
    };

    const handleToggleCensorship = async (post: Tweet) => {
        setPostToCensor(post);
        setConfirmCensorshipModalOpen(true);
    };

    const handleCensorPost = async (post: Tweet) => {
        try {
            const result = await togglePostCensorship(post.id);
            const updatedPosts = posts.map(p =>
                p.id === post.id ? { ...p, isCensored: result.isCensored } : p
            );
            setPosts(updatedPosts);
            setConfirmCensorshipModalOpen(false);
        } catch (error) {
            console.error('Erreur lors de la censure:', error);
        }
    };

    const handleDelete = (postId: number) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            setPostToDelete(post);
            setConfirmDeleteModalOpen(true);
        }
    };

    const handleDeletePost = async (post: Tweet) => {
        try {
            await deletePost(post.id);
            // Supprimer le post de la liste
            setPosts(posts.filter(p => p.id !== post.id));
            setConfirmDeleteModalOpen(false);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* En-tête et onglets fixes */}
                    <div className="sticky top-0 bg-white z-20 shadow-sm transition-shadow duration-200">
                        {/* En-tête mobile */}
                        <div className="lg:hidden border-b border-gray-200">
                            <div className="p-4 flex items-center justify-center">
                                <h2 className="text-xl font-bold">Dashboard - Admin</h2>
                            </div>
                        </div>

                        {/* En-tête desktop */}
                        <div className="hidden lg:block border-b border-gray-200">
                            <div className="p-4">
                                <h2 className="text-xl font-bold text-center">Dashboard - Admin</h2>
                            </div>
                        </div>

                        {/* Onglets de navigation fixes */}
                        <div className="flex justify-center border-b border-gray-200 bg-white">
                            <div className="flex w-full max-w-md justify-center">
                                <button
                                    className={`py-4 px-6 font-medium text-center flex-1 transition-colors ${activeTab === 'users'
                                        ? 'text-orange border-b-2 border-orange bg-orange/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                    onClick={() => setActiveTab('users')}
                                >
                                    Gestion des Utilisateurs
                                </button>
                                <button
                                    className={`py-4 px-6 font-medium text-center flex-1 transition-colors ${activeTab === 'content'
                                        ? 'text-orange border-b-2 border-orange bg-orange/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    Gestion des Contenus
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contenu qui défile sous l'en-tête fixe */}
                    <div className="mt-4">
                        {activeTab === 'users' ? (
                            <>
                                {loading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center text-red-500 p-4">{error}</div>
                                ) : (
                                    <div className="mt-8">
                                        {/* Version mobile et tablette */}
                                        <div className="lg:hidden flex flex-col items-center space-y-6">
                                            {users.map((user) => (
                                                <div key={user.id} className={`bg-white rounded-lg shadow p-6 border ${user.isbanned ? 'border-red-500' : 'border-orange'} w-full max-w-md`}>
                                                    <div className="flex items-center space-x-4">
                                                        <img
                                                            src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                                                            alt={user.name || 'Avatar par défaut'}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div className="flex-1">
                                                            <h2 className="text-lg font-semibold">{user.name}</h2>
                                                            <p className="text-gray-500">@{user.mention}</p>
                                                            <p className="text-sm text-gray-500">{user.email}</p>
                                                            {user.isbanned && (
                                                                <span className="text-red-500 text-sm font-bold">Banni</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex justify-start space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(user)}
                                                        >
                                                            Modifier
                                                        </Button>
                                                        {!(user.roles ?? []).includes('ROLE_ADMIN') && (
                                                            <button
                                                                onClick={() => handleBan(user)}
                                                                className="text-red-500 hover:text-red-700 cursor-pointer"
                                                                title={user.isbanned ? 'Dé-bannir' : 'Bannir'}
                                                            >
                                                                {user.isbanned ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <circle cx="12" cy="12" r="10" fill="red" fillOpacity="0.2" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" stroke="red" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <circle cx="12" cy="12" r="10" fill="green" fillOpacity="0.2" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" stroke="green" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Version desktop */}
                                        <div className="hidden lg:block bg-white rounded-lg shadow-lg overflow-hidden border border-orange">
                                            <table className="min-w-full">
                                                <thead className="bg-gray-100 border-b border-orange">
                                                    <tr>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Mention</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Avatar</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
                                                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {users.map((user) => (
                                                        <tr key={user.id} className={`hover:bg-gray-50 ${user.isbanned ? 'bg-red-50' : ''}`}>
                                                            <td className="px-8 py-4 text-sm text-gray-900">{user.id}</td>
                                                            <td className="px-8 py-4 text-sm text-gray-900">{user.email}</td>
                                                            <td className="px-8 py-4 text-sm text-gray-900">{user.name}</td>
                                                            <td className="px-8 py-4 text-sm text-gray-900">@{user.mention}</td>
                                                            <td className="px-8 py-4">
                                                                <img
                                                                    src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                                                                    alt={user.name || 'Avatar par défaut'}
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                />
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                {user.isbanned ? (
                                                                    <span className="text-red-500 font-bold">Banni</span>
                                                                ) : (
                                                                    <span className="text-green-500">Actif</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 flex space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(user)}
                                                                >
                                                                    Modifier
                                                                </Button>
                                                                {!(user.roles ?? []).includes('ROLE_ADMIN') && (
                                                                    <button
                                                                        onClick={() => handleBan(user)}
                                                                        className="text-red-500 hover:text-red-700 cursor-pointer"
                                                                        title={user.isbanned ? 'Dé-bannir' : 'Bannir'}
                                                                    >
                                                                        {user.isbanned ? (
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <circle cx="12" cy="12" r="10" fill="red" fillOpacity="0.2" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" stroke="red" />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <circle cx="12" cy="12" r="10" fill="green" fillOpacity="0.2" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" stroke="green" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Onglet "Gestion des Contenus"
                            <>
                                {/* Barre de recherche pour les posts */}
                                <div className="mt-4 mb-4">
                                    <form onSubmit={handleSearchSubmit} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={handleSearchInputChange}
                                                placeholder="Rechercher dans les posts..."
                                                className="w-full p-2 pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                                                disabled={isSearching}
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    onClick={handleClearSearch}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <Button
                                            variant="full"
                                            type="submit"
                                            className="px-4 py-2"
                                            disabled={isSearching}
                                        >
                                            {isSearching ? (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Recherche...
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    Rechercher
                                                </div>
                                            )}
                                        </Button>
                                    </form>
                                </div>

                                {/* État de la recherche */}
                                {searchMode && (
                                    <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg mb-4">
                                        <div className="flex items-center">
                                            <span className="text-gray-600 mr-2">Résultats pour: </span>
                                            <span className="font-medium">{searchQuery}</span>
                                        </div>
                                        <button
                                            onClick={handleClearSearch}
                                            className="text-orange hover:text-orange-600 font-medium flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Effacer et afficher tout
                                        </button>
                                    </div>
                                )}

                                {/* Information sur les posts filtrés */}
                                {bannedPostsCount > 0 && (
                                    <div className="mb-4 p-3 bg-gray-100 rounded-lg text-gray-700">
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span>{bannedPostsCount} post{bannedPostsCount > 1 ? 's' : ''} d'utilisateurs bannis {bannedPostsCount > 1 ? 'ont été masqués' : 'a été masqué'}</span>
                                        </div>
                                    </div>
                                )}

                                {loadingPosts && posts.length === 0 ? (
                                    <div className="flex justify-center items-center h-64">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center text-red-500 p-4">{error}</div>
                                ) : (
                                    <div className="mt-2">
                                        <div className="bg-white rounded-lg overflow-hidden">
                                            <h3 className="text-lg font-semibold mb-4 pl-4">
                                                {searchMode
                                                    ? `${posts.length} post(s) trouvé(s)`
                                                    : 'Liste des posts'}
                                            </h3>

                                            {posts.length === 0 ? (
                                                <div className="text-center text-gray-500 py-8">
                                                    {searchMode
                                                        ? 'Aucun post ne correspond à votre recherche'
                                                        : 'Aucun post disponible'}
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-200">
                                                    {posts.map((post, index) => (
                                                        <div
                                                            key={post.id}
                                                            className="relative mb-6"
                                                            ref={index === posts.length - 1 ? lastPostElementRef : null}
                                                        >
                                                            {/* Actions de post - version desktop */}
                                                            <div className="absolute right-4 top-4 z-10 hidden sm:flex space-x-2">
                                                                <Button
                                                                    variant={post.isCensored ? "outline" : "danger"}
                                                                    size="sm"
                                                                    onClick={() => handleToggleCensorship(post)}
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    {post.isCensored ? (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            <span>Annuler la censure</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                                            </svg>
                                                                            <span>Censurer</span>
                                                                        </>
                                                                    )}
                                                                </Button>

                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(post.id)}
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    <span>Supprimer</span>
                                                                </Button>
                                                            </div>

                                                            {/* Actions de post - version mobile */}
                                                            <div className="sm:hidden flex flex-col space-y-2 mb-2">
                                                                <Button
                                                                    variant={post.isCensored ? "outline" : "danger"}
                                                                    size="sm"
                                                                    onClick={() => handleToggleCensorship(post)}
                                                                    className="flex items-center justify-center w-full space-x-2"
                                                                >
                                                                    {post.isCensored ? (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            <span>Annuler la censure</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                                            </svg>
                                                                            <span>Censurer</span>
                                                                        </>
                                                                    )}
                                                                </Button>

                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(post.id)}
                                                                    className="flex items-center justify-center w-full space-x-2"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    <span>Supprimer</span>
                                                                </Button>
                                                            </div>

                                                            <TweetCard
                                                                tweet={post}
                                                                onDelete={handleDelete}
                                                                onPostUpdated={() => { }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Indicateur de chargement pour la pagination infinie */}
                                            {loadingMore && (
                                                <div className="flex justify-center py-4">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
                                                    <span className="ml-2 text-gray-500">Chargement de plus de posts...</span>
                                                </div>
                                            )}

                                            {/* Message si aucun post n'est disponible */}
                                            {!loadingMore && posts.length === 0 && (
                                                <div className="text-center text-gray-500 py-8">
                                                    Aucun post disponible
                                                </div>
                                            )}

                                            {/* Message si tous les posts ont été chargés */}
                                            {!loadingMore && posts.length > 0 && !hasMore && (
                                                <div className="text-center text-gray-500 py-4">
                                                    Tous les posts ont été chargés
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSave}
                />
            )}

            <ConfirmModal
                isOpen={confirmBanModalOpen}
                onClose={() => setConfirmBanModalOpen(false)}
                onConfirm={() => {
                    handleBanUser(userToBan!);
                    setConfirmBanModalOpen(false);
                }}
                title={`${userToBan?.isbanned ? 'Débannir' : 'Bannir'} l'utilisateur`}
                message={`Êtes-vous sûr de vouloir ${userToBan?.isbanned ? 'débannir' : 'bannir'} cet utilisateur ?`}
                confirmText={userToBan?.isbanned ? 'Débannir' : 'Bannir'}
                variant="danger"
            />

            <ConfirmModal
                isOpen={confirmCensorshipModalOpen}
                onClose={() => setConfirmCensorshipModalOpen(false)}
                onConfirm={() => handleCensorPost(postToCensor!)}
                title={`${postToCensor?.isCensored ? 'Annuler la censure' : 'Censurer'} le post`}
                message={`Êtes-vous sûr de vouloir ${postToCensor?.isCensored ? 'annuler la censure de' : 'censurer'} ce post ?`}
                confirmText={postToCensor?.isCensored ? 'Annuler la censure' : 'Censurer'}
                variant="danger"
            />

            <ConfirmModal
                isOpen={confirmDeleteModalOpen}
                onClose={() => setConfirmDeleteModalOpen(false)}
                onConfirm={() => handleDeletePost(postToDelete!)}
                title="Supprimer le post"
                message="Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible."
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
