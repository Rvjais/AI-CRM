import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            // Validate token or just set user state
            // For now we just assume if token exists, we are logged in (until 401)
            // Ideally fetch /api/auth/me to validate
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, accessToken: token } = response.data.data;

            if (user.role !== 'admin') {
                throw new Error('Unauthorized access');
            }

            localStorage.setItem('adminToken', token);
            setUser(user);
            return true;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
