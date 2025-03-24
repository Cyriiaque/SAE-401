import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePostModal } from '../contexts/PostModalContext';
import TweetCard from '../components/TweetCard';
import Sidebar from '../components/Sidebar';
import { fetchPosts, Tweet } from '../lib/loaders';

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

  const loadPosts = async (pageNumber: number) => {
    if (!user) return;

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

  useEffect(() => {
    const handleTweetPublished = (event: CustomEvent<Tweet>) => {
      setPosts(prev => [event.detail, ...prev]);
    };

    window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
    return () => {
      window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
    };
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage);
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
            <div className="p-4 flex items-center justify-center">
              <h1 className="text-xl font-bold">Accueil</h1>
            </div>
          </div>

          {/* En-tête desktop */}
          <div className="hidden lg:block border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="p-4">
              <h1 className="text-xl font-bold">Accueil</h1>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {posts.map((post) => (
              <TweetCard key={post.id} tweet={post} />
            ))}
            {loading && (
              <div className="p-4 text-center text-gray-500">
                Chargement...
              </div>
            )}
            {hasMore && !loading && (
              <div className="p-4 text-center">
                <button
                  className="text-[#F05E1D] hover:text-[#D84E1A]"
                  onClick={handleLoadMore}
                >
                  Afficher plus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 