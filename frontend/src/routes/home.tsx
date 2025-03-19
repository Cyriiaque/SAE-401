import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../ui/buttons';
import Publish, { Tweet } from '../components/Publish';
import TweetCard from '../components/TweetCard';

// Simuler une base de données de tweets globale
const allTweets: Tweet[] = [];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  // Référence au dernier élément pour l'infinite scroll
  const lastTweetElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Charger plus de tweets
  const loadMoreTweets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      const start = (page - 1) * 10;
      const newTweets = allTweets.slice(start, start + 10);
      setTweets(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueNewTweets = newTweets.filter(t => !existingIds.has(t.id));
        return [...prev, ...uniqueNewTweets];
      });
      setHasMore(newTweets.length === 10);
    } catch (error) {
      console.error('Erreur lors du chargement des tweets:', error);
    }
    setLoading(false);
  }, [page, user]);

  // Charger les tweets initiaux
  useEffect(() => {
    if (user) {
      setTweets([]);
      setPage(1);
      loadMoreTweets();
    }
  }, [user?.id]);

  useEffect(() => {
    loadMoreTweets();
  }, [page]);

  const handleTweetPublished = (newTweet: Tweet) => {
    if (!user) return;
    
    // Ajouter le tweet à la liste globale
    allTweets.unshift(newTweet);
    setTweets(prev => [newTweet, ...prev]);
  };

  const handleLike = (tweetId: string) => {
    if (!user) return;

    // Mettre à jour les likes dans la liste globale
    const tweetIndex = allTweets.findIndex(t => t.id === tweetId);
    if (tweetIndex !== -1) {
      allTweets[tweetIndex] = {
        ...allTweets[tweetIndex],
        likes: allTweets[tweetIndex].likes + 1
      };
    }

    // Mettre à jour l'état local
    setTweets(prev =>
      prev.map(tweet =>
        tweet.id === tweetId
          ? { ...tweet, likes: tweet.likes + 1 }
          : tweet
      )
    );
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
            <span className="text-gray-600">@{user.username}</span>
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
        {tweets.map((tweet, index) => {
          if (tweets.length === index + 1) {
            return (
              <div ref={lastTweetElementRef} key={tweet.id}>
                <TweetCard tweet={tweet} onLike={handleLike} />
              </div>
            );
          } else {
            return (
              <TweetCard key={tweet.id} tweet={tweet} onLike={handleLike} />
            );
          }
        })}
        {loading && (
          <div className="p-4 text-center text-gray-500">
            Chargement...
          </div>
        )}
      </div>
    </div>
  );
} 