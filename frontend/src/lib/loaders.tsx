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
interface PostsResponse {
    posts: any[];
    previous_page: number | null;
    next_page: number | null;
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
    return userStr ? JSON.parse(userStr) : null;
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

export async function createPost(content: string): Promise<{ id: number }> {
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
            body: JSON.stringify({ content: content })
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