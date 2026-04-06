import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/token";

class ApiClient {
  private static instance: AxiosInstance;
  private static isRefreshing = false;
  private static failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    config: InternalAxiosRequestConfig;
  }> = [];

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      ApiClient.instance.interceptors.request.use(
        (config) => {
          const token = getAccessToken();
          if (token) config.headers.Authorization = `Bearer ${token}`;
          return config;
        },
        (error: AxiosError) => Promise.reject(error)
      );

      ApiClient.instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        async (error: AxiosError) => {
          const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

          if (error.response?.status === 401 && !originalRequest._retry) {
            if (ApiClient.isRefreshing) {
              return new Promise((resolve, reject) => {
                ApiClient.failedQueue.push({ resolve, reject, config: originalRequest });
              });
            }

            originalRequest._retry = true;
            ApiClient.isRefreshing = true;

            try {
              const newAccessToken = await ApiClient.refreshAccessToken();
              setAccessToken(newAccessToken);

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

              const response = await ApiClient.instance(originalRequest);
              ApiClient.processQueue(null, newAccessToken);
              return response;
            } catch (refreshError) {
              ApiClient.processQueue(refreshError as Error, null);
              clearAccessToken();

              if (typeof window !== "undefined") window.location.href = "/login";
              return Promise.reject(refreshError);
            } finally {
              ApiClient.isRefreshing = false;
            }
          }

          return Promise.reject(error);
        }
      );
    }
    return ApiClient.instance;
  }

  private static async refreshAccessToken(): Promise<string> {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true, headers: { "Content-Type": "application/json" } }
    );
    return response.data.access_token;
  }

  private static processQueue(error: Error | null, token: string | null) {
    ApiClient.failedQueue.forEach((p) => {
      if (error) p.reject(error);
      else {
        p.config.headers.Authorization = `Bearer ${token}`;
        ApiClient.instance(p.config).then(p.resolve).catch(p.reject);
      }
    });
    ApiClient.failedQueue = [];
  }
}

export const api = ApiClient.getInstance();
