import { Tweet, fetchReplies, createReply, Reply, getLikeStatus, getImageUrl, checkBlockStatus, fetchUsersByQuery, retweetPost, getRetweetStatus } from '../lib/loaders';
import { useState, useEffect, useRef } from 'react';
import { likePost, unlikePost } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';
import PostModal from './PostModal';
import Button from '../ui/buttons';
import UserProfile from './UserProfile';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import Modal from './Modal';

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

// Fonction pour formater le contenu avec hashtags et mentions cliquables
function formatContentWithLinks(content: string, onHashtagClick: (hashtag: string) => void, onMentionClick: (mention: string) => void): React.ReactNode {
  // Regex pour détecter les hashtags et mentions
  const regex = /(\s|^)([@#][\w]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Parcourir toutes les correspondances
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const spaceOrStart = match[1];
    const tagOrMention = match[2];

    // Ajouter le texte avant la correspondance
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Ajouter l'espace ou le début
    parts.push(spaceOrStart);

    // Ajouter le hashtag ou la mention avec un gestionnaire de clic
    if (tagOrMention.startsWith('#')) {
      parts.push(
        <button
          key={match.index}
          className="text-orange font-semibold hover:underline"
          onClick={() => onHashtagClick(tagOrMention.substring(1))}
        >
          {tagOrMention}
        </button>
      );
    } else if (tagOrMention.startsWith('@')) {
      parts.push(
        <button
          key={match.index}
          className="text-blue-600 font-semibold hover:underline"
          onClick={() => onMentionClick(tagOrMention.substring(1))}
        >
          {tagOrMention}
        </button>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Ajouter le reste du texte
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return <>{parts}</>;
}

export default function TweetCard({ tweet, onDelete, onUserProfileClick, onPostUpdated }: TweetCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [likes, setLikes] = useState(tweet.likes);
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [retweets, setRetweets] = useState(tweet.retweets || 0);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isRetweetModalOpen, setIsRetweetModalOpen] = useState(false);
  const [retweetComment, setRetweetComment] = useState('');
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
  const [isOriginalUserPrivate, setIsOriginalUserPrivate] = useState<boolean>(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const [displayedRepliesCount, setDisplayedRepliesCount] = useState<number>(3);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Nouvelle logique pour gérer les utilisateurs bannis
  const isBanned = tweet.user?.isbanned ?? false;

  // Nouvelle logique pour gérer les posts censurés
  const isCensored = currentTweet.isCensored ?? false;

  // Vérifier si le tweet provient d'un compte en mode lecture seule
  const isReadOnly = currentTweet.user?.readOnly ?? false;

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

    // Vérifier si l'utilisateur original a un compte privé
    const originalUser = tweet.isRetweet && tweet.originalUser
      ? tweet.originalUser
      : tweet.user;

    // Vérifier si l'utilisateur original a un compte privé en utilisant une approche sûre avec TypeScript
    if (originalUser) {
      // Utiliser une conversion explicite pour accéder à is_private
      const userObj = originalUser as any;
      const userIsPrivate =
        userObj.isPrivate === true ||
        userObj.is_private === true;

      setIsOriginalUserPrivate(userIsPrivate);

      // Log pour debug
      console.log("isOriginalUserPrivate défini à:", userIsPrivate, "à partir de:", userObj);
    } else {
      setIsOriginalUserPrivate(false);
    }
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

  // Vérifier le statut de retweet
  useEffect(() => {
    const checkRetweetStatus = async () => {
      if (!user) return;

      try {
        // Si le tweet est déjà un retweet, vérifier le statut du post original
        const postIdToCheck = tweet.isRetweet && tweet.originalPost && tweet.originalPost.id !== null
          ? tweet.originalPost.id
          : currentTweet.id;
        const status = await getRetweetStatus(postIdToCheck);
        setRetweets(status.retweets);
        setIsRetweeted(status.isRetweeted);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de retweet:', error);
      }
    };

    checkRetweetStatus();
  }, [currentTweet.id, tweet.isRetweet, tweet.originalPost, user]);

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

    // Si le compte est en mode lecture seule, empêcher la réponse
    if (isReadOnly) {
      setErrorMessage("Ce compte est en mode lecture seule. Les réponses sont désactivées.");
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
        {/* Bouton de fermeture */}
        <button
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsMediaOverlayOpen(false);
          }}
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div
          className="h-[calc(100vh-64px)] flex items-center justify-center p-8"
          onClick={(e) => e.stopPropagation()}
        >
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
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors cursor-pointer"
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
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors cursor-pointer"
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

  const handleRetweetClick = () => {
    if (!user || !isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    // Si déjà retweeté, afficher un message et ne pas ouvrir la modal
    if (isRetweeted) {
      setErrorMessage("Vous avez déjà retweeté ce post");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Si c'est son propre tweet, afficher un message d'erreur
    if (user.id === currentTweet.user?.id) {
      setErrorMessage("Vous ne pouvez pas repartager votre propre post");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Déterminer l'utilisateur à l'origine du post
    const originalUser = tweet.isRetweet && tweet.originalPost && tweet.originalPost.user
      ? tweet.originalPost.user
      : tweet.user;

    // Afficher l'utilisateur à l'origine du post dans la console
    console.log("Utilisateur à l'origine du post:", originalUser);

    // Ouvrir la modale avec le bon contexte
    // Si c'est un retweet, on doit afficher le post original
    setIsRetweetModalOpen(true);
  };

  const handleDirectRetweet = async () => {
    if (!user || !isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      // Si le tweet est déjà un retweet, on utilise l'ID du post original s'il existe
      const postIdToRetweet = tweet.isRetweet && tweet.originalPost && tweet.originalPost.id !== null
        ? tweet.originalPost.id
        : currentTweet.id;

      // La fonction retweetPost attend le paramètre 'content' et non 'comment'
      const newRetweet = await retweetPost(postIdToRetweet, '');

      // Mettre à jour l'UI
      setIsRetweeted(true);
      setRetweets(prevRetweets => prevRetweets + 1);
      setIsRetweetModalOpen(false);

      // Émettre un événement personnalisé pour notifier qu'un retweet a été créé
      const retweetEvent = new CustomEvent('retweetCreated', {
        detail: newRetweet
      });
      window.dispatchEvent(retweetEvent);
    } catch (error: any) {
      if (error.message?.includes('blocked')) {
        setErrorMessage('Vous ne pouvez pas retweeter le post d\'un utilisateur qui vous a bloqué.');
      } else {
        setErrorMessage('Une erreur est survenue lors du retweet.');
      }
    }
  };

  const handleRetweetWithComment = async () => {
    if (!user || !isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      // Si le tweet est déjà un retweet, on utilise l'ID du post original s'il existe
      const postIdToRetweet = tweet.isRetweet && tweet.originalPost && tweet.originalPost.id !== null
        ? tweet.originalPost.id
        : currentTweet.id;

      // La fonction retweetPost attend le paramètre 'content' et non 'comment'
      const newRetweet = await retweetPost(postIdToRetweet, retweetComment);

      // Mettre à jour l'UI
      setIsRetweeted(true);
      setRetweets(prevRetweets => prevRetweets + 1);
      setIsRetweetModalOpen(false);
      setRetweetComment('');

      // Émettre un événement personnalisé pour notifier qu'un retweet a été créé
      const retweetEvent = new CustomEvent('retweetCreated', {
        detail: newRetweet
      });
      window.dispatchEvent(retweetEvent);
    } catch (error: any) {
      if (error.message?.includes('blocked')) {
        setErrorMessage('Vous ne pouvez pas retweeter le post d\'un utilisateur qui vous a bloqué.');
      } else {
        setErrorMessage('Une erreur est survenue lors du retweet avec commentaire.');
      }
    }
  };

  // Si le post est censuré, afficher un message alternatif
  if (isCensored) {
    return (
      <div className="border-b border-gray-300">
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
              <div className="mt-2 text-gray-800 italic bg-red-50 p-3 rounded-lg border border-red-200">
                Ce message enfreint les conditions d'utilisation de la plateforme
              </div>
              {user?.roles?.includes('ROLE_ADMIN') && onDelete && (
                <div className="flex items-center space-x-4 mt-3">
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
    );
  }

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

  const handleHashtagClick = (hashtag: string) => {
    // Rediriger vers la page d'accueil avec recherche pour ce hashtag
    navigate(`/?q=${encodeURIComponent(hashtag)}`);
  };

  const handleMentionClick = async (mention: string) => {
    // Si le tweet a un auteur et que la mention correspond à l'auteur du tweet
    if (tweet.user && tweet.user.mention === mention) {
      // Afficher le profil de l'utilisateur
      if (onUserProfileClick && tweet.user) {
        onUserProfileClick(tweet.user.id);
      }
      return;
    }

    // Sinon, chercher l'utilisateur par sa mention
    if (onUserProfileClick) {
      try {
        // Rechercher l'utilisateur par sa mention
        const users = await fetchUsersByQuery(mention);

        // Trouver l'utilisateur dont la mention correspond exactement
        const matchedUser = users.find(user => user.mention === mention);

        if (matchedUser) {
          // Afficher le profil de l'utilisateur trouvé
          onUserProfileClick(matchedUser.id);
        } else if (users.length > 0) {
          // Si pas de correspondance exacte mais des résultats, prendre le premier
          onUserProfileClick(users[0].id);
        } else {
          console.error(`Aucun utilisateur trouvé avec la mention @${mention}`);
        }
      } catch (error) {
        console.error('Erreur lors de la recherche de l\'utilisateur par mention:', error);
      }
    }
  };

  // Ajouter ici la modal de retweet qui sera rendue en fin de composant
  const RetweetModal = () => {
    if (!isRetweetModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Repartager ce post</h3>
            <button
              onClick={() => setIsRetweetModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-t border-b border-gray-200 py-4 my-4">
            <div className="flex items-start space-x-3">
              <img
                src={
                  // Si c'est un retweet, on utilise l'avatar de l'utilisateur du post original
                  tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.avatar
                    ? getImageUrl(tweet.originalPost.user.avatar)
                    : tweet.user?.avatar
                      ? getImageUrl(tweet.user.avatar)
                      : '/default_pp.webp'
                }
                alt={`${tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.name
                  ? tweet.originalPost.user.name
                  : tweet.user?.name
                  } avatar`}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="font-bold">
                    {tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.name
                      ? tweet.originalPost.user.name
                      : tweet.user?.name}
                  </span>
                  <span className="text-gray-500">
                    @{tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.mention
                      ? tweet.originalPost.user.mention
                      : tweet.user?.mention}
                  </span>
                </div>
                <p className="text-gray-800 mt-1">
                  {tweet.isRetweet && tweet.originalPost
                    ? tweet.originalPost.content
                    : tweet.content}
                </p>

                {/* Affichage des médias du tweet */}
                {(tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                  ? tweet.originalPost.mediaUrl
                  : tweet.mediaUrl) && (
                    <div
                      className="mt-3 grid gap-2 rounded-lg overflow-hidden"
                      style={getMediaGridLayout(
                        (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                          ? tweet.originalPost.mediaUrl
                          : tweet.mediaUrl || "")
                          .split(',')
                          .filter(Boolean)
                          .slice(0, 4)
                          .length
                      )}
                    >
                      {(tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                        ? tweet.originalPost.mediaUrl
                        : tweet.mediaUrl || "")
                        .split(',')
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((mediaFile, index) => {
                          const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);
                          const mediaFiles = (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                            ? tweet.originalPost.mediaUrl
                            : tweet.mediaUrl)
                            ? (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                              ? tweet.originalPost.mediaUrl
                              : tweet.mediaUrl || "").split(',').filter(Boolean)
                            : [];
                          const mediaStyle = getMediaItemStyle(Math.min(mediaFiles.length, 4), index);

                          return (
                            <div
                              key={index}
                              style={mediaStyle}
                              className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-orange/40 hover:border-orange transition-all duration-200"
                            >
                              {isVideo ? (
                                <>
                                  <video
                                    src={getImageUrl(mediaFile)}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/50 rounded-full p-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <img
                                  src={getImageUrl(mediaFile)}
                                  alt={`Média ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}

                              {/* Indicateur s'il y a plus de médias */}
                              {mediaFiles.length > 4 && index === 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                  +{mediaFiles.length - 4}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <textarea
              placeholder="Ajoutez un commentaire (optionnel)"
              value={retweetComment}
              onChange={(e) => setRetweetComment(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDirectRetweet}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 font-medium flex-1"
            >
              Repartager sans commentaire
            </button>
            <button
              onClick={handleRetweetWithComment}
              disabled={!retweetComment.trim()}
              className={`px-4 py-2 rounded-full font-medium flex-1 ${retweetComment.trim()
                ? 'bg-orange text-white hover:bg-orange/90'
                : 'bg-orange/50 text-white cursor-not-allowed'
                }`}
            >
              Repartager avec commentaire
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Si c'est un retweet, on ajoute une note en haut
  const RetweetHeader = () => {
    if (!tweet.isRetweet || !tweet.originalUser) return null;

    return (
      <div className="flex items-center mb-2 text-orange text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>
          Repartagé d'un tweet de <span className="font-medium hover:underline cursor-pointer" onClick={() => tweet.originalUser && onUserProfileClick?.(tweet.originalUser.id)}>
            @{tweet.originalUser.mention}
          </span>
        </span>
      </div>
    );
  };

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
        {/* Afficher l'en-tête de retweet si nécessaire */}
        <RetweetHeader />

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
              {tweet.isCensored ?
                formattedContent :
                formatContentWithLinks(formattedContent, handleHashtagClick, handleMentionClick)
              }
              {tweet.isRetweet && tweet.originalPost && (
                <div className="mt-3 p-3 border rounded-lg bg-gray-50 border-gray-300">
                  {tweet.originalPost.deleted ? (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {tweet.originalPost?.user ? (
                          <>
                            <img
                              src={tweet.originalPost.user.avatar ? getImageUrl(tweet.originalPost.user.avatar) : '/default_pp.webp'}
                              alt={tweet.originalPost.user.name || 'Avatar'}
                              className="w-6 h-6 rounded-full"
                              onClick={() => tweet.originalPost?.user?.id && onUserProfileClick?.(tweet.originalPost.user.id)}
                            />
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {tweet.originalPost.user.name}
                              </span>
                              <span className="text-gray-500 ml-1">@{tweet.originalPost.user.mention}</span>
                              <div className="text-gray-500 dark:text-gray-400 italic mt-1">
                                Post supprimé par son auteur
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 italic">
                            Post supprimé par son auteur
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800 dark:text-gray-200">
                        {formatContentWithLinks(tweet.originalPost.content, handleHashtagClick, handleMentionClick)}
                      </div>
                      {tweet.originalPost?.mediaUrl && (
                        <div className="mt-2 grid gap-2 rounded-lg overflow-hidden"
                          style={tweet.originalPost?.mediaUrl ? getMediaGridLayout(tweet.originalPost.mediaUrl.split(',').filter(Boolean).slice(0, 4).length) : {}}>
                          {tweet.originalPost?.mediaUrl?.split(',').filter(Boolean).slice(0, 4).map((mediaFile, index) => {
                            const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);
                            const mediaFiles = tweet.originalPost?.mediaUrl?.split(',').filter(Boolean) || [];
                            const mediaStyle = getMediaItemStyle(Math.min(mediaFiles.length, 4), index);

                            return (
                              <div
                                key={index}
                                style={mediaStyle}
                                className="relative rounded-lg overflow-hidden cursor-pointer group border-1 border-gray-300 hover:border-black transition-all duration-200"
                                onClick={() => openMediaOverlay(index)}
                              >
                                {isVideo ? (
                                  <div className="relative aspect-video">
                                    <video
                                      src={getImageUrl(mediaFile)}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/50 rounded-full p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                                          <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={getImageUrl(mediaFile)}
                                    alt="Média"
                                    className="w-full h-full object-cover"
                                  />
                                )}

                                {/* Indicateur s'il y a plus de médias */}
                                {mediaFiles.length > 4 && index === 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                    +{mediaFiles.length - 4}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src={tweet.originalPost?.user?.avatar ? getImageUrl(tweet.originalPost.user.avatar) : '/default_pp.webp'}
                          alt={tweet.originalPost?.user?.name || 'Avatar'}
                          className="w-6 h-6 rounded-full"
                          onClick={() => tweet.originalPost?.user?.id && onUserProfileClick?.(tweet.originalPost.user.id)}
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {tweet.originalPost?.user?.name}
                          </span>
                          <span className="text-gray-500 ml-1">@{tweet.originalPost?.user?.mention}</span>
                        </div>
                      </div>
                      <div className="text-gray-800 dark:text-gray-200">
                        {formatContentWithLinks(tweet.originalPost.content, handleHashtagClick, handleMentionClick)}
                      </div>
                      {tweet.originalPost?.mediaUrl && (
                        <div className="mt-2 grid gap-2 rounded-lg overflow-hidden"
                          style={tweet.originalPost?.mediaUrl ? getMediaGridLayout(tweet.originalPost.mediaUrl.split(',').filter(Boolean).slice(0, 4).length) : {}}>
                          {tweet.originalPost?.mediaUrl?.split(',').filter(Boolean).slice(0, 4).map((mediaFile, index) => {
                            const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);
                            const mediaFiles = tweet.originalPost?.mediaUrl?.split(',').filter(Boolean) || [];
                            const mediaStyle = getMediaItemStyle(Math.min(mediaFiles.length, 4), index);

                            return (
                              <div
                                key={index}
                                style={mediaStyle}
                                className="relative rounded-lg overflow-hidden cursor-pointer group border-1 border-gray-300 hover:border-black transition-all duration-200"
                                onClick={() => openMediaOverlay(index)}
                              >
                                {isVideo ? (
                                  <div className="relative aspect-video">
                                    <video
                                      src={getImageUrl(mediaFile)}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/50 rounded-full p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                                          <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={getImageUrl(mediaFile)}
                                    alt="Média"
                                    className="w-full h-full object-cover"
                                  />
                                )}

                                {/* Indicateur s'il y a plus de médias */}
                                {mediaFiles.length > 4 && index === 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                    +{mediaFiles.length - 4}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Afficher les médias seulement si ce n'est pas un retweet */}
            {currentTweet.mediaUrl && !tweet.isRetweet && (
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

                {/* NOUVEAU Bouton de retweet */}
                <button
                  onClick={handleRetweetClick}
                  className={`flex items-center space-x-2 cursor-pointer group ${isRetweeted ? 'text-orange' : 'text-gray-500 hover:text-orange'} ${isBlockedByAuthor || isRetweeted || (user?.id === currentTweet.user?.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isBlockedByAuthor || isRetweeted || (user?.id === currentTweet.user?.id)}
                  title={isBlockedByAuthor ? "Vous ne pouvez pas interagir avec ce post" : isRetweeted ? "Vous avez déjà retweeté ce post" : (user?.id === currentTweet.user?.id) ? "Vous ne pouvez pas repartager votre propre post" : "Repartager"}
                >
                  <svg
                    className={`h-5 w-5 fill-none ${isRetweeted ? 'stroke-orange' : 'group-hover:stroke-orange'}`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {retweets > 0 && (
                    <span className={`ml-1 ${isRetweeted ? 'text-orange' : 'text-gray-500 group-hover:text-orange'}`}>
                      {retweets}
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
                      className="flex items-center space-x-2 cursor-pointer group text-gray-500 hover:text-orange"
                      title="Modifier le post"
                    >
                      <svg
                        className="h-5 w-5 fill-none group-hover:stroke-orange"
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
          {user && !userHasReplied && !isBlockedByAuthor && !isReadOnly && (
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
          {isBlockedByAuthor && (
            <div className="p-4 my-2 bg-gray-100 rounded-lg text-center text-gray-600">
              <p>Vous ne pouvez pas répondre à ce post car l'auteur vous a bloqué.</p>
            </div>
          )}

          {/* Message si le compte est en mode lecture seule */}
          {isReadOnly && (
            <div className="p-4 my-2 bg-blue-50 rounded-lg text-center text-blue-600">
              <p>Ce compte est en mode lecture seule. Les réponses sont désactivées.</p>
            </div>
          )}

          {/* Message si l'utilisateur a déjà répondu */}
          {user && userHasReplied && !isBlockedByAuthor && !isReadOnly && (
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

      {/* Retweet Modal */}
      <Modal
        isOpen={isRetweetModalOpen}
        onClose={() => setIsRetweetModalOpen(false)}
        title="Retweeter"
      >
        <div className="p-4">
          {isOriginalUserPrivate && (
            <div className="mb-4 p-3 bg-light-orange border border-orange rounded-lg text-dark-orange text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#F05E1D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Le compte à l'origine de ce post est privé, la visualisation sera restreinte sur votre republication</span>
              </div>
            </div>
          )}
          <div className="mb-4 flex space-x-3 border-b pb-4 text-sm">
            <img
              src={
                // Si c'est un retweet, on utilise l'avatar de l'utilisateur du post original
                tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.avatar
                  ? getImageUrl(tweet.originalPost.user.avatar)
                  : tweet.user?.avatar
                    ? getImageUrl(tweet.user.avatar)
                    : '/default_pp.webp'
              }
              alt={`${tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.name
                ? tweet.originalPost.user.name
                : tweet.user?.name
                } avatar`}
              className="h-10 w-10 rounded-full"
            />
            <div className="flex-1">
              <div className="font-bold">
                {tweet.isRetweet && tweet.originalPost && tweet.originalPost.user?.name
                  ? tweet.originalPost.user.name
                  : tweet.user?.name}
              </div>
              <p className="mt-1">
                {tweet.isRetweet && tweet.originalPost
                  ? tweet.originalPost.content
                  : tweet.content}
              </p>

              {/* Affichage des médias du tweet */}
              {(tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                ? tweet.originalPost.mediaUrl
                : tweet.mediaUrl) && (
                  <div
                    className="mt-3 grid gap-2 rounded-lg overflow-hidden"
                    style={getMediaGridLayout(
                      (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                        ? tweet.originalPost.mediaUrl
                        : tweet.mediaUrl || "")
                        .split(',')
                        .filter(Boolean)
                        .slice(0, 4)
                        .length
                    )}
                  >
                    {(tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                      ? tweet.originalPost.mediaUrl
                      : tweet.mediaUrl || "")
                      .split(',')
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((mediaFile, index) => {
                        const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);
                        const mediaFiles = (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                          ? tweet.originalPost.mediaUrl
                          : tweet.mediaUrl)
                          ? (tweet.isRetweet && tweet.originalPost && tweet.originalPost.mediaUrl
                            ? tweet.originalPost.mediaUrl
                            : tweet.mediaUrl || "").split(',').filter(Boolean)
                          : [];
                        const mediaStyle = getMediaItemStyle(Math.min(mediaFiles.length, 4), index);

                        return (
                          <div
                            key={index}
                            style={mediaStyle}
                            className="relative rounded-lg overflow-hidden border-2 border-orange/40 hover:border-orange transition-all duration-200"
                          >
                            {isVideo ? (
                              <>
                                <video
                                  src={getImageUrl(mediaFile)}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/50 rounded-full p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <img
                                src={getImageUrl(mediaFile)}
                                alt={`Média ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}

                            {/* Indicateur s'il y a plus de médias */}
                            {mediaFiles.length > 4 && index === 3 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                +{mediaFiles.length - 4}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange focus:border-orange"
                rows={3}
                placeholder="Ajouter un commentaire (optionnel)"
                value={retweetComment}
                onChange={(e) => setRetweetComment(e.target.value)}
              ></textarea>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {retweetComment ? "Retweet avec commentaire" : "Retweet sans commentaire"}
                </div>
                <div className={`text-sm ${retweetComment.length > 250 ? "text-red-500" : "text-gray-500"}`}>
                  {retweetComment.length}/280
                </div>
              </div>

              <Button
                onClick={retweetComment.trim() ? handleRetweetWithComment : handleDirectRetweet}
                variant="full"
                className="mt-3 w-full py-2 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retweeter
              </Button>

            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}