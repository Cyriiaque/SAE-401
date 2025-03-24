import { useState } from 'react';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';
import { createPost, Tweet } from '../lib/loaders';

interface PublishProps {
  onTweetPublished: (tweet: Tweet) => void;
}

export default function Publish({ onTweetPublished }: PublishProps) {
  const { user } = useAuth();
  const [newTweet, setNewTweet] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxLength = 280;

  const handleTweetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.name || !user.mention) return;
    if (newTweet.trim() && newTweet.length <= maxLength) {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await createPost(newTweet);
        const tweet: Tweet = {
          id: result.id,
          content: newTweet,
          created_at: new Date().toISOString(),
          likes: 0,
          isLiked: false,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            mention: user.mention,
            avatar: user.avatar
          }
        };
        onTweetPublished(tweet);
        setNewTweet('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleTweetSubmit} className="p-4 border-b border-gray-200">
      <div className="flex flex-col space-y-4">
        <textarea
          value={newTweet}
          onChange={(e) => setNewTweet(e.target.value)}
          placeholder="Quoi de neuf ?"
          className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${newTweet.length > maxLength
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
            }`}
          rows={4}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          <span className={`text-sm ${newTweet.length > maxLength ? 'text-red-500' : 'text-gray-500'
            }`}>
            {newTweet.length}/{maxLength}
          </span>
          {newTweet.length > maxLength && (
            <span className="text-sm text-red-500">
              Le tweet ne peut pas dépasser {maxLength} caractères
            </span>
          )}
          {error && (
            <span className="text-sm text-red-500">
              {error}
            </span>
          )}
          <Button
            variant="twitter"
            disabled={!newTweet.trim() || newTweet.length > maxLength || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </div>
    </form>
  );
} 