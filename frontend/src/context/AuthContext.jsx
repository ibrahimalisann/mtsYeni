import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setLoading(false);
        }
    }, []);

    const verifyToken = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/auth/verify', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.user);
        } catch (error) {
            console.error('Token verification failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                username,
                password
            });

            const { token: newToken, user: userData } = res.data;
            setToken(newToken);
            setUser(userData);
            localStorage.setItem('token', newToken);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Giriş başarısız';
            return { success: false, message };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
