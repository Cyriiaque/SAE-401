import { useState, useRef, useEffect } from 'react';
import { Tweet, uploadImage, getImageUrl, updatePost, deleteMediaFile } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    tweet: Tweet;
    onPostUpdated: (updatedTweet: Tweet) => void;
}

// Ajouter un type augmenté pour HTMLVideoElement avec captureStream
interface HTMLVideoElementWithCapture extends HTMLVideoElement {
    captureStream?: () => MediaStream;
}

export default function EditPostModal({ isOpen, onClose, tweet, onPostUpdated }: EditPostModalProps) {
    const [content, setContent] = useState(tweet.content);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [media, setMedia] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([]);
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
    const [processingFiles, setProcessingFiles] = useState<Record<string, {
        id: string,
        name: string,
        progress: number,
        cancel: () => void
    }>>({});
    const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
    const maxLength = 280;
    const maxMediaCount = 10;
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Charger les données du post à modifier
    useEffect(() => {
        if (tweet && isOpen) {
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
                    console.log(`Media existant chargé: ${url}, type: ${isVideo ? 'video' : 'image'}`);
                });

                setMediaPreviews(previews);
                setMediaTypes(types);
                console.log(`Total médias existants chargés: ${mediaUrls.length}, types: ${types.join(', ')}`);
            }
        }
    }, [tweet, isOpen]);

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
        console.log(`Début de compression vidéo pour ${file.name} (${Math.round(file.size / (1024 * 1024))}Mo)...`);
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

        // Si le fichier est déjà assez petit, on le retourne directement
        if (file.size <= maxSizeInBytes) {
            console.log(`Le fichier est déjà en dessous de la limite de ${maxSizeInMB}Mo.`);
            return file;
        }

        // Calculer le bitrate cible en fonction de la taille actuelle
        let targetBitrate = 1000000; // Par défaut 1 Mbps
        const currentSize = file.size / (1024 * 1024); // Taille en Mo

        // Ajuster le bitrate en fonction de la taille actuelle
        if (currentSize > 100) {
            targetBitrate = 500000; // 500 Kbps pour les fichiers très volumineux
        } else if (currentSize > 75) {
            targetBitrate = 800000; // 800 Kbps
        } else if (currentSize > 50) {
            targetBitrate = 1000000; // 1 Mbps
        }

        console.log(`Bitrate cible pour la compression: ${targetBitrate / 1000} Kbps`);

        return new Promise((resolve, reject) => {
            try {
                // Créer une URL pour la vidéo
                const videoURL = URL.createObjectURL(file);
                const videoElement = document.createElement('video');

                // Stocker des références pour pouvoir les libérer plus tard
                const createdObjectURLs = [videoURL];

                videoElement.muted = true;
                videoElement.autoplay = false;
                videoElement.preload = 'metadata';
                videoElement.src = videoURL;

                videoElement.onloadedmetadata = async () => {
                    try {
                        // Réduire la résolution pour les fichiers volumineux
                        let width = videoElement.videoWidth;
                        let height = videoElement.videoHeight;
                        let reduceResolution = false;

                        if (currentSize > 75) {
                            // Réduire la résolution de moitié pour les fichiers très volumineux
                            width = Math.floor(width / 2);
                            height = Math.floor(height / 2);
                            reduceResolution = true;
                            console.log(`Réduction de la résolution: ${videoElement.videoWidth}x${videoElement.videoHeight} -> ${width}x${height}`);
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            throw new Error("Impossible de créer le contexte canvas");
                        }

                        const stream = canvas.captureStream(30);

                        // Ajouter une piste audio si la vidéo originale en a une
                        const captureStream = (videoElement as HTMLVideoElementWithCapture).captureStream;
                        if (captureStream && typeof captureStream === 'function') {
                            const stream = captureStream.call(videoElement);
                            if (stream && stream.getAudioTracks().length > 0) {
                                const audioTrack = stream.getAudioTracks()[0];
                                if (audioTrack) {
                                    stream.addTrack(audioTrack);
                                }
                            }
                        }

                        // Options de compression
                        const options = {
                            mimeType: 'video/webm;codecs=vp9',
                            audioBitsPerSecond: 128000,
                            videoBitsPerSecond: targetBitrate
                        };

                        // Vérifier le support du format
                        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                            options.mimeType = 'video/webm;codecs=vp8';

                            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                                options.mimeType = 'video/webm';

                                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                                    throw new Error("Format vidéo non supporté pour la compression");
                                }
                            }
                        }

                        console.log(`Utilisation du format: ${options.mimeType} pour la compression`);

                        const recorder = new MediaRecorder(stream, options);
                        const chunks: Blob[] = [];
                        let startTime = 0;
                        let isRecording = false;
                        let recordingTimeout: number | null = null;

                        // Maximum 30 secondes d'enregistrement pour les vidéos très longues
                        const maxRecordingTime = 30000; // 30 secondes

                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) {
                                chunks.push(e.data);
                            }
                        };

                        recorder.onstop = async () => {
                            // Nettoyer le timeout si existant
                            if (recordingTimeout) {
                                clearTimeout(recordingTimeout);
                                recordingTimeout = null;
                            }

                            isRecording = false;
                            videoElement.pause();

                            try {
                                // Créer un blob avec les chunks enregistrés
                                const blob = new Blob(chunks, { type: options.mimeType });

                                const compressedSize = blob.size / (1024 * 1024);
                                console.log(`Compression terminée: ${Math.round(file.size / (1024 * 1024))}Mo -> ${compressedSize.toFixed(2)}Mo`);

                                // Si la taille est toujours trop grande et qu'on n'a pas déjà réduit la résolution, 
                                // recommencer avec une résolution réduite
                                if (blob.size > maxSizeInBytes && !reduceResolution) {
                                    console.log(`Taille encore trop grande (${compressedSize.toFixed(2)}Mo), nouvel essai avec résolution réduite...`);

                                    // Nettoyer les ressources actuelles
                                    createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                                    // Récursion avec résolution réduite forcée
                                    try {
                                        const retryCompression = async () => {
                                            const newWidth = Math.floor(videoElement.videoWidth / 2);
                                            const newHeight = Math.floor(videoElement.videoHeight / 2);

                                            canvas.width = newWidth;
                                            canvas.height = newHeight;

                                            const newOptions = {
                                                ...options,
                                                videoBitsPerSecond: targetBitrate / 2
                                            };

                                            console.log(`Nouvel essai avec résolution: ${newWidth}x${newHeight} et bitrate: ${newOptions.videoBitsPerSecond / 1000} Kbps`);

                                            const newStream = canvas.captureStream(30);

                                            // Ajouter une piste audio si la vidéo originale en a une
                                            const captureStream = (videoElement as HTMLVideoElementWithCapture).captureStream;
                                            if (captureStream && typeof captureStream === 'function') {
                                                const stream = captureStream.call(videoElement);
                                                if (stream && stream.getAudioTracks().length > 0) {
                                                    const audioTrack = stream.getAudioTracks()[0];
                                                    if (audioTrack) {
                                                        newStream.addTrack(audioTrack);
                                                    }
                                                }
                                            }

                                            const newRecorder = new MediaRecorder(newStream, newOptions);
                                            const newChunks: Blob[] = [];

                                            newRecorder.ondataavailable = (e) => {
                                                if (e.data.size > 0) {
                                                    newChunks.push(e.data);
                                                }
                                            };

                                            newRecorder.onstop = () => {
                                                const newBlob = new Blob(newChunks, { type: options.mimeType });
                                                const newCompressedSize = newBlob.size / (1024 * 1024);
                                                console.log(`Deuxième compression terminée: ${compressedSize.toFixed(2)}Mo -> ${newCompressedSize.toFixed(2)}Mo`);

                                                // Créer un fichier à partir du blob et résoudre
                                                const compressedFile = new File([newBlob], file.name, {
                                                    type: options.mimeType,
                                                    lastModified: new Date().getTime()
                                                });

                                                // Libérer les ressources
                                                createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                                                resolve(compressedFile);
                                            };

                                            // Démarrer l'enregistrement
                                            videoElement.currentTime = 0;
                                            videoElement.play();

                                            const drawFrame = () => {
                                                if (videoElement.paused || videoElement.ended) return;
                                                ctx.drawImage(videoElement, 0, 0, newWidth, newHeight);
                                                requestAnimationFrame(drawFrame);
                                            };

                                            videoElement.onplay = () => {
                                                drawFrame();
                                                newRecorder.start(100);

                                                // Arrêter après la durée de la vidéo ou 30 secondes maximum
                                                setTimeout(() => {
                                                    if (newRecorder.state === 'recording') {
                                                        newRecorder.stop();
                                                    }
                                                }, Math.min(videoElement.duration * 1000, maxRecordingTime));
                                            };
                                        };

                                        await retryCompression();
                                    } catch (error) {
                                        console.error("Erreur lors de la seconde compression:", error);

                                        // Si la deuxième compression échoue, on utilise quand même le résultat de la première
                                        const compressedFile = new File([blob], file.name, {
                                            type: options.mimeType,
                                            lastModified: new Date().getTime()
                                        });

                                        // Libérer les ressources
                                        createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                                        resolve(compressedFile);
                                    }
                                } else {
                                    // Créer un fichier à partir du blob et résoudre
                                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webm", {
                                        type: options.mimeType,
                                        lastModified: new Date().getTime()
                                    });

                                    // Libérer les ressources
                                    createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                                    resolve(compressedFile);
                                }
                            } catch (error) {
                                console.error("Erreur de traitement post-compression:", error);

                                // Libérer les ressources
                                createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                                reject(error);
                            }
                        };

                        const startRecording = () => {
                            if (isRecording) return;

                            isRecording = true;
                            chunks.length = 0;  // Vider les chunks précédents
                            startTime = videoElement.currentTime;

                            recorder.start(100);  // Capturer des chunks toutes les 100ms

                            // Arrêter après la durée de la vidéo ou 30 secondes maximum
                            recordingTimeout = window.setTimeout(() => {
                                if (recorder.state === 'recording') {
                                    console.log(`La vidéo est toujours en cours d'enregistrement après ${maxRecordingTime / 1000}s`);
                                    // Ne pas arrêter automatiquement, continuer l'enregistrement
                                }
                            }, maxRecordingTime);
                        };

                        const drawFrame = () => {
                            if (videoElement.paused || videoElement.ended) {
                                if (isRecording && recorder.state === 'recording') {
                                    recorder.stop();
                                }
                                return;
                            }

                            ctx.drawImage(videoElement, 0, 0, width, height);
                            requestAnimationFrame(drawFrame);
                        };

                        videoElement.onplay = () => {
                            drawFrame();
                            startRecording();
                        };

                        videoElement.onended = () => {
                            if (isRecording && recorder.state === 'recording') {
                                recorder.stop();
                            }
                        };

                        // Démarrer la lecture
                        videoElement.currentTime = 0;
                        videoElement.play().catch(error => {
                            console.error("Erreur lors de la lecture de la vidéo:", error);

                            // Libérer les ressources
                            createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                            reject(error);
                        });
                    } catch (error) {
                        console.error("Erreur lors de la compression:", error);

                        // Libérer les ressources
                        createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                        reject(error);
                    }
                };

                videoElement.onerror = (event) => {
                    console.error("Erreur lors du chargement de la vidéo:", event);

                    // Libérer les ressources
                    createdObjectURLs.forEach(url => URL.revokeObjectURL(url));

                    reject(new Error("Erreur de chargement vidéo"));
                };
            } catch (error) {
                console.error("Erreur lors de l'initialisation de la compression:", error);
                reject(error);
            }
        });
    };

    // Correction de la fonction tryConvertVideo
    const tryConvertVideo = async (file: File): Promise<File> => {
        console.log("Tentative de conversion de la vidéo en format alternatif...");

        // Limiter la taille maximale pour la conversion
        const MAX_SIZE_FOR_CONVERSION = 50 * 1024 * 1024; // 50 Mo
        if (file.size > MAX_SIZE_FOR_CONVERSION) {
            console.log(`Vidéo trop volumineuse pour la conversion: ${Math.round(file.size / (1024 * 1024))}Mo > ${MAX_SIZE_FOR_CONVERSION / (1024 * 1024)}Mo`);
            // Pour les fichiers très gros, on tente une compression directe au lieu de la conversion
            try {
                const compressed = await compressVideo(file);
                console.log(`Compression directe réussie: ${Math.round(file.size / (1024 * 1024))}Mo -> ${Math.round(compressed.size / (1024 * 1024))}Mo`);
                return compressed;
            } catch (compressError) {
                console.error("Échec de la compression directe:", compressError);
                throw new Error("Échec du traitement de la vidéo volumineuse");
            }
        }

        return new Promise((resolve, reject) => {
            try {
                // Récupérer l'extension du fichier
                const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                console.log(`Extension de fichier détectée: ${fileExt}`);

                // Créer un élément vidéo pour l'analyse
                const videoElement = document.createElement('video');
                videoElement.muted = true;
                videoElement.preload = 'metadata';

                // Créer une URL pour le fichier vidéo
                const videoURL = URL.createObjectURL(file);
                videoElement.src = videoURL;

                // Garder une référence aux ressources pour les libérer plus tard
                const resources = {
                    urls: [videoURL],
                    timeouts: [] as number[],
                    videoElement: videoElement,
                    cleanupCalled: false
                };

                // Fonction pour révoquer les URL en toute sécurité
                const safeRevokeUrl = () => {
                    resources.urls.forEach(url => {
                        try {
                            URL.revokeObjectURL(url);
                            console.log(`URL révoquée: ${url.substring(0, 30)}...`);
                        } catch (error) {
                            console.error(`Erreur lors de la révocation d'URL: ${error}`);
                        }
                    });
                    resources.urls = [];
                };

                // Fonction pour nettoyer toutes les ressources
                const cleanupResources = () => {
                    if (resources.cleanupCalled) return;
                    resources.cleanupCalled = true;

                    console.log("Nettoyage des ressources...");

                    // Arrêter les timeouts
                    resources.timeouts.forEach(id => window.clearTimeout(id));
                    resources.timeouts = [];

                    // Arrêter la vidéo si elle est en lecture
                    if (resources.videoElement) {
                        try {
                            resources.videoElement.pause();
                            resources.videoElement.src = '';
                            resources.videoElement.load();
                        } catch (e) {
                            console.error("Erreur lors du nettoyage de l'élément vidéo:", e);
                        }
                    }

                    // Révoquer les URL
                    safeRevokeUrl();
                };

                // Gérer le timeout global
                const timeoutId = window.setTimeout(() => {
                    console.error("Délai d'attente dépassé pour la conversion vidéo");
                    cleanupResources();
                    reject(new Error("Délai d'attente dépassé"));
                }, 30000); // 30 secondes max
                resources.timeouts.push(timeoutId);

                // Gestionnaire d'erreur vidéo
                videoElement.onerror = (event) => {
                    console.error("Erreur lors du chargement de la vidéo:", event);
                    cleanupResources();
                    reject(new Error(`Format vidéo ${fileExt} non supporté par le navigateur`));
                };

                // Gestionnaire de métadonnées chargées
                videoElement.onloadedmetadata = () => {
                    try {
                        console.log("Métadonnées vidéo chargées, tentative de conversion...");

                        // Créer un canvas pour la conversion
                        const canvas = document.createElement('canvas');
                        canvas.width = videoElement.videoWidth;
                        canvas.height = videoElement.videoHeight;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            throw new Error("Impossible de créer le contexte canvas");
                        }

                        // Options pour WebM (format largement supporté)
                        let mimeType = 'video/webm;codecs=vp8';
                        const stream = canvas.captureStream(30); // 30 FPS

                        // Récupérer la piste audio si disponible
                        const captureStream = (videoElement as HTMLVideoElementWithCapture).captureStream;
                        if (captureStream && typeof captureStream === 'function') {
                            const stream = captureStream.call(videoElement);
                            if (stream && stream.getAudioTracks().length > 0) {
                                const audioTrack = stream.getAudioTracks()[0];
                                if (audioTrack) {
                                    stream.addTrack(audioTrack);
                                }
                            }
                        }

                        // Options d'enregistrement
                        const options = {
                            mimeType: mimeType,
                            videoBitsPerSecond: 1500000 // 1.5 Mbps
                        };

                        // Vérifier le support du format
                        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                            options.mimeType = 'video/webm'; // Fallback sans codec spécifique
                        }

                        const recorder = new MediaRecorder(stream, options);
                        const chunks: Blob[] = [];

                        // Collecter les données
                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) {
                                chunks.push(e.data);
                            }
                        };

                        // Finaliser lorsque l'enregistrement est terminé
                        recorder.onstop = () => {
                            try {
                                // Vérifier si le nettoyage a déjà été appelé
                                if (resources.cleanupCalled) return;

                                // Créer un blob avec toutes les données
                                const blob = new Blob(chunks, { type: options.mimeType });
                                const convertedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webm"), {
                                    type: options.mimeType,
                                    lastModified: new Date().getTime()
                                });

                                // Nettoyer, puis résoudre
                                cleanupResources();
                                resolve(convertedFile);
                            } catch (error) {
                                console.error("Erreur lors de la création du fichier converti:", error);
                                cleanupResources();
                                reject(error);
                            }
                        };

                        // Dessiner la vidéo sur le canvas
                        const drawFrame = () => {
                            if (videoElement.paused || videoElement.ended) {
                                if (recorder.state === 'recording') {
                                    recorder.stop();
                                }
                                return;
                            }

                            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                            requestAnimationFrame(drawFrame);
                        };

                        // Démarrer la lecture et l'enregistrement
                        videoElement.onplay = () => {
                            drawFrame();
                            recorder.start(100);

                            // Limiter l'enregistrement à 30 secondes
                            const recordingTimeout = window.setTimeout(() => {
                                if (recorder.state === 'recording') {
                                    console.log("Arrêt forcé de l'enregistrement après 30s");
                                    recorder.stop();
                                }
                            }, Math.min(30000, videoElement.duration * 1000));
                            resources.timeouts.push(recordingTimeout);
                        };

                        // Arrêter l'enregistrement lorsque la vidéo se termine
                        videoElement.onended = () => {
                            if (recorder.state === 'recording') {
                                recorder.stop();
                            }
                        };

                        // Jouer la vidéo depuis le début
                        videoElement.currentTime = 0;
                        videoElement.play().catch(error => {
                            console.error("Erreur lors de la lecture de la vidéo:", error);
                            cleanupResources();
                            reject(error);
                        });
                    } catch (error) {
                        console.error("Erreur lors de la tentative de conversion:", error);
                        cleanupResources();
                        reject(error);
                    }
                };
            } catch (error) {
                console.error("Erreur d'initialisation de la conversion:", error);
                reject(error);
            }
        });
    };

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        // Vérifier le nombre total de fichiers (existants + nouveaux)
        if (existingMediaUrls.length + mediaPreviews.length + e.target.files.length > 10) {
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
            console.log(`Traitement de ${e.target.files.length} nouveaux fichiers...`);

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

                console.log(`Traitement du fichier ${i + 1}/${filesToProcess.length}: ${file.name} (${Math.round(file.size / (1024 * 1024))}Mo)`);

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
                                    } else {
                                        resolve();
                                    }
                                };

                                videoElement.preload = 'metadata';
                                videoElement.muted = true;
                                videoElement.src = objectUrl;
                            });

                            // Vérifier à nouveau si l'opération a été annulée
                            if (cancelProcessing) {
                                URL.revokeObjectURL(objectUrl);
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            console.log(`Vidéo ${file.name} validée avec succès`);
                        } catch (error) {
                            console.error(`Erreur lors du traitement du fichier: ${file.name}`, error);
                            URL.revokeObjectURL(objectUrl);

                            // Si l'erreur est due à l'annulation, propager l'erreur
                            if (cancelProcessing || (error instanceof Error && error.message.includes("annulé"))) {
                                throw new Error("Traitement annulé par l'utilisateur");
                            }

                            // Tenter une conversion si le format n'est pas supporté
                            console.log("Tentative de conversion de la vidéo en format alternatif...");

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

                                console.log("Conversion vidéo réussie!");

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
                        console.log(`Traitement du fichier ${file.name} annulé par l'utilisateur`);

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

            console.log(`${processedFiles.length} fichiers ajoutés avec succès`);

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
            // Avant la suppression, journaliser les états actuels
            console.log("ÉTATS AVANT SUPPRESSION :");
            console.log("Index à supprimer:", index);
            console.log("MediaTypes:", [...mediaTypes]);
            console.log("MediaPreviews:", [...mediaPreviews]);
            console.log("ExistingMediaUrls:", [...existingMediaUrls]);
            console.log("Media (nouveaux fichiers):", [...media]);

            // Vérifier si l'index est valide
            if (index < 0 || index >= mediaPreviews.length) {
                console.error(`Index ${index} hors limites pour la suppression de média`);
                return;
            }

            // Capture du type de média pour le débogage
            const mediaType = mediaTypes[index];

            // Mise à jour synchronisée de tous les tableaux
            // Approche en deux temps: copie puis mise à jour d'état

            if (index < existingMediaUrls.length) {
                // C'est un média existant
                console.log(`Suppression du média existant à l'index ${index}, type: ${mediaType}`);

                // Récupérer le nom du fichier à supprimer
                const mediaFilename = existingMediaUrls[index];
                console.log(`Fichier ${mediaFilename} marqué pour suppression (sera supprimé après mise à jour)`);

                // Ajouter le fichier à la liste des fichiers à supprimer plus tard
                setMediaToDelete(prev => [...prev, mediaFilename]);

                const newExistingUrls = [...existingMediaUrls];
                newExistingUrls.splice(index, 1);

                // Mise à jour des trois états importants
                setExistingMediaUrls(newExistingUrls);
                setMediaPreviews(prev => {
                    const newPreviews = [...prev];
                    newPreviews.splice(index, 1);
                    return newPreviews;
                });
                setMediaTypes(prev => {
                    const newTypes = [...prev];
                    newTypes.splice(index, 1);
                    return newTypes;
                });
            } else {
                // C'est un nouveau média
                const newIndex = index - existingMediaUrls.length;
                console.log(`Suppression du nouveau média à l'index relatif ${newIndex}, type: ${mediaType}`);

                // Libérer le blob URL pour éviter les fuites de mémoire
                const previewUrl = mediaPreviews[index];
                if (previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(previewUrl);
                    console.log(`URL blob révoquée: ${previewUrl}`);
                }

                const newMedia = [...media];
                newMedia.splice(newIndex, 1);

                // Mise à jour des trois états importants
                setMedia(newMedia);
                setMediaPreviews(prev => {
                    const newPreviews = [...prev];
                    newPreviews.splice(index, 1);
                    return newPreviews;
                });
                setMediaTypes(prev => {
                    const newTypes = [...prev];
                    newTypes.splice(index, 1);
                    return newTypes;
                });
            }

            // Après une courte attente, vérifier que les états ont été mis à jour correctement
            setTimeout(() => {
                console.log("ÉTATS APRÈS SUPPRESSION :");
                console.log("MediaTypes:", [...mediaTypes]);
                console.log("MediaPreviews:", [...mediaPreviews]);
                console.log("ExistingMediaUrls:", [...existingMediaUrls]);
                console.log("Media (nouveaux fichiers):", [...media]);
                console.log("Médias à supprimer après mise à jour:", [...mediaToDelete]);
            }, 100);
        } catch (error) {
            console.error("Erreur lors de la suppression du média:", error);
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
        try {
            // Récupérer les médias existants au début de l'édition
            const originalMediaUrls = tweet.mediaUrl ? tweet.mediaUrl.split(',') : [];
            console.log("Médias originaux:", originalMediaUrls);
            console.log("Médias conservés:", existingMediaUrls);
            console.log("Médias marqués pour suppression:", mediaToDelete);

            // Préparer les URLs de médias (existantes + nouvelles)
            const updatedMediaUrls: string[] = [...existingMediaUrls];

            // Uploader les nouveaux médias
            let uploadedCount = 0;
            for (const mediaFile of media) {
                try {
                    console.log(`Upload du fichier ${mediaFile.name} (${Math.round(mediaFile.size / (1024 * 1024))}Mo)...`);
                    const response = await uploadImage(mediaFile, 'post');

                    if (!response || !response.filename) {
                        console.error('Réponse d\'upload invalide:', response);
                        throw new Error('Réponse invalide du serveur lors de l\'upload');
                    }

                    updatedMediaUrls.push(response.filename);
                    uploadedCount++;
                    console.log(`Fichier uploadé avec succès (${uploadedCount}/${media.length}): ${response.filename}`);
                } catch (uploadError) {
                    console.error(`Erreur lors de l'upload du fichier ${mediaFile.name}:`, uploadError);
                    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Erreur inconnue';
                    throw new Error(`Erreur lors de l'upload du fichier ${mediaFile.name}: ${errorMessage}`);
                }
            }

            // Si tous les uploads ont réussi, mettre à jour le post
            console.log(`Mise à jour du post avec ${updatedMediaUrls.length} médias...`);
            const response = await updatePost(tweet.id, content.trim(), updatedMediaUrls);

            // Vérifier que la réponse est valide
            if (!response || !response.id) {
                console.error('Réponse de mise à jour invalide:', response);
                throw new Error('Réponse invalide du serveur lors de la mise à jour du post');
            }

            console.log('Post mis à jour avec succès');

            // Maintenant que le post est mis à jour avec succès, supprimer les fichiers médias qui ne sont plus utilisés
            if (mediaToDelete.length > 0) {
                console.log(`Suppression de ${mediaToDelete.length} fichiers médias qui ne sont plus utilisés...`);
                const deletionPromises = mediaToDelete.map(filename =>
                    deleteMediaFile(filename)
                        .then(() => console.log(`Fichier ${filename} supprimé avec succès`))
                        .catch(err => console.error(`Erreur lors de la suppression du fichier ${filename}:`, err))
                );

                try {
                    await Promise.all(deletionPromises);
                    console.log('Tous les fichiers inutilisés ont été nettoyés');
                } catch (err) {
                    console.error('Erreur lors du nettoyage des fichiers:', err);
                    // On continue même si la suppression des fichiers échoue
                }
            }

            onPostUpdated(response);
            onClose();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du post:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            alert(`Erreur lors de la mise à jour du post: ${errorMessage}`);
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

        // Ne pas supprimer les fichiers marqués puisque la modification est annulée
        setMediaToDelete([]);

        // Fermer le modal
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-auto overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Modifier le tweet</h2>
                    <button
                        onClick={handleModalClose}
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
                                            onClick={(e) => {
                                                e.stopPropagation(); // Empêcher la propagation des événements
                                                console.log(`Clic pour supprimer le média ${index}, type: ${isVideo ? 'video' : 'image'}`);
                                                handleRemoveMedia(index);
                                            }}
                                            className={`
                                                absolute 
                                                top-1 
                                                right-1 
                                                bg-black 
                                                text-white 
                                                rounded-full 
                                                p-1 
                                                hover:bg-black/70
                                                z-10
                                                ${isVideo ? 'video-delete-btn' : 'image-delete-btn'}
                                            `}
                                            title="Supprimer"
                                            data-index={index}
                                            data-type={isVideo ? 'video' : 'image'}
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
                    {mediaPreviews.length > 0 && (
                        <div className="text-left text-sm text-gray-500 mt-2">
                            {mediaPreviews.length}/{maxMediaCount}
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
                                disabled={mediaPreviews.length >= maxMediaCount}
                            >
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={mediaPreviews.length === 0 && !content.trim() || content.length > maxLength || isSubmitting}
                            className="bg-orange text-white px-6 py-2 rounded-full font-semibold hover:bg-dark-orange disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 