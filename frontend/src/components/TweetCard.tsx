import { Tweet } from '../lib/loaders';
import { useState, useEffect } from 'react';
import { likePost, getLikeStatus } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';

interface TweetCardProps {
  tweet: Tweet;
  onDelete?: (postId: number) => void;
  onUserProfileClick?: (userId: number) => void;
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

function formatContent(content: string): string {
  let maxLength;
  if (window.innerWidth < 640) { // sm
    maxLength = 30;
  } else if (window.innerWidth < 768) { // md
    maxLength = 50;
  } else { // lg et plus
    maxLength = 75;
  }

  const words = content.split(' ');
  let currentLine = '';
  let formattedContent = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const space = i < words.length - 1 ? ' ' : '';

    if ((currentLine + word + space).length > maxLength) {
      if (currentLine) {
        formattedContent += currentLine.trim() + '\n';
      }
      if (word.length > maxLength) {
        // Si le mot est plus long que maxLength, on le coupe
        let remainingWord = word;
        while (remainingWord.length > 0) {
          formattedContent += remainingWord.slice(0, maxLength) + '\n';
          remainingWord = remainingWord.slice(maxLength);
        }
      } else {
        currentLine = word + space;
      }
    } else {
      currentLine += word + space;
    }
  }

  if (currentLine) {
    formattedContent += currentLine.trim();
  }

  return formattedContent;
}

export default function TweetCard({ tweet, onDelete, onUserProfileClick }: TweetCardProps) {
  const { user } = useAuth();
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [formattedContent, setFormattedContent] = useState(formatContent(tweet.content));

  // Nouvelle logique pour gérer les utilisateurs bannis
  const isBanned = tweet.user?.isbanned ?? false;

  useEffect(() => {
    const handleResize = () => {
      setFormattedContent(formatContent(tweet.content));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tweet.content]);

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

  const handleAvatarClick = () => {
    if (tweet.user?.id && onUserProfileClick) {
      onUserProfileClick(tweet.user.id);
    }
  };

  // Si l'utilisateur est banni, on limite l'affichage
  if (isBanned) {
    return (
      <div className="p-4 hover:bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-3 min-h-[48px]">
          <div className="relative flex-shrink-0">
            <img
              src="/default_pp.webp"
              alt="Avatar par défaut"
              className="h-12 w-12 rounded-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="mt-2 text-gray-900 whitespace-pre-line break-words">
              Ce compte a été bloqué pour non respect des conditions d'utilisation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 hover:bg-gray-50 border-b border-gray-200">
      <div className="flex space-x-3 min-h-[48px]">
        <div className="relative flex-shrink-0">
          <img
            src={avatarError || !tweet.user?.avatar ? '/default_pp.webp' : tweet.user.avatar}
            alt={tweet.user?.name || 'Avatar par défaut'}
            className="h-12 w-12 rounded-full object-cover cursor-pointer"
            onClick={handleAvatarClick}
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
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className="font-bold truncate">{tweet.user?.name}</span>
            <div className="flex items-center space-x-2 text-sm sm:text-base">
              <span className="text-gray-500 truncate">@{tweet.user?.mention}</span>
              <span className="hidden sm:inline text-gray-500">·</span>
              <span className="text-gray-500">
                {formatDate(tweet.created_at)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-900 whitespace-pre-line break-words">{formattedContent}</p>
          <div className="mt-3 flex items-center space-x-8">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 cursor-pointer group ${isLiked ? 'text-orange' : 'text-gray-500 hover:text-orange'}`}
            >
              <svg
                className={`h-5 w-5 ${isLiked ? 'fill-orange' : 'fill-none text-gray-500 group-hover:stroke-orange'}`}
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
              <span className={`${isLiked ? 'text-orange' : 'text-inherit group-hover:text-orange'}`}>{likes}</span>
            </button>
            {user?.id === tweet.user?.id && onDelete && (
              <button
                onClick={() => onDelete(tweet.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full cursor-pointer"
                title="Supprimer le post"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 