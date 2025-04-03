// import { fakeNetwork } from "./utils.js";

// Configuration
const API_BASE_URL = "http://localhost:8080";

// Types d'entités
export interface User {
    id: number;
    email: string;
    name: string | null;
    mention: string | null;
    avatar: string | null;
    banner: string | null;
    biography: string | null;
    roles?: string[];
    isVerified: boolean;
    postReload: number;
    isbanned: boolean;
    readOnly?: boolean;
}

// Types pour l'authentification
interface LoginCredentials {
    email: string;
    password: string;
}

interface LoginResponse {
    token: string;
    user: User;
}

interface RegisterData {
    email: string;
    password: string;
    name: string;
    mention: string;
}

interface RegisterResponse {
    message: string;
    user: User;
}

// Types pour les posts
export interface Tweet {
    id: number;
    content: string;
    mediaUrl?: string | null; // Peut contenir jusqu'à 10 médias séparés par des virgules
    created_at: string;
    likes: number;
    isLiked: boolean;
    isCensored?: boolean;
    isPinned?: boolean;
    retweets?: number; // Nombre de retweets
    isRetweet?: boolean; // Si c'est un retweet
    originalPost?: { // Le post original retourné par l'API
        id: number | null;
        content: string;
        mediaUrl?: string | null;
        created_at: string | null;
        deleted?: boolean; // Indique si le post original a été supprimé
        user?: {
            id: number;
            name: string;
            mention: string;
            avatar: string | null;
        } | null;
    };
    originalUser?: {
        id: number;
        name: string;
        mention: string;
        avatar: string | null;
    }; // L'utilisateur qui a créé le post original (auteur du tweet original)
    user: {
        id: number;
        email: string;
        name: string;
        mention: string;
        avatar: string | null;
        isbanned?: boolean;
        readOnly?: boolean;
    } | null;
}

interface PostsResponse {
    posts: Tweet[];
    previous_page: number | null;
    next_page: number | null;
}

// Types pour les réponses
export interface Reply {
    id: number;
    reply: string;
    replied_at: string;
    user: {
        id: number;
        name: string;
        mention: string;
        avatar: string | null;
        isbanned?: boolean;
    };
    isLiked: boolean;
}

// Fonctions d'authentification
export async function register(data: RegisterData): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de l\'inscription');
    }

    return response.json();
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de l\'authentification');
    }

    const data = await response.json();

    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
}

export function logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Fonctions utilitaires de session
export function getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
}

export function isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
}

// Fonctions de gestion des posts
export async function fetchPosts(page: number): Promise<PostsResponse> {
    const response = await fetch(`${API_BASE_URL}/posts?page=${page}`);

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération des posts');
    }

    return response.json();
}

export async function createPost(content: string, mediaUrls?: string[]): Promise<Tweet> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/addpost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content: content,
                mediaUrls: mediaUrls
            })
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 401) {
                logout();
                throw new Error('Session expirée - veuillez vous reconnecter');
            }

            throw new Error(error.errors || error.message || 'Erreur lors de la création du post');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function fetchUsers(): Promise<User[]> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        if (response.status === 403) {
            throw new Error('Vous n\'avez pas les droits pour accéder à ce contenu');
        }
        throw new Error('Erreur lors de la récupération des utilisateurs');
    }

    return response.json();
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        if (response.status === 403) {
            throw new Error('Vous n\'avez pas les droits pour modifier cet utilisateur');
        }
        throw new Error('Erreur lors de la mise à jour de l\'utilisateur');
    }

    return response.json();
}

export async function likePost(postId: number): Promise<{ likes: number; isLiked: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors du like');
    }

    return response.json();
}

