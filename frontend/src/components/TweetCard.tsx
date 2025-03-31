import { Tweet } from '../lib/loaders';
import { useState, useEffect } from 'react';
import { likePost, getLikeStatus, getImageUrl } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import EditPostModal from './EditPostModal';

interface TweetCardProps {
  tweet: Tweet;
  onDelete?: (postId: number) => void;
  onUserProfileClick?: (userId: number) => void;
  onPostUpdated?: (updatedTweet: Tweet) => void;
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

export default function TweetCard({ tweet, onDelete, onUserProfileClick, onPostUpdated }: TweetCardProps) {
  const { user } = useAuth();
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [formattedContent, setFormattedContent] = useState(formatContent(tweet.content));
  const [isMediaOverlayOpen, setIsMediaOverlayOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTweet, setCurrentTweet] = useState<Tweet>(tweet);

  // Nouvelle logique pour gérer les utilisateurs bannis
  const isBanned = tweet.user?.isbanned ?? false;

  const mediaFiles = currentTweet.mediaUrl ? currentTweet.mediaUrl.split(',') : [];
  const displayedMediaFiles = mediaFiles.slice(0, 4);
  const hasMoreMedia = mediaFiles.length > 4;
  const additionalMediaCount = mediaFiles.length - 4;

  useEffect(() => {
    const handleResize = () => {
      setFormattedContent(formatContent(currentTweet.content));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentTweet.content]);

  useEffect(() => {
    setCurrentTweet(tweet);
    setFormattedContent(formatContent(tweet.content));
  }, [tweet]);

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const status = await getLikeStatus(currentTweet.id);
        setLikes(status.likes);
        setIsLiked(status.isLiked);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du like:', error);
      }
    };

