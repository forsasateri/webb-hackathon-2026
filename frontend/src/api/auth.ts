import { BASE_URL } from './base_url';

// DEV auth token for faster iteration
export const DEV_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"

export const getAuthToken = (): string | null => {
    // In production use real token from localStorage
    // In development fallback to DEV_AUTH_TOKEN for convenience
    return localStorage.getItem('token') || DEV_AUTH_TOKEN;
}

export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
}

export const clearAuthToken = () => {
    localStorage.removeItem('token');
}

// /api/auth/register
export const register = async (username: string, email: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
        throw new Error('Failed to register');
    }

    return await response.json();
}

// /api/auth/login
export const login = async (username: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        throw new Error('Failed to login');
    }

    return await response.json();
}


// /api/auth/me
export const getCurrentUser = async () => {
    const response = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch current user');
    }

    return await response.json();
}