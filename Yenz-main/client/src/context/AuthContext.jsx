import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { reconnectSocketWithAuth } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('yenz_token') || localStorage.getItem('milega_token') || localStorage.getItem('krawing_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await API.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, requestedRole) => {
    const res = await API.post('/auth/login', { email, password, requestedRole });
    if (res.data.success) {
      localStorage.setItem('yenz_token', res.data.token);
      localStorage.setItem('milega_token', res.data.token);
      localStorage.setItem('krawing_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      reconnectSocketWithAuth();
      return res.data;
    }
  };

  const register = async (userData) => {
    const res = await API.post('/auth/register', userData);
    if (res.data.success) {
      localStorage.setItem('yenz_token', res.data.token);
      localStorage.setItem('milega_token', res.data.token);
      localStorage.setItem('krawing_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      reconnectSocketWithAuth();
      return res.data;
    }
  };

  const demoSwitchRole = async (role) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/demo-login', { role });
      if (res.data.success) {
        localStorage.setItem('yenz_token', res.data.token);
        localStorage.setItem('milega_token', res.data.token);
        localStorage.setItem('krawing_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        reconnectSocketWithAuth();
        return res.data.user;
      }
    } catch (err) {
      console.error('Demo switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('yenz_token');
    localStorage.removeItem('milega_token');
    localStorage.removeItem('krawing_token');
    setToken(null);
    setUser(null);
    reconnectSocketWithAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, demoSwitchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
