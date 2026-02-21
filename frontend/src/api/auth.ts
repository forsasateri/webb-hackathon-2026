
// DEV auth token for faster iteration
export const DEV_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" //.mock_token_for_frontend"

export const getAuthToken = (): string | null => {
    return DEV_AUTH_TOKEN;
}

// /authYregister
// {
//   "username": "string",
//   "email": "string",
//   "password": "string"
// }
export const register = async (username: string, email: string, password: string) => {
    const response = await fetch('/auth/register', {
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

// /auth/login
// {
//   "username": "string",
//   "password": "string"
// }
export const login = async (username: string, password: string) => {
    const response = await fetch('/auth/login', {
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


// auth/me
export const getCurrentUser = async () => {
    const response = await fetch('/auth/me', {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch current user');
    }

    return await response.json();
}