export async function unlikePost(postId: number): Promise<{ likes: number }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/unlike`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors du unlike');
    }

    return response.json();
}

export async function getLikeStatus(postId: number): Promise<{ likes: number; isLiked: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like-status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération du statut du like');
    }

    return response.json();
}

export async function fetchUserPosts(userId: number): Promise<{ posts: Tweet[] }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/posts?userId=${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération des posts');
    }

    return response.json();
}

export async function deletePost(postId: number): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    try {
        // Étape 1: Récupérer les informations du post pour connaître ses médias
        const postInfoResponse = await fetch(`${API_BASE_URL}/post/${postId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Si on ne peut pas récupérer les infos du post, on continue quand même avec la suppression
        let mediaUrls: string[] = [];

        if (postInfoResponse.ok) {
            const postData = await postInfoResponse.json();
            console.log("Données récupérées pour le post à supprimer:", postData);

            // Récupérer les médias du post
            if (postData && postData.mediaUrl) {
                mediaUrls = postData.mediaUrl.split(',').filter(Boolean);
                console.log(`Post à supprimer contient ${mediaUrls.length} fichiers médias:`, mediaUrls);
            } else {
                console.warn(`Format de réponse inattendu pour le post ${postId}:`, postData);
            }
        } else {
            console.warn(`Impossible de récupérer les infos du post ${postId} avant suppression. Statut: ${postInfoResponse.status}`);
            try {
                const errorData = await postInfoResponse.json();
                console.error("Détails de l'erreur:", errorData);
            } catch (e) {
                console.error("Impossible de parser la réponse d'erreur");
            }
        }

        // Étape 2: Supprimer le post lui-même
        console.log(`Suppression du post ${postId}...`);
        const deleteResponse = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!deleteResponse.ok) {
            if (deleteResponse.status === 401) {
                logout();
                throw new Error('Session expirée');
            }
            if (deleteResponse.status === 403) {
                throw new Error('Vous n\'êtes pas autorisé à supprimer ce post');
            }
            throw new Error('Erreur lors de la suppression du post');
        }

        console.log(`Post ${postId} supprimé avec succès`);

        // Étape 3: Pour chaque média, vérifier s'il est utilisé par d'autres posts avant de le supprimer
        if (mediaUrls.length > 0) {
            console.log(`Vérification des ${mediaUrls.length} fichiers médias associés au post ${postId}...`);

            // Pour chaque média, extraire seulement le nom du fichier (sans le chemin)
            const cleanMediaUrls = mediaUrls.map(url => {
                // Si l'URL est déjà un simple nom de fichier
                if (!url.includes('/')) {
                    return url;
                }

                // Si c'est une URL complète, extraire le nom du fichier
                return url.split('/').pop() || url;
            });

            console.log("URLs des médias nettoyées:", cleanMediaUrls);

            // Vérifier chaque média un par un
            for (const filename of cleanMediaUrls) {
                try {
                    // Vérifier si d'autres posts utilisent ce média
                    const checkResponse = await fetch(`${API_BASE_URL}/media/check-usage?filename=${filename}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (checkResponse.ok) {
                        const usageData = await checkResponse.json();

                        // Si ce média n'est plus utilisé par aucun post, le supprimer
                        if (usageData.count === 0) {
                            console.log(`Le média ${filename} n'est plus utilisé par aucun post, suppression...`);
                            await deleteMediaFile(filename);
                            console.log(`Fichier ${filename} supprimé avec succès`);
                        } else {
                            console.log(`Le média ${filename} est encore utilisé par ${usageData.count} post(s), conservation du fichier.`);
                        }
                    } else {
                        // En cas d'erreur lors de la vérification, on tente de supprimer le fichier par sécurité
                        console.warn(`Impossible de vérifier l'utilisation du média ${filename}, suppression par défaut...`);
                        await deleteMediaFile(filename);
                    }
                } catch (error) {
                    console.error(`Erreur lors de la vérification/suppression du fichier ${filename}:`, error);
                }
            }
        } else {
            console.log(`Le post ${postId} ne contenait pas de médias à supprimer`);
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression du post ${postId}:`, error);
        throw error;
    }
}

export async function updatePost(postId: number, content: string, mediaUrls?: string[]): Promise<Tweet> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content: content,
                mediaUrls: mediaUrls
            })
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 401) {
                logout();
                throw new Error('Session expirée - veuillez vous reconnecter');
            }

            if (response.status === 403) {
                throw new Error('Vous n\'êtes pas autorisé à modifier ce post');
            }

            throw new Error(error.errors || error.message || 'Erreur lors de la modification du post');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function updateUserSettings(data: Partial<User>): Promise<User> {
    try {
        // Mise à jour des paramètres utilisateur via le nouvel endpoint
        const response = await fetch(`${API_BASE_URL}/user/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour des paramètres');
        }

        const updatedUser = await response.json();
        return updatedUser;
    } catch (error) {
        console.error('Erreur de mise à jour des paramètres utilisateur:', error);
        throw error;
    }
}

export async function checkUserStatus(userId: number): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la vérification du statut');
    }

    return response.json();
}

export async function fetchUserProfile(userId: number): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        if (response.status === 403) {
            throw new Error('Vous n\'avez pas les droits pour accéder à ce profil');
        }
        throw new Error('Erreur lors de la récupération du profil');
    }

    return response.json();
}

