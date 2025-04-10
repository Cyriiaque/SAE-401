import React, { useState, useRef, useEffect } from 'react';
import { createPost, uploadImage, fetchUsersByQuery, Tweet, User, getImageUrl, updatePost, deleteMediaFile } from '../lib/loaders';
import { compressImage, compressVideo, tryConvertVideo } from './Compression';
import Avatar from '../ui/Avatar';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    tweet?: Tweet;
    onPostUpdated?: (updatedTweet: Tweet) => void;
    onTweetPublished?: (tweet: Tweet) => void;
    mode?: 'edit' | 'create';
}

export default function PostModal({
    isOpen,
    onClose,
    tweet,
    onPostUpdated,
    onTweetPublished,
    mode = 'edit'
}: PostModalProps) {
    const [content, setContent] = useState(tweet?.content || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [media, setMedia] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([]);
    const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
    const [isLocked, setIsLocked] = useState<boolean>(tweet?.isLocked || false);
    const [processingFiles, setProcessingFiles] = useState<Record<string, {
        id: string,
        name: string,
        progress: number,
        cancel: () => void
    }>>({});
    const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
    const [hiddenMediaIndexes, setHiddenMediaIndexes] = useState<number[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const searchTimeout = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const maxLength = 280;
    const maxMediaCount = 10;

    // Obtenir le titre de la modal selon le mode
    const getModalTitle = () => {
        return mode === 'edit' ? 'Modifier le tweet' : 'Créer un tweet';
    };

    // Charger les données du post à modifier si mode édition
    useEffect(() => {
        if (tweet && isOpen && mode === 'edit') {
            setContent(tweet.content);

            // Charger les médias existants
            if (tweet.mediaUrl) {
                const mediaUrls = tweet.mediaUrl.split(',');
                setExistingMediaUrls(mediaUrls);

                // Préparer les prévisualisations et les types de médias
                const previews: string[] = [];
                const types: ('image' | 'video')[] = [];

                mediaUrls.forEach(url => {
                    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                    previews.push(getImageUrl(url));
                    types.push(isVideo ? 'video' : 'image');
                });

                setMediaPreviews(previews);
                setMediaTypes(types);
            }
        } else if (isOpen && mode === 'create') {
            // Réinitialiser les champs pour une nouvelle création
            setContent('');
            setMedia([]);
            setMediaPreviews([]);
            setMediaTypes([]);
            setExistingMediaUrls([]);
            setMediaToDelete([]);
        }
    }, [tweet, isOpen, mode]);

    // Nettoyer le timeout lors du démontage du composant
    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        // Vérifier le nombre total de fichiers (existants + nouveaux)
        if (existingMediaUrls.length + mediaPreviews.length - hiddenMediaIndexes.length + e.target.files.length > 10) {
            alert("Vous ne pouvez pas ajouter plus de 10 fichiers médias au total.");
            return;
        }

        // Vérifier les tailles des fichiers originaux (limite absolue pour ne pas bloquer le navigateur)
        const MAX_ORIGINAL_SIZE = 250 * 1024 * 1024; // 250 Mo maximum par fichier d'origine
        const oversizedFiles = Array.from(e.target.files).filter(file => file.size > MAX_ORIGINAL_SIZE);
        if (oversizedFiles.length > 0) {
            const fileSizes = oversizedFiles.map(f => `${f.name}: ${Math.round(f.size / (1024 * 1024))}Mo`).join(', ');
            alert(`Les fichiers suivants sont trop volumineux (>${MAX_ORIGINAL_SIZE / (1024 * 1024)}Mo): ${fileSizes}.`);
            return;
        }

        try {

            // Traiter chaque fichier individuellement
            const processedFiles: File[] = [];
            const processedPreviews: string[] = [];
            const processedTypes: string[] = [];

            // Copie des fichiers pour pouvoir les traiter même après la réinitialisation de l'input
            const filesToProcess = Array.from(e.target.files);
            // Reset l'input file pour permettre la sélection des mêmes fichiers
            e.target.value = '';

            // Traiter chaque fichier séquentiellement pour éviter de surcharger le navigateur
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const fileId = `file-${Date.now()}-${i}`;

                // Créer un objet d'annulation
                let cancelProcessing = false;
                const cancelTokens: number[] = [];
                let progressInterval = 0; // Initialiser avec 0

                // Ajouter ce fichier à la liste des fichiers en cours de traitement
                setProcessingFiles(prev => ({
                    ...prev,
                    [fileId]: {
                        id: fileId,
                        name: file.name,
                        progress: 0,
                        cancel: () => {
                            cancelProcessing = true;
                            cancelTokens.forEach(id => window.clearTimeout(id));
                            if (progressInterval) window.clearInterval(progressInterval);
                            setProcessingFiles(current => {
                                const updated = { ...current };
                                delete updated[fileId];
                                return updated;
                            });
                        }
                    }
                }));

                try {
                    let processedFile = file;
                    const isImage = file.type.startsWith('image/');
                    const isVideo = file.type.startsWith('video/');

                    // Mise à jour périodique de la progression
                    progressInterval = window.setInterval(() => {
                        if (!cancelProcessing) {
                            setProcessingFiles(prev => {
                                if (!prev[fileId]) return prev;
                                return {
                                    ...prev,
                                    [fileId]: {
                                        ...prev[fileId],
                                        progress: Math.min(prev[fileId].progress + 5, 95) // augmente progressivement mais plafonne à 95%
                                    }
                                };
                            });
                        }
                    }, 1000);
                    cancelTokens.push(progressInterval);

                    // Vérification des limites de taille pour l'upload
                    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 Mo max après compression
                    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo max après compression

                    // Compresser les vidéos si nécessaire
                    if (isVideo && file.size > MAX_VIDEO_SIZE) {

                        try {
                            // Vérifier périodiquement si l'opération a été annulée
                            if (cancelProcessing) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            processedFile = await compressVideo(file);

                            // Vérifier à nouveau si l'opération a été annulée pendant la compression
                            if (cancelProcessing) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            // Si toujours trop volumineux, on alerte
                            if (processedFile.size > MAX_VIDEO_SIZE) {
                                console.warn(`La vidéo compressée est toujours trop volumineuse: ${Math.round(processedFile.size / (1024 * 1024))}Mo > ${MAX_VIDEO_SIZE / (1024 * 1024)}Mo`);
                            }
                        } catch (compressError) {
                            // Si l'erreur est due à l'annulation, propager l'erreur
                            if (cancelProcessing || (compressError instanceof Error && compressError.message.includes("annulé"))) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            console.error("Erreur de compression vidéo:", compressError);
                            throw new Error(`Impossible de compresser la vidéo ${file.name}: ${compressError instanceof Error ? compressError.message : 'Erreur inconnue'}`);
                        }
                    }

                    // Compresser les images si nécessaires
                    if (isImage && file.size > MAX_IMAGE_SIZE) {

                        try {
                            // Vérifier si l'opération a été annulée
                            if (cancelProcessing) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            processedFile = await compressImage(file);

                            // Vérifier à nouveau si l'opération a été annulée pendant la compression
                            if (cancelProcessing) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                        } catch (compressError) {
                            // Si l'erreur est due à l'annulation, propager l'erreur
                            if (cancelProcessing || (compressError instanceof Error && compressError.message.includes("annulé"))) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            console.error("Erreur de compression image:", compressError);
                            throw new Error(`Impossible de compresser l'image ${file.name}`);
                        }
                    }

                    // Créer les URL pour les previews
                    const objectUrl = URL.createObjectURL(processedFile);

                    // Pour les vidéos, vérifier qu'elles peuvent être lues
                    if (isVideo) {

                        try {
                            // Vérifier si l'opération a été annulée
                            if (cancelProcessing) {
                                URL.revokeObjectURL(objectUrl);
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            await new Promise<void>((resolve, reject) => {
                                const videoElement = document.createElement('video');
                                const loadTimeout = setTimeout(() => {
                                    console.warn(`Délai dépassé lors du chargement de la vidéo ${file.name}`);
                                    videoElement.onerror = null;
                                    videoElement.onloadedmetadata = null;
                                    reject(new Error("Délai de chargement de la vidéo dépassé"));
                                }, 20000); // 20 secondes max pour charger
                                cancelTokens.push(loadTimeout);

                                videoElement.onerror = (event) => {
                                    clearTimeout(loadTimeout);
                                    console.error(`Erreur lors du chargement de la vidéo ${file.name}:`, event);
                                    videoElement.onerror = null;
                                    videoElement.onloadedmetadata = null;
                                    reject(new Error(`Format vidéo ${file.type.split('/')[1] || ''} non supporté par le navigateur`));
                                };

                                videoElement.onloadedmetadata = () => {
                                    clearTimeout(loadTimeout);
                                    videoElement.onerror = null;
                                    videoElement.onloadedmetadata = null;

                                    // Vérifier si l'opération a été annulée pendant le chargement
                                    if (cancelProcessing) {
                                        reject(new Error("Traitement annulé par l'utilisateur"));
                                    } else {
                                        resolve();
                                    }
                                };

                                videoElement.preload = 'metadata';
                                videoElement.muted = false;
                                videoElement.src = objectUrl;
                            });

                            // Vérifier à nouveau si l'opération a été annulée
                            if (cancelProcessing) {
                                URL.revokeObjectURL(objectUrl);
                                throw new Error("Traitement annulé par l'utilisateur");
                            }
                        } catch (error) {
                            console.error(`Erreur lors du traitement du fichier: ${file.name}`, error);
                            URL.revokeObjectURL(objectUrl);

                            // Si l'erreur est due à l'annulation, propager l'erreur
                            if (cancelProcessing || (error instanceof Error && error.message.includes("annulé"))) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            // Tenter une conversion si le format n'est pas supporté

                            try {
                                // Vérifier si l'opération a été annulée
                                if (cancelProcessing) {
                                    throw new Error("Traitement annulé par l'utilisateur");
                                }

                                const convertedFile = await tryConvertVideo(processedFile);

                                // Vérifier à nouveau si l'opération a été annulée
                                if (cancelProcessing) {
                                    throw new Error("Traitement annulé par l'utilisateur");
                                }

                                // Remplacer le fichier et créer une nouvelle URL
                                processedFile = convertedFile;
                                const newUrl = URL.createObjectURL(convertedFile);

                                // Ajouter aux listes
                                processedFiles.push(convertedFile);
                                processedPreviews.push(newUrl);
                                processedTypes.push('video');

                                // Enlever ce fichier de la liste des fichiers en cours de traitement
                                if (progressInterval) window.clearInterval(progressInterval);
                                setProcessingFiles(prev => {
                                    const updated = { ...prev };
                                    delete updated[fileId];
                                    return updated;
                                });

                                // Passer au fichier suivant
                                continue;
                            } catch (conversionError) {
                                // Si l'erreur est due à l'annulation, propager l'erreur
                                if (cancelProcessing || (conversionError instanceof Error && conversionError.message.includes("annulé"))) {
                                    throw new Error("Traitement annulé par l'utilisateur");
                                }

                                console.error("Échec de la conversion:", conversionError);
                                throw new Error(`Format vidéo incompatible : ${conversionError instanceof Error ? conversionError.message : 'Erreur inconnue'}`);
                            }
                        }
                    }

                    // Ajouter aux listes si aucune erreur
                    processedFiles.push(processedFile);
                    processedPreviews.push(objectUrl);
                    processedTypes.push(isVideo ? 'video' : 'image');

                    // Enlever ce fichier de la liste des fichiers en cours de traitement
                    if (progressInterval) window.clearInterval(progressInterval);
                    setProcessingFiles(prev => {
                        const updated = { ...prev };
                        delete updated[fileId];
                        return updated;
                    });

                } catch (fileError) {
                    // Nettoyer les ressources et les intervalles
                    if (progressInterval) window.clearInterval(progressInterval);

                    // Si l'erreur est due à l'annulation, ne pas afficher d'erreur
                    if (cancelProcessing || (fileError instanceof Error && fileError.message.includes("annulé"))) {

                        // Enlever ce fichier de la liste des fichiers en cours de traitement
                        setProcessingFiles(prev => {
                            const updated = { ...prev };
                            delete updated[fileId];
                            return updated;
                        });

                        continue; // Passer au fichier suivant sans afficher d'erreur
                    }

                    console.error(`Erreur lors du traitement du fichier individuel:`, fileError);

                    // Enlever ce fichier de la liste des fichiers en cours de traitement
                    if (progressInterval) window.clearInterval(progressInterval);
                    setProcessingFiles(prev => {
                        const updated = { ...prev };
                        delete updated[fileId];
                        return updated;
                    });

                    throw new Error(`Erreur lors du traitement du fichier ${file.name}: ${fileError instanceof Error ? fileError.message : 'Erreur inconnue'}`);
                }
            }

            // Mettre à jour l'état avec tous les nouveaux fichiers
            setMedia(prev => [...prev, ...processedFiles]);
            setMediaPreviews(prev => [...prev, ...processedPreviews]);
            setMediaTypes(prev => [...prev, ...processedTypes as ("image" | "video")[]]);

        } catch (error) {
            console.error("Erreur globale lors du traitement des médias:", error);

            // Ne pas afficher d'erreur si c'est une annulation par l'utilisateur
            if (!(error instanceof Error && error.message.includes("annulé"))) {
                alert(`Erreur: ${error instanceof Error ? error.message : 'Problème lors du traitement des fichiers'}`);
            }
        }
    };

    const handleRemoveMedia = (index: number) => {
        try {
            // Vérifier si l'index est valide
            if (index < 0 || index >= mediaPreviews.length) {
                return;
            }

            // Ajouter l'index à la liste des médias masqués
            setHiddenMediaIndexes(prev => [...prev, index]);

            if (index < existingMediaUrls.length) {
                // C'est un média existant
                // Ajouter le fichier à la liste des fichiers à supprimer plus tard
                const mediaFilename = existingMediaUrls[index];
                setMediaToDelete(prev => [...prev, mediaFilename]);
                // Note: On ne supprime pas immédiatement de existingMediaUrls
            } else {
                // C'est un nouveau média
                // Note: On ne supprime pas immédiatement de media
            }
        } catch (error) {
            // Ignorer les erreurs pour éviter de bloquer l'interface
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Vérifier si le contenu est vide et s'il n'y a pas de média visible
        const visibleMediaCount = media.length + existingMediaUrls.length - hiddenMediaIndexes.length;
        if (!content.trim() && visibleMediaCount === 0) {
            return;
        }

        // Vérifier la longueur du contenu
        if (content.length > maxLength) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Appliquer les suppressions de médias maintenant
            // 1. Filtrer les médias existants
            const filteredExistingMediaUrls = existingMediaUrls.filter((_, index) =>
                !hiddenMediaIndexes.includes(index));

            // 2. Filtrer les nouveaux médias (ceux qui sont après existingMediaUrls.length)
            const adjustedMediaIndexes = hiddenMediaIndexes
                .filter(index => index >= existingMediaUrls.length)
                .map(index => index - existingMediaUrls.length);

            const filteredMedia = media.filter((_, index) =>
                !adjustedMediaIndexes.includes(index));

            // Télécharger les nouveaux médias
            const uploadedMediaUrls: string[] = [];

            // Upload des nouveaux médias si présents
            if (filteredMedia.length > 0) {
                // Vérifier la taille totale avant upload
                const totalSize = filteredMedia.reduce((acc, file) => acc + file.size, 0);
                const maxTotalSize = 200 * 1024 * 1024; // 200 MB max total

                if (totalSize > maxTotalSize) {
                    throw new Error(`La taille totale des médias (${Math.round(totalSize / 1024 / 1024)}Mo) dépasse la limite de 200Mo`);
                }

                // Uploader chaque média
                for (const file of filteredMedia) {
                    // Vérifier la taille individuelle
                    if (file.size > 50 * 1024 * 1024) {
                        throw new Error(`Le fichier ${file.name} (${Math.round(file.size / 1024 / 1024)}Mo) dépasse la limite de 50Mo`);
                    }

                    const response = await uploadImage(file, 'post');
                    uploadedMediaUrls.push(response.filename);
                }
            }

            // Combiner les médias existants conservés et les nouveaux médias
            const allMediaUrls = [...filteredExistingMediaUrls, ...uploadedMediaUrls];

            let updatedTweet;

            if (mode === 'edit' && tweet) {
                // Mode édition: Mettre à jour le post existant
                updatedTweet = await updatePost(
                    tweet.id,
                    content,
                    allMediaUrls.length > 0 ? allMediaUrls : undefined,
                    isLocked
                );

                // Supprimer les médias qui ne sont plus utilisés
                if (mediaToDelete.length > 0) {
                    for (const mediaUrl of mediaToDelete) {
                        try {
                            // Extraire le nom du fichier de l'URL
                            const filename = mediaUrl.includes('/')
                                ? mediaUrl.split('/').pop() || mediaUrl
                                : mediaUrl;

                            await deleteMediaFile(filename);
                        } catch (error) {
                            // Ne pas bloquer le processus si la suppression échoue
                        }
                    }
                }

                if (onPostUpdated) {
                    onPostUpdated(updatedTweet);
                }
            } else {
                // Mode création: Créer un nouveau post
                const newTweet = await createPost(
                    content,
                    allMediaUrls.length > 0 ? allMediaUrls : undefined,
                    isLocked
                );

                if (onTweetPublished) {
                    onTweetPublished(newTweet);
                }
            }

            // Réinitialiser l'état et fermer la modal
            handleModalClose();
        } catch (error) {
            // Afficher l'erreur à l'utilisateur
            alert(error instanceof Error ? error.message : 'Une erreur est survenue lors de la soumission');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fonction personnalisée pour gérer la fermeture du modal sans sauvegarder
    const handleModalClose = () => {
        // Révoquer toutes les URLs blob pour éviter les fuites mémoire
        mediaPreviews.forEach(preview => {
            if (preview.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(preview);
                } catch (e) {
                    console.error('Erreur lors de la révocation d\'URL:', e);
                }
            }
        });

        // Réinitialiser tous les états
        setMediaToDelete([]);
        setHiddenMediaIndexes([]);

        // Fermer le modal
        onClose();
    };

    // Recherche d'utilisateurs pour les mentions
    const searchUsers = async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestedUsers([]);
            return;
        }

        try {
            const users = await fetchUsersByQuery(query);
            // Limiter à 5 suggestions les plus pertinentes
            const sortedUsers = users
                // Trier par pertinence (si commence par la requête en premier)
                .sort((a, b) => {
                    const aStarts = a.mention?.toLowerCase().startsWith(query.toLowerCase()) || false;
                    const bStarts = b.mention?.toLowerCase().startsWith(query.toLowerCase()) || false;
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return 0;
                })
                .slice(0, 5);

            setSuggestedUsers(sortedUsers);
        } catch (error) {
            console.error('Erreur lors de la recherche des utilisateurs:', error);
            setSuggestedUsers([]);
        }
    };

    // Gérer la saisie de texte avec détection des hashtags et mentions
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);

        // Sauvegarder la position du curseur
        if (textareaRef.current) {
            setCursorPosition(textareaRef.current.selectionStart);
        }

        // Détecter si nous sommes en train de taper une mention
        const text = newContent.substring(0, e.target.selectionStart);
        const mentionMatch = text.match(/@(\w*)$/);

        if (mentionMatch) {
            const mention = mentionMatch[1];

            // Annuler la recherche précédente si en cours
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }

            // Attendre un peu avant de lancer la recherche (300ms)
            searchTimeout.current = window.setTimeout(() => {
                searchUsers(mention);
            }, 300);

            setShowUserSuggestions(true);
        } else {
            setShowUserSuggestions(false);
        }
    };

    // Insérer une mention dans le contenu
    const insertMention = (user: User) => {
        if (!textareaRef.current) return;

        const text = content;
        const curPos = cursorPosition;

        // Trouver le début de la mention
        let startPos = curPos;
        while (startPos > 0 && text.charAt(startPos - 1) !== '@' && !text.charAt(startPos - 1).match(/\s/)) {
            startPos--;
        }
        if (startPos > 0 && text.charAt(startPos - 1) === '@') {
            startPos--;
        }

        // Insérer la mention formatée
        const newText = text.substring(0, startPos) +
            `@${user.mention}` +
            text.substring(curPos);

        setContent(newText);
        setShowUserSuggestions(false);

        // Replacer le focus sur le textarea
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = startPos + user.mention!.length + 1; // +1 pour le @
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                setCursorPosition(newCursorPos);
            }
        }, 10);
    };

    // Insérer un hashtag
    const insertHashtag = () => {
        if (!textareaRef.current) return;

        const curPos = textareaRef.current.selectionStart;
        const newText = content.substring(0, curPos) + '#' + content.substring(curPos);

        setContent(newText);

        // Replacer le focus et déplacer le curseur
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = curPos + 1;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                setCursorPosition(newCursorPos);
            }
        }, 10);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{getModalTitle()}</h2>
                    <button
                        onClick={handleModalClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Qu'avez-vous à dire ?"
                        className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${content.length > maxLength
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-orange'
                            }`}
                        rows={4}
                    />

                    {/* Suggestions d'utilisateurs pour les mentions */}
                    {showUserSuggestions && suggestedUsers.length > 0 && (
                        <div className="mt-2 bg-white rounded-lg border border-gray-300 shadow-lg max-h-64 overflow-y-auto">
                            <div className="p-2 bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-300">
                                Utilisateurs suggérés
                            </div>
                            <div>
                                {suggestedUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                        onClick={() => insertMention(user)}
                                    >
                                        <Avatar
                                            src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                                            alt={user.name || ''}
                                            size="sm"
                                            className="mr-2"
                                        />
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-gray-500">@{user.mention}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={`text-right text-sm ${content.length > maxLength ? 'text-red-500' : 'text-gray-500'}`}>
                        {content.length}/{maxLength}
                    </div>

                    {mediaPreviews.length > 0 && (
                        <div className="mt-4">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {mediaPreviews.map((preview, index) => {
                                    // Ne pas afficher les médias masqués
                                    if (hiddenMediaIndexes.includes(index)) {
                                        return null;
                                    }

                                    const isVideo = mediaTypes[index] === 'video';
                                    return (
                                        <div key={index} className="relative border rounded-lg overflow-hidden group">
                                            {isVideo ? (
                                                <video
                                                    src={preview}
                                                    className="w-full h-40 object-cover bg-gray-200"
                                                    controls
                                                ></video>
                                            ) : (
                                                <img
                                                    src={preview}
                                                    alt={`Media ${index + 1}`}
                                                    className="w-full h-40 object-cover bg-gray-200"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedia(index)}
                                                className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {mediaPreviews.length > 0 && (
                        <div className="text-left text-sm text-gray-500 mt-2">
                            {mediaPreviews.length - hiddenMediaIndexes.length}/{maxMediaCount}
                        </div>
                    )}
                    {/* Affichage des fichiers en cours de traitement */}
                    {Object.values(processingFiles).length > 0 && (
                        <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                            <h3 className="text-md font-semibold mb-2">Fichiers en cours de traitement</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Chargement... L'importation des fichiers peut prendre longtemps en fonction de leur taille...
                            </p>
                            {Object.values(processingFiles).map(file => (
                                <div key={file.id} className="flex items-center justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="text-sm truncate">{file.name}</div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-orange h-2.5 rounded-full"
                                                style={{ width: `${file.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => file.cancel()}
                                        className="ml-2 text-red-600 hover:text-red-800"
                                        title="Annuler"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between mt-4">
                        <div className="flex space-x-2">
                            <label
                                htmlFor="media-upload"
                                className={`p-2 rounded-lg border ${mediaPreviews.length - hiddenMediaIndexes.length >= maxMediaCount
                                    ? 'bg-gray-200 cursor-not-allowed border-gray-300 text-gray-500'
                                    : 'bg-white hover:bg-gray-100 cursor-pointer border-gray-300 text-gray-700'
                                    }`}
                                title={mediaPreviews.length >= maxMediaCount ? `Maximum ${maxMediaCount} médias` : "Ajouter des médias"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </label>
                            <input
                                id="media-upload"
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleMediaChange}
                                className="hidden"
                                disabled={mediaPreviews.length - hiddenMediaIndexes.length >= maxMediaCount}
                            />

                            {/* Boutons pour insérer hashtag et mention */}
                            <button
                                type="button"
                                onClick={insertHashtag}
                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                                title="Insérer un hashtag"
                            >
                                <span className="font-bold text-orange">#</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (textareaRef.current) {
                                        const curPos = textareaRef.current.selectionStart;
                                        const newText = content.substring(0, curPos) + '@' + content.substring(curPos);
                                        setContent(newText);

                                        setTimeout(() => {
                                            if (textareaRef.current) {
                                                textareaRef.current.focus();
                                                const newCursorPos = curPos + 1;
                                                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                                                setCursorPosition(newCursorPos);
                                            }
                                        }, 10);
                                    }
                                }}
                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                                title="Mentionner un utilisateur"
                            >
                                <span className="font-bold text-blue-600">@</span>
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                (content.length === 0 && media.length === 0 && existingMediaUrls.length === 0) ||
                                content.length > maxLength
                            }
                            className="bg-orange hover:bg-orange/80 text-white font-bold py-2 px-4 rounded-full disabled:bg-orange/50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? mode === 'edit' ? 'Mise à jour...' : 'Publication...'
                                : mode === 'edit' ? 'Modifier' : 'Publier'}
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <button
                            type="button"
                            onClick={() => setIsLocked(!isLocked)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${isLocked
                                ? 'bg-light-orange text-orange hover:bg-soft-orange/50'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <svg
                                className={`h-5 w-5 transition-colors duration-200 ${isLocked ? 'text-orange' : 'text-gray-500'
                                    }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={isLocked
                                        ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}
                                />
                            </svg>
                            <span className="text-sm font-medium">
                                {isLocked ? 'Commentaires verrouillés' : 'Commentaires déverrouillés'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 