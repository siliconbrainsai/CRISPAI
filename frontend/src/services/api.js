import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor injecting JWT Bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('crisp_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for consistent error messaging & 401 handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        let message = 'An unexpected error occurred';
        if (error.response) {
            // Handle expired session
            if (error.response.status === 401 && !window.location.pathname.includes('/auth')) {
                localStorage.removeItem('crisp_token');
                localStorage.removeItem('crisp_user');
                window.location.href = '/auth';
            }
            message = error.response.data?.detail || error.response.data?.message || `Request failed with status ${error.response.status}`;
        } else if (error.request) {
            message = 'Backend unavailable. Please check if the server is running.';
        } else {
            message = error.message;
        }
        const customError = new Error(message);
        customError.originalError = error;
        customError.status = error.response?.status;
        return Promise.reject(customError);
    }
);

// --- Authentication Endpoints ---
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (data) => api.post('/auth/register', data);
export const logoutUser = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// --- Core Pipeline & Upload Endpoints ---
export const uploadTabular = (formData) => {
    return api.post('/upload/tabular', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const uploadImages = (formData) => {
    return api.post('/upload/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const runPipeline = (config) => api.post('/pipeline/run', config);
export const getStatus = (jobId) => api.get(`/pipeline/status/${jobId}`);
export const getResults = (jobId) => api.get(`/pipeline/results/${jobId}`);
export const retryAnalysis = (analysisId) => api.post(`/pipeline/retry/${analysisId}`);
export const cancelJob = (jobId) => api.post(`/pipeline/cancel/${jobId}`);
export const getGradCam = (jobId, imageId) => api.get(`/pipeline/gradcam/${jobId}/${imageId}`);
export const runInference = (formData) => {
    return api.post('/inference/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// --- Enterprise Endpoints ---
// Datasets
export const getDatasets = () => api.get('/datasets');
export const getDataset = (id) => api.get(`/datasets/${id}`);
export const createDataset = (data) => api.post('/datasets', data);
export const deleteDataset = (id) => api.delete(`/datasets/${id}`);

// Analyses
export const getAnalyses = () => api.get('/analyses');
export const getAnalysis = (id) => api.get(`/analyses/${id}`);
export const createAnalysis = (data) => api.post('/analyses', data);
export const updateAnalysis = (id, data) => api.patch(`/analyses/${id}`, data);

// Reports
export const getReports = () => api.get('/reports');
export const getReport = (id) => api.get(`/reports/${id}`);
export const createReport = (data) => api.post('/reports', data);

// Experiments
export const getExperiments = () => api.get('/experiments');
export const getExperiment = (id) => api.get(`/experiments/${id}`);
export const createExperiment = (data) => api.post('/experiments', data);

// Audit Logs
export const getAuditLogs = () => api.get('/audit-logs');
export const logAudit = (actionOrPayload, details = null, workspace_id = null) => {
    if (typeof actionOrPayload === 'object' && actionOrPayload !== null) {
        return api.post('/audit-logs', actionOrPayload);
    }
    return api.post('/audit-logs', { 
        action: actionOrPayload, 
        details: details || '', 
        workspace_id 
    });
};

// Causal Copilot
export const chatCopilot = (data) => api.post('/causal-copilot/chat', data);

// Newsletter Subscription
export const subscribeNewsletter = (email) => api.post('/newsletter/subscribe', { email });

export default api;
