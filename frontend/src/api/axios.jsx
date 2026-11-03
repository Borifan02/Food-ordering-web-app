import axios from "axios";

const getBaseUrl = () => {
    const raw = import.meta.env.VITE_API_URL;
    if (!raw) return "/api";
    let cleaned = String(raw).trim().replace(/^['"]+|['"]+$/g, "").trim().replace(/\/+$/, "");
    if (!cleaned.endsWith("/api") && !cleaned.includes("/api/")) {
        cleaned = `${cleaned}/api`;
    }
    return cleaned;
};

// Use same-origin API by default so production deployments do not call localhost.
const apiClient = axios.create({
    baseURL: getBaseUrl(),
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
