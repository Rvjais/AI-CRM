import { useState } from 'react';
import api from '../utils/apiClient';
import './Login.css';

function Login({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const payload = isLogin ? { email, password } : { email, password, name };

            const data = await api.post(endpoint, payload);

            if (data.success) {
                // For both login and register, we get a token back
                // Register returns: { user, accessToken, refreshToken }
                // Login returns: { user, accessToken, refreshToken }
                const token = data.data.accessToken || data.data.token;
                if (token) {
                    onLogin(token);
                } else {
                    setError('Authentication successful but no token received.');
                }
            } else {
                setError(data.message || 'Authentication failed');
            }
        } catch (err) {
            setError(err.message || 'Connection error. Make sure the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        // Optional: Clear form or keep it
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                            <rect width="60" height="60" rx="12" fill="url(#gradient)" />
                            <path d="M30 15L45 22.5V37.5L30 45L15 37.5V22.5L30 15Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                            <circle cx="30" cy="30" r="5" fill="white" />
                            <defs>
                                <linearGradient id="gradient" x1="0" y1="0" x2="60" y2="60">
                                    <stop stopColor="#667eea" />
                                    <stop offset="1" stopColor="#764ba2" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p>{isLogin ? 'Sign in to your account' : 'Get started with your free account'}</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                placeholder="Enter your full name"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            minLength={8}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading
                            ? (isLogin ? 'Signing in...' : 'Creating account...')
                            : (isLogin ? 'Sign In' : 'Sign Up')
                        }
                    </button>

                    <div className="auth-toggle">
                        <p>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button type="button" className="toggle-button" onClick={toggleMode}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>

                    {isLogin && (
                        <div className="demo-note">
                            <p>💡 Demo credentials:</p>
                            <p className="small">test@example.com / Test1234</p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default Login;
