import { Tweet } from '../lib/loaders';
import { useState, useEffect } from 'react';
import { likePost, getLikeStatus } from '../lib/loaders';

interface TweetCardProps {
  tweet: Tweet;
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

export default function TweetCard({ tweet }: TweetCardProps) {
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const status = await getLikeStatus(tweet.id);
        setLikes(status.likes);
        setIsLiked(status.isLiked);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du like:', error);
      }
    };

    checkLikeStatus();
  }, [tweet.id]);

  const handleLike = async () => {
    try {
      const response = await likePost(tweet.id);
      setLikes(response.likes);
      setIsLiked(response.isLiked);
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 border-b border-gray-200">
      <div className="flex space-x-3">
        <div className="relative">
          <img
            src={avatarError || !tweet.user?.avatar ? '/default_pp.webp' : tweet.user.avatar}
            alt={tweet.user?.name || 'Avatar par défaut'}
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
            <span className="font-bold">{tweet.user?.name}</span>
            <span className="text-gray-500">@{tweet.user?.mention}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDate(tweet.created_at)}
            </span>
          </div>
          <p className="mt-2 text-gray-900">{tweet.content}</p>
          <div className="mt-3 flex items-center space-x-8">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors cursor-pointer group ${isLiked ? 'text-[#F05E1D]' : 'text-gray-500 hover:text-[#F05E1D]'}`}
            >
              <svg
                className={`h-5 w-5 ${isLiked ? 'fill-[#F05E1D] text-[#F05E1D]' : 'fill-none text-gray-500 group-hover:text-[#F05E1D]'
                  }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className={isLiked ? 'text-[#F05E1D]' : 'text-gray-500 group-hover:text-[#F05E1D]'}>{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 