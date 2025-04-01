import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePostModal } from '../contexts/PostModalContext';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import { fetchPosts, Tweet, fetchFollowedPosts, getImageUrl, fetchBlockedUsers, User } from '../lib/loaders';
import UserProfile from '../components/UserProfile';
import Button from '../ui/buttons';

interface PostsResponse {
  posts: Tweet[];
  previous_page: number | null;
  next_page: number | null;
}

// Composant pour l'en-tête
const HomeHeader = ({ refreshPosts }: { refreshPosts: () => void }) => {
  return (
    <>
      {/* En-tête mobile */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
        <div className="p-4 flex items-center">
          <div className="flex-1 text-center">
            <h2 className="ml-8 text-xl font-bold">Accueil</h2>
          </div>
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

      {/* En-tête desktop */}
      <div className="hidden lg:block sticky top-0 bg-white z-10 border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <div className="flex-1 pl-4">
            <h2 className="text-xl font-bold">Accueil</h2>
          </div>
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
    </>
  );
};

// Composant pour la navigation par onglets
const TabNavigation = ({
  activeTab,
  handleTabChange
}: {
  activeTab: 'actualite' | 'suivis',
  handleTabChange: (tab: 'actualite' | 'suivis') => void
}) => {
  return (
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
  );
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Tweet[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'actualite' | 'suivis'>('actualite');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

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

  const loadPosts = async (pageNumber: number) => {
    if (!user || !hasMore) return;

    setLoading(true);
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
    }
    setLoading(false);
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
    if (target.isIntersecting && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  }, [hasMore, loading, page, activeTab]);

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
    const handleBlockStatusChanged = (event: Event) => {
      // Conversion de type sécurisée
      const customEvent = event as CustomEvent<{ userId: number, isBlocked: boolean }>;

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
    loadPosts(1);
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
          <TabNavigation
            activeTab={activeTab}
            handleTabChange={handleTabChange}
          />

          {/* Contenu principal */}
          <div className="divide-y divide-gray-200">
            {posts.map((post) => (
              <TweetCard
                key={post.id}
                tweet={post}
                onUserProfileClick={handleUserProfileClick}
                onPostUpdated={handlePostUpdated}
              />
            ))}

            {loading && (
              <div className="p-4 text-center text-gray-500">
                Chargement...
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                {activeTab === 'actualite'
                  ? 'Aucun post dans l\'actualité'
                  : 'Aucun post des profils suivis'}
              </div>
            )}

            {hasMore && (
              <div
                ref={loadMoreTriggerRef}
                className="h-10 w-full"
              />
            )}
          </div>
        </div>
      </div>

      {/* Profil utilisateur */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto my-auto">
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