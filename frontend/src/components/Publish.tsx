import { useState } from 'react';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';

interface PublishProps {
  onTweetPublished: (tweet: Tweet) => void;
}

export interface Tweet {
  id: string;
  content: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  timestamp: Date;
  likes: number;
}

export default function Publish({ onTweetPublished }: PublishProps) {
  const { user } = useAuth();
  const [newTweet, setNewTweet] = useState('');
  const maxLength = 280;

  const handleTweetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newTweet.trim() && newTweet.length <= maxLength) {
      const tweet: Tweet = {
        id: Date.now().toString(),
        content: newTweet,
        author: {
          name: user.fullName,
          username: user.username,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
        },
        timestamp: new Date(),
        likes: 0
      };
      onTweetPublished(tweet);
      setNewTweet('');
    }
  };

  return (
    <form onSubmit={handleTweetSubmit} className="p-4 border-b border-gray-200">
      <div className="flex flex-col space-y-4">
        <textarea
          value={newTweet}
          onChange={(e) => setNewTweet(e.target.value)}
          placeholder="Quoi de neuf ?"
          className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${
            newTweet.length > maxLength ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
          rows={4}
        />
        <div className="flex items-center justify-between">
          <span className={`text-sm ${
            newTweet.length > maxLength ? 'text-red-500' : 'text-gray-500'
          }`}>
            {newTweet.length}/{maxLength}
          </span>
          {newTweet.length > maxLength && (
            <span className="text-sm text-red-500">
              Le tweet ne peut pas dépasser {maxLength} caractères
            </span>
          )}
          <Button
            variant="twitter"
            disabled={!newTweet.trim() || newTweet.length > maxLength}
            type="submit"
          >
            Publier
          </Button>
        </div>
      </div>
    </form>
  );
} 