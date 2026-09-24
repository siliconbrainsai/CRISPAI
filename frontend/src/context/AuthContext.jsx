import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('crisp_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('crisp_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify stored session on mount if token exists
    const verifySession = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('crisp_user', JSON.stringify(res.data));
          }
        } catch (err) {
          // Token expired or invalid
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.warn('Session expired or token invalid. Clearing session.');
            logout();
          }
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password
      });

      const { access_token, user_id, name, role, workspace_id, workspace_name } = res.data;
      const userData = {
        id: user_id,
        email: email.trim(),
        name,
        role,
        workspace_id,
        workspace_name
      };

      setToken(access_token);
      setUser(userData);
      localStorage.setItem('crisp_token', access_token);
      localStorage.setItem('crisp_user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      return { success: false, error: message };
    }
  };

  const register = async ({ email, name, password, role = 'Data Scientist', workspace_name }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: email.trim(),
        name: name.trim(),
        password,
        role,
        workspace_name: workspace_name || `${name.split(' ')[0]}'s Workspace`
      });

      const { access_token, user_id, workspace_id, workspace_name: wsName } = res.data;
      const userData = {
        id: user_id,
        email: email.trim(),
        name: name.trim(),
        role,
        workspace_id,
        workspace_name: wsName
      };

      setToken(access_token);
      setUser(userData);
      localStorage.setItem('crisp_token', access_token);
      localStorage.setItem('crisp_user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        // Suppress network errors on logout
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('crisp_token');
    localStorage.removeItem('crisp_user');
  };

  const role = user?.role || 'Viewer';
  const isAuthenticated = !!token && !!user;

  // RBAC Helper functions
  const canUpload = ['Admin', 'Data Scientist', 'Analyst'].includes(role);
  const canDelete = ['Admin', 'Data Scientist'].includes(role);
  const canRunAnalysis = ['Admin', 'Data Scientist'].includes(role);
  const canCreateExperiment = ['Admin', 'Data Scientist'].includes(role);
  const canViewAudit = role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        workspaceId: user?.workspace_id || 1,
        workspaceName: user?.workspace_name || 'Primary Workspace',
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        canUpload,
        canDelete,
        canRunAnalysis,
        canCreateExperiment,
        canViewAudit
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
