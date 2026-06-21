import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_time');
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const loginTime = localStorage.getItem('login_time');
    let logoutTimer;

    if (token && savedUser && loginTime) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const elapsedTime = now - parseInt(loginTime, 10);

      if (elapsedTime > oneHour) {
        logout();
      } else {
        setUser(JSON.parse(savedUser));
        
        // Auto-logout after the remaining time of 1 hour
        const remainingTime = oneHour - elapsedTime;
        logoutTimer = setTimeout(() => {
          logout();
          toast.error("Session expired. Please log in again.");
        }, remainingTime);
      }
    }
    setLoading(false);

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('login_time', Date.now().toString());
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

