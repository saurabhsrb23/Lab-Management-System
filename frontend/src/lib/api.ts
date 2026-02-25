import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove("token");
      Cookies.remove("user");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: { email: string; full_name: string; password: string; role: string }) =>
    api.post("/auth/register", data),
};

// Users
export const usersApi = {
  me: () => api.get("/users/me"),
  list: () => api.get("/users/"),
  update: (id: number, data: object) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Equipment
export const equipmentApi = {
  list: (params?: { category?: string; status?: string }) =>
    api.get("/equipment/", { params }),
  get: (id: number) => api.get(`/equipment/${id}`),
  create: (data: object) => api.post("/equipment/", data),
  update: (id: number, data: object) => api.put(`/equipment/${id}`, data),
  delete: (id: number) => api.delete(`/equipment/${id}`),
};

// Bookings
export const bookingsApi = {
  list: (params?: { status?: string }) => api.get("/bookings/", { params }),
  get: (id: number) => api.get(`/bookings/${id}`),
  create: (data: object) => api.post("/bookings/", data),
  update: (id: number, data: object) => api.put(`/bookings/${id}`, data),
  delete: (id: number) => api.delete(`/bookings/${id}`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  bookingsByStatus: () => api.get("/dashboard/bookings-by-status"),
  bookingsByMonth: () => api.get("/dashboard/bookings-by-month"),
  equipmentUsage: () => api.get("/dashboard/equipment-usage"),
};

// Reports
export const reportsApi = {
  bookings: (params?: { start_date?: string; end_date?: string; status?: string }) =>
    api.get("/reports/bookings", { params }),
  exportCsv: (params?: { start_date?: string; end_date?: string; status?: string }) => {
    const token = Cookies.get("token");
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `${API_URL}/api/v1/reports/bookings/export/csv?${query}`;
  },
};

export default api;
