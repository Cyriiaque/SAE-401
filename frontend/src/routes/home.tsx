import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import { fetchPosts, Tweet, fetchFollowedPosts, getImageUrl, fetchBlockedUsers, User, searchPosts, fetchUsersByQuery } from '../lib/loaders';
import UserProfile from '../components/UserProfile';
import Button from '../ui/buttons';
import Header from '../components/Header';

interface PostsResponse {
  posts: Tweet[];
  previous_page: number | null;
  next_page: number | null;
}

// Composant pour l'en-tête
const HomeHeader = ({ refreshPosts }: { refreshPosts: () => void }) => {
  return (
    <Header title="Accueil">
      <Button
        onClick={refreshPosts}
        variant="outline"
        className="p-2 lg:flex lg:items-center lg:gap-2"
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
        <span className="hidden lg:inline">Rafraîchir les posts</span>
      </Button>
    </Header>
  );
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Tweet[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'actualite' | 'suivis'>('actualite');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les filtres
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [moderationFilterCount, setModerationFilterCount] = useState<number>(0);

  // États pour la recherche d'utilisateurs
  const [searchResults, setSearchResults] = useState<{ users: User[], posts: Tweet[] }>({ users: [], posts: [] });

  // Effet pour bloquer/débloquer le scroll du body
  useEffect(() => {
    if (selectedUserId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Nettoyer l'effet lors du démontage
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedUserId]);

  // Récupérer la liste des utilisateurs bloqués au chargement
  useEffect(() => {
    const getBlockedUsers = async () => {
      if (user) {
        try {
          const response = await fetchBlockedUsers();
          setBlockedUsers(response.blockedUsers);
        } catch (error) {
          console.error('Erreur lors de la récupération des utilisateurs bloqués:', error);
        }
      }
    };

    getBlockedUsers();
  }, [user]);

  useEffect(() => {
    // Extraire un éventuel paramètre de recherche de l'URL
    const params = new URLSearchParams(location.search);
    const hashtagParam = params.get('q');

    // Si un hashtag est présent dans l'URL, lancer la recherche
    if (hashtagParam) {
      setSearchQuery(hashtagParam);
      setSearchMode(true);

      // On utilise un setTimeout pour s'assurer que les états sont bien mis à jour
      setTimeout(() => {
        handleSearch();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // Réagir aux changements dans l'URL avec location.search

  const loadPosts = async (pageNumber: number = 1) => {
    if (!user || !hasMore) return;

    setLoading(true);
    setError(null);
    try {
      let response: PostsResponse;
      if (activeTab === 'actualite') {
        response = await fetchPosts(pageNumber);
      } else {
        response = await fetchFollowedPosts(pageNumber);
      }

      // Filtrer les posts pour exclure ceux des utilisateurs bloqués
      const blockedUserIds = blockedUsers.map(blockedUser => blockedUser.id);
      const filteredPosts = response.posts.filter(post =>
        post.user && !blockedUserIds.includes(post.user.id)
      );

      if (pageNumber === 1) {
        setPosts(filteredPosts);
      } else {
        setPosts(prev => [...prev, ...filteredPosts]);
      }
      setHasMore(!!response.next_page);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
      setError('Erreur lors du chargement des posts');
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (searchQuery.trim() === '' && !dateFilter && !contentTypeFilter && !userFilter) {
      loadPosts(1);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results: { users: User[], posts: Tweet[] } = { users: [], posts: [] };

      // Recherche de posts
      const postsData = await searchPosts(searchQuery);

      // Application des filtres côté client
      let filteredPosts = postsData.posts;

      // Compter le nombre de posts avant filtrage de modération
      const totalPostsBeforeModeration = filteredPosts.length;

      // Filtrer les posts des utilisateurs bannis et les posts censurés
      filteredPosts = filteredPosts.filter(post => {
        // Exclure les posts des utilisateurs bannis
        if (post.user && 'isbanned' in post.user && post.user.isbanned) {
          return false;
        }
        // Exclure les posts des utilisateurs en mode privé
        if (post.user && 'isPrivate' in post.user && post.user.isPrivate) {
          return false;
        }
        // Exclure les posts censurés
        if (post.isCensored) {
          return false;
        }
        return true;
      });

      // Calculer le nombre de posts exclus par la modération
      const postsExcludedByModeration = totalPostsBeforeModeration - filteredPosts.length;
      // Mettre à jour l'état avec le nombre de posts exclus par modération
      setModerationFilterCount(postsExcludedByModeration);

      // Filtre par date (hypothétique - à adapter selon le format des dates)
      if (dateFilter) {
        const dateLimit = new Date(dateFilter);
        filteredPosts = filteredPosts.filter(post => {
          const postDate = new Date(post.created_at);
          return postDate >= dateLimit;
        });
      }

      // Filtre par type de contenu
      if (contentTypeFilter) {
        filteredPosts = filteredPosts.filter(post => {
          if (contentTypeFilter === 'media') {
            return post.mediaUrl && post.mediaUrl.trim() !== '';
          } else if (contentTypeFilter === 'text') {
            return !post.mediaUrl || post.mediaUrl.trim() === '';
          }
          return true;
        });
      }

      // Recherche d'utilisateurs
      const usersData = await fetchUsersByQuery(searchQuery);

      results.posts = filteredPosts;
      results.users = usersData;

      setSearchResults(results);
      setPosts(results.posts);
      setSearchMode(true);
      setHasMore(false);

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setError('Erreur lors de la recherche');
    }
    setIsSearching(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() === '' && !dateFilter && !contentTypeFilter && !userFilter) {
      loadPosts(1);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDateFilter('');
    setContentTypeFilter('');
    setUserFilter('');
    setModerationFilterCount(0);
    setSearchMode(false);
    setPosts([]);
    setPage(1);
    setHasMore(true);

    // Recharger complètement la page
    window.location.href = '/';
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Recharger les posts quand la liste des utilisateurs bloqués change
  useEffect(() => {
    if (user) {
      loadPosts(1);
    }
  }, [user?.id, activeTab, blockedUsers]);

  // Créer un Intersection Observer pour le chargement infini
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading && !searchMode) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  }, [hasMore, loading, page, activeTab, searchMode]);

  // Configurer l'Intersection Observer
  useEffect(() => {
    if (loadMoreTriggerRef.current) {
      observerRef.current = new IntersectionObserver(handleObserver, {
        root: null,
        rootMargin: '20px',
        threshold: 1.0
      });

      if (loadMoreTriggerRef.current) {
        observerRef.current.observe(loadMoreTriggerRef.current);
      }
    }

    // Nettoyer l'observer
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Mettre à jour la liste des utilisateurs bloqués lorsque le statut de blocage change
  useEffect(() => {
    const handleBlockStatusChanged = () => {
      // Recharger la liste des utilisateurs bloqués
      const updateBlockedUsers = async () => {
        try {
          const response = await fetchBlockedUsers();
          setBlockedUsers(response.blockedUsers);
        } catch (error) {
          console.error('Erreur lors du rechargement des utilisateurs bloqués:', error);
        }
      };

      updateBlockedUsers();
    };

    window.addEventListener('userBlockStatusChanged', handleBlockStatusChanged);
    return () => {
      window.removeEventListener('userBlockStatusChanged', handleBlockStatusChanged);
    };
  }, []);

  useEffect(() => {
    const handleTweetPublished = (event: CustomEvent<Tweet>) => {
      const newTweet = event.detail;

      // Vérifier si l'auteur du tweet n'est pas bloqué
      const blockedUserIds = blockedUsers.map(blockedUser => blockedUser.id);
      if (newTweet.user && !blockedUserIds.includes(newTweet.user.id)) {
        setPosts(prev => [newTweet, ...prev]);
      }
    };

    window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
    return () => {
      window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
    };
  }, [blockedUsers]);

  const refreshPosts = () => {
    handleClearSearch();
  };

  const handleUserProfileClick = (userId: number) => {
    setSelectedUserId(userId);
  };

  const handleCloseUserProfile = () => {
    setSelectedUserId(null);
  };

  const handleTabChange = (tab: 'actualite' | 'suivis') => {
    setActiveTab(tab);
    setPage(1);
    setHasMore(true);
    if (searchMode) {
      handleClearSearch();
    }
  };

  const handlePostUpdated = (updatedPost: Tweet) => {
    setPosts(prev => prev.map(post =>
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  if (!user) {
    navigate('/signin');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="max-w-2xl mx-auto">
          {/* En-tête */}
          <HomeHeader refreshPosts={refreshPosts} />

          {/* Navigation par onglets */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => handleTabChange('actualite')}
                className={`flex-1 p-4 text-center font-bold transition-colors cursor-pointer ${activeTab === 'actualite'
                  ? 'text-orange border-b-2 border-orange'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                Actualité
              </button>
              <button
                onClick={() => handleTabChange('suivis')}
                className={`flex-1 p-4 text-center font-bold transition-colors cursor-pointer ${activeTab === 'suivis'
                  ? 'text-orange border-b-2 border-orange'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                Suivis
              </button>
            </div>
          </div>

          {/* Barre de recherche - visible uniquement dans l'onglet Actualité */}
          {activeTab === 'actualite' && (
            <>
              <div className="mx-4 mt-4 mb-2">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      placeholder="Rechercher posts, utilisateurs..."
                      className="w-full p-2 pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                      disabled={isSearching}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setSearchQuery('')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="p-2"
                    onClick={toggleFilters}
                    title="Filtres"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </Button>
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

              {/* Filtres additionnels */}
              {showFilters && (
                <div className="mx-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Filtres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="dateFilter" className="block text-sm text-gray-600 mb-1">Date (après)</label>
                      <input
                        type="date"
                        id="dateFilter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="contentTypeFilter" className="block text-sm text-gray-600 mb-1">Type de contenu</label>
                      <select
                        id="contentTypeFilter"
                        value={contentTypeFilter}
                        onChange={(e) => setContentTypeFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                      >
                        <option value="">Tous</option>
                        <option value="text">Texte uniquement</option>
                        <option value="media">Avec média</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="userFilter" className="block text-sm text-gray-600 mb-1">Par utilisateur (@mention)</label>
                      <input
                        type="text"
                        id="userFilter"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        placeholder="@mention"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* État de la recherche */}
          {searchMode && (
            <div className="flex items-center justify-between bg-gray-100 p-2 mx-4 rounded-lg mb-4">
              <div className="flex items-center flex-wrap">
                <span className="text-gray-600 mr-2">Résultats pour: </span>
                <span className="font-medium">{searchQuery}</span>
                {(dateFilter || contentTypeFilter || userFilter) && (
                  <span className="text-gray-600 ml-2">(avec filtres)</span>
                )}
                <span className="ml-2 text-gray-600">
                  • {posts.length} post{posts.length > 1 ? 's' : ''}
                  • {searchResults.users.length} utilisateur{searchResults.users.length > 1 ? 's' : ''}
                </span>
                {moderationFilterCount > 0 && (
                  <span className="ml-2 text-orange-600">• {moderationFilterCount} exclu{moderationFilterCount > 1 ? 's' : ''}</span>
                )}
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

          {/* Résultats de recherche d'utilisateurs */}
          {searchResults.users && searchResults.users.length > 0 && (
            <div className="mx-4 mt-4 mb-6">
              <h3 className="font-medium text-lg mb-2">Utilisateurs</h3>
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {searchResults.users.map(user => (
                  <div key={user.id} className="flex items-center p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleUserProfileClick(user.id)}>
                    <div className="flex-shrink-0 mr-3">
                      <img
                        src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                        alt={user.name || "Utilisateur"}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          // Remplacer l'image en cas d'erreur de chargement
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Éviter les boucles infinies
                          target.src = '/default_pp.webp';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{user.mention}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nombre de résultats */}
          {searchMode && posts.length > 0 && (
            <div className="mx-4 mb-4">
              <h3 className="font-medium text-lg">
                {posts.length} post{posts.length > 1 ? 's' : ''} trouvé{posts.length > 1 ? 's' : ''}
              </h3>
              {moderationFilterCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {moderationFilterCount} post{moderationFilterCount > 1 ? 's' : ''} {moderationFilterCount > 1 ? 'ont été exclus' : 'a été exclu'} des résultats (contenu censuré ou utilisateur banni)
                </p>
              )}
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="mx-4 p-3 bg-red-100 text-red-700 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Contenu principal */}
          <div className="divide-y divide-gray-200">
            {loading && posts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
                </div>
                <p className="mt-2">Chargement des posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchMode
                  ? 'Aucun post ne correspond à votre recherche. Essayez d\'autres termes ou filtres.'
                  : activeTab === 'actualite'
                    ? 'Aucun post dans l\'actualité. Revenez plus tard !'
                    : 'Aucun post des profils suivis. Commencez à suivre d\'autres utilisateurs pour voir leurs posts ici !'}
              </div>
            ) : (
              posts.map((post) => (
                <TweetCard
                  key={post.id}
                  tweet={post}
                  onUserProfileClick={handleUserProfileClick}
                  onPostUpdated={handlePostUpdated}
                />
              ))
            )}

            {!loading && !searchMode && hasMore && (
              <div
                ref={loadMoreTriggerRef}
                className="h-10 w-full"
              />
            )}

            {/* Indicateur de chargement pour la pagination infinie */}
            {loading && posts.length > 0 && (
              <div className="p-4 text-center text-gray-500">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
                </div>
                <p className="mt-2">Chargement de plus de posts...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profil utilisateur */}
      {selectedUserId && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto"
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
    </div>
  );
} 