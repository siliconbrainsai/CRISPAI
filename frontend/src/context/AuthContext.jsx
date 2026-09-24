import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const getApiBaseUrl = () => {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://crispai.onrender.com/api')
  );
};

// Curated demo profiles for instant 1-click sandbox testing
const DEMO_PROFILES = {
  'admin@crisp.ai': {
    id: 1,
    email: 'admin@crisp.ai',
    name: 'CRISP Administrator',
    role: 'Admin',
    workspace_id: 1,
    workspace_name: 'SiliconBrain Enterprise',
    password: 'AdminPassword123!',
    is_demo: true,
  },
  'analyst@siliconbrain.ai': {
    id: 2,
    email: 'analyst@siliconbrain.ai',
    name: 'Lead Causal Scientist',
    role: 'Data Scientist',
    workspace_id: 1,
    workspace_name: 'SiliconBrain Enterprise',
    password: 'Admin123!',
    is_demo: true,
  },
};

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
        // If it's a demo session, keep it alive without network check
        if (user?.is_demo || token.startsWith('crisp_demo_jwt_')) {
          setIsLoading(false);
          return;
        }

        try {
          const res = await axios.get(`${getApiBaseUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000,
          });
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('crisp_user', JSON.stringify(res.data));
          }
        } catch (err) {
          // Token expired or invalid on live backend
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.warn('Session expired or token invalid. Clearing session.');
            logout();
          }
          // Note: if backend is temporarily unreachable via network error, preserve session
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    // 1. Attempt live backend authentication
    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/auth/login`,
        {
          email: cleanEmail,
          password: cleanPassword,
        },
        { timeout: 3500 }
      );

      // Verify that response is valid JSON token (avoiding static host HTML rewrite)
      if (res.data && res.data.access_token) {
        const { access_token, user_id, name, role, workspace_id, workspace_name } = res.data;
        const userData = {
          id: user_id,
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          role: role || 'Data Scientist',
          workspace_id: workspace_id || 1,
          workspace_name: workspace_name || 'Primary Workspace',
          is_demo: false,
        };

        setToken(access_token);
        setUser(userData);
        localStorage.setItem('crisp_token', access_token);
        localStorage.setItem('crisp_user', JSON.stringify(userData));

        return { success: true, user: userData };
      }
    } catch (err) {
      // If live backend explicitly returned 401 Unauthorized or 403 Forbidden:
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // If not a demo account, show server error
        if (!DEMO_PROFILES[cleanEmail]) {
          return {
            success: false,
            error: err.response?.data?.detail || 'Invalid email or password.',
          };
        }
      }
      // Network error, backend offline, or demo account requested: fall through to demo handler
    }

    // 2. Demo Sandbox Fallback
    const demoProfile = DEMO_PROFILES[cleanEmail];
    if (demoProfile) {
      if (cleanPassword === demoProfile.password) {
        const demoUserData = {
          id: demoProfile.id,
          email: demoProfile.email,
          name: demoProfile.name,
          role: demoProfile.role,
          workspace_id: demoProfile.workspace_id,
          workspace_name: demoProfile.workspace_name,
          is_demo: true,
        };
        const demoToken = `crisp_demo_jwt_${demoProfile.role.toLowerCase()}_${Date.now()}`;

        setToken(demoToken);
        setUser(demoUserData);
        localStorage.setItem('crisp_token', demoToken);
        localStorage.setItem('crisp_user', JSON.stringify(demoUserData));

        return { success: true, user: demoUserData };
      } else {
        return {
          success: false,
          error: `Incorrect password for ${demoProfile.email}. Use "${demoProfile.password}" or click the 1-click login button below.`,
        };
      }
    }

    // If custom email entered and live backend failed
    return {
      success: false,
      error:
        'Live backend service is currently offline or unreachable. Please use the Quick Test Credentials below for instant 1-click access, or connect your backend.',
    };
  };

  const register = async (firstArg, posPassword, posName, posRole = 'Data Scientist', posWorkspace) => {
    let email, name, password, role, workspace_name;
    if (typeof firstArg === 'object' && firstArg !== null) {
      email = firstArg.email;
      name = firstArg.name;
      password = firstArg.password;
      role = firstArg.role || 'Data Scientist';
      workspace_name = firstArg.workspace_name;
    } else {
      email = firstArg;
      password = posPassword;
      name = posName;
      role = posRole;
      workspace_name = posWorkspace;
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPassword = (password || '').trim();

    // 1. Attempt live backend registration
    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/auth/register`,
        {
          email: cleanEmail,
          name: cleanName,
          password: cleanPassword,
          role,
          workspace_name: workspace_name || `${cleanName.split(' ')[0]}'s Workspace`,
        },
        { timeout: 3500 }
      );

      if (res.data && res.data.access_token) {
        const { access_token, user_id, workspace_id, workspace_name: wsName } = res.data;
        const userData = {
          id: user_id,
          email: cleanEmail,
          name: cleanName,
          role,
          workspace_id: workspace_id || 1,
          workspace_name: wsName,
          is_demo: false,
        };

        setToken(access_token);
        setUser(userData);
        localStorage.setItem('crisp_token', access_token);
        localStorage.setItem('crisp_user', JSON.stringify(userData));

        return { success: true, user: userData };
      }
    } catch (err) {
      if (err.response && err.response.status === 400) {
        return {
          success: false,
          error: err.response.data?.detail || 'An account with this email already exists.',
        };
      }
      // If network unreachable, allow instant demo registration
    }

    // 2. Demo Sandbox Registration Fallback
    const demoUserData = {
      id: Date.now(),
      email: cleanEmail,
      name: cleanName || cleanEmail.split('@')[0],
      role: role || 'Data Scientist',
      workspace_id: Date.now(),
      workspace_name: workspace_name || `${cleanName || 'Enterprise'} Workspace`,
      is_demo: true,
    };
    const demoToken = `crisp_demo_jwt_reg_${Date.now()}`;

    setToken(demoToken);
    setUser(demoUserData);
    localStorage.setItem('crisp_token', demoToken);
    localStorage.setItem('crisp_user', JSON.stringify(demoUserData));

    return { success: true, user: demoUserData };
  };

  const logout = async () => {
    if (token && !token.startsWith('crisp_demo_jwt_')) {
      try {
        await axios.post(
          `${getApiBaseUrl()}/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 2000,
          }
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
  const isDemo = Boolean(user?.is_demo || token?.startsWith('crisp_demo_jwt_'));

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
        isDemo,
        workspaceId: user?.workspace_id || 1,
        workspaceName: user?.workspace_name || 'SiliconBrain Enterprise',
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        canUpload,
        canDelete,
        canRunAnalysis,
        canCreateExperiment,
        canViewAudit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
