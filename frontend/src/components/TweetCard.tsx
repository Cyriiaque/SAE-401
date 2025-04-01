import { Tweet, fetchReplies, createReply, Reply, getLikeStatus, getImageUrl, checkBlockStatus } from '../lib/loaders';
import { useState, useEffect, useRef } from 'react';
import { likePost } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import PostModal from './PostModal';
import Button from '../ui/buttons';

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
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [formattedContent, setFormattedContent] = useState(formatContent(tweet.content));
  const [isMediaOverlayOpen, setIsMediaOverlayOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTweet, setCurrentTweet] = useState<Tweet>(tweet);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyCount, setReplyCount] = useState<number>(0);
  const [userHasReplied, setUserHasReplied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBlockedByAuthor, setIsBlockedByAuthor] = useState<boolean>(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const [displayedRepliesCount, setDisplayedRepliesCount] = useState<number>(3);

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

  // Vérifier si l'utilisateur actuel est bloqué par l'auteur du post
  useEffect(() => {
    const checkIfBlockedByAuthor = async () => {
      if (user && currentTweet.user && user.id !== currentTweet.user.id) {
        try {
          const blockStatus = await checkBlockStatus(currentTweet.user.id);
          setIsBlockedByAuthor(blockStatus.isBlockedByTarget);
        } catch (error) {
          console.error('Erreur lors de la vérification du statut de blocage:', error);
        }
      }
    };

    checkIfBlockedByAuthor();
  }, [currentTweet.user?.id, user?.id]);

  useEffect(() => {
    // Au chargement initial, vérifier s'il y a des réponses
    const checkRepliesExist = async () => {
      try {
        const response = await fetchReplies(currentTweet.id);
        // Mettre à jour seulement le compteur, sans afficher les réponses
        setReplyCount(response.replies.length);

        // Vérifier si l'utilisateur actuel a déjà répondu
        if (user && response.replies.length > 0) {
          const hasUserReplied = response.replies.some(reply => reply.user?.id === user.id);
          setUserHasReplied(hasUserReplied);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des réponses:', error);
      }
    };

    checkRepliesExist();
  }, [currentTweet.id, user]);

  const handleLike = async () => {
    // Si l'utilisateur est bloqué par l'auteur, empêcher l'interaction
    if (isBlockedByAuthor) {
      setErrorMessage("Vous ne pouvez pas interagir avec ce post car l'auteur vous a bloqué.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    try {
      const response = await likePost(currentTweet.id);
      setLikes(response.likes);
      setIsLiked(response.isLiked);
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  };

  const handlePostUpdated = (updatedTweet: Tweet) => {
    setCurrentTweet(updatedTweet);
    setFormattedContent(formatContent(updatedTweet.content));

    if (onPostUpdated) {
      onPostUpdated(updatedTweet);
    }

    setIsEditModalOpen(false);
  };

  // Nouvelle fonction pour afficher/masquer les réponses sans ouvrir le formulaire
  const handleToggleReplies = async () => {
    // Inverser l'état d'affichage des réponses
    const willShow = !showReplies;
    setShowReplies(willShow);

    // Réinitialiser le compteur de réponses affichées quand on masque les réponses
    if (!willShow) {
      setDisplayedRepliesCount(3);
    }

    // Si on va afficher les réponses et qu'elles n'ont pas encore été chargées
    if (willShow && replies.length === 0) {
      setLoadingReplies(true);

      try {
        const response = await fetchReplies(currentTweet.id);
        setReplies(response.replies);

        // Vérifier si l'utilisateur actuel a déjà répondu
        if (user) {
          const hasUserReplied = response.replies.some(reply => reply.user?.id === user.id);
          setUserHasReplied(hasUserReplied);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error);
        setErrorMessage("Erreur lors du chargement des réponses");
        setTimeout(() => setErrorMessage(null), 3000);
      } finally {
        setLoadingReplies(false);
      }
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim() || isSubmittingReply || userHasReplied) return;

    // Si l'utilisateur est bloqué par l'auteur, empêcher l'interaction
    if (isBlockedByAuthor) {
      setErrorMessage("Vous ne pouvez pas répondre à ce post car l'auteur vous a bloqué.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsSubmittingReply(true);

    try {
      const newReply = await createReply(currentTweet.id, replyContent);

      // Ajouter la nouvelle réponse au début de la liste
      setReplies(prev => [newReply, ...prev]);

      // Incrémenter le compteur de réponses
      setReplyCount(prev => prev + 1);

      // Marquer que l'utilisateur a répondu
      setUserHasReplied(true);

      // Réinitialiser le formulaire
      setReplyContent('');

      // Toujours afficher les réponses après l'envoi, même si c'était la première
      setShowReplies(true);

      console.log('Réponse ajoutée avec succès', newReply);
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la réponse:', error);

      // Si le message d'erreur indique que l'utilisateur a déjà répondu
      if (error.message && error.message.includes('déjà répondu')) {
        setUserHasReplied(true);
        setErrorMessage("Vous avez déjà répondu à ce post");
        setTimeout(() => setErrorMessage(null), 3000);

        // Rafraîchir les réponses pour s'assurer que nous avons les données correctes
        try {
          const response = await fetchReplies(currentTweet.id);
          setReplies(response.replies);
          setShowReplies(response.replies.length > 0);
        } catch (fetchError) {
          console.error('Erreur lors du rafraîchissement des réponses:', fetchError);
        }
      } else {
        // Autre type d'erreur
        setErrorMessage(error.message || "Erreur lors de l'envoi de la réponse");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const formatReplyDate = (dateString: string): string => {
    return formatDate(dateString);
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

  // Fonction pour afficher plus de réponses
  const handleShowMoreReplies = () => {
    setDisplayedRepliesCount(prev => prev + 5);
  };

  // Si l'utilisateur est banni, on limite l'affichage
  if (isBanned) {
    return (
      <div className="p-4 hover:bg-gray-50 border-b border-gray-300">
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
    <div className="border-b border-gray-300">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 mx-2 mt-2 text-center">
          {errorMessage}
          <span
            className="absolute top-0 right-0 px-4 py-2 cursor-pointer"
            onClick={() => setErrorMessage(null)}
          >
            &times;
          </span>
        </div>
      )}
      <div className="p-4 hover:bg-gray-50">
        <div className="flex space-x-3 min-h-[48px]">
          <div className="relative flex-shrink-0">
            <img
              src={currentTweet.user?.avatar ? getImageUrl(currentTweet.user.avatar) : '/default_pp.webp'}
              alt={currentTweet.user?.name || 'Avatar par défaut'}
              className="w-10 h-10 rounded-full object-cover cursor-pointer"
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
                {/* Bouton pour afficher/masquer les réponses - Suppression du texte */}
                <button
                  onClick={handleToggleReplies}
                  className={`flex items-center cursor-pointer group ${showReplies ? 'text-orange' : 'text-gray-500 hover:text-orange'} ${isBlockedByAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isBlockedByAuthor ? "Vous ne pouvez pas interagir avec ce post" : (showReplies ? "Masquer les réponses" : "Afficher les réponses")}
                  disabled={isBlockedByAuthor}
                >
                  <svg
                    className={`h-5 w-5 fill-none ${showReplies ? 'stroke-orange' : 'group-hover:stroke-orange'}`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {showReplies ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                      />
                    )}
                  </svg>
                  {replyCount > 0 && (
                    <span className={`ml-1 ${showReplies ? 'text-orange' : 'text-gray-500 group-hover:text-orange'}`}>
                      {replyCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 cursor-pointer group ${isLiked ? 'text-orange' : 'text-gray-500 hover:text-orange'} ${isBlockedByAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isBlockedByAuthor}
                  title={isBlockedByAuthor ? "Vous ne pouvez pas interagir avec ce post" : "J'aime"}
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
                {user?.id === currentTweet.user?.id && onDelete && (
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affichage des réponses */}
      {loadingReplies ? (
        <div className="border-t border-gray-300 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className={`${showReplies ? 'block' : 'hidden'} px-4 relative`}>
          {/* Ligne verticale de thread */}
          <div className="absolute left-10 top-0 w-[2px] h-full bg-gray-300"></div>

          {/* Si l'utilisateur n'a pas répondu et est connecté, on affiche le formulaire de réponse */}
          {user && !userHasReplied && !isBlockedByAuthor && (
            <div ref={replyFormRef} className="relative pt-2">
              {/* Barre horizontale */}
              <div className="absolute left-6.5 top-6 h-[2px] w-6 bg-gray-300"></div>

              <div className="pl-15 relative">
                <div className="relative mb-2">
                  <img
                    src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                    alt={user.name || 'Avatar par défaut'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>

                <form onSubmit={handleSubmitReply} className="w-full">
                  <div className="relative">
                    <textarea
                      ref={replyInputRef}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Écrivez votre réponse..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange resize-none"
                      rows={2}
                      maxLength={280}
                    />
                  </div>

                  <div className="mt-2 flex justify-between items-center">
                    <span className={`text-sm ${replyContent.length > 250 ? 'text-red-500' : 'text-gray-500'}`}>
                      {replyContent.length}/280
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={!replyContent.trim() || isSubmittingReply}
                        variant={!replyContent.trim() || isSubmittingReply ? "notallowed" : "full"}
                        size="sm"
                        className="w-full"
                      >
                        {isSubmittingReply ? (
                          <span className="flex items-center space-x-1">
                            <div className="w-3 h-3 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                            <span>Envoi...</span>
                          </span>
                        ) : (
                          'Répondre'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Message si l'utilisateur est bloqué par l'auteur */}
          {user && isBlockedByAuthor && (
            <div className="relative">
              <div className="ml-15 pl-5 text-sm text-red-600 italic border-b border-gray-300 pb-3">
                Vous ne pouvez pas répondre à ce post car l'auteur vous a bloqué
              </div>
            </div>
          )}

          {/* Message si l'utilisateur a déjà répondu */}
          {user && userHasReplied && !isBlockedByAuthor && (
            <div className="relative">
              <div className="ml-15 pl-5 text-sm text-gray-600 italic border-b border-gray-300 pb-3">
                Vous avez déjà répondu à ce post
              </div>
            </div>
          )}

          {/* Liste des réponses */}
          {replies.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              Aucune réponse pour le moment
            </div>
          ) : (
            <>
              {replies.slice(0, displayedRepliesCount).map((reply) => (
                <div key={reply.id} className="relative last:mb-0 pt-4">
                  {/* Barre horizontale */}
                  <div className="absolute left-6.5 top-8 h-[2px] w-6 bg-gray-300"></div>

                  <div className="pl-15 relative">
                    <div className="relative flex-shrink-0 left-0 top-0">
                      <img
                        src={reply.user?.avatar ? getImageUrl(reply.user.avatar) : '/default_pp.webp'}
                        alt={reply.user?.name || 'Avatar par défaut'}
                        className="h-10 w-10 rounded-full object-cover cursor-pointer"
                        onClick={() => reply.user?.id && onUserProfileClick?.(reply.user.id)}
                      />
                    </div>

                    <div className="pb-4 border-b border-gray-300">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="font-bold truncate">{reply.user?.name}</span>
                        <div className="flex items-center space-x-2 text-sm sm:text-base">
                          <span className="text-gray-500 truncate">@{reply.user?.mention}</span>
                          <span className="hidden sm:inline text-gray-500">·</span>
                          <span className="text-gray-500">{formatReplyDate(reply.replied_at)}</span>
                        </div>
                      </div>

                      <div className="mt-1 text-gray-800 whitespace-pre-wrap">
                        {reply.reply}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bouton pour voir plus de réponses */}
              {replies.length > displayedRepliesCount && (
                <div className="pt-4 pb-6 flex justify-center">
                  <button
                    onClick={handleShowMoreReplies}
                    className="px-4 py-2 text-sm font-medium text-blue-500 hover:bg-blue-50 rounded-full border border-blue-200"
                  >
                    Voir plus de réponses
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isEditModalOpen && (
        <PostModal
          tweet={currentTweet}
          onClose={() => setIsEditModalOpen(false)}
          onPostUpdated={handlePostUpdated}
          isOpen={isEditModalOpen}
          mode="edit"
        />
      )}
    </div>
  );
}