    checkLikeStatus();
  }, [currentTweet.id]);

  const handleLike = async () => {
    try {
      const response = await likePost(currentTweet.id);
      setLikes(response.likes);
      setIsLiked(response.isLiked);
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  };

  const handleAvatarClick = () => {
    if (currentTweet.user?.id && onUserProfileClick) {
      onUserProfileClick(currentTweet.user.id);
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handlePostUpdated = (updatedTweet: Tweet) => {
    setCurrentTweet(updatedTweet);
    setFormattedContent(formatContent(updatedTweet.content));

    if (onPostUpdated) {
      onPostUpdated(updatedTweet);
    }

    setIsEditModalOpen(false);
  };

  const getMediaGridLayout = (mediaCount: number) => {
    switch (mediaCount) {
      case 1: return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '"media"',
        maxHeight: '300px',
      };
      case 2: return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '"media1 media2"',
        maxHeight: '250px',
      };
      case 3: return {
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: `
          "media1 media2"
          "media1 media3"
        `,
        maxHeight: '300px',
      };
      case 4: return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: `
          "media1 media2"
          "media3 media4"
        `,
        maxHeight: '300px',
      };
      default: return {};
    }
  };

  const getMediaItemStyle = (mediaCount: number, index: number) => {
    const layouts = {
      1: ['media'],
      2: ['media1', 'media2'],
      3: ['media1', 'media2', 'media3'],
      4: ['media1', 'media2', 'media3', 'media4']
    } as const;

    return {
      gridArea: layouts[mediaCount as keyof typeof layouts]?.[index] || '',
      aspectRatio: mediaCount === 1 ? '16/9' : 'auto',
      objectFit: 'cover' as const,
      maxHeight: '100%',
    };
  };

  const openMediaOverlay = (startIndex: number = 0) => {
    setSelectedMediaIndex(startIndex);
    setIsMediaOverlayOpen(true);
  };

  const MediaOverlay = () => {
    if (!isMediaOverlayOpen) return null;

    const currentMedia = mediaFiles[selectedMediaIndex];
    const isVideo = currentMedia.match(/\.(mp4|webm|ogg)$/i);

    const handlePrevious = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMediaIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
    };

    const handleNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMediaIndex((prev) => (prev + 1) % mediaFiles.length);
    };

    return (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex flex-col"
        onClick={() => setIsMediaOverlayOpen(false)}
      >
        {/* Conteneur principal avec hauteur fixe */}
        <div className="h-[calc(100vh-64px)] flex items-center justify-center p-8">
          <div
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Média */}
            <div className="relative flex justify-center items-center">
              {isVideo ? (
                <video
                  src={getImageUrl(currentMedia)}
                  controls
                  autoPlay
                  className="max-w-full max-h-[calc(100vh-120px)] object-contain"
                />
              ) : (
                <img
                  src={getImageUrl(currentMedia)}
                  alt={`Média ${selectedMediaIndex + 1}`}
                  className="max-w-full max-h-[calc(100vh-120px)] object-contain"
                />
              )}
            </div>
          </div>
        </div>

        {/* Barre de navigation fixe en bas avec hauteur fixe */}
        {mediaFiles.length > 1 && (
          <div className="h-16 bg-black/50 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevious}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                aria-label="Image précédente"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="text-white text-sm font-medium min-w-[60px] text-center">
                {selectedMediaIndex + 1} / {mediaFiles.length}
              </div>
              <button
                onClick={handleNext}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                aria-label="Image suivante"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
            src={currentTweet.user?.avatar ? getImageUrl(currentTweet.user.avatar) : '/default_pp.webp'}
            alt={currentTweet.user?.name || 'Avatar par défaut'}
            className="w-10 h-10 rounded-full object-cover"
            onClick={() => currentTweet.user?.id && onUserProfileClick?.(currentTweet.user.id)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className="font-bold truncate">{currentTweet.user?.name}</span>
            <div className="flex items-center space-x-2 text-sm sm:text-base">
              <span className="text-gray-500 truncate">@{currentTweet.user?.mention}</span>
              <span className="hidden sm:inline text-gray-500">·</span>
              <span className="text-gray-500">
                {formatDate(currentTweet.created_at)}
              </span>
            </div>
          </div>
          <div className="mt-2 text-gray-800 whitespace-pre-wrap">
            {formattedContent}
          </div>
          {currentTweet.mediaUrl && (
            <div
              className="mt-2 grid gap-2 rounded-lg overflow-hidden"
              style={getMediaGridLayout(displayedMediaFiles.length)}
            >
              {displayedMediaFiles.map((mediaFile, index) => {
                const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);
                const mediaStyle = getMediaItemStyle(displayedMediaFiles.length, index);

                return (
                  <div
                    key={index}
                    style={mediaStyle}
                    className="relative rounded-lg overflow-hidden cursor-pointer group border border-gray-300 hover:border-gray-800 transition-all duration-200"
                    onClick={() => openMediaOverlay(index)}
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={getImageUrl(mediaFile)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 rounded-full p-3 shadow-md">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="white"
                              className="w-10 h-10"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={getImageUrl(mediaFile)}
                        alt={`Contenu du post ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Affichage du nombre de médias supplémentaires */}
                    {hasMoreMedia && index === 3 && (
                      <div
                        className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMediaOverlay(3);
                        }}
                      >
                        +{additionalMediaCount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <MediaOverlay />
          <div className="mt-4 flex items-center justify-between">
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
              {user?.id === currentTweet.user?.id && (
                <div className="flex items-center space-x-2">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(currentTweet.id)}
                      className="flex items-center space-x-2 cursor-pointer group text-gray-500 hover:text-red-500"
                      title="Supprimer le post"
                    >
                      <svg
                        className="h-5 w-5 fill-none group-hover:stroke-red-500"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 cursor-pointer group text-gray-500 hover:text-blue-500"
                    title="Modifier le post"
                  >
                    <svg
                      className="h-5 w-5 fill-none group-hover:stroke-blue-500"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isEditModalOpen && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          tweet={currentTweet}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
} 