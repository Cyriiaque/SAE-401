import React, { useState, useEffect } from 'react';
import { Tweet, retweetPost, getImageUrl } from '../lib/loaders';
import Button from '../ui/buttons';

interface RetweetModalProps {
    tweet: Tweet;
    isOpen: boolean;
    onClose: () => void;
    onRetweetSuccess: () => void;
    isOriginalUserPrivate: boolean;
    currentUser: any; // Remplacé par le type User en production
}

const RetweetModal: React.FC<RetweetModalProps> = ({
    tweet,
    isOpen,
    onClose,
    onRetweetSuccess,
    isOriginalUserPrivate,
    currentUser
}) => {
    const [retweetComment, setRetweetComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleDirectRetweet = async () => {
        if (!currentUser) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const postIdToRetweet = tweet.isRetweet && tweet.originalPost && tweet.originalPost.id !== null
                ? tweet.originalPost.id
                : tweet.id;

            const newRetweet = await retweetPost(postIdToRetweet, '');

            // Déclencher un événement personnalisé
            const retweetEvent = new CustomEvent('retweetCreated', {
                detail: newRetweet
            });
            window.dispatchEvent(retweetEvent);

            onRetweetSuccess();
            onClose();
        } catch (error: any) {
            if (error.message?.includes('blocked')) {
                setErrorMessage('Vous ne pouvez pas retweeter le post d\'un utilisateur qui vous a bloqué.');
            } else {
                setErrorMessage('Une erreur est survenue lors du retweet.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetweetWithComment = async () => {
        if (!currentUser) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const postIdToRetweet = tweet.isRetweet && tweet.originalPost && tweet.originalPost.id !== null
                ? tweet.originalPost.id
                : tweet.id;

            const newRetweet = await retweetPost(postIdToRetweet, retweetComment);

            // Déclencher un événement personnalisé
            const retweetEvent = new CustomEvent('retweetCreated', {
                detail: newRetweet
            });
            window.dispatchEvent(retweetEvent);

            onRetweetSuccess();
            onClose();
        } catch (error: any) {
            if (error.message?.includes('blocked')) {
                setErrorMessage('Vous ne pouvez pas retweeter le post d\'un utilisateur qui vous a bloqué.');
            } else {
                setErrorMessage('Une erreur est survenue lors du retweet avec commentaire.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const currentTweet = tweet.isRetweet && tweet.originalPost ? tweet.originalPost : tweet;
    const displayMediaFiles = currentTweet.mediaUrl?.split(',').filter(Boolean) || [];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        Retweeter
                                    </h3>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <span className="sr-only">Fermer</span>
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {errorMessage && (
                                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                        {errorMessage}
                                    </div>
                                )}

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
                                                    style={{
                                                        gridTemplateColumns: displayMediaFiles.length > 1 ? 'repeat(2, 1fr)' : '1fr',
                                                        gridTemplateRows: displayMediaFiles.length > 2 ? 'repeat(2, 1fr)' : '1fr',
                                                        aspectRatio: displayMediaFiles.length === 1 ? '16/9' : displayMediaFiles.length === 2 ? '2/1' : '1/1',
                                                        maxHeight: displayMediaFiles.length === 1 ? '300px' : displayMediaFiles.length === 3 ? '250px' : '200px'
                                                    }}
                                                >
                                                    {displayMediaFiles.slice(0, 4).map((mediaFile, index) => {
                                                        const isVideo = mediaFile.match(/\.(mp4|webm|ogg)$/i);

                                                        return (
                                                            <div
                                                                key={index}
                                                                className="relative rounded-lg overflow-hidden"
                                                                style={{
                                                                    gridColumn: displayMediaFiles.length === 3 && index === 0 ? 'span 2' : 'auto'
                                                                }}
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
                                                                {displayMediaFiles.length > 4 && index === 3 && (
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                                                        +{displayMediaFiles.length - 4}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <textarea
                                        value={retweetComment}
                                        onChange={(e) => setRetweetComment(e.target.value)}
                                        placeholder="Ajouter un commentaire..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                        maxLength={280}
                                    />
                                    <div className="mt-2 text-right text-sm text-gray-500">
                                        {retweetComment.length}/280
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button
                            onClick={handleRetweetWithComment}
                            disabled={isProcessing || retweetComment.length > 280}
                            className="w-full sm:w-auto sm:ml-3"
                            variant="full"
                        >
                            {isProcessing ? 'Retweet en cours...' : 'Retweeter avec commentaire'}
                        </Button>
                        <Button
                            onClick={handleDirectRetweet}
                            disabled={isProcessing}
                            className="mt-3 w-full sm:mt-0 sm:w-auto"
                            variant="outline"
                        >
                            {isProcessing ? 'Retweet en cours...' : 'Retweeter'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetweetModal; 