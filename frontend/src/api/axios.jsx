import axios from "axios";

// Use same-origin API by default so production deployments do not call localhost.
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Interceptor to add JWT to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;