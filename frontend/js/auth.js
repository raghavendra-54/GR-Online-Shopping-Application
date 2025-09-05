// Authentication utilities
class AuthService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Get authentication token
    getToken() {
        return this.token || localStorage.getItem('authToken');
    }

    // Remove authentication token
    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Get current user info
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Set current user info
    setCurrentUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            this.removeToken();
            window.location.href = '/login.html';
            throw new Error('Authentication expired');
        }

        return response;
    }

    // Login user
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setToken(data.token);
                this.setCurrentUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    // Logout user
    logout() {
        this.removeToken();
        window.location.href = '/login.html';
    }

    // Forgot password
    async forgotPassword(email) {
        try {
            const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    // Reset password
    async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${this.baseURL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }
}

// Create global auth service instance
const authService = new AuthService();

// Protect pages that require authentication
function requireAuth() {
    if (!authService.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Redirect if already authenticated (for login/register pages)
function redirectIfAuthenticated() {
    if (authService.isAuthenticated()) {
        window.location.href = '/p1.html';
        return true;
    }
    return false;
}