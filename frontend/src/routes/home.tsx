import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import Publish from '../components/Publish';
import TweetCard from '../components/TweetCard';
import { fetchPosts } from '../lib/loaders';

interface Post {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number;
    email: string;
    name: string;
    mention: string;
    avatar: string | null;
  };
}

interface PostsResponse {
  posts: Post[];
  previous_page: number | null;
  next_page: number | null;
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
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

  const handleTweetPublished = (newTweet: Post) => {
    if (!user) return;
    setPosts(prev => [newTweet, ...prev]);
  };

  const handleLike = (tweetId: number) => {
    // TODO: Implémenter la fonctionnalité de like avec l'API
    console.log('Like tweet:', tweetId);
  };

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
    <div className="max-w-2xl mx-auto">
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex justify-between items-center p-4">
          <h1 className="text-xl font-bold">Accueil</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">@{user.mention}</span>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                logout();
                navigate('/signin');
              }}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <Publish onTweetPublished={handleTweetPublished} />

      <div className="divide-y divide-gray-200">
        {posts.map((post) => (
          <TweetCard key={post.id} tweet={post} onLike={handleLike} />
        ))}
        {loading && (
          <div className="p-4 text-center text-gray-500">
            Chargement...
          </div>
        )}
        {hasMore && !loading && (
          <div className="p-4 text-center">
            <Button
              variant="outline"
              size="default"
              onClick={handleLoadMore}
            >
              Afficher plus
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 