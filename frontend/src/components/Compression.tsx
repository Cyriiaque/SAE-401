// Interface pour les options de compression
interface CompressionOptions {
    maxSizeInMB?: number;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
}

// Interface pour les options de compression vidéo
interface VideoCompressionOptions {
    maxSizeInMB?: number;
    targetBitrate?: number;
    maxRecordingTime?: number;
}

// Interface pour l'élément vidéo avec captureStream
interface HTMLVideoElementWithCapture extends HTMLVideoElement {
    captureStream?: () => MediaStream;
}

/**
 * Compresse une image pour qu'elle soit en dessous d'une taille maximale
 * @param file Le fichier image à compresser
 * @param options Options de compression
 * @returns Promise<File> Le fichier compressé
 */
export const compressImage = async (file: File, options: CompressionOptions = {}): Promise<File> => {
    const {
        maxSizeInMB = 1,
        quality = 0.8,
        maxWidth = 1920,
        maxHeight = 1080
    } = options;

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    // Si le fichier est déjà assez petit, on le retourne directement
    if (file.size <= maxSizeInBytes) {
        return file;
    }

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

                // Redimensionner si nécessaire
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Impossible de créer le contexte canvas"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Fonction de compression récursive
                const compress = (currentQuality: number = quality) => {
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
                    const base64Data = compressedDataUrl.split(',')[1];
                    const compressedSize = Math.ceil((base64Data.length * 3) / 4);

                    if (compressedSize <= maxSizeInBytes || currentQuality <= 0.1) {
                        // Convertir le Data URL en Blob
                        fetch(compressedDataUrl)
                            .then(res => res.blob())
                            .then(blob => {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: new Date().getTime()
                                });
                                resolve(compressedFile);
                            })
                            .catch(reject);
                    } else {
                        // Réduire la qualité et réessayer
                        compress(currentQuality - 0.1);
                    }
                };

                compress();
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Compresse une vidéo pour qu'elle soit en dessous d'une taille maximale
 * @param file Le fichier vidéo à compresser
 * @param options Options de compression vidéo
 * @returns Promise<File> Le fichier compressé
 */
export const compressVideo = async (file: File, options: VideoCompressionOptions = {}): Promise<File> => {
    const {
        maxSizeInMB = 50,
        targetBitrate = 1000000,
        maxRecordingTime = 30000
    } = options;

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    // Si le fichier est déjà assez petit, on le retourne directement
    if (file.size <= maxSizeInBytes) {
        return file;
    }

    // Calculer le bitrate cible en fonction de la taille actuelle
    let adjustedBitrate = targetBitrate;
    const currentSize = file.size / (1024 * 1024); // Taille en Mo

    // Ajuster le bitrate en fonction de la taille actuelle
    if (currentSize > 100) {
        adjustedBitrate = 500000; // 500 Kbps pour les fichiers très volumineux
    } else if (currentSize > 75) {
        adjustedBitrate = 800000; // 800 Kbps
    }

    return new Promise((resolve, reject) => {
        try {
            // Créer une URL pour la vidéo
            const videoURL = URL.createObjectURL(file);
            const videoElement = document.createElement('video');

            // Stocker des références pour pouvoir les libérer plus tard
            const createdObjectURLs = [videoURL];

            videoElement.muted = false;
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
                        videoBitsPerSecond: adjustedBitrate
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

                    const recorder = new MediaRecorder(stream, options);
                    const chunks: Blob[] = [];
                    let isRecording = false;
                    let recordingTimeout: number | null = null;

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

                            // Si la taille est toujours trop grande et qu'on n'a pas déjà réduit la résolution, 
                            // recommencer avec une résolution réduite
                            if (blob.size > maxSizeInBytes && !reduceResolution) {
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
                                            videoBitsPerSecond: adjustedBitrate / 2
                                        };

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

                                            // Arrêter après la durée de la vidéo ou maxRecordingTime maximum
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

                        recorder.start(100);  // Capturer des chunks toutes les 100ms

                        // Arrêter après la durée de la vidéo ou maxRecordingTime maximum
                        recordingTimeout = window.setTimeout(() => {
                            if (recorder.state === 'recording') {
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

/**
 * Tente de convertir une vidéo en format alternatif
 * @param file Le fichier vidéo à convertir
 * @returns Promise<File> Le fichier converti
 */
export const tryConvertVideo = async (file: File): Promise<File> => {
    // Limiter la taille maximale pour la conversion
    const MAX_SIZE_FOR_CONVERSION = 50 * 1024 * 1024; // 50 Mo
    if (file.size > MAX_SIZE_FOR_CONVERSION) {
        // Pour les fichiers très gros, on tente une compression directe au lieu de la conversion
        try {
            const compressed = await compressVideo(file);
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

            // Créer un élément vidéo pour l'analyse
            const videoElement = document.createElement('video');
            videoElement.muted = false;
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
                    } catch (error) {
                        console.error(`Erreur lors de la révocation d'URL:`, error);
                    }
                });
                resources.urls = [];
            };

            // Fonction pour nettoyer toutes les ressources
            const cleanupResources = () => {
                if (resources.cleanupCalled) return;
                resources.cleanupCalled = true;

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