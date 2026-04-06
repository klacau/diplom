import { create } from "zustand";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { setAccessToken, clearAccessToken, getAccessToken } from "@/lib/auth/token";

interface User { id: number; email: string; name: string; }

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  isAuthChecked: boolean;

  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthChecked: false,

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/auth/register", { email, password, name });
      await get().login(email, password);
    } catch (e) {
      const err = e as AxiosError<{ detail: string }>;
      set({ error: err.response?.data?.detail || "Registration failed" });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new URLSearchParams();
      formData.append("email", email);
      formData.append("password", password);

      const response = await api.post("/api/auth/login", formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      setAccessToken(response.data.access_token);
      await get().fetchCurrentUser();
      set({ isAuthChecked: true }); 
    } catch (e) {
      const err = e as AxiosError<{ detail: string }>;
      clearAccessToken();
      set({ error: err.response?.data?.detail || "Login failed", user: null, isAuthChecked: true });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearAccessToken();
      set({ user: null, error: null, isAuthChecked: true });
    }
  },

  fetchCurrentUser: async () => {
    const response = await api.get("/api/users/me");
    set({ user: response.data, error: null });
  },

  initAuth: async () => {
    try {
      if (!getAccessToken()) return; // токена нет => не логинен
      await get().fetchCurrentUser(); // если access протух — интерцептор попробует refresh
    } catch {
      // если refresh упал — api.ts редиректнет на /login (как ты делал)
      set({ user: null });
    } finally {
      set({ isAuthChecked: true });
    }
  },

  clearError: () => set({ error: null }),
}));

