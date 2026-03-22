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

// --- Silent Token Refresh Logic ---
let isRefreshing = false;

const forceLogout = async () => {
    await Preferences.clear();
    window.location.href = '/';
};

const tryRefreshToken = async () => {
    if (isRefreshing) return false; // Already in progress, bail out
    isRefreshing = true;
    try {
        const { value: refreshToken } = await Preferences.get({ key: 'refreshToken' });
        if (!refreshToken) return false;

        const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();
        if (response.ok && data.success && data.data.accessToken) {
            // Save the new access token
            await Preferences.set({ key: 'token', value: data.data.accessToken });
            // Save new refresh token if one was issued
            if (data.data.refreshToken) {
                await Preferences.set({ key: 'refreshToken', value: data.data.refreshToken });
            }
            return true; // Refresh succeeded
        }
        return false; // Refresh failed
    } catch {
        return false;
    } finally {
        isRefreshing = false;
    }
};

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @param {Function} retryFn - Optional function to retry the original request
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If response is not ok
 */
const handleResponse = async (response, retryFn) => {
    if (response.status === 401) {
        // Try to silently refresh the access token
        const refreshed = await tryRefreshToken();
        if (refreshed && retryFn) {
            // Retry the original request with the new token
            return retryFn();
        }
        // Refresh failed — force logout
        await forceLogout();
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    if (!response.ok) {
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
    const doRequest = async () => {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: { ...authHeaders, ...options.headers },
            ...options,
        });
        return handleResponse(response, doRequest);
    };
    return doRequest();
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
    const doRequest = async () => {
        const authHeaders = await getAuthHeaders();
        const headers = { ...authHeaders, ...options.headers };
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
        return handleResponse(response, doRequest);
    };
    return doRequest();
};

/**
 * Make HTTP PUT request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const put = async (endpoint, data = {}, options = {}) => {
    const doRequest = async () => {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
            body: JSON.stringify(data),
            ...options,
        });
        return handleResponse(response, doRequest);
    };
    return doRequest();
};

/**
 * Make HTTP DELETE request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const del = async (endpoint, options = {}) => {
    const doRequest = async () => {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { ...authHeaders, ...options.headers },
            ...options,
        });
        return handleResponse(response, doRequest);
    };
    return doRequest();
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
