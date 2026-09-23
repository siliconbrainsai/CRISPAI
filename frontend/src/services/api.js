import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const uploadTabular = (formData) => {
    return api.post('/upload/tabular', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const uploadImages = (formData) => {
    return api.post('/upload/images', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const runPipeline = (config) => {
    return api.post('/pipeline/run', config);
};

export const getStatus = (jobId) => {
    return api.get(`/pipeline/status/${jobId}`);
};

export const getResults = (jobId) => {
    return api.get(`/pipeline/results/${jobId}`);
};

export const getGradCam = (jobId, imageId) => {
    return api.get(`/pipeline/gradcam/${jobId}/${imageId}`);
};

export const runInference = (formData) => {
    return api.post('/inference/predict', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export default api;
