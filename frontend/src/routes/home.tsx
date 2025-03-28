import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePostModal } from '../contexts/PostModalContext';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import { fetchPosts, Tweet } from '../lib/loaders';
import UserProfile from '../components/UserProfile';

interface PostsResponse {
  posts: Tweet[];
  previous_page: number | null;
  next_page: number | null;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Tweet[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

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

  const loadPosts = async (pageNumber: number) => {
    if (!user || !hasMore) return;

    setLoading(true);
    try {
      const response: PostsResponse = await fetchPosts(pageNumber);
      if (pageNumber === 1) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      setHasMore(!!response.next_page);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadPosts(1);
    }
  }, [user?.id]);

  // Créer un Intersection Observer pour le chargement infini
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  }, [hasMore, loading, page]);

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

  useEffect(() => {
    const handleTweetPublished = (event: CustomEvent<Tweet>) => {
      setPosts(prev => [event.detail, ...prev]);
    };

    window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
    return () => {
      window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
    };
  }, []);

  const refreshPosts = () => {
    loadPosts(1);
  };

  const handleUserProfileClick = (userId: number) => {
    setSelectedUserId(userId);
  };

  const handleCloseUserProfile = () => {
    setSelectedUserId(null);
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
          {/* En-tête mobile */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold">Accueil</h1>
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
                <h1 className="text-xl font-bold">Accueil</h1>
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

          <div className="divide-y divide-gray-200">
            {posts.map((post) => (
              <TweetCard
                key={post.id}
                tweet={post}
                onUserProfileClick={handleUserProfileClick}
              />
            ))}

            {loading && (
              <div className="p-4 text-center text-gray-500">
                Chargement...
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