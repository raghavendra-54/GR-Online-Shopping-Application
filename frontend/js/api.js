// API service for handling all API calls
class APIService {
    constructor() {
        this.baseURL = '/api';
    }

    // Get products
    async getProducts(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.category) queryParams.append('category', filters.category);
            if (filters.subcategory) queryParams.append('subcategory', filters.subcategory);
            if (filters.search) queryParams.append('search', filters.search);

            const url = `${this.baseURL}/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await fetch(url);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch products');
            }
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    }

    // Get single product
    async getProduct(productId) {
        try {
            const response = await fetch(`${this.baseURL}/products/${productId}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch product');
            }
        } catch (error) {
            console.error('Get product error:', error);
            throw error;
        }
    }

    // Add to cart
    async addToCart(productId, quantity = 1) {
        try {
            const response = await authService.makeAuthenticatedRequest(`${this.baseURL}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add to cart');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            throw error;
        }
    }

    // Get cart
    async getCart() {
        try {
            const response = await authService.makeAuthenticatedRequest(`${this.baseURL}/cart`);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch cart');
            }
        } catch (error) {
            console.error('Get cart error:', error);
            throw error;
        }
    }

    // Create order
    async createOrder(orderData) {
        try {
            const response = await authService.makeAuthenticatedRequest(`${this.baseURL}/orders`, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create order');
            }
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    // Get user orders
    async getOrders() {
        try {
            const response = await authService.makeAuthenticatedRequest(`${this.baseURL}/orders`);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch orders');
            }
        } catch (error) {
            console.error('Get orders error:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile() {
        try {
            const response = await authService.makeAuthenticatedRequest(`${this.baseURL}/user/profile`);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch user profile');
            }
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    }
}

// Create global API service instance
const apiService = new APIService();