export async function checkFollowStatus(targetUserId: number): Promise<{ isFollowing: boolean, isBlockedByTarget: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow-status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la vérification du statut de suivi');
    }

    return response.json();
}

export async function toggleFollow(targetUserId: number): Promise<{ isFollowing: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/toggle-follow`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors du changement de statut de suivi');
    }

    return response.json();
}

export async function fetchFollowedPosts(page: number): Promise<PostsResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/followed?page=${page}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération des posts des profils suivis');
    }

    return response.json();
}

// Fonctions supplémentaires pour les requêtes fetch

export async function uploadImage(file: File, type: 'avatar' | 'banner' | 'post'): Promise<{ filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Erreur lors de l'upload de l'image ${type}`);
    }

    return response.json();
}

/**
 * Supprime un fichier média du serveur
 * @param filename Nom du fichier à supprimer
 * @param checkRepostsUsage Si true, vérifie d'abord si le média est utilisé par des reposts
 * @returns Promise qui se résout quand la suppression est terminée
 */
export async function deleteMediaFile(filename: string, checkRepostsUsage: boolean = true): Promise<void> {
    // Vérifier que le nom de fichier n'est pas vide
    if (!filename || filename.trim() === '') {
        console.error('Tentative de suppression avec un nom de fichier vide');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    // Nettoyer le nom de fichier (au cas où il contient encore une URL complète)
    const cleanFilename = filename.includes('/') ? filename.split('/').pop() || filename : filename;

    try {
        console.log(`Demande de suppression du fichier: ${cleanFilename}`);

        // Si on doit vérifier l'utilisation par des reposts
        if (checkRepostsUsage) {
            try {
                // Vérifier si d'autres posts utilisent ce média
                const checkResponse = await fetch(`${API_BASE_URL}/media/check-usage?filename=${cleanFilename}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (checkResponse.ok) {
                    const usageData = await checkResponse.json();

                    // Si ce média est utilisé par plus d'un post, ne pas le supprimer
                    if (usageData.count > 1) {
                        console.log(`Le média ${cleanFilename} est utilisé par ${usageData.count} posts, suppression annulée.`);
                        throw new Error(`Le média ne peut pas être supprimé car il est utilisé par ${usageData.count - 1} autres posts, y compris des reposts.`);
                    }
                }
            } catch (error) {
                // Si l'erreur provient de notre propre vérification, on la propage
                if (error instanceof Error && error.message.includes('reposts')) {
                    throw error;
                }
                // Sinon on continue avec la tentative de suppression
                console.warn(`Impossible de vérifier l'utilisation du média, tentative de suppression directe...`);
            }
        }

        // Afficher les détails de la requête pour le débogage
        console.log('Requête DELETE envoyée à:', `${API_BASE_URL}/media/delete`);
        console.log('Corps de la requête:', JSON.stringify({ filename: cleanFilename }));

        const response = await fetch(`${API_BASE_URL}/media/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filename: cleanFilename })
        });

        // Log détaillé de la réponse pour le débogage
        console.log(`Réponse du serveur pour la suppression de ${cleanFilename}: Status ${response.status}`);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('Détail de l\'erreur du serveur:', errorData);
            } catch (parseError) {
                console.error('Impossible de parser la réponse d\'erreur:', parseError);
                errorData = { message: `Erreur HTTP ${response.status}` };
            }

            if (response.status === 401) {
                logout();
                throw new Error('Session expirée');
            }

            if (response.status === 403) {
                throw new Error('Vous n\'êtes pas autorisé à supprimer ce média');
            }

            if (response.status === 404) {
                console.warn(`Le fichier ${cleanFilename} n'existe pas ou a déjà été supprimé`);
                // Ne pas lancer d'erreur pour un fichier déjà supprimé
                return;
            }

            // Vérifier si l'erreur est due à l'utilisation du média par des reposts
            if (response.status === 400 && errorData.message && errorData.message.includes('reposts')) {
                throw new Error(`Le média ne peut pas être supprimé car il est utilisé par ${errorData.usageCount - 1} autres posts, y compris des reposts.`);
            }

            throw new Error(errorData.message || 'Erreur lors de la suppression du média');
        }

        // Tentative de récupération de la réponse
        try {
            const successData = await response.json();
            console.log(`Fichier ${cleanFilename} supprimé avec succès:`, successData);
        } catch (e) {
            console.log(`Fichier ${cleanFilename} probablement supprimé avec succès, mais pas de données dans la réponse`);
        }
    } catch (error) {
        console.error(`Échec de suppression du fichier ${cleanFilename}:`, error);
        throw error; // Propager l'erreur pour qu'elle puisse être gérée par le composant appelant
    }
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await fetch('http://localhost:8080/resend-verification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors du renvoi de l\'email de vérification');
    }

    return response.json();
}

