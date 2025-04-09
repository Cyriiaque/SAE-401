import React, { useState, useRef, useCallback, useEffect } from 'react';
import Button from '../ui/buttons';
import { User, getImageUrl } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';

const EditProfileModal = ({
    isOpen,
    onClose,
    user,
    onSave
}: {
    isOpen: boolean,
    onClose: () => void,
    user: User,
    onSave: (updatedUser: Partial<User>) => Promise<void>
}) => {
    const { setUser } = useAuth();
    const [name, setName] = useState(user.name || '');
    const [mention, setMention] = useState(user.mention || '');
    const [biography, setBiography] = useState(user.biography || '');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(getImageUrl(user.avatar));
    const [bannerPreview, setBannerPreview] = useState<string | null>(getImageUrl(user.banner));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageImportType, setImageImportType] = useState<'avatar' | 'banner' | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
    const [nameError, setNameError] = useState('');
    const [mentionError, setMentionError] = useState('');

    const modalRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Effet pour bloquer/débloquer le scroll du body
    useEffect(() => {
        if (isOpen || imageImportType) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Nettoyer l'effet lors du démontage
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, imageImportType]);

    // Fonction pour compresser l'image
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

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Si le fichier est > 1Mo, le compresser
                const processedFile = file.size > 1024 * 1024
                    ? await compressImage(file)
                    : file;

                setAvatar(processedFile);
                setAvatarPreview(URL.createObjectURL(processedFile));
                setImageImportType(null);
            } catch (error) {
                console.error('Erreur lors de la compression de l\'image:', error);
                alert('Impossible de traiter cette image. Veuillez en choisir une autre.');
            }
        }
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Si le fichier est > 1Mo, le compresser
                const processedFile = file.size > 1024 * 1024
                    ? await compressImage(file)
                    : file;

                setBanner(processedFile);
                setBannerPreview(URL.createObjectURL(processedFile));
                setImageImportType(null);
            } catch (error) {
                console.error('Erreur lors de la compression de l\'image:', error);
                alert('Impossible de traiter cette image. Veuillez en choisir une autre.');
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Si le fichier est > 1Mo, le compresser
                const processedFile = file.size > 1024 * 1024
                    ? await compressImage(file)
                    : file;

                setSelectedFile(processedFile);
                setSelectedFilePreview(URL.createObjectURL(processedFile));
            } catch (error) {
                console.error('Erreur lors de la compression de l\'image:', error);
                alert('Impossible de traiter cette image. Veuillez en choisir une autre.');
            }
        }
    };

    const handleImageImport = useCallback(() => {
        if (imageImportType === 'avatar') {
            avatarInputRef.current?.click();
        } else if (imageImportType === 'banner') {
            bannerInputRef.current?.click();
        }
    }, [imageImportType]);

    const handleImportConfirm = async () => {
        if (!selectedFile) return;

        // Simplement mettre à jour les états locaux
        if (imageImportType === 'avatar') {
            setAvatar(selectedFile);
            setAvatarPreview(URL.createObjectURL(selectedFile));
        } else if (imageImportType === 'banner') {
            setBanner(selectedFile);
            setBannerPreview(URL.createObjectURL(selectedFile));
        }

        // Réinitialiser les états de sélection
        setSelectedFile(null);
        setSelectedFilePreview(null);
        setImageImportType(null);
    };

    const openImageImportOverlay = (type: 'avatar' | 'banner') => {
        setImageImportType(type);
        setSelectedFile(null);
        setSelectedFilePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Réinitialiser les erreurs
        setNameError('');
        setMentionError('');

        let validForm = true;

        // Validation de base
        if (!name || name.trim() === '') {
            setNameError('Le nom ne peut pas être vide');
            validForm = false;
        }

        if (!mention || mention.trim() === '') {
            setMentionError('Le nom d\'utilisateur ne peut pas être vide');
            validForm = false;
        }

        if (!validForm) {
            setIsSubmitting(false);
            return;
        }

        try {
            // Préparation des données de base
            const userData: Partial<User> = {
                name,
                mention,
                biography
            };

            // Gérer l'upload de l'avatar
            if (avatar instanceof File) {
                const formData = new FormData();
                formData.append('file', avatar);
                formData.append('type', 'avatar');

                const response = await fetch('http://localhost:8080/upload-image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Erreur lors de l\'upload de l\'avatar');
                }

                const result = await response.json();
                userData.avatar = result.filename;
            }

            // Gérer l'upload de la bannière
            if (banner instanceof File) {
                const formData = new FormData();
                formData.append('file', banner);
                formData.append('type', 'banner');

                const response = await fetch('http://localhost:8080/upload-image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Erreur lors de l\'upload de la bannière');
                }

                const result = await response.json();
                userData.banner = result.filename;
            }

            // Appel à la fonction pour sauvegarder les modifications
            await onSave(userData);

            // Mise à jour des infos locales de l'utilisateur si succès
            setUser({
                ...user,
                name,
                mention,
                biography,
                avatar: avatarPreview ? user.avatar : user.avatar,
                banner: bannerPreview ? user.banner : user.banner
            });

            onClose();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 bg-black/30 bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm"
        >
            <div
                className="bg-white p-6 w-full max-w-md min-h-screen overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4">Modifier le profil</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={bannerInputRef}
                        onChange={handleBannerChange}
                        accept="image/*"
                        className="hidden"
                    />

                    {/* Bannière */}
                    <div className="relative">
                        <div
                            className="w-full h-32 bg-gray-200 flex items-center justify-center cursor-pointer relative"
                            onClick={() => openImageImportOverlay('banner')}
                        >
                            {bannerPreview ? (
                                <img
                                    src={bannerPreview}
                                    alt="Aperçu de la bannière"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-gray-500">Cliquez pour ajouter une bannière</span>
                            )}
                            <div
                                className="absolute top-2 right-2 bg-black/50 rounded-full p-2 text-white hover:text-black transition-colors"
                                title="Modifier la bannière"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                            <div
                                className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer relative border-4 border-white"
                                onClick={() => openImageImportOverlay('avatar')}
                            >
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Aperçu de l'avatar"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-gray-500">Avatar</span>
                                )}
                                <div
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-100 text-white hover:text-black transition-colors"
                                    title="Modifier l'avatar"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-8 h-8"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reste du formulaire */}
                    <div className="mt-16">
                        {/* Nom */}
                        <div>
                            <label htmlFor="name" className="block mb-2">Nom</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setNameError('');
                                }}
                                className={`w-full p-2 border rounded ${nameError ? 'border-red-500' : ''}`}
                                required
                            />
                            {nameError && (
                                <p className="text-red-500 text-sm mt-1">{nameError}</p>
                            )}
                        </div>

                        {/* Mention */}
                        <div className="mt-4">
                            <label htmlFor="mention" className="block mb-2">Mention</label>
                            <input
                                type="text"
                                id="mention"
                                value={mention}
                                onChange={(e) => {
                                    setMention(e.target.value);
                                    setMentionError('');
                                }}
                                className={`w-full p-2 border rounded ${mentionError ? 'border-red-500' : ''}`}
                                required
                            />
                            {mentionError && (
                                <p className="text-red-500 text-sm mt-1">{mentionError}</p>
                            )}
                        </div>

                        {/* Biographie */}
                        <div className="mt-4">
                            <label htmlFor="biography" className="block mb-2">Biographie</label>
                            <textarea
                                id="biography"
                                value={biography}
                                onChange={(e) => setBiography(e.target.value)}
                                className="w-full p-2 border rounded"
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Boutons */}
                    <div className="flex justify-between mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </div>
                </form>

                {/* Overlay d'importation d'image */}
                {imageImportType && (
                    <div
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm"
                        onClick={() => {
                            setImageImportType(null);
                            setSelectedFile(null);
                            setSelectedFilePreview(null);
                        }}
                    >
                        <div
                            className="bg-white p-6 rounded-lg w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4">
                                {imageImportType === 'avatar' ? 'Importer un avatar' : 'Importer une bannière'}
                            </h3>

                            <input
                                type="file"
                                ref={imageImportType === 'avatar' ? avatarInputRef : bannerInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />

                            {!selectedFilePreview ? (
                                <div className="flex flex-col">
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mb-4"
                                        onClick={() => handleImageImport()}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className="w-12 h-12 text-gray-400 mb-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6.75a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6.75v10.5a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                                            />
                                        </svg>
                                        <Button
                                            variant="full"
                                            className="flex items-center gap-2"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-6 h-6"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                                />
                                            </svg>
                                            Choisir le fichier
                                        </Button>
                                        <p className="text-sm text-gray-500 mt-2 text-center">
                                            Formats acceptés : PNG, JPG, WEBP (compressé au delà de 1Mo)
                                        </p>
                                    </div>
                                    <div className="flex space-x-4 w-full">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setImageImportType(null)}
                                        >
                                            Fermer
                                        </Button>
                                        <Button
                                            variant="full"
                                            className="flex-1"
                                            disabled
                                        >
                                            Importer
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-h-64 mb-4 overflow-hidden rounded-lg">
                                        <img
                                            src={selectedFilePreview}
                                            alt="Aperçu"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex space-x-4 w-full">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setSelectedFilePreview(null);
                                                setImageImportType(null);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            variant="full"
                                            className="flex-1"
                                            onClick={handleImportConfirm}
                                        >
                                            Importer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditProfileModal; 