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

export default function TweetCard({ tweet }: TweetCardProps) {
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [formattedContent, setFormattedContent] = useState(formatContent(tweet.content));

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className="font-bold">{tweet.user?.name}</span>
            <div className="flex items-center space-x-2 text-sm sm:text-base">
              <span className="text-gray-500">@{tweet.user?.mention}</span>
              <span className="hidden sm:inline text-gray-500">·</span>
              <span className="text-gray-500">
                {formatDate(tweet.created_at)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-900 whitespace-pre-line">{formattedContent}</p>
          <div className="mt-3 flex items-center space-x-8">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors cursor-pointer group ${isLiked ? 'text-orange' : 'text-gray-500 hover:text-orange'}`}
            >
              <svg
                className={`h-5 w-5 ${isLiked ? 'fill-orange text-orange' : 'fill-none text-gray-500 group-hover:text-orange'}`}
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
              <span className={isLiked ? 'text-orange' : 'text-gray-500 group-hover:text-orange'}>{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 