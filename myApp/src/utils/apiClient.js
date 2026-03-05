/**
 * Centralized API Client
 * Handles all HTTP requests to the backend API
 */
import { Preferences } from '@capacitor/preferences';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.aicrmz.com').replace(/\/$/, '');

/**
 * Get authorization header
 * @returns {Promise<Object>} Authorization header or empty object
 */
const getAuthHeaders = async () => {
    const { value: token } = await Preferences.get({ key: 'token' });
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If response is not ok
 */
const handleResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
            await Preferences.remove({ key: 'token' });
            window.location.href = '/';
        }

        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
};

/**
 * Make HTTP GET request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const get = async (endpoint, options = {}) => {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            ...authHeaders,
            ...options.headers,
        },
        ...options,
    });

    return handleResponse(response);
};

/**
 * Make HTTP POST request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const post = async (endpoint, data = {}, options = {}) => {
    const isFormData = data instanceof FormData;
    const authHeaders = await getAuthHeaders();

    // Prepare headers
    const headers = {
        ...authHeaders,
        ...options.headers,
    };

    // Set Content-Type to json if NOT formData
    // If it IS FormData, DELETE any 'Content-Type' header to let browser set boundary
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    } else {
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
        ...options,
    });

    return handleResponse(response);
};

/**
 * Make HTTP PUT request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const put = async (endpoint, data = {}, options = {}) => {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
    });

    return handleResponse(response);
};

/**
 * Make HTTP DELETE request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const del = async (endpoint, options = {}) => {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
            ...authHeaders,
            ...options.headers,
        },
        ...options,
    });

    return handleResponse(response);
};

/**
 * Get API base URL (useful for Socket.io connections)
 * @returns {string} Base URL
 */
export const getBaseURL = () => API_BASE_URL;

// Export default object with all methods
export default {
    get,
    post,
    put,
    delete: del,
    getBaseURL,
};
