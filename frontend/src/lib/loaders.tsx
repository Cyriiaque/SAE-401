// import { fakeNetwork } from "./utils.js";

const API_BASE_URL = "http://localhost:8080";

export interface User {
  id: number;
  email: string;
  name: string | null;
  mention: string | null;
  avatar: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// export async function fetchOurTeams(teamName) {
//   await fakeNetwork();
//   let answer = await fetch("/src/lib/data/teams-data.json");
//   let data = await answer.json();
//   return data[teamName];
// }

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  mention: string;
}

export async function register(data: RegisterData): Promise<{ message: string; user: User }> {
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

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export async function fetchPosts(page: number) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Non authentifié');
  }

  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${API_BASE_URL}/posts?page=${page}`, {
    headers
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