export async function banUser(userId: number): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`http://localhost:8080/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors du bannissement de l\'utilisateur');
    }
}

// Fonction pour générer l'URL de l'image
export function getImageUrl(filename: string | null): string {
    if (!filename) return '';
    return `http://localhost:8080/images/${filename}`;
}

// Fonctions pour les réponses aux posts
export async function createReply(postId: number, replyContent: string): Promise<Reply> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reply: replyContent
            })
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 401) {
                logout();
                throw new Error('Session expirée - veuillez vous reconnecter');
            }

            throw new Error(error.errors || error.message || 'Erreur lors de la création de la réponse');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function fetchReplies(postId: number): Promise<{ replies: Reply[] }> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/replies`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error('Session expirée');
            }
            throw new Error('Erreur lors de la récupération des réponses');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Nouvelles fonctions pour la gestion du blocage

export async function checkBlockStatus(targetUserId: number): Promise<{ isBlocked: boolean, isBlockedByTarget: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/block-status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la vérification du statut de blocage');
    }

    return response.json();
}

export async function toggleBlockUser(targetUserId: number): Promise<{ isBlocked: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/toggle-block`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        if (response.status === 400) {
            const error = await response.json();
            throw new Error(error.message || 'Opération non autorisée');
        }
        throw new Error('Erreur lors du changement de statut de blocage');
    }

    return response.json();
}

export async function fetchBlockedUsers(): Promise<{ blockedUsers: User[] }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/users/blocked`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération des utilisateurs bloqués');
    }

    return response.json();
}

export async function togglePostCensorship(postId: number): Promise<{ isCensored: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/toggle-censorship`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Erreur lors de la modification du statut de censure');
    }

    return response.json();
}

export async function togglePinPost(postId: number): Promise<{ isPinned: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/toggle-pin`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Erreur lors de l\'épinglage/désépinglage du post');
    }

    return response.json();
}

export async function fetchAllPosts(page: number = 1): Promise<{ posts: Tweet[], previous_page: number | null, next_page: number | null }> {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Non authentifié');
        }

        const response = await fetch(`${API_BASE_URL}/posts?page=${page}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des posts');
        }

        const data = await response.json();
        return {
            posts: data.posts,
            previous_page: data.previous_page,
            next_page: data.next_page
        };
    } catch (error) {
        console.error('Erreur fetchAllPosts:', error);
        throw error;
    }
}

export async function searchPosts(searchQuery: string): Promise<{ posts: Tweet[] }> {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Non authentifié');
        }

        const response = await fetch(`${API_BASE_URL}/posts/search?query=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la recherche des posts');
        }

        const data = await response.json();
        return {
            posts: data.posts
        };
    } catch (error) {
        console.error('Erreur searchPosts:', error);
        throw error;
    }
}

// Fonction pour rechercher des utilisateurs par query (pour les mentions)
export async function fetchUsersByQuery(query: string): Promise<User[]> {
    if (!query || query.trim() === '') {
        return [];
    }

    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    // Recherche côté client uniquement
    try {
        // Récupérer tous les utilisateurs
        const allUsers = await fetchUsers();

        // Filtrer les utilisateurs qui correspondent à la recherche
        return allUsers.filter(user =>
            (user.mention && user.mention.toLowerCase().includes(query.toLowerCase())) ||
            (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
        );
    } catch (error) {
        console.error("Erreur lors de la recherche d'utilisateurs:", error);
        throw new Error("Erreur lors de la recherche des utilisateurs");
    }
}

// Nouvelle fonction pour créer un retweet
export async function retweetPost(postId: number, comment?: string): Promise<Tweet> {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('Non authentifié');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/retweet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content: comment || '' // Si pas de commentaire, envoyer une chaîne vide
            })
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 401) {
                logout();
                throw new Error('Session expirée - veuillez vous reconnecter');
            }

            throw new Error(error.errors || error.message || 'Erreur lors du retweet');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Fonction pour vérifier si un post a été retweeté par l'utilisateur
export async function getRetweetStatus(postId: number): Promise<{ retweets: number, isRetweeted: boolean }> {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Non authentifié');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/retweet-status`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la vérification du statut de retweet');
    }

    return response.json();
}