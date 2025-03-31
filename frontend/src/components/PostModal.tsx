import { useState, useRef, useEffect } from 'react';
import { createPost, Tweet, uploadImage, deleteMediaFile } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';

interface ProcessingFile {
    id: string;
    name: string;
    progress: number;
    cancel: () => void;
    error?: string;
}

interface HTMLVideoElementWithCapture extends HTMLVideoElement {
    captureStream?: () => MediaStream;
}

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTweetPublished: (tweet: Tweet) => void;
}

export default function PostModal({ isOpen, onClose, onTweetPublished }: PostModalProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [media, setMedia] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([]);
    const [isPasswordHelpVisible, setIsPasswordHelpVisible] = useState(false);
    const maxLength = 280;
    const maxMediaCount = 10;
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<Record<string, ProcessingFile>>({});

    // Fonction pour compresser une image
    const compressImage = (file: File, maxSizeInMB: number = 1): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    let quality = 0.9;

                    // Réduire progressivement la qualité et/ou la taille jusqu'à ce que l'image soit < 1Mo
                    const compress = () => {
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Erreur de compression'));
                                return;
                            }

                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now()
                            });

                            if (compressedFile.size <= maxSizeInMB * 1024 * 1024) {
                                resolve(compressedFile);
                            } else {
                                // Réduire la taille ou la qualité
                                if (quality > 0.1) {
                                    quality -= 0.1;
                                } else {
                                    width = Math.round(width * 0.9);
                                    height = Math.round(height * 0.9);
                                    quality = 0.9;
                                }
                                compress();
                            }
                        }, file.type, quality);
                    };

                    compress();
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    // Fonction pour compresser une vidéo
    const compressVideo = async (file: File, maxSizeInMB: number = 50): Promise<File> => {
        return new Promise((resolve, reject) => {
            // Si la taille est déjà correcte, on retourne le fichier directement
            if (file.size <= maxSizeInMB * 1024 * 1024) {
                resolve(file);
                return;
            }

            const video = document.createElement('video');
            video.crossOrigin = "anonymous"; // Ajout de crossOrigin pour éviter les problèmes CORS
            const fileUrl = URL.createObjectURL(file);
            video.src = fileUrl;

            // Ajouter un timeout pour éviter que la promesse ne reste bloquée
            const timeout = setTimeout(() => {
                URL.revokeObjectURL(fileUrl);
                reject(new Error('Délai d\'attente dépassé pour charger la vidéo'));
            }, 15000); // 15 secondes max pour charger la vidéo

            video.onloadedmetadata = () => {
                clearTimeout(timeout);

                try {
                    // Calculer le bitrate adapté en fonction de la taille actuelle
                    // Plus le fichier est gros, plus on réduit le bitrate
                    const currentSizeMB = file.size / (1024 * 1024);
                    // Bitrate de base (1 Mbps)
                    let targetBitrate = 1000000;

                    // Ajustement progressif du bitrate en fonction de la taille
                    const ratio = maxSizeInMB / currentSizeMB;

                    // Si le fichier est très volumineux, on réduit davantage le bitrate
                    if (currentSizeMB > 100) {
                        targetBitrate = 500000; // 500 Kbps pour les vidéos très volumineuses
                    } else if (currentSizeMB > 75) {
                        targetBitrate = 750000; // 750 Kbps
                    } else {
                        // Ajuster proportionnellement tout en restant entre 500 Kbps et 1 Mbps
                        targetBitrate = Math.max(500000, Math.min(1000000, targetBitrate * ratio));
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        URL.revokeObjectURL(fileUrl);
                        reject(new Error('Impossible de créer le contexte de canvas pour la compression vidéo'));
                        return;
                    }

                    // Réduire la résolution pour les vidéos très volumineuses
                    let width = video.videoWidth;
                    let height = video.videoHeight;

                    if (currentSizeMB > 100) {
                        // Réduire la résolution de 50% pour les fichiers très volumineux
                        width = Math.floor(width * 0.5);
                        height = Math.floor(height * 0.5);
                    } else if (currentSizeMB > 75) {
                        // Réduire la résolution de 25% pour les fichiers volumineux
                        width = Math.floor(width * 0.75);
                        height = Math.floor(height * 0.75);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Certains navigateurs peuvent ne pas supporter certains codecs
                    let mimeType = 'video/webm;codecs=vp9';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'video/webm;codecs=vp8';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = 'video/webm';
                            if (!MediaRecorder.isTypeSupported(mimeType)) {
                                URL.revokeObjectURL(fileUrl);
                                reject(new Error('Le navigateur ne supporte pas les codecs vidéo nécessaires'));
                                return;
                            }
                        }
                    }

                    try {
                        const stream = canvas.captureStream();
                        const mediaRecorder = new MediaRecorder(stream, {
                            mimeType: mimeType,
                            videoBitsPerSecond: targetBitrate
                        });

                        const chunks: BlobPart[] = [];
                        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

                        mediaRecorder.onstop = () => {
                            URL.revokeObjectURL(fileUrl); // Libérer les ressources

                            try {
                                const blob = new Blob(chunks, { type: mimeType });
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                                    type: mimeType,
                                    lastModified: Date.now()
                                });

                                if (compressedFile.size <= maxSizeInMB * 1024 * 1024) {
                                    resolve(compressedFile);
                                } else {
                                    // Si la compression n'est pas suffisante, on réessaie avec un bitrate plus faible
                                    console.log(`Compression insuffisante: ${(compressedFile.size / (1024 * 1024)).toFixed(2)} Mo. Nouvel essai...`);

                                    // Récursivement, on essaie de compresser davantage
                                    const retryCompression = async () => {
                                        try {
                                            const moreCompressed = await compressVideo(compressedFile, maxSizeInMB);
                                            resolve(moreCompressed);
                                        } catch (error) {
                                            reject(error);
                                        }
                                    };

                                    retryCompression();
                                }
                            } catch (blobError) {
                                console.error('Erreur lors de la création du blob:', blobError);
                                reject(new Error('Impossible de créer le fichier compressé'));
                            }
                        };

                        ctx.drawImage(video, 0, 0, width, height);
                        mediaRecorder.start();
                        video.play();

                        video.onended = () => {
                            if (mediaRecorder.state === 'recording') {
                                mediaRecorder.stop();
                            }
                        };

                        // Pour les vidéos longues, on arrête après 30 secondes pour éviter des fichiers trop lourds
                        setTimeout(() => {
                            if (mediaRecorder.state === 'recording') {
                                mediaRecorder.stop();
                            }
                        }, 30000);
                    } catch (recorderError) {
                        URL.revokeObjectURL(fileUrl);
                        console.error('Erreur lors de l\'initialisation du MediaRecorder:', recorderError);
                        reject(new Error('Échec de la compression vidéo - erreur technique'));
                    }
                } catch (error) {
                    URL.revokeObjectURL(fileUrl);
                    console.error('Erreur générale de compression vidéo:', error);
                    reject(error);
                }
            };

            video.onerror = (error) => {
                clearTimeout(timeout);
                URL.revokeObjectURL(fileUrl);
                console.error('Erreur lors du chargement de la vidéo:', error);
                reject(new Error('Format vidéo non supporté'));
            };
        });
    };

    // Ajout d'une fonction d'aide pour tenter de convertir les vidéos problématiques
    const tryConvertVideo = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            // Si ce n'est pas une vidéo, retourner le fichier tel quel
            if (!file.type.startsWith('video/')) {
                resolve(file);
                return;
            }

            console.log(`Tentative de conversion de la vidéo ${file.name} (${file.type})...`);

            // Créer un élément vidéo pour lire le fichier
            const video = document.createElement('video');
            video.crossOrigin = "anonymous";

            // Créer un canvas pour capturer les frames de la vidéo
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Contexte de canvas non disponible'));
                return;
            }

            const fileUrl = URL.createObjectURL(file);

            // Définir un timeout pour éviter les blocages
            const timeout = setTimeout(() => {
                URL.revokeObjectURL(fileUrl);
                reject(new Error('Délai d\'attente dépassé lors de la tentative de conversion'));
            }, 15000);

            video.onloadedmetadata = () => {
                clearTimeout(timeout);

                try {
                    // Vérifier si la vidéo a des dimensions valides
                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        URL.revokeObjectURL(fileUrl);
                        reject(new Error('Vidéo avec dimensions invalides'));
                        return;
                    }

                    // Configurer le canvas aux dimensions de la vidéo
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Trouver un format supporté
                    let mimeType = 'video/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'video/mp4';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            URL.revokeObjectURL(fileUrl);
                            reject(new Error('Aucun format vidéo supporté par le navigateur'));
                            return;
                        }
                    }

                    // Créer un stream à partir du canvas
                    const stream = canvas.captureStream();

                    // Créer un MediaRecorder pour enregistrer le stream
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: mimeType,
                        videoBitsPerSecond: 1500000 // 1.5 Mbps
                    });

                    const chunks: BlobPart[] = [];
                    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

                    mediaRecorder.onstop = () => {
                        URL.revokeObjectURL(fileUrl);

                        try {
                            const blob = new Blob(chunks, { type: mimeType });
                            const extension = mimeType === 'video/webm' ? '.webm' : '.mp4';
                            const convertedFile = new File([blob], file.name.replace(/\.[^/.]+$/, extension), {
                                type: mimeType,
                                lastModified: Date.now()
                            });

                            resolve(convertedFile);
                        } catch (error) {
                            reject(error);
                        }
                    };

                    // Dessiner la vidéo sur le canvas et commencer l'enregistrement
                    mediaRecorder.start();

                    // Dessiner chaque frame de la vidéo sur le canvas
                    video.onplay = () => {
                        const drawFrame = () => {
                            if (video.paused || video.ended) {
                                mediaRecorder.stop();
                                return;
                            }

                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            requestAnimationFrame(drawFrame);
                        };

                        drawFrame();
                    };

                    // Limiter la durée de conversion
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, 30000); // 30 secondes maximum

                    // Démarrer la lecture de la vidéo
                    video.play();
                } catch (error) {
                    URL.revokeObjectURL(fileUrl);
                    clearTimeout(timeout);
                    reject(error);
                }
            };

            video.onerror = () => {
                clearTimeout(timeout);
                URL.revokeObjectURL(fileUrl);
                reject(new Error('Erreur lors du chargement de la vidéo pour conversion'));
            };

            video.src = fileUrl;
        });
    };

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            // Convertir FileList en tableau
            const fileArray = Array.from(files);

            // Vérifier le nombre total de médias
            if (media.length + fileArray.length > maxMediaCount) {
                alert(`Vous ne pouvez pas ajouter plus de ${maxMediaCount} médias.`);
                return;
            }

            // Vérifier les tailles des fichiers originaux (limite absolue pour ne pas bloquer le navigateur)
            const MAX_ORIGINAL_SIZE = 250 * 1024 * 1024; // 250 Mo maximum par fichier d'origine
            const oversizedFiles = fileArray.filter(file => file.size > MAX_ORIGINAL_SIZE);
            if (oversizedFiles.length > 0) {
                const fileSizes = oversizedFiles.map(f => `${f.name}: ${Math.round(f.size / (1024 * 1024))}Mo`).join(', ');
                alert(`Les fichiers suivants sont trop volumineux (>${MAX_ORIGINAL_SIZE / (1024 * 1024)}Mo): ${fileSizes}.`);
                return;
            }

            // Reset l'input file pour permettre la sélection des mêmes fichiers
            e.target.value = '';

            // Activer le chargement
            setIsMediaLoading(true);

            const newMedia: File[] = [];
            const newPreviews: string[] = [];
            const newMediaTypes: ('image' | 'video')[] = [];

            // Traiter chaque fichier séquentiellement pour éviter de surcharger le navigateur
            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];
                const fileId = `file-${Date.now()}-${i}`;

                console.log(`Traitement du fichier ${i + 1}/${fileArray.length}: ${file.name} (${Math.round(file.size / (1024 * 1024))}Mo)`);

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
                    const isVideo = file.type.startsWith('video/');
                    const isImage = file.type.startsWith('image/');

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
                        console.log(`Compression de la vidéo ${file.name} (${Math.round(file.size / (1024 * 1024))}Mo > ${MAX_VIDEO_SIZE / (1024 * 1024)}Mo)...`);

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

                            console.log(`Compression terminée: ${Math.round(file.size / (1024 * 1024))}Mo -> ${Math.round(processedFile.size / (1024 * 1024))}Mo`);

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
                        console.log(`Compression de l'image ${file.name} (${Math.round(file.size / (1024 * 1024))}Mo > ${MAX_IMAGE_SIZE / (1024 * 1024)}Mo)...`);

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

                            console.log(`Compression terminée: ${Math.round(file.size / (1024 * 1024))}Mo -> ${Math.round(processedFile.size / (1024 * 1024))}Mo`);
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
                        console.log(`Vérification de la compatibilité de la vidéo ${file.name}...`);

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
                                        return;
                                    }

                                    // Vérifier des dimensions et durée valides
                                    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                        reject(new Error(`La vidéo ${file.name} a des dimensions invalides`));
                                        return;
                                    }

                                    if (isNaN(videoElement.duration) || videoElement.duration === Infinity || videoElement.duration === 0) {
                                        reject(new Error(`La vidéo ${file.name} a une durée invalide`));
                                        return;
                                    }

                                    resolve();
                                };

                                videoElement.src = objectUrl;
                            });

                            // Si on arrive ici, la vidéo est valide
                            newMedia.push(processedFile);
                            newPreviews.push(objectUrl);
                            newMediaTypes.push('video');
                            console.log(`Vidéo ${file.name} ajoutée avec succès`);
                        } catch (error) {
                            URL.revokeObjectURL(objectUrl);

                            if (cancelProcessing) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            console.error(`Erreur lors de la vérification de la vidéo ${file.name}:`, error);

                            // Essayer de convertir la vidéo si elle ne peut pas être lue
                            try {
                                console.log(`Tentative de conversion de la vidéo ${file.name}...`);
                                processedFile = await tryConvertVideo(file);
                                const newUrl = URL.createObjectURL(processedFile);

                                // Vérifier que la vidéo convertie est lisible
                                await new Promise<void>((resolve, reject) => {
                                    const videoElement = document.createElement('video');
                                    const loadTimeout = setTimeout(() => {
                                        reject(new Error("Délai de chargement de la vidéo convertie dépassé"));
                                    }, 20000);

                                    videoElement.onloadedmetadata = () => {
                                        clearTimeout(loadTimeout);
                                        resolve();
                                    };

                                    videoElement.onerror = () => {
                                        clearTimeout(loadTimeout);
                                        reject(new Error("La vidéo convertie n'est pas lisible"));
                                    };

                                    videoElement.src = newUrl;
                                });

                                newMedia.push(processedFile);
                                newPreviews.push(newUrl);
                                newMediaTypes.push('video');
                                console.log(`Vidéo ${file.name} convertie et ajoutée avec succès`);
                            } catch (conversionError) {
                                console.error(`Échec de la conversion de la vidéo ${file.name}:`, conversionError);
                                throw new Error(`Impossible de charger la vidéo ${file.name}: format non supporté`);
                            }
                        }
                    } else if (isImage) {
                        try {
                            // Vérifier si l'opération a été annulée
                            if (cancelProcessing) {
                                URL.revokeObjectURL(objectUrl);
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            // Valider l'image
                            await new Promise<void>((resolve, reject) => {
                                const img = new Image();
                                const loadTimeout = setTimeout(() => {
                                    reject(new Error("Délai de chargement de l'image dépassé"));
                                }, 10000); // 10 secondes max

                                img.onload = () => {
                                    clearTimeout(loadTimeout);
                                    // Vérifier si l'image a des dimensions valides
                                    if (img.width === 0 || img.height === 0) {
                                        reject(new Error("L'image a des dimensions invalides"));
                                        return;
                                    }
                                    resolve();
                                };

                                img.onerror = () => {
                                    clearTimeout(loadTimeout);
                                    reject(new Error("Format d'image non supporté"));
                                };

                                img.src = objectUrl;
                            });

                            newMedia.push(processedFile);
                            newPreviews.push(objectUrl);
                            newMediaTypes.push('image');
                            console.log(`Image ${file.name} ajoutée avec succès`);
                        } catch (error) {
                            URL.revokeObjectURL(objectUrl);
                            console.error(`Erreur lors de la validation de l'image ${file.name}:`, error);
                            throw new Error(`Impossible de charger l'image ${file.name}: ${error instanceof Error ? error.message : 'format non supporté'}`);
                        }
                    } else {
                        URL.revokeObjectURL(objectUrl);
                        throw new Error(`Type de fichier non supporté: ${file.type}`);
                    }

                    // Mettre à jour la progression à 100%
                    setProcessingFiles(prev => ({
                        ...prev,
                        [fileId]: {
                            ...prev[fileId],
                            progress: 100
                        }
                    }));

                    // Supprimer l'entrée de traitement après un court délai
                    const removeEntryTimeout = setTimeout(() => {
                        setProcessingFiles(prev => {
                            const updated = { ...prev };
                            delete updated[fileId];
                            return updated;
                        });
                    }, 1000);
                    cancelTokens.push(removeEntryTimeout);

                } catch (error) {
                    console.error(`Erreur lors du traitement du fichier ${file.name}:`, error);

                    // Marquer comme erreur sauf si annulé par l'utilisateur
                    if (!(error instanceof Error && error.message.includes("annulé"))) {
                        setProcessingFiles(prev => ({
                            ...prev,
                            [fileId]: {
                                ...prev[fileId],
                                progress: -1, // -1 indique une erreur
                                error: error instanceof Error ? error.message : "Erreur inconnue"
                            }
                        }));

                        // Supprimer l'entrée d'erreur après quelques secondes
                        const removeErrorTimeout = setTimeout(() => {
                            setProcessingFiles(prev => {
                                const updated = { ...prev };
                                delete updated[fileId];
                                return updated;
                            });
                        }, 5000);
                        cancelTokens.push(removeErrorTimeout);
                    }
                }
            }

            // Mettre à jour les états avec les nouveaux médias
            if (newMedia.length > 0) {
                setMedia(prev => [...prev, ...newMedia]);
                setMediaPreviews(prev => [...prev, ...newPreviews]);
                setMediaTypes(prev => [...prev, ...newMediaTypes]);
            }

            // Désactiver le chargement
            setIsMediaLoading(false);
        }
    };

    const handleRemoveMedia = (index: number) => {
        try {
            // Avant la suppression, journaliser les états actuels
            console.log("ÉTATS AVANT SUPPRESSION :");
            console.log("Index à supprimer:", index);
            console.log("MediaTypes:", [...mediaTypes]);
            console.log("MediaPreviews:", [...mediaPreviews]);
            console.log("Media (fichiers):", [...media]);

            // Vérifier si l'index est valide
            if (index < 0 || index >= mediaPreviews.length) {
                console.error(`Index ${index} hors limites pour la suppression de média`);
                return;
            }

            // Capture du type de média pour le débogage
            const mediaType = mediaTypes[index];
            console.log(`Suppression du média à l'index ${index}, type: ${mediaType}`);

            // Libérer le blob URL pour éviter les fuites de mémoire
            const previewUrl = mediaPreviews[index];
            if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
                console.log(`URL blob révoquée: ${previewUrl}`);
            }

            // Mise à jour synchronisée de tous les tableaux
            setMedia(prev => prev.filter((_, i) => i !== index));
            setMediaPreviews(prev => prev.filter((_, i) => i !== index));
            setMediaTypes(prev => prev.filter((_, i) => i !== index));

            // Après une courte attente, vérifier que les états ont été mis à jour correctement
            setTimeout(() => {
                console.log("ÉTATS APRÈS SUPPRESSION :");
                console.log("MediaTypes:", [...mediaTypes]);
                console.log("MediaPreviews:", [...mediaPreviews]);
                console.log("Media (fichiers):", [...media]);
            }, 100);
        } catch (error) {
            console.error("Erreur lors de la suppression du média:", error);
        }
    };

    const getMediaGridClass = (mediaCount: number) => {
        switch (mediaCount) {
            case 1: return 'grid-cols-1 grid-rows-1 max-h-[200px]';
            case 2: return 'grid-cols-2 grid-rows-1 max-h-[150px]';
            case 3: return 'grid-cols-3 grid-rows-1 max-h-[150px]';
            case 4: return 'grid-cols-2 grid-rows-2 max-h-[250px]';
            default: return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Autoriser la soumission si du contenu multimédia est présent
        if (mediaPreviews.length === 0 && !content.trim()) return;

        // Vérifier uniquement la longueur du texte s'il est présent
        if (content.length > maxLength) return;

        // Vérifier que les médias ne sont pas trop volumineux avant l'envoi
        const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 Mo maximum par fichier
        const oversizedFiles = media.filter(file => file.size > MAX_UPLOAD_SIZE);
        if (oversizedFiles.length > 0) {
            const fileSizes = oversizedFiles.map(f => `${f.name}: ${Math.round(f.size / (1024 * 1024))}Mo`).join(', ');
            alert(`Certains fichiers sont trop volumineux pour être envoyés (>${MAX_UPLOAD_SIZE / (1024 * 1024)}Mo): ${fileSizes}. Veuillez d'abord les compresser.`);
            return;
        }

        // Vérifier que le total des médias n'excède pas une limite raisonnable
        const TOTAL_MAX_SIZE = 200 * 1024 * 1024; // 200 Mo au total
        const totalSize = media.reduce((total, file) => total + file.size, 0);
        if (totalSize > TOTAL_MAX_SIZE) {
            alert(`Le total de vos médias (${Math.round(totalSize / (1024 * 1024))}Mo) dépasse la limite autorisée (${TOTAL_MAX_SIZE / (1024 * 1024)}Mo). Veuillez supprimer ou compresser certains fichiers.`);
            return;
        }

        setIsSubmitting(true);
        const uploadedMediaUrls: string[] = [];

        try {
            // Uploader les médias
            let uploadedCount = 0;
            for (const mediaFile of media) {
                try {
                    console.log(`Upload du fichier ${mediaFile.name} (${Math.round(mediaFile.size / (1024 * 1024))}Mo)...`);
                    const response = await uploadImage(mediaFile, 'post');

                    if (!response || !response.filename) {
                        console.error('Réponse d\'upload invalide:', response);
                        throw new Error('Réponse invalide du serveur lors de l\'upload');
                    }

                    uploadedMediaUrls.push(response.filename);
                    uploadedCount++;
                    console.log(`Fichier uploadé avec succès (${uploadedCount}/${media.length}): ${response.filename}`);
                } catch (uploadError) {
                    console.error(`Erreur lors de l'upload du fichier ${mediaFile.name}:`, uploadError);

                    // Si des fichiers ont déjà été uploadés avec succès, on les nettoie
                    if (uploadedMediaUrls.length > 0) {
                        console.log(`Nettoyage des ${uploadedMediaUrls.length} fichiers déjà uploadés suite à une erreur...`);
                        await cleanupUploadedMedia(uploadedMediaUrls);
                    }

                    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Erreur inconnue';
                    throw new Error(`Erreur lors de l'upload du fichier ${mediaFile.name}: ${errorMessage}`);
                }
            }

            // Si tous les uploads ont réussi, créer le post
            console.log(`Création du post avec ${uploadedMediaUrls.length} médias...`);
            const response = await createPost(content.trim(), uploadedMediaUrls);

            // Vérifier que la réponse est valide
            if (!response || !response.id) {
                console.error('Réponse de création invalide:', response);

                // Si l'appel à createPost a échoué, nettoyer les médias uploadés
                if (uploadedMediaUrls.length > 0) {
                    console.log(`Nettoyage des ${uploadedMediaUrls.length} fichiers uploadés suite à l'échec de création du post...`);
                    await cleanupUploadedMedia(uploadedMediaUrls);
                }

                throw new Error('Réponse invalide du serveur lors de la création du post');
            }

            console.log('Post créé avec succès');
            onTweetPublished(response);

            // Nettoyer les ressources et fermer le modal
            cleanupMediaResources();
            setContent('');
            setMedia([]);
            setMediaPreviews([]);
            setMediaTypes([]);
            onClose();
        } catch (error) {
            console.error('Erreur lors de la création du post:', error);

            // S'il reste des médias non nettoyés, on les supprime
            if (uploadedMediaUrls.length > 0) {
                console.log(`Nettoyage de ${uploadedMediaUrls.length} fichiers médias après erreur...`);
                await cleanupUploadedMedia(uploadedMediaUrls);
            }

            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            alert(`Erreur lors de la création du post: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fonction pour nettoyer les médias uploadés en cas d'erreur
    const cleanupUploadedMedia = async (mediaUrls: string[]): Promise<void> => {
        try {
            // Pour chaque média, extraire seulement le nom du fichier (sans le chemin)
            const cleanMediaUrls = mediaUrls.map(url => {
                // Si l'URL est déjà un simple nom de fichier
                if (!url.includes('/')) {
                    return url;
                }

                // Si c'est une URL complète, extraire le nom du fichier
                return url.split('/').pop() || url;
            });

            console.log("URLs des médias à nettoyer:", cleanMediaUrls);

            const deletionPromises = cleanMediaUrls.map(filename =>
                deleteMediaFile(filename)
                    .then(() => console.log(`Fichier ${filename} supprimé avec succès`))
                    .catch(err => console.error(`Erreur lors de la suppression du fichier ${filename}:`, err))
            );

            await Promise.all(deletionPromises);
            console.log('Tous les fichiers uploadés ont été nettoyés après erreur');
        } catch (e) {
            console.error('Erreur lors du nettoyage des fichiers uploadés:', e);
            // Ne pas propager l'erreur pour éviter de bloquer le flux principal
        }
    };

    // Fonction pour nettoyer les médias
    const cleanupMediaResources = () => {
        try {
            // Révoquer toutes les URLs blob pour éviter les fuites mémoire
            mediaPreviews.forEach(preview => {
                try {
                    URL.revokeObjectURL(preview);
                } catch (e) {
                    console.error('Erreur lors de la révocation d\'URL:', e);
                }
            });
            console.log(`${mediaPreviews.length} URL(s) blob révoquées lors du nettoyage`);
        } catch (error) {
            console.error('Erreur lors du nettoyage des ressources média:', error);
        }
    };

    // Fonction pour gérer la fermeture et nettoyer les ressources
    const handleClose = () => {
        cleanupMediaResources();
        setContent('');
        setMedia([]);
        setMediaPreviews([]);
        setMediaTypes([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-lg">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Créer un tweet</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Qu'avez-vous à dire ?"
                        className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${content.length > maxLength
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-orange'
                            }`}
                        rows={4}
                        maxLength={maxLength}
                    />
                    <div className={`text-left text-sm ${content.length > maxLength ? 'text-red-500' : 'text-gray-500'}`}>
                        {content.length}/{maxLength}
                    </div>
                    {isMediaLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            Chargement...
                        </div>
                    ) : mediaPreviews.length > 0 && (
                        <div
                            className="
                                p-4 
                                flex 
                                space-x-2 
                                overflow-x-auto 
                                scrollbar-thin 
                                scrollbar-thumb-gray-300 
                                scrollbar-track-gray-100
                                rounded-lg
                            "
                        >
                            {mediaPreviews.map((preview, index) => {
                                const isVideo = mediaTypes[index] === 'video';
                                return (
                                    <div
                                        key={index}
                                        className="
                                            relative 
                                            flex-shrink-0 
                                            w-24 
                                            h-24 
                                            rounded-lg 
                                            overflow-hidden 
                                            group
                                            border border-gray-500
                                        "
                                    >
                                        {isVideo ? (
                                            <video
                                                src={preview}
                                                className="
                                                    w-full 
                                                    h-full 
                                                    object-cover
                                                "
                                            />
                                        ) : (
                                            <img
                                                src={preview}
                                                alt={`Prévisualisation ${index + 1}`}
                                                className="
                                                    w-full 
                                                    h-full 
                                                    object-cover 
                                                    group-hover:opacity-80 
                                                    transition-opacity
                                                "
                                            />
                                        )}

                                        {/* Bouton de suppression */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMedia(index)}
                                            className="
                                                absolute 
                                                top-1 
                                                right-1 
                                                bg-black 
                                                text-white 
                                                rounded-full 
                                                p-1 
                                                hover:bg-black/70
                                            "
                                            title="Supprimer"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-3 w-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>

                                        {/* Icône de lecture pour les vidéos */}
                                        {isVideo && (
                                            <div className="
                                                absolute 
                                                inset-0 
                                                flex 
                                                items-center 
                                                justify-center 
                                                bg-black/30
                                            ">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="white"
                                                    className="w-6 h-6"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Indicateur de progression pour les fichiers en cours de traitement */}
                    {Object.keys(processingFiles).length > 0 && (
                        <div className="mt-2 p-2 space-y-2">
                            {Object.values(processingFiles).map((file) => (
                                <div key={file.id} className="flex items-center text-sm">
                                    <div className="flex-1 mr-2">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                            {file.progress >= 0 && (
                                                <span className="text-gray-500">{file.progress}%</span>
                                            )}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${file.progress < 0 ? 'bg-red-500' : 'bg-orange'}`}
                                                style={{ width: `${file.progress < 0 ? 100 : file.progress}%` }}
                                            ></div>
                                        </div>
                                        {file.progress < 0 && (
                                            <p className="text-red-500 text-xs mt-0.5">
                                                {file.error || "Erreur lors du traitement"}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={file.cancel}
                                        className="text-gray-500 hover:text-gray-700"
                                        title="Annuler"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {mediaPreviews.length > 0 && (
                        <div className="text-left text-sm text-gray-500 mt-2">
                            {mediaPreviews.length}/{maxMediaCount}
                        </div>
                    )}
                    <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleMediaChange}
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="
                                    text-orange 
                                    hover:text-dark-orange 
                                    cursor-pointer 
                                    p-1.5
                                    rounded-full 
                                    border 
                                    border-orange 
                                    hover:border-dark-orange 
                                    transition-colors
                                "
                                disabled={media.length >= maxMediaCount}
                            >
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={media.length === 0 && !content.trim() || content.length > maxLength || isSubmitting}
                            className="bg-orange text-white px-6 py-2 rounded-full font-semibold hover:bg-dark-orange disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Publication...' : 'Publier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 