import { Tweet } from './Publish';
import { useState } from 'react';

interface TweetCardProps {
  tweet: Tweet;
  onLike: (tweetId: number) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return "à l'instant";
  } else if (minutes < 60) {
    return `il y a ${minutes} min`;
  } else if (hours < 24) {
    return `il y a ${hours}h`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }
}

export default function TweetCard({ tweet, onLike }: TweetCardProps) {
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div className="p-4 hover:bg-gray-50 border-b border-gray-200">
      <div className="flex space-x-3">
        <div className="relative">
          <img
            src={avatarError || !tweet.user.avatar ? '/default_pp.webp' : tweet.user.avatar}
            alt={tweet.user.name || 'Avatar par défaut'}
            className="h-12 w-12 rounded-full object-cover"
            onError={() => {
              setAvatarError(true);
              setIsAvatarLoading(false);
            }}
            onLoad={() => setIsAvatarLoading(false)}
          />
          {isAvatarLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold">{tweet.user.name}</span>
            <span className="text-gray-500">@{tweet.user.mention}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDate(tweet.created_at)}
            </span>
          </div>
          <p className="mt-2 text-gray-900">{tweet.content}</p>
          <div className="mt-3 flex items-center space-x-8">
            <button
              onClick={() => onLike(tweet.id)}
              className="flex items-center space-x-2 text-gray-500 hover:text-red-500 group"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>